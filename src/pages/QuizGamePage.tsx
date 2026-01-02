import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Timer, Trophy, HelpCircle, Send, CheckCircle2, XCircle, Clock, Gift, Loader2 } from 'lucide-react';

type GameState = 'WAITING' | 'LOTTERY' | 'ASKING' | 'ANSWERING' | 'RESULT' | 'GAME_OVER';

interface QuizState {
    turn_id: string; // user_id of who is asking
    question: string;
    answer: string;
    responder_answer?: string;
    round_result?: 'correct' | 'wrong';
    round_start_time?: number;
}

export const QuizGamePage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [gameState, setGameState] = useState<GameState>('WAITING');
    const [timeLeft, setTimeLeft] = useState(0); // Game duration
    const [turnTimeLeft, setTurnTimeLeft] = useState(120); // 2 mins per turn
    const [quizState, setQuizState] = useState<QuizState>({ turn_id: '', question: '', answer: '' });

    // Inputs
    const [questionInput, setQuestionInput] = useState('');
    const [answerInput, setAnswerInput] = useState('');
    const [responderInput, setResponderInput] = useState('');
    const [isSendingQuestion, setIsSendingQuestion] = useState(false);
    const [isSendingAnswer, setIsSendingAnswer] = useState(false);

    const turnTimerRef = useRef<NodeJS.Timeout>();

    const { data: userProfile } = useQuery({
        queryKey: ['user-profile'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return null;
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            return data;
        },
    });

    const { data: session, refetch: refetchSession } = useQuery({
        queryKey: ['quiz-session', sessionId],
        queryFn: async () => {
            const { data } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
            return data;
        },
        enabled: !!sessionId
    });

    // --- REALTIME SUBSCRIPTION ---
    useEffect(() => {
        if (!sessionId || !userProfile) return;

        const channel = supabase
            .channel(`quiz_game_${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_sessions',
                    filter: `id=eq.${sessionId}`
                },
                (payload) => {
                    const newSession = payload.new;
                    // Sync local state with DB
                    if (newSession.game_state) {
                        const serverState = newSession.game_state as any;
                        if (serverState.current_phase) setGameState(serverState.current_phase);
                        if (serverState.quiz_data) setQuizState(serverState.quiz_data);
                        // Trigger refetch to be safe
                        refetchSession();
                    }

                    if (newSession.status === 'finished') {
                        setGameState('GAME_OVER');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId, userProfile]);

    // --- GAME LOGIC CONTROLLER (HOST ONLY) ---
    const isHost = session && userProfile && session.host_id === userProfile.id;

    useEffect(() => {
        if (!isHost || !session) return;

        // Auto-start if waiting and guest joined
        if (gameState === 'WAITING' && session.guest_id) {
            updateGameState('LOTTERY', {}, {
                startTime: Date.now(),
                duration: session.duration * 60
            });
            setTimeout(handleLottery, 3000); // 3s spin
        }

    }, [session?.guest_id, isHost]);

    // Main Game Timer
    useEffect(() => {
        if (!session?.start_time || gameState === 'WAITING' || gameState === 'GAME_OVER') return;

        const durationSec = session.duration * 60;
        const start = new Date(session.start_time).getTime();

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - start) / 1000;
            const remaining = Math.max(0, durationSec - elapsed);
            setTimeLeft(Math.floor(remaining));

            if (remaining <= 0 && isHost) {
                endGame();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [session?.start_time, gameState, isHost]);

    const updateGameState = async (phase: GameState, data: Partial<QuizState>, extras: any = {}) => {
        if (!sessionId) return;

        const updatePayload: any = {
            game_state: {
                current_phase: phase,
                quiz_data: { ...quizState, ...data }
            }
        };

        if (phase === 'LOTTERY') {
            updatePayload.start_time = new Date().toISOString();
        }

        if (phase === 'GAME_OVER') {
            updatePayload.status = 'finished';
            updatePayload.end_time = new Date().toISOString();
        }

        await supabase.from('game_sessions').update(updatePayload).eq('id', sessionId);
    };

    const handleLottery = () => {
        // Randomly pick turn
        const picker = Math.random() > 0.5 ? session.host_id : session.guest_id;
        updateGameState('ASKING', {
            turn_id: picker,
            question: '',
            answer: '',
            responder_answer: '',
            round_result: undefined
        });

        // Reset inputs
        setQuestionInput('');
        setAnswerInput('');
        setResponderInput('');
    };

    const handleSendQuestion = async () => {
        if (!questionInput.trim() || !answerInput.trim()) return;
        setIsSendingQuestion(true);
        try {
            await updateGameState('ANSWERING', {
                question: questionInput,
                answer: answerInput
            });
        } finally {
            setIsSendingQuestion(false);
        }
    };

    const handleSendAnswer = async () => {
        if (!responderInput.trim()) return;
        setIsSendingAnswer(true);

        // Check answer
        const isCorrect = responderInput.trim().toLowerCase() === quizState.answer.trim().toLowerCase();

        // Logic handled by whoever sends the answer? Or Host? 
        // Better: The person answering updates the state with their answer, 
        // then the logic (Host or shared) calculates result. 
        // For simplicity, let's have the responder update the state to RESULT directly 
        // since they have the local input.

        // Calculate points
        let pointsToAdd = isCorrect ? 10 : 0;
        let zcoinsToAdd = isCorrect ? 2 : 0;

        // Determine who gets points (Responder)
        const isMe = userProfile?.id === session?.guest_id ? 'guest' : 'host'; // Wait, logic below

        // Actually, we need to update the score in DB.
        const scoreUpdate = userProfile?.id === session?.host_id
            ? { host_score: (session?.host_score || 0) + pointsToAdd }
            : { guest_score: (session?.guest_score || 0) + pointsToAdd };

        await supabase.from('game_sessions').update({
            ...scoreUpdate,
            game_state: {
                current_phase: 'RESULT',
                quiz_data: {
                    ...quizState,
                    responder_answer: responderInput,
                    round_result: isCorrect ? 'correct' : 'wrong'
                }
            }
        }).eq('id', sessionId);

        // RPC to add coins if win
        if (isCorrect && userProfile?.id) {
            await supabase.rpc('increment_zcoins', { amount: zcoinsToAdd, user_id: userProfile.id });
        }

        // Wait 3s then next turn
        setIsSendingAnswer(false);
        if (isHost) {
            setTimeout(handleLottery, 3000);
        } else {
            // If guest triggered result, host needs to see it and then trigger lottery.
            // But host 'useEffect' for lottery only triggers on mount/change.
            // We need a way for Host to know "Round ended, start next".
            // We can use a timeout on both sides but only Host calls update.
        }
    };

    // Effect to handle RESULT -> Next Turn transition (Host driven)
    useEffect(() => {
        if (!isHost || gameState !== 'RESULT') return;
        const timer = setTimeout(() => {
            handleLottery();
        }, 4000);
        return () => clearTimeout(timer);
    }, [gameState, isHost]);


    const endGame = async () => {
        // Calculate winner
        // This is handled by updateGameState('GAME_OVER') logic
        await updateGameState('GAME_OVER', {});

        // Distribute final rewards? (Already done per question? or bonus?)
        // Let's stick to per-question rewards for now as per prompt "and if he wins he gets points + zcoins". 
        // The prompt says "and after time ends, calculate points and winner gets points + zcoins". 
        // Maybe a bonus for the winner?

        const myScore = userProfile?.id === session?.host_id ? session?.host_score : session?.guest_score;
        const opScore = userProfile?.id === session?.host_id ? session?.guest_score : session?.host_score;

        if (myScore > opScore) {
            await supabase.rpc('increment_zcoins', { amount: 20, user_id: userProfile?.id }); // Bonus
        }
    };

    // UI HELPER
    const isMyTurn = userProfile?.id === quizState.turn_id;
    const amIHost = userProfile?.id === session?.host_id;

    if (!session || !userProfile) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-purple-900/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-full h-1/2 bg-blue-900/10 blur-[100px] pointer-events-none" />

            {/* Header / Scoreboard */}
            <header className="relative z-10 flex items-center justify-between bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 mb-6">
                <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">المضيف (أنت)</p>
                    <div className="text-2xl font-black text-purple-400">{session.host_score || 0}</div>
                </div>

                <div className="flex flex-col items-center">
                    <div className={`text-2xl font-mono font-bold ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-500">الوقت المتبقي</div>
                </div>

                <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">الضيف</p>
                    <div className="text-2xl font-black text-pink-400">{session.guest_score || 0}</div>
                </div>
            </header>

            {/* Main Game Area */}
            <main className="relative z-10 max-w-md mx-auto min-h-[50vh] flex flex-col justify-center">

                {gameState === 'WAITING' && (
                    <div className="text-center space-y-4 animate-pulse">
                        <Loader2 className="w-16 h-16 text-purple-500 mx-auto animate-spin" />
                        <h2 className="text-2xl font-bold">بانتظار المنافس...</h2>
                        <p className="text-gray-400 text-sm">شارك الكود لبدء اللعب</p>
                        <div className="bg-black/30 p-4 rounded-xl font-mono text-xl tracking-widest border border-purple-500/30">
                            {session.invite_code}
                        </div>
                    </div>
                )}

                {gameState === 'LOTTERY' && (
                    <div className="text-center space-y-6 animate-in zoom-in duration-500">
                        <Gift className="w-20 h-20 text-yellow-400 mx-auto animate-bounce" />
                        <h2 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                            جاري اختيار من سيبدأ...
                        </h2>
                    </div>
                )}

                {gameState === 'ASKING' && (
                    <div className="w-full space-y-6 animate-in slide-in-from-bottom-4">
                        {isMyTurn ? (
                            <div className="bg-slate-900/80 border border-purple-500/30 p-6 rounded-2xl shadow-xl shadow-purple-900/20">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <HelpCircle className="text-purple-400" />
                                    دورك في طرح السؤال!
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">السؤال</label>
                                        <input
                                            value={questionInput}
                                            onChange={(e) => setQuestionInput(e.target.value)}
                                            className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 focus:border-purple-500 outline-none"
                                            placeholder="اكتب سؤالاً صعباً..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">الإجابة الصحيحة</label>
                                        <input
                                            value={answerInput}
                                            onChange={(e) => setAnswerInput(e.target.value)}
                                            className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 focus:border-green-500 outline-none"
                                            placeholder="الإجابة النموذجية..."
                                        />
                                    </div>
                                    <button
                                        onClick={handleSendQuestion}
                                        disabled={!questionInput || !answerInput || isSendingQuestion}
                                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSendingQuestion ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>جاري الإرسال...</span>
                                            </>
                                        ) : (
                                            'إرسال السؤال 📤'
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/5">
                                <Loader2 className="w-12 h-12 text-gray-500 mx-auto animate-spin mb-4" />
                                <h3 className="text-xl font-bold text-gray-300">الخصم يكتب السؤال...</h3>
                                <p className="text-gray-500">استعد للإجابة!</p>
                            </div>
                        )}
                    </div>
                )}

                {gameState === 'ANSWERING' && (
                    <div className="w-full space-y-6 animate-in fade-in">
                        {!isMyTurn ? (
                            <div className="bg-slate-900/80 border border-pink-500/30 p-6 rounded-2xl shadow-xl shadow-pink-900/20">
                                <div className="mb-6">
                                    <span className="text-xs text-pink-400 font-bold tracking-wider uppercase">سؤال من الخصم</span>
                                    <h3 className="text-2xl font-bold mt-2">{quizState.question}</h3>
                                </div>

                                <div className="space-y-4">
                                    <input
                                        value={responderInput}
                                        onChange={(e) => setResponderInput(e.target.value)}
                                        className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-lg focus:border-pink-500 outline-none"
                                        placeholder="اكتب إجابتك هنا..."
                                    />
                                    <button
                                        onClick={handleSendAnswer}
                                        disabled={!responderInput || isSendingAnswer}
                                        className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSendingAnswer ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>جاري الإرسال...</span>
                                            </>
                                        ) : (
                                            'إرسال الإجابة ✅'
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/5">
                                <Clock className="w-12 h-12 text-pink-500 mx-auto animate-pulse mb-4" />
                                <h3 className="text-xl font-bold text-gray-300">الخصم يفكر في الإجابة...</h3>
                                <p className="text-gray-500">السؤال: {quizState.question}</p>
                            </div>
                        )}
                    </div>
                )}

                {gameState === 'RESULT' && (
                    <div className="text-center space-y-6 animate-in zoom-in duration-300">
                        {quizState.round_result === 'correct' ? (
                            <div className="bg-green-500/10 border border-green-500/50 p-8 rounded-3xl">
                                <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-4" />
                                <h2 className="text-3xl font-black text-green-400">إجابة صحيحة! 🎉</h2>
                                <p className="text-gray-300 mt-2">الإجابة: {quizState.answer}</p>
                            </div>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-3xl">
                                <XCircle className="w-24 h-24 text-red-500 mx-auto mb-4" />
                                <h2 className="text-3xl font-black text-red-400">إجابة خاطئة 😢</h2>
                                <p className="text-gray-300 mt-2">الإجابة الصحيحة كانت: <span className="font-bold text-white">{quizState.answer}</span></p>
                            </div>
                        )}
                        <p className="text-sm text-gray-500 animate-pulse">الجولة التالية ستبدأ قريباً...</p>
                    </div>
                )}

                {gameState === 'GAME_OVER' && (
                    <div className="text-center space-y-6 bg-slate-900 border border-purple-500/50 p-8 rounded-3xl animate-in zoom-in">
                        <Trophy className="w-24 h-24 text-yellow-400 mx-auto animate-bounce" />
                        <h2 className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                            انتهت اللعبة!
                        </h2>

                        <div className="grid grid-cols-2 gap-4 my-8">
                            <div className="bg-black/30 p-4 rounded-xl">
                                <div className="text-sm text-gray-400">أنت</div>
                                <div className="text-3xl font-bold text-white">
                                    {amIHost ? session.host_score : session.guest_score}
                                </div>
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl">
                                <div className="text-sm text-gray-400">الخصم</div>
                                <div className="text-3xl font-bold text-white">
                                    {amIHost ? session.guest_score : session.host_score}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/multiplayer')}
                            className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            العودة للقائمة
                        </button>
                    </div>
                )}

            </main>
        </div>
    );
};

export default QuizGamePage;
