import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GameProvider, useGame } from '@/contexts/GameContext';
import BottomNavigation from '@/components/zersu-game/BottomNavigation';
import { Navbar } from '@/components/Navbar';
import { Timer, Target, ChevronRight, Loader2, Clock, Zap, Sparkles, Swords, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduledChallenge {
    id: string;
    challenge_id: string;
    status: string;
    scheduled_at: string | null;
    deadline_at: string | null;
    created_at: string;
}

// Fallback challenge info
const challengeInfo: Record<string, { title: string; titleAr: string; reward: number }> = {
    'first-blood': { title: 'FIRST BLOOD', titleAr: 'الدم الأول', reward: 5 },
    'social-butterfly': { title: 'SOCIAL BUTTERFLY', titleAr: 'الفراشة الاجتماعية', reward: 8 },
    'comment-master': { title: 'COMMENT MASTER', titleAr: 'سيد التعليقات', reward: 12 },
};

// Main content component that uses GameContext
const ActiveTasksContent: React.FC = () => {
    const { userProfile, isLoading: gameLoading } = useGame();
    const [scheduledChallenges, setScheduledChallenges] = useState<ScheduledChallenge[]>([]);
    const [historyChallenges, setHistoryChallenges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(Date.now());
    const navigate = useNavigate();

    // Update current time every second for countdown
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch scheduled and history challenges
    useEffect(() => {
        const fetchData = async () => {
            if (!userProfile?.user_id) {
                setLoading(false);
                return;
            }

            try {
                // Fetch active/scheduled
                const { data: activeData, error: activeError } = await supabase
                    .from('player_challenges')
                    .select('*')
                    .eq('user_id', userProfile.user_id)
                    .in('status', ['scheduled', 'active'])
                    .not('scheduled_at', 'is', null)
                    .order('created_at', { ascending: false });

                if (!activeError && activeData) {
                    setScheduledChallenges(activeData as ScheduledChallenge[]);
                }

                // Fetch history (completed/failed) - last 10
                const { data: historyData, error: historyError } = await supabase
                    .from('player_challenges')
                    .select('*')
                    .eq('user_id', userProfile.user_id)
                    .in('status', ['completed', 'failed'])
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (!historyError && historyData) {
                    setHistoryChallenges(historyData);
                }
            } catch (e) {
                console.error('Error fetching tasks:', e);
            }
            setLoading(false);
        };

        fetchData();

        // Refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [userProfile?.user_id]);

    const getTimeRemaining = (scheduledAt: string | null) => {
        if (!scheduledAt) return { ready: true, hours: 0, minutes: 0, seconds: 0, total: 0 };

        const target = new Date(scheduledAt).getTime();
        const diff = target - now;

        if (diff <= 0) return { ready: true, hours: 0, minutes: 0, seconds: 0, total: 0 };

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return { ready: false, hours, minutes, seconds, total: diff };
    };

    const handleStartChallenge = (challengeId: string) => {
        navigate('/zetsuchallenge');
        toast.info(`افتح التحدي "${challengeId}" لرفع الدليل`);
    };

    if (gameLoading || loading) {
        return (
            <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-4" />
                    <p className="text-purple-400">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0e17] via-[#0d1525] to-[#0a0e17] pb-24">
            <Navbar />


            {/* Header */}
            <div className="pt-20 px-4 pb-6">
                <div className="max-w-lg mx-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <Timer className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white">المهام النشطة</h1>
                            <p className="text-gray-400 text-sm">تحدياتك المجدولة والجارية</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tasks List */}
            <div className="px-4">
                <div className="max-w-lg mx-auto space-y-4">
                    {scheduledChallenges.length === 0 ? (
                        /* Empty State - Special Design */
                        <div className="relative py-12">
                            {/* Background glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent rounded-3xl"></div>

                            <div className="relative text-center">
                                {/* Zersu Character */}
                                <div className="relative inline-block mb-6">
                                    <div className="absolute inset-0 bg-purple-500/30 blur-[40px] rounded-full"></div>
                                    <img
                                        src="https://i.ibb.co/5gMzf6XK/zersu-challengeface.png"
                                        alt="Zersu"
                                        className="relative w-32 h-32 object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                                    />
                                </div>

                                {/* Zersu's message */}
                                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border border-purple-500/30 p-6 mb-6 backdrop-blur-sm">
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        <Sparkles className="w-5 h-5 text-purple-400" />
                                        <span className="text-purple-400 font-bold">Zersu يقول:</span>
                                    </div>
                                    <p className="text-white text-lg mb-2 font-medium">
                                        "لا توجد أي مهمة بعد! 😈"
                                    </p>
                                    <p className="text-gray-400 text-sm">
                                        أراهن أنك لن تستطيع إكمال أي تحدي... أثبت أنني مخطئ!
                                    </p>
                                </div>

                                {/* Stats hint */}
                                <div className="flex justify-center gap-4 mb-6">
                                    <div className="bg-slate-800/50 rounded-xl px-4 py-2 border border-slate-700">
                                        <span className="text-gray-500 text-xs">المهام النشطة</span>
                                        <p className="text-white font-bold text-xl">0</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl px-4 py-2 border border-slate-700">
                                        <span className="text-gray-500 text-xs">المكتملة</span>
                                        <p className="text-green-400 font-bold text-xl">-</p>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                <button
                                    onClick={() => navigate('/zetsuchallenge')}
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform"
                                >
                                    <Swords className="w-5 h-5" />
                                    ابدأ الآن وأثبت أن Zersu مخطئ!
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Tasks List */
                        scheduledChallenges.map((task) => {
                            const info = challengeInfo[task.challenge_id] || {
                                title: task.challenge_id.toUpperCase().replace(/-/g, ' '),
                                titleAr: task.challenge_id,
                                reward: 5
                            };
                            const timeRemaining = getTimeRemaining(task.scheduled_at);

                            return (
                                <div
                                    key={task.id}
                                    className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-purple-500/30 overflow-hidden shadow-lg"
                                >
                                    {/* Status indicator */}
                                    <div className={`absolute top-0 left-0 right-0 h-1 ${timeRemaining.ready ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                        }`}></div>

                                    <div className="p-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                                    <Target className="w-5 h-5 text-purple-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white">{info.title}</h3>
                                                    <p className="text-purple-300 text-sm">{info.titleAr}</p>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                                                <span className="text-green-400 text-sm font-bold">+{info.reward} 💎</span>
                                            </div>
                                        </div>

                                        {/* Countdown Timer - AAA Style */}
                                        {!timeRemaining.ready && task.status === 'scheduled' ? (
                                            <div className="bg-black/40 rounded-xl p-4 mb-4">
                                                <div className="flex items-center justify-center gap-1 mb-3">
                                                    <Clock className="w-4 h-4 text-purple-400" />
                                                    <span className="text-purple-300 text-sm">يبدأ خلال</span>
                                                </div>

                                                {/* Timer Display */}
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Hours */}
                                                    <div className="text-center">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                                                            <span className="text-xl font-black text-white">
                                                                {String(timeRemaining.hours).padStart(2, '0')}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 mt-1 block">ساعة</span>
                                                    </div>

                                                    <span className="text-xl font-black text-purple-400 animate-pulse mb-4">:</span>

                                                    {/* Minutes */}
                                                    <div className="text-center">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                                                            <span className="text-xl font-black text-white">
                                                                {String(timeRemaining.minutes).padStart(2, '0')}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 mt-1 block">دقيقة</span>
                                                    </div>

                                                    <span className="text-xl font-black text-purple-400 animate-pulse mb-4">:</span>

                                                    {/* Seconds */}
                                                    <div className="text-center">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30">
                                                            <span className="text-xl font-black text-white">
                                                                {String(timeRemaining.seconds).padStart(2, '0')}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 mt-1 block">ثانية</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Ready to start */
                                            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-4 text-center">
                                                <div className="flex items-center justify-center gap-2 mb-1">
                                                    <Zap className="w-5 h-5 text-green-400" />
                                                    <span className="text-green-400 font-bold">
                                                        {task.status === 'active' ? 'جاري التنفيذ' : 'حان الوقت!'}
                                                    </span>
                                                </div>
                                                <p className="text-gray-400 text-sm">ارفع الدليل لإكمال التحدي</p>
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        <button
                                            onClick={() => handleStartChallenge(task.challenge_id)}
                                            disabled={!timeRemaining.ready && task.status === 'scheduled'}
                                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${timeRemaining.ready || task.status === 'active'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:scale-[1.02] shadow-lg shadow-green-500/20'
                                                : 'bg-slate-700 text-gray-500 cursor-not-allowed'
                                                }`}
                                        >
                                            {timeRemaining.ready || task.status === 'active' ? (
                                                <>
                                                    رفع الدليل
                                                    <ChevronRight className="w-5 h-5" />
                                                </>
                                            ) : (
                                                <>
                                                    <Clock className="w-5 h-5" />
                                                    انتظر حتى يحين الوقت
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>


            {/* History Section */}
            {historyChallenges.length > 0 && (
                <div className="px-4 mt-8 pb-8">
                    <div className="max-w-lg mx-auto">
                        <h2 className="text-xl font-bold text-gray-400 mb-4 px-2">آخر النشاطات 📜</h2>
                        <div className="space-y-3">
                            {historyChallenges.map((task) => {
                                const info = challengeInfo[task.challenge_id] || {
                                    title: task.challenge_id,
                                    titleAr: task.challenge_id,
                                    reward: 5
                                };
                                const isCompleted = task.status === 'completed';
                                const date = new Date(task.updated_at || task.created_at).toLocaleDateString('ar-EG', {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                });

                                return (
                                    <div key={task.id} className={`bg-slate-900/50 border ${isCompleted ? 'border-green-500/20' : 'border-red-500/20'} rounded-xl p-4`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-white text-sm">{info.titleAr}</h3>
                                                <span className="text-xs text-gray-500">{date}</span>
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {isCompleted ? 'مكتمل' : 'فشل'}
                                            </div>
                                        </div>

                                        {/* Status Message */}
                                        <div className="flex items-center gap-2 mb-2">
                                            {isCompleted ? (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                            <span className={`text-sm font-bold ${isCompleted ? 'text-green-400' : 'text-red-400'}`}>
                                                {isCompleted ? `+${info.reward} 💎` : 'خصم عقوبة'}
                                            </span>
                                        </div>

                                        {/* AI Feedback */}
                                        {task.ai_feedback && (
                                            <div className="mt-3 bg-slate-800/80 rounded-lg p-3 border border-purple-500/10">
                                                <p className="text-gray-300 text-sm italic border-r-2 border-purple-500 pr-2">
                                                    "{task.ai_feedback}"
                                                </p>
                                                <p className="text-[10px] text-gray-500 mt-1 text-left">- Zersu AI</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <BottomNavigation activeTab="tasks" />
        </div>
    );
};

// Wrapper component with GameProvider
const ActiveTasksPage: React.FC = () => {
    return (
        <GameProvider>
            <ActiveTasksContent />
        </GameProvider>
    );
};

export default ActiveTasksPage;
