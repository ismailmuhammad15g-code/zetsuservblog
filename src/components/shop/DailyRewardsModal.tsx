import React, { useState, useEffect } from 'react';
import { X, Gift, CheckCircle, Clock, Sparkles, Zap, Target, Trophy, Star, Crown, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import zcoinImage from '../../images/zcoin.png';

interface DailyMission {
    mission_id: string;
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    reward_zcoins: number;
    icon: string;
    mission_type: string;
    is_active: boolean;
}

interface MissionProgress {
    mission_id: string;
    completed_date: string;
    reward_claimed: boolean;
}

interface DailyRewardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRewardClaimed?: (amount: number) => void;
}

const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({ isOpen, onClose, onRewardClaimed }) => {
    const [missions, setMissions] = useState<DailyMission[]>([]);
    const [progress, setProgress] = useState<MissionProgress[]>([]);
    const [canClaimDaily, setCanClaimDaily] = useState(false);
    const [nextRewardTime, setNextRewardTime] = useState<Date | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [timeUntilNext, setTimeUntilNext] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchMissions();
            checkDailyRewardStatus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (nextRewardTime) {
            const interval = setInterval(() => {
                updateCountdown();
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [nextRewardTime]);

    const updateCountdown = () => {
        if (!nextRewardTime) return;
        
        const now = new Date();
        const diff = nextRewardTime.getTime() - now.getTime();
        
        if (diff <= 0) {
            setCanClaimDaily(true);
            setTimeUntilNext('');
            return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeUntilNext(`${hours}ساعة ${minutes}دقيقة ${seconds}ثانية`);
    };

    const fetchMissions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch all missions
            const { data: missionsData } = await supabase
                .from('daily_missions')
                .select('*')
                .eq('is_active', true);

            if (missionsData) {
                setMissions(missionsData);
            }

            // Fetch user's mission progress for today
            const today = new Date().toISOString().split('T')[0];
            const { data: progressData } = await supabase
                .from('user_mission_progress')
                .select('*')
                .eq('user_id', user.id)
                .gte('completed_date', today);

            if (progressData) {
                setProgress(progressData);
            }
        } catch (error) {
            console.error('Error fetching missions:', error);
        }
    };

    const checkDailyRewardStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase.rpc('check_daily_reward_status', {
                p_user_id: user.id
            });

            if (error) throw error;

            if (data && data.length > 0) {
                const status = data[0];
                setCanClaimDaily(status.can_claim);
                if (status.next_available_time) {
                    setNextRewardTime(new Date(status.next_available_time));
                }
            }
        } catch (error) {
            console.error('Error checking daily reward:', error);
        }
    };

    const playRewardSound = () => {
        // Simple success sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio playback not supported');
        }
    };

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB']
        });
        
        // Second burst
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#FFD700', '#FFA500', '#FF6347']
            });
        }, 250);
        
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#00CED1', '#9370DB', '#FFD700']
            });
        }, 400);
    };

    const handleClaimDailyReward = async () => {
        if (!canClaimDaily || claiming) return;
        
        setClaiming(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase.rpc('claim_daily_reward', {
                p_user_id: user.id
            });

            if (error) throw error;

            if (data && data.length > 0 && data[0].success) {
                playRewardSound();
                triggerConfetti();
                
                toast.success(
                    <div className="flex items-center gap-3">
                        <Gift className="w-8 h-8 text-yellow-400" />
                        <div>
                            <p className="font-bold text-lg">تهانينا! 🎉</p>
                            <p>حصلت على {data[0].reward_amount} ZCoins!</p>
                        </div>
                    </div>,
                    {
                        duration: 5000,
                        style: {
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '16px'
                        }
                    }
                );
                
                setCanClaimDaily(false);
                if (onRewardClaimed) {
                    onRewardClaimed(data[0].reward_amount);
                }
                checkDailyRewardStatus();
            }
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            toast.error('فشل في المطالبة بالجائزة');
        } finally {
            setClaiming(false);
        }
    };

    const handleCompleteMission = async (missionId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase.rpc('complete_daily_mission', {
                p_user_id: user.id,
                p_mission_id: missionId
            });

            if (error) throw error;

            if (data && data.length > 0 && data[0].success) {
                playRewardSound();
                triggerConfetti();
                
                toast.success(`مهمة مكتملة! +${data[0].reward_amount} ZCoins 🎉`);
                
                if (onRewardClaimed) {
                    onRewardClaimed(data[0].reward_amount);
                }
                fetchMissions();
            } else {
                toast.info(data[0].message);
            }
        } catch (error) {
            console.error('Error completing mission:', error);
        }
    };

    const isMissionCompleted = (missionId: string) => {
        return progress.some(p => p.mission_id === missionId && p.reward_claimed);
    };

    const getIconComponent = (iconName: string) => {
        const icons: Record<string, any> = {
            'calendar': Clock,
            'gamepad': Zap,
            'target': Target,
            'shopping-bag': Gift,
            'user': Star,
            'trophy': Trophy
        };
        return icons[iconName] || Target;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            {/* Animated particles background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 3}s`,
                            opacity: 0.3 + Math.random() * 0.7
                        }}
                    />
                ))}
            </div>

            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in duration-300">
                {/* Outer glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 rounded-3xl blur-xl opacity-75 animate-pulse" />
                
                <div className="relative bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 rounded-3xl border-2 border-yellow-500/50 overflow-hidden">
                    {/* Animated background effects with hexagonal pattern */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {/* Main gradient orbs */}
                        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-500/30 to-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                        
                        {/* Scanning lines effect */}
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute h-px w-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse" style={{ top: '20%' }} />
                            <div className="absolute h-px w-full bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" style={{ top: '40%', animationDelay: '1s' }} />
                            <div className="absolute h-px w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" style={{ top: '60%', animationDelay: '2s' }} />
                            <div className="absolute h-px w-full bg-gradient-to-r from-transparent via-pink-400 to-transparent animate-pulse" style={{ top: '80%', animationDelay: '1.5s' }} />
                        </div>
                    </div>

                    {/* Header - AAA Style */}
                    <div className="relative overflow-hidden border-b-2 border-yellow-500/30 bg-gradient-to-r from-slate-900/80 via-purple-900/80 to-slate-900/80 backdrop-blur-md">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
                        
                        <div className="relative p-6">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-10 p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 transition-all hover:scale-110 hover:rotate-90 duration-300 group"
                            >
                                <X className="w-5 h-5 text-red-400 group-hover:text-red-300" />
                            </button>
                            
                            <div className="flex items-center gap-4">
                                {/* Animated icon container */}
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl blur-xl animate-pulse" />
                                    <div className="relative p-4 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl shadow-2xl border-2 border-yellow-300/50 transform hover:scale-110 transition-transform">
                                        <Gift className="w-10 h-10 text-white drop-shadow-lg animate-pulse" />
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                                    </div>
                                </div>
                                
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Crown className="w-6 h-6 text-yellow-400 animate-pulse" />
                                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]">
                                            الجوائز اليومية
                                        </h2>
                                        <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                                    </div>
                                    <p className="text-yellow-200/90 text-lg font-bold flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-yellow-400" />
                                        أكمل المهام واحصل على ZCoins مجاناً!
                                        <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content with custom scrollbar */}
                    <div className="relative p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto custom-scrollbar">
                        {/* Daily Login Reward - AAA Style */}
                        <div className="relative group">
                            {/* Outer glow */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600 via-orange-600 to-yellow-600 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition-opacity animate-pulse" />
                            
                            <div className="relative overflow-hidden rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-900/40 via-orange-900/40 to-red-900/40 backdrop-blur-sm">
                                {/* Animated background rays */}
                                <div className="absolute inset-0 overflow-hidden">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                                        {[...Array(8)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="absolute top-1/2 left-1/2 w-2 h-full bg-gradient-to-t from-transparent via-yellow-400/20 to-transparent"
                                                style={{
                                                    transform: `rotate(${i * 45}deg)`,
                                                    transformOrigin: 'top center'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="relative p-6">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Icon with multiple glow layers */}
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-yellow-500 rounded-xl blur-xl animate-pulse" />
                                                <div className="absolute inset-0 bg-orange-500 rounded-xl blur-lg animate-pulse" style={{ animationDelay: '0.5s' }} />
                                                <div className="relative p-5 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-xl shadow-2xl border-2 border-yellow-300/50 transform hover:scale-110 hover:rotate-12 transition-all">
                                                    <Clock className="w-10 h-10 text-white drop-shadow-lg" />
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
                                                    <h3 className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                                        مكافأة الحضور اليومي
                                                    </h3>
                                                    <Star className="w-5 h-5 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                                                </div>
                                                <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-400/30 rounded-lg px-3 py-2 w-fit">
                                                    <img src={zcoinImage} alt="ZCoins" className="w-6 h-6 drop-shadow-md" />
                                                    <span className="text-yellow-300 font-black text-xl">+10 ZCoins</span>
                                                    <Sparkles className="w-4 h-4 text-yellow-400" />
                                                </div>
                                                {!canClaimDaily && timeUntilNext && (
                                                    <div className="mt-2 flex items-center gap-2 text-sm text-yellow-300/80">
                                                        <Clock className="w-4 h-4" />
                                                        الجائزة التالية بعد: <span className="font-bold">{timeUntilNext}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={handleClaimDailyReward}
                                            disabled={!canClaimDaily || claiming}
                                            className={`relative px-8 py-4 rounded-xl font-black text-white text-lg transition-all flex items-center gap-3 shadow-2xl ${
                                                canClaimDaily && !claiming
                                                    ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:scale-110 hover:shadow-[0_0_40px_rgba(251,191,36,0.8)] border-2 border-yellow-300/50'
                                                    : 'bg-gray-700/50 cursor-not-allowed opacity-50 border-2 border-gray-600/50'
                                            }`}
                                        >
                                            {!canClaimDaily && !claiming && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl" />
                                            )}
                                            {canClaimDaily && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 rounded-xl animate-pulse" />
                                            )}
                                            <div className="relative flex items-center gap-3">
                                                {canClaimDaily ? (
                                                    <>
                                                        <Gift className="w-6 h-6 animate-bounce" />
                                                        استلم الآن
                                                        <Sparkles className="w-6 h-6 animate-pulse" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-6 h-6" />
                                                        تم الاستلام
                                                    </>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Daily Missions - AAA Style */}
                        <div>
                            <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-purple-500/30">
                                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
                                    <Target className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                                    المهام اليومية
                                </h3>
                                <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                            </div>
                            
                            <div className="space-y-4">
                                {missions.map((mission, index) => {
                                    const IconComponent = getIconComponent(mission.icon);
                                    const completed = isMissionCompleted(mission.mission_id);
                                    
                                    return (
                                        <div
                                            key={mission.mission_id}
                                            className="relative group"
                                            style={{ animationDelay: `${index * 100}ms` }}
                                        >
                                            {/* Mission card glow */}
                                            {!completed && (
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-xl blur-sm opacity-0 group-hover:opacity-75 transition-opacity" />
                                            )}
                                            
                                            <div
                                                className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                                                    completed
                                                        ? 'bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/50 opacity-75'
                                                        : 'bg-gradient-to-br from-slate-800/60 to-purple-900/40 border-purple-500/30 hover:border-purple-500/60 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]'
                                                }`}
                                            >
                                                {/* Animated shine effect on hover */}
                                                {!completed && (
                                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-[shimmer_2s_infinite]" />
                                                    </div>
                                                )}
                                                
                                                <div className="relative p-5">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4 flex-1">
                                                            {/* Icon with glow */}
                                                            <div className="relative">
                                                                <div className={`absolute inset-0 rounded-xl blur-md ${
                                                                    completed ? 'bg-green-500/50' : 'bg-purple-500/50'
                                                                } animate-pulse`} />
                                                                <div className={`relative p-3 rounded-xl shadow-lg border-2 ${
                                                                    completed 
                                                                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400/50' 
                                                                        : 'bg-gradient-to-br from-purple-500 to-pink-600 border-purple-400/50'
                                                                }`}>
                                                                    <IconComponent className="w-7 h-7 text-white drop-shadow-lg" />
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex-1">
                                                                <h4 className="font-black text-white text-lg mb-1 drop-shadow-md">
                                                                    {mission.title_ar}
                                                                </h4>
                                                                <p className="text-sm text-gray-300/90">
                                                                    {mission.description_ar}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-3">
                                                            {/* Reward badge */}
                                                            <div className="relative">
                                                                <div className="absolute inset-0 bg-blue-500 rounded-lg blur-md opacity-50" />
                                                                <div className="relative flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 rounded-lg border-2 border-blue-400/50 shadow-lg">
                                                                    <img src={zcoinImage} alt="ZCoins" className="w-6 h-6 drop-shadow-md" />
                                                                    <span className="font-black text-white text-lg drop-shadow-md">
                                                                        +{mission.reward_zcoins}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Action button */}
                                                            {completed ? (
                                                                <div className="flex items-center gap-2 bg-green-500/20 border-2 border-green-500/50 px-4 py-2 rounded-lg">
                                                                    <CheckCircle className="w-6 h-6 text-green-400" />
                                                                    <span className="font-bold text-green-400">مكتمل</span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleCompleteMission(mission.mission_id)}
                                                                    className="relative px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-black text-sm transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] border-2 border-purple-400/50"
                                                                >
                                                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg animate-pulse opacity-50" />
                                                                    <span className="relative flex items-center gap-2">
                                                                        <Zap className="w-4 h-4" />
                                                                        أكمل الآن
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyRewardsModal;
