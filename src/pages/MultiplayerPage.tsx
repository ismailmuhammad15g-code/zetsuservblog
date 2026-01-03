import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Copy, Users, Swords, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import BottomNavigation from '@/components/zersu-game/BottomNavigation';

export const MultiplayerPage = () => {
    const navigate = useNavigate();
    const [inviteCode, setInviteCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [gameMode, setGameMode] = useState<'task_check' | 'quiz'>('task_check');
    const [duration, setDuration] = useState(3);
    const [showGameModeModal, setShowGameModeModal] = useState(false);

    // Fetch user profile
    const { data: userProfile } = useQuery({
        queryKey: ['user-profile'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/register'); // Redirect to register if not logged in
                return null;
            }
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            return data;
        },
    });

    const generateCode = () => {
        // Simple 6-char random code
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    // Subscribe for changes when we have an invite code (HOST)
    useEffect(() => {
        if (!inviteCode || !userProfile) return;

        const channel = supabase
            .channel(`game_session_monitor_${inviteCode}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_sessions',
                    filter: `invite_code=eq.${inviteCode}`
                },
                (payload) => {
                    const newSession = payload.new as any;
                    if (newSession.guest_id && newSession.status === 'active') {
                        toast.success('انضم صديقك! سيبدأ اللعب الآن... ⚔️');
                        setTimeout(() => {
                            if (newSession.game_mode === 'quiz') {
                                navigate(`/quiz/${newSession.id}`);
                            } else {
                                navigate(`/vschallenge/${newSession.id}`);
                            }
                        }, 1500);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [inviteCode, userProfile, navigate]);

    const handleCreateSession = async () => {
        if (!userProfile) return;
        setIsCreating(true);
        const code = generateCode();

        try {
            const { data, error } = await supabase
                .from('game_sessions')
                .insert({
                    host_id: userProfile.id,
                    invite_code: code,
                    status: 'waiting',
                    game_mode: gameMode,
                    duration: gameMode === 'quiz' ? duration : 0
                })
                .select()
                .single();

            if (error) throw error;

            setInviteCode(code);
            setShowGameModeModal(false);
            toast.success('تم إنشاء غرفة اللعب! شارك الرمز مع صديقك 🎮');

        } catch (error) {
            console.error('Error creating session:', error);
            toast.error('فشل في إنشاء الغرفة');
            setInviteCode(''); // Reset on error
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinSession = async () => {
        if (!joinCode || !userProfile) return;
        setIsJoining(true);

        try {
            // Find session
            const { data: session, error: findError } = await supabase
                .from('game_sessions')
                .select('*')
                .eq('invite_code', joinCode.toUpperCase())
                .eq('status', 'waiting')
                .single();

            if (findError || !session) {
                toast.error('الرمز غير صحيح أو الغرفة ممتلئة ❌');
                setIsJoining(false);
                return;
            }

            // Join session
            const { error: updateError } = await supabase
                .from('game_sessions')
                .update({
                    guest_id: userProfile.id,
                    status: 'active',
                    start_time: new Date().toISOString()
                })
                .eq('id', session.id);

            if (updateError) throw updateError;

            toast.success('تم الاتصال بنجاح! استعد للقتال ⚔️');

            // Navigate to game
            const sessionData = session as any;
            setTimeout(() => {
                if (sessionData.game_mode === 'quiz') {
                    navigate(`/quiz/${session.id}`);
                } else {
                    navigate(`/vschallenge/${session.id}`);
                }
            }, 1000);

        } catch (error) {
            console.error('Error joining session:', error);
            toast.error('حدث خطأ أثناء الانضمام');
        } finally {
            setIsJoining(false);
        }
    };

    const copyCode = async () => {
        if (!inviteCode) return;

        try {
            // Try modern API first
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(inviteCode);
                setIsCopied(true);
                toast.success('تم نسخ الرمز! 📋');
                setTimeout(() => setIsCopied(false), 2000);
                return;
            }
            throw new Error('Clipboard API unavailable');
        } catch (err) {
            // Fallback for HTTP or older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = inviteCode;

                // Ensure it's part of the document but invisible
                textArea.style.position = 'fixed';
                textArea.style.left = '0';
                textArea.style.top = '0';
                textArea.style.opacity = '0';
                textArea.style.pointerEvents = 'none';

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    setIsCopied(true);
                    toast.success('تم نسخ الرمز! 📋');
                    setTimeout(() => setIsCopied(false), 2000);
                } else {
                    throw new Error('Fallback copy failed');
                }
            } catch (fallbackErr) {
                console.error('Copy failed:', fallbackErr);
                toast.error('فشل النسخ - يرجى النسخ يدوياً');
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 pb-24 font-sans">
            {/* Game Mode Selection Modal */}
            {showGameModeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95">
                        {/* Modal Header */}
                        <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-4">
                            <h3 className="text-xl font-bold text-white text-center">اختر نوع اللعبة</h3>
                            <p className="text-purple-200 text-sm text-center mt-1">حدد طريقة التحدي التي تناسبك</p>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Game Mode Selection */}
                            <div>
                                <label className="text-sm text-gray-400 mb-3 block font-bold">نوع اللعبة</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setGameMode('task_check')}
                                        className={`p-4 rounded-xl border transition-all ${
                                            gameMode === 'task_check'
                                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40 scale-105'
                                                : 'bg-slate-900 border-gray-700 text-gray-400 hover:border-purple-500/50'
                                        }`}
                                    >
                                        <div className="text-3xl mb-2">✅</div>
                                        <div className="font-bold text-sm">تحدي المهام</div>
                                    </button>
                                    <button
                                        onClick={() => setGameMode('quiz')}
                                        className={`p-4 rounded-xl border transition-all ${
                                            gameMode === 'quiz'
                                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40 scale-105'
                                                : 'bg-slate-900 border-gray-700 text-gray-400 hover:border-purple-500/50'
                                        }`}
                                    >
                                        <div className="text-3xl mb-2">❓</div>
                                        <div className="font-bold text-sm">الأسئلة</div>
                                    </button>
                                </div>
                            </div>

                            {/* Duration Selection (Quiz Only) */}
                            {gameMode === 'quiz' && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="text-sm text-gray-400 mb-3 block font-bold">مدة اللعبة (دقائق)</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[3, 4, 5, 10].map((mins) => (
                                            <button
                                                key={mins}
                                                onClick={() => setDuration(mins)}
                                                className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                                                    duration === mins
                                                        ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-900/40 scale-105'
                                                        : 'bg-slate-900 border-gray-700 text-gray-400 hover:border-pink-500/50'
                                                }`}
                                            >
                                                {mins}د ⏱️
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowGameModeModal(false)}
                                    className="flex-1 py-3 bg-slate-800 border border-slate-700 text-gray-300 font-bold rounded-xl hover:bg-slate-700 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleCreateSession}
                                    disabled={isCreating}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50"
                                >
                                    {isCreating ? 'جاري الإنشاء...' : 'إنشاء الغرفة 🎮'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex items-center justify-between mb-8 pt-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
                        <Swords className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        قتال الأصدقاء
                    </h1>
                </div>
            </header>

            <div className="space-y-8 max-w-md mx-auto">
                {/* Hero Section */}
                <div className="text-center space-y-2 mb-8">
                    <h2 className="text-3xl font-bold">1VS1</h2>
                    <p className="text-gray-400">تحدى صديقك في سباق لإنجاز المهام!</p>
                </div>

                {/* Create Session Card */}
                <section className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/40 transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />

                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-400" />
                        العب مع صديق
                    </h3>

                    {!inviteCode ? (
                        <button
                            onClick={() => setShowGameModeModal(true)}
                            disabled={isCreating}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold shadow-lg shadow-purple-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            إنشاء غرفة جديدة 🎮
                        </button>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="p-4 bg-black/40 rounded-xl border border-purple-500/30 flex items-center justify-between">
                                <span className="text-2xl font-mono font-bold tracking-wider text-purple-300">
                                    {inviteCode}
                                </span>
                                <button
                                    onClick={copyCode}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    {isCopied ? (
                                        <Check className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm text-yellow-400 animate-pulse">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                                بانتظار انضمام صديقك...
                            </div>
                        </div>
                    )}
                </section>

                <div className="flex items-center gap-4 text-gray-600">
                    <div className="h-px bg-gray-800 flex-1" />
                    <span>أو</span>
                    <div className="h-px bg-gray-800 flex-1" />
                </div>

                {/* Join Session Card */}
                <section className="bg-slate-900/50 backdrop-blur-sm border border-pink-500/20 rounded-2xl p-6 relative overflow-hidden group hover:border-pink-500/40 transition-all">
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl group-hover:bg-pink-500/20 transition-all pointer-events-none" />

                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <ArrowRight className="w-5 h-5 text-pink-400" />
                        انضم لغرفة
                    </h3>

                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="الصق رمز المشاركة هنا"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            className="w-full bg-black/40 border border-gray-700/50 rounded-xl px-4 py-3 text-center font-mono placeholder:text-gray-600 focus:border-pink-500 focus:outline-none transition-colors"
                        />
                        <button
                            onClick={handleJoinSession}
                            disabled={!joinCode || isJoining}
                            className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl font-bold shadow-lg shadow-pink-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isJoining ? 'جاري الاتصال...' : 'انضمام للتحدي 🚀'}
                        </button>
                    </div>
                </section>
            </div>

            <BottomNavigation />
        </div>
    );
};
