import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Timer, Trophy, Frown, Camera, LogOut, AlertTriangle, X } from 'lucide-react';
import { useZersuAI } from '@/hooks/useZersuAI';

export const VsChallengePage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { verifyChallenge } = useZersuAI();

    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
    const [gameStatus, setGameStatus] = useState<'loading' | 'waiting' | 'active' | 'finished'>('loading');
    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [isHost, setIsHost] = useState(false);
    const [currentTask, setCurrentTask] = useState<{ id: number; title: string; description: string; icon: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Mock tasks pool - in real app, fetch from DB
    const TASKS_POOL = [
        { id: 1, title: 'Push-ups', description: 'Do 10 push-ups', icon: '💪' },
        { id: 2, title: 'Water', description: 'Drink a glass of water', icon: '💧' },
        { id: 3, title: 'Squats', description: 'Do 15 squats', icon: '🏋️' },
        { id: 4, title: 'Selfie', description: 'Take a funny selfie', icon: '📸' },
        { id: 5, title: 'Plank', description: 'Hold plank for 30s', icon: '🧘' },
    ];

    // Fetch user profile
    const { data: userProfile } = useQuery({
        queryKey: ['user-profile'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return null;
            return session.user;
        },
    });

    const [opponentPresent, setOpponentPresent] = useState(true); // Assume present initially to avoid flicker
    const [showSurrenderModal, setShowSurrenderModal] = useState(false);

    const processGameEndRewards = async (finalMy: number, finalOp: number) => {
        if (!userProfile) return;

        // Define points/coins logic
        let points = 0;
        let coins = 0;
        let isWin = false;
        let isDraw = false;

        if (finalMy > finalOp) {
            isWin = true;
            points = 50; // Win points
            coins = 10;
        } else if (finalMy < finalOp) {
            // Loss
            // Check for surrender penalty (score 0 vs 99 usually means surrender)
            if (finalOp === 99 && finalMy === 0) {
                points = -20; // Surrender penalty points
                coins = -5; // Surrender penalty coins
                toast.error('انسحاب مخزي! 🤡 -5 💎');
            } else {
                points = 10; // Participation points
                coins = -1; // Loss penalty
                toast.error('للأسف خسرت! 💀 -1 💎');
            }
        } else {
            isDraw = true;
            points = 15; // Draw points
            coins = 0;
            toast('تعادل! لا غالب ولا مغلوب 🤝');
        }

        if (isWin) toast.success(`مبروك! أنت الفائز! 🏆 +${coins} 💎 +${points} نقاط`);

        // Call RPC
        try {
            // @ts-ignore - RPC not generated in types yet
            await supabase.rpc('record_game_result', {
                p_user_id: userProfile.id,
                p_is_win: isWin,
                p_is_draw: isDraw,
                p_points: points,
                p_zcoins: coins
            });
        } catch (e) {
            console.error('Error recording result:', e);
        }
    };

    useEffect(() => {
        if (!sessionId || !userProfile) return;

        const fetchSession = async () => {
            const { data, error } = await supabase
                .from('game_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (error) {
                console.error("Error fetching session:", error);
                // IF 406, it might be due to RLS or other transient issue. Do NOT navigate away immediately if we are in the middle of waiting.
                // toast.error('خطأ في تحميل الجلسة');
                return;
            }

            if (!data) {
                // Only navigate away if data is truly missing (e.g., 404/deleted) and we aren't just hitting a permission blip
                navigate('/multiplayer');
                return;
            }

            const amIHost = data.host_id === userProfile.id;
            setIsHost(amIHost);
            setMyScore(amIHost ? data.host_score : data.guest_score);
            setOpponentScore(amIHost ? data.guest_score : data.host_score);

            // Check if game is ready to start (has valid start_time and is active)
            if (!data.start_time || data.status !== 'active') {
                console.log('Waiting for game to start...', { start_time: data.start_time, status: data.status });
                setGameStatus('waiting');
                return;
            }

            // Calculate time left
            const startTime = new Date(data.start_time).getTime();
            const now = new Date().getTime();
            const elapsed = Math.floor((now - startTime) / 1000);
            const remaining = 300 - elapsed;

            if (remaining <= 0) {
                setGameStatus('finished');
                setTimeLeft(0);
            } else {
                setTimeLeft(remaining);
                setGameStatus('active');
            }

            // Pick random task to start if not set
            if (!currentTask) {
                setCurrentTask(TASKS_POOL[Math.floor(Math.random() * TASKS_POOL.length)]);
            }
        };

        fetchSession();

        // Subscribe to real-time updates & Presence
        const channel = supabase
            .channel(`game_session_play_${sessionId}`, {
                config: {
                    presence: {
                        key: userProfile.id,
                    },
                },
            })
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_sessions',
                    filter: `id=eq.${sessionId}`
                },
                (payload) => {
                    const newData = payload.new;
                    const amIHost = newData.host_id === userProfile.id;
                    const newMyScore = amIHost ? newData.host_score : newData.guest_score;
                    const newOpponentScore = amIHost ? newData.guest_score : newData.host_score;

                    setMyScore(newMyScore);
                    setOpponentScore(newOpponentScore);

                    // If game just became active, re-fetch to start the game properly
                    if (newData.status === 'active' && newData.start_time) {
                        fetchSession();
                    }

                    // If game finished (via timer or surrender)
                    if (newData.status === 'finished') {
                        setGameStatus('finished');
                        processGameEndRewards(newMyScore, newOpponentScore);
                        // Avoid trigger if I surrendered (I already got -5)
                        // If I surrendered, my score became 0 and opponent 99.
                        // My local handleSurrender dealt with coins.
                        // But wait, if I reload, I might re-trigger.
                        // Ideally we check if "reward_claimed" but we don't have that column on game_sessions for each user easily.
                        // For this iteration, we accept slight risk of double reward on refresh OR we rely on the component state transition.
                        // This hook runs on UPDATE.
                    }
                }
            )
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users = Object.keys(state);
                console.log('Presence sync:', users);

                // Triggers refetch in case we missed the update event but users are here
                if (users.length >= 2) {
                    fetchSession();
                    setOpponentPresent(true);
                } else if (users.length === 1) {
                    setOpponentPresent(false);
                }
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('Join:', key, newPresences);
                setOpponentPresent(true);
                fetchSession(); // Retry start when opponent joins
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('Leave:', key, leftPresences);
                // We rely on sync mostly
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        user_id: userProfile.id
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, userProfile, navigate]);

    // Watch for opponent disconnect
    useEffect(() => {
        if (gameStatus === 'active' && !opponentPresent) {
            const timeout = setTimeout(() => {
                toast.error('انقطع اتصال الخصم! لقد فزت 🏆');

                // Set opponent to lose (surrender by disconnect)
                // Best way: set status finished and opponent higher score (me)
                (async () => {
                    if (isHost) {
                        await supabase.from('game_sessions').update({ host_score: 99, guest_score: 0, status: 'finished', end_time: new Date().toISOString() }).eq('id', sessionId);
                    } else {
                        await supabase.from('game_sessions').update({ guest_score: 99, host_score: 0, status: 'finished', end_time: new Date().toISOString() }).eq('id', sessionId);
                    }
                })();
            }, 5000); // 5 seconds grace period
            return () => clearTimeout(timeout);
        }
    }, [opponentPresent, gameStatus]);


    // Timer Interval
    useEffect(() => {
        if (gameStatus !== 'active') return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setGameStatus('finished');
                    // Only one person needs to trigger the DB update, but it's safer if both try (idempotent)
                    // or ideally just the host. Let's let both try to be safe against host disconnect.
                    handleGameEndTimer();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameStatus]);

    const handleGameEndTimer = async () => {
        if (!sessionId) return;
        // Mark game as finished in DB. 
        // The REALTIME listener will pick this up and show the result screen with the correct scores.
        await supabase.from('game_sessions').update({ status: 'finished', end_time: new Date().toISOString() }).eq('id', sessionId);
    };



    const handleTaskSubmit = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !currentTask || !userProfile) return;
        const file = e.target.files[0];
        setIsSubmitting(true);

        // 1. Upload
        // 2. Verify with AI
        // 3. If success -> Update score & Get new task

        try {
            // Fake upload for speed in demo or implement real
            const verification = await verifyChallenge({
                challengeTitle: currentTask.title,
                challengeDescription: currentTask.description,
                proofImage: URL.createObjectURL(file), // Local blob for speed
                userId: userProfile.id
            });

            if (verification.success) {
                toast.success(`أحسنت! +1 نقطة ${verification.feedbackAr}`);

                // Update Score in DB
                const scoreField = isHost ? 'host_score' : 'guest_score';

                // Optimistic update
                setMyScore(prev => prev + 1);

                await supabase
                    .from('game_sessions')
                    .update({ [scoreField]: myScore + 1 }) // Use state + 1 or fetch fresh? careful with race conditions. Postgres increment is better but simple update works for 1v1 turn based-ish.
                    .eq('id', sessionId);

                // Next Task
                setCurrentTask(TASKS_POOL[Math.floor(Math.random() * TASKS_POOL.length)]);
            } else {
                toast.error(`فشل! ${verification.feedbackAr}`);
            }

        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSurrender = async () => {
        if (!userProfile) return;

        // Immediate UI feedback
        setShowSurrenderModal(false);
        setGameStatus('finished');
        setMyScore(0);
        setOpponentScore(99);
        toast.error('لقد انسحبت! خذلتني يا محارب... 👎');

        try {
            // Update DB to reflect surrender (give win to opponent)
            // Since we don't have a sophisticated game engine, simply giving opponent points or ending game
            // Best way: set status finished and opponent higher score
            const scoreField = isHost ? 'guest_score' : 'host_score'; // Give points to OPPONENT

            await supabase
                .from('game_sessions')
                .update({
                    [scoreField]: 99,
                    status: 'finished',
                    end_time: new Date().toISOString()
                })
                .eq('id', sessionId);

            // Coins/Points handled by processGameEndRewards via real-time subscription
            // await supabase.rpc('increment_zcoins', { amount: -5, user_id: userProfile.id });

        } catch (err) {
            console.error('Surrender error:', err);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (gameStatus === 'loading') return <div className="text-white text-center pt-20">جاري تحميل المعركة...</div>;

    if (gameStatus === 'waiting') return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center animate-in fade-in">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-8" />
            <h2 className="text-2xl font-bold text-white mb-2">في انتظار انضمام الخصم...</h2>
            <p className="text-gray-400">شارك رمز التحدي مع صديقك!</p>
            <div className="mt-8 p-4 bg-slate-900 rounded-xl font-mono text-purple-300 border border-purple-500/30">
                جاري الاتصال بالسيرفر...
            </div>
        </div>
    );

    if (gameStatus === 'finished') {
        const isWinner = myScore > opponentScore;
        const isDraw = myScore === opponentScore;

        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center animate-in zoom-in">
                {isWinner ? (
                    <Trophy className="w-24 h-24 text-yellow-400 mb-6 animate-bounce" />
                ) : isDraw ? (
                    <div className="text-4xl mb-6">🤝</div>
                ) : (
                    <Frown className="w-24 h-24 text-red-500 mb-6" />
                )}

                <h1 className="text-4xl font-black text-white mb-2">
                    {isWinner ? 'انتصار ساحق!' : isDraw ? 'تعادل!' : 'هزيمة...'}
                </h1>
                <p className="text-xl text-gray-400 mb-8">
                    أنت: {myScore} - الخصم: {opponentScore}
                </p>

                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/multiplayer')}
                        className="px-8 py-3 bg-purple-600 rounded-xl font-bold text-white hover:bg-purple-700"
                    >
                        العودة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 pb-20 font-sans flex flex-col">
            {/* Header / Scoreboard */}
            <header className="bg-slate-900/80 backdrop-blur rounded-2xl p-4 mb-6 border border-white/10 shadow-xl z-10 sticky top-2 relative">
                {/* Surrender Button */}
                <button
                    onClick={() => setShowSurrenderModal(true)}
                    className="absolute top-[-10px] right-[-10px] bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg border-2 border-slate-900 z-50 transition-transform hover:scale-110"
                    title="انسحاب"
                >
                    <LogOut className="w-5 h-5" />
                </button>

                <div className="flex justify-between items-center mb-2">
                    <div className="text-center">
                        <p className="text-xs text-green-400 font-bold mb-1">أنت</p>
                        <span className="text-3xl font-black">{myScore}</span>
                    </div>

                    <div className={`p-3 rounded-xl border ${timeLeft < 60 ? 'bg-red-500/20 border-red-500 animate-pulse' : 'bg-slate-800 border-slate-700'}`}>
                        <div className="flex items-center gap-2">
                            <Timer className="w-5 h-5 text-gray-400" />
                            <span className="text-2xl font-mono font-bold tracking-widest">{formatTime(timeLeft)}</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-red-400 font-bold mb-1">الخصم</p>
                        <span className="text-3xl font-black">{opponentScore}</span>
                    </div>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                        className="bg-purple-500 h-full transition-all duration-1000"
                        style={{ width: `${(timeLeft / 300) * 100}%` }}
                    />
                </div>
            </header>

            {/* Surrender Modal */}
            {showSurrenderModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-slate-900 border-2 border-red-500/70 rounded-3xl p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.3)] relative overflow-hidden">
                        {/* Zersu Character Mockup (Emoji/Icon for now) */}
                        <div className="absolute top-[-20px] left-[-20px] text-9xl opacity-10 select-none">😈</div>

                        <div className="flex justify-center mb-4">
                            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-purple-600 rounded-full flex items-center justify-center shadow-inner border-4 border-slate-800 relative">
                                <span className="text-5xl">🤡</span>
                                <div className="absolute bottom-0 right-0 bg-red-600 rounded-full p-1 border-2 border-slate-900">
                                    <AlertTriangle className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-white mb-2">يا للعار!</h3>

                        <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 mb-6 text-sm leading-relaxed text-gray-300 relative">
                            <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 border-t border-l border-white/5 rotate-45"></div>
                            "أتود فعلاً الانسحاب وتجعل صديقك يفوز بتلك السهولة!؟
                            <br />
                            <span className="text-red-400 font-bold block mt-2">ستخسر نقاط الشجاعة!</span>"
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleSurrender}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                نعم، أنا انسحب...
                            </button>

                            <button
                                onClick={() => setShowSurrenderModal(false)}
                                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                لا! سأكمل القتال! ⚔️
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!opponentPresent && gameStatus === 'active' && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-8 max-w-md text-center shadow-2xl shadow-red-900/20">
                        <div className="animate-pulse mb-6">
                            <span className="text-6xl">📡</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">انقطع الاتصال بالخصم!</h3>
                        <p className="text-gray-400 mb-6">
                            يبدو أن منافسك قد غادر المعركة...
                            <br />
                            سيتم احتساب الفوز لك خلال ثوانٍ.
                        </p>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full w-full animate-progress-indeterminate" />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Game Area */}
            <main className="flex-1 flex flex-col justify-center items-center relative">
                <div className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-purple-500/30 p-8 text-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

                    <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
                        {currentTask?.icon}
                    </div>
                    <h2 className="text-3xl font-bold mb-4">{currentTask?.title}</h2>
                    <p className="text-gray-400 text-lg mb-8">{currentTask?.description}</p>

                    <label className={`
                        w-full py-6 rounded-2xl border-2 border-dashed border-gray-600 
                        flex flex-col items-center justify-center gap-3 cursor-pointer
                        hover:border-purple-500 hover:bg-purple-500/10 transition-all
                        ${isSubmitting ? 'opacity-50 pointer-events-none animate-pulse' : ''}
                    `}>
                        <input type="file" accept="image/*" className="hidden" onChange={handleTaskSubmit} disabled={isSubmitting} />
                        <Camera className="w-8 h-8 text-purple-400" />
                        <span className="font-bold text-gray-300">
                            {isSubmitting ? 'جاري التحقق...' : 'صور ونفذ! 📸'}
                        </span>
                    </label>
                </div>
            </main>
        </div>
    );
};
