import React, { useState, useEffect } from 'react';
import { X, Gift, CheckCircle, Clock, Sparkles, Zap, Target, Trophy, Star } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 rounded-3xl border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20">
                {/* Animated background effects */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                {/* Header */}
                <div className="relative p-6 border-b border-purple-500/30">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg">
                            <Gift className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white">الجوائز اليومية</h2>
                            <p className="text-purple-200">أكمل المهام واحصل على ZCoins مجاناً!</p>
                        </div>
                    </div>
                </div>

                <div className="relative p-6 space-y-6">
                    {/* Daily Login Reward */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-2 border-yellow-500/50 p-6">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg">
                                    <Clock className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">مكافأة الحضور اليومي</h3>
                                    <p className="text-yellow-200">احصل على 10 ZCoins كل يوم!</p>
                                    {!canClaimDaily && timeUntilNext && (
                                        <p className="text-sm text-yellow-300 mt-1">
                                            الجائزة التالية بعد: {timeUntilNext}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={handleClaimDailyReward}
                                disabled={!canClaimDaily || claiming}
                                className={`px-6 py-3 rounded-xl font-bold text-white transition-all flex items-center gap-2 ${
                                    canClaimDaily && !claiming
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:scale-105 shadow-lg shadow-orange-500/50'
                                        : 'bg-gray-600/50 cursor-not-allowed'
                                }`}
                            >
                                {canClaimDaily ? (
                                    <>
                                        <Gift className="w-5 h-5" />
                                        استلم الآن
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-5 h-5" />
                                        تم الاستلام
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Daily Missions */}
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-purple-400" />
                            المهام اليومية
                        </h3>
                        <div className="space-y-3">
                            {missions.map((mission) => {
                                const IconComponent = getIconComponent(mission.icon);
                                const completed = isMissionCompleted(mission.mission_id);
                                
                                return (
                                    <div
                                        key={mission.mission_id}
                                        className={`relative overflow-hidden rounded-xl p-4 border-2 transition-all ${
                                            completed
                                                ? 'bg-green-900/20 border-green-500/50'
                                                : 'bg-slate-800/50 border-purple-500/30 hover:border-purple-500/50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className={`p-2 rounded-lg ${
                                                    completed ? 'bg-green-500/20' : 'bg-purple-500/20'
                                                }`}>
                                                    <IconComponent className={`w-6 h-6 ${
                                                        completed ? 'text-green-400' : 'text-purple-400'
                                                    }`} />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-white">{mission.title_ar}</h4>
                                                    <p className="text-sm text-gray-300">{mission.description_ar}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 bg-blue-500/20 px-3 py-1 rounded-lg">
                                                    <img src={zcoinImage} alt="ZCoins" className="w-5 h-5" />
                                                    <span className="font-bold text-blue-300">+{mission.reward_zcoins}</span>
                                                </div>
                                                {completed ? (
                                                    <CheckCircle className="w-6 h-6 text-green-400" />
                                                ) : (
                                                    <button
                                                        onClick={() => handleCompleteMission(mission.mission_id)}
                                                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold text-sm transition-colors"
                                                    >
                                                        أكمل
                                                    </button>
                                                )}
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
    );
};

export default DailyRewardsModal;
