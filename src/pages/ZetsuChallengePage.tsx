import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GameProvider, GameContext, useGame } from '../contexts/GameContext';
import GameLoginFlow from '../components/zersu-game/GameLoginFlow';
import ChallengeSystem from '../components/zersu-game/ChallengeSystem';
import BottomNavigation from '../components/zersu-game/BottomNavigation';
import ZersuCharacter from '../components/zersu-game/ZersuCharacter';
import { Navbar } from "@/components/Navbar";
import { supabase } from '@/integrations/supabase/client';
import { useZersuAI } from '../hooks/useZersuAI';
import { useAIChallengeGenerator } from '../hooks/useAIChallengeGenerator';
import { useNotifications } from '../hooks/useNotifications';
import { toast } from 'sonner';
import { Swords, Trophy, Star, Zap, Users, ChevronRight, Sparkles, Target, Upload, Clock, X, CheckCircle, XCircle, Loader2, Camera, Tv, Bell, Plus, Edit3, Calendar, ArrowRight } from 'lucide-react';
import AdRewardModal from '../components/zersu-game/AdRewardModal';
import { EnhancedChallenge } from '../hooks/useZersuAI';
import WeatherDisplay from '../components/weather/WeatherDisplay';
import { Settings as SettingsIcon } from 'lucide-react';
import { useSound } from '../contexts/SoundContext';
import { TouchRipple } from '../components/TouchRipple';

interface Challenge {
    id: string;
    title: string;
    titleAr: string;
    description: string;
    cost: number;
    reward: number;
    failurePenalty: number;
    timeLimit: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

// Default fallback challenges - will be replaced by AI-generated ones
const defaultChallenges: Challenge[] = [
    { id: 'first-blood', title: 'FIRST BLOOD', titleAr: 'الدم الأول', description: 'انشر أول منشور لك وارفع صورة للتحقق!', cost: 1, reward: 5, failurePenalty: 2, timeLimit: '24h', difficulty: 'easy' },
    { id: 'social-butterfly', title: 'SOCIAL BUTTERFLY', titleAr: 'الفراشة الاجتماعية', description: 'شارك منشورك على 3 منصات تواصل!', cost: 2, reward: 8, failurePenalty: 3, timeLimit: '48h', difficulty: 'medium' },
    { id: 'comment-master', title: 'COMMENT MASTER', titleAr: 'سيد التعليقات', description: 'احصل على 10 تعليقات على منشورك!', cost: 3, reward: 12, failurePenalty: 4, timeLimit: '72h', difficulty: 'hard' },
];

// Challenge Modal Component
// Entertaining loading screen with rotating messages
const VerifyingScreen = () => {
    const [messageIndex, setMessageIndex] = useState(0);
    const { zersuPersonality } = useSound();

    // Personality-based messages
    const sarcasticMessages = [
        { text: "Zersu يفحص الدليل... 🔍", emoji: "🤔" },
        { text: "هممم... أبحث عن أي غش... 👁️", emoji: "😒" },
        { text: "هل حقاً فعلتها؟ دعني أتحقق... 🧐", emoji: "🤨" },
        { text: "لا تحاول خداعي! 👀", emoji: "😤" },
        { text: "جاري تحليل الصورة بدقة... 🔬", emoji: "🧪" },
        { text: "أراهن أنك فشلت! 😈", emoji: "😂" },
        { text: "لحظة واحدة... 💭", emoji: "🤔" },
        { text: "سأكتشف كل شيء! ⚡", emoji: "🔥" },
    ];

    const politeMessages = [
        { text: "Zersu يراجع إنجازك... 🌟", emoji: "✨" },
        { text: "جاري التحقق من نجاحك! 🏆", emoji: "👀" },
        { text: "لحظة واحدة، أتأكد من التفاصيل... 📋", emoji: "🤔" },
        { text: "أحسنت المحاولة! دعنا نرى النتيجة... 🎉", emoji: "👏" },
        { text: "تحليل الصورة لإثبات تفوقك... 📸", emoji: "😊" },
        { text: "أتمنى لك التوفيق! 🍀", emoji: "🤞" },
    ];

    const messages = zersuPersonality === 'polite' ? politeMessages : sarcasticMessages;

    useEffect(() => {
        const timer = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 1500);
        return () => clearInterval(timer);
    }, [messages.length]);

    return (
        <div className="text-center py-8 space-y-6">
            <div className="relative">
                <img
                    src="https://i.ibb.co/rGMR1Q98/zersu-villhaha.png"
                    alt="Zersu"
                    className="w-28 h-28 mx-auto rounded-full animate-pulse"
                    style={{ filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.6))' }}
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-4xl animate-bounce">
                    {messages[messageIndex].emoji}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                    <span className="text-purple-300 font-bold text-lg animate-pulse">
                        جاري التحقق...
                    </span>
                    <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                </div>

                <p className="text-gray-300 text-base bg-slate-800/50 rounded-xl px-4 py-3 border border-purple-500/30 transition-all duration-300">
                    "{messages[messageIndex].text}"
                </p>

                {/* Progress bar animation */}
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full animate-pulse"
                        style={{
                            width: '100%',
                            animation: 'shimmer 1.5s infinite',
                            backgroundSize: '200% 100%'
                        }}
                    />
                </div>

                <p className="text-gray-500 text-xs">⚡ Zersu AI يعمل بذكاء خارق</p>
            </div>
        </div>
    );
};

const ChallengeModal = ({
    challenge,
    onClose,
    userZcoins,
    onSuccess,
    onFail
}: {
    challenge: Challenge;
    onClose: () => void;
    userZcoins: number;
    onSuccess: (reward: number) => void;
    onFail: (penalty: number) => void;
}) => {
    const [step, setStep] = useState<'confirm' | 'schedule' | 'upload' | 'verifying' | 'result'>('confirm');
    const [proofImage, setProofImage] = useState<string | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [result, setResult] = useState<'success' | 'fail' | null>(null);
    const [scheduledDelay, setScheduledDelay] = useState<number>(0); // 0 = now, else hours
    const [aiResponse, setAiResponse] = useState<string>('');
    const { verifyChallenge } = useZersuAI();
    const { generateSingleChallenge } = useAIChallengeGenerator();
    const { userProfile, refreshGameData } = useGame();
    const navigate = useNavigate();
    const { permission, requestPermission, scheduleNotification } = useNotifications();
    const { zersuPersonality } = useSound();


    const canAfford = userZcoins >= challenge.cost;

    // Lock body scroll when modal is open
    useEffect(() => {
        // Save original body overflow
        const originalOverflow = document.body.style.overflow;
        // Lock scroll
        document.body.style.overflow = 'hidden';

        // Cleanup: restore scroll when modal closes
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProofFile(file);
            setProofImage(URL.createObjectURL(file));
        }
    };

    const handleStartChallenge = async () => {
        // Virtual Box: Don't deduct yet, just move to schedule/upload step
        setStep('schedule');
    };

    const handleScheduleConfirm = async () => {
        if (!userProfile) return;

        // NOW we deduct for scheduled tasks as a booking fee
        const { error } = await supabase.from('game_profiles')
            .update({ zcoins: userZcoins - challenge.cost })
            .eq('user_id', userProfile.user_id);

        if (error) {
            toast.error('فشل في جدول التحدي - رصيد غير كافي؟');
            return;
        }

        const now = new Date();
        const scheduledAt = scheduledDelay === 0 ? now : new Date(now.getTime() + scheduledDelay * 60 * 60 * 1000);
        const deadlineAt = new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000);

        // Create challenge record
        await supabase.from('player_challenges').insert({
            user_id: userProfile.user_id,
            challenge_id: challenge.id,
            status: scheduledDelay === 0 ? 'active' : 'scheduled',
            scheduled_at: scheduledAt.toISOString(),
            deadline_at: deadlineAt.toISOString()
        });

        if (scheduledDelay === 0) {
            // Start now - go to upload (Coins deducted as entry fee)
            setStep('upload');
        } else {
            // Request notification permission logic...
            if (permission !== 'granted') {
                const result = await requestPermission();
                if (result === 'granted') scheduleNotification(challenge.id, challenge.title, scheduledAt);
            } else {
                scheduleNotification(challenge.id, challenge.title, scheduledAt);
            }

            toast.success(`تم خصم ${challenge.cost} 💎 وجدولة التحدي`);
            onClose();
            navigate('/zetsuchallenge/active-tasks');
        }
    };

    const handleSubmitProof = async () => {
        if (!proofImage || !userProfile) return;
        setStep('verifying');

        // DIRECT UPLOAD TO AI (No Storage)
        // We skip Supabase Storage upload entirely
        const uploadedUrl = null; // No storage URL anymore

        // Verify with AI
        try {
            const verificationResult = await verifyChallenge({
                challengeTitle: challenge.title,
                challengeDescription: challenge.description,
                proofImage: proofImage,
                userId: userProfile.user_id,
                personality: zersuPersonality
            });

            // Store AI response for display
            setAiResponse(verificationResult.feedbackAr);

            // Check for error state - REFUND and don't complete the challenge
            if (verificationResult.error) {
                // REFUND: Return the deducted ZCoins
                const { data: profile } = await supabase.from('game_profiles').select('zcoins').eq('user_id', userProfile.user_id).single();
                if (profile) {
                    await supabase.from('game_profiles')
                        .update({ zcoins: profile.zcoins + challenge.cost })
                        .eq('user_id', userProfile.user_id);
                }

                // Delete the challenge record
                await supabase.from('player_challenges')
                    .delete()
                    .eq('user_id', userProfile.user_id)
                    .eq('challenge_id', challenge.id);

                toast.error('حدث خطأ في التحقق - تم استرداد عملاتك 💎');
                // await refreshGameData(); // Do not refresh here to avoid re-rendering issues
                setStep('upload'); // Go back to upload step
                return;
            }

            if (verificationResult.success) {
                // Award ZCoins: Cost already paid. Net = Current + Reward.
                const { data: profile } = await supabase.from('game_profiles').select('zcoins').eq('user_id', userProfile.user_id).single();
                const currentCoins = profile?.zcoins || 0;

                await supabase.from('game_profiles')
                    .update({ zcoins: currentCoins + challenge.reward })
                    .eq('user_id', userProfile.user_id);

                await supabase.from('player_challenges')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        proof_url: uploadedUrl,
                        ai_feedback: verificationResult.feedbackAr // Save AI feedback
                    })
                    .eq('user_id', userProfile.user_id)
                    .eq('challenge_id', challenge.id);

                // Generate a new challenge to replace the completed one
                // This happens in the background - user sees success first
                generateSingleChallenge(
                    userProfile.user_id,
                    challenge.id,
                    challenge.difficulty
                ).catch(err => console.error('Failed to generate replacement challenge:', err));

                setResult('success');
                // onSuccess(challenge.reward); DEFERRED to close
            } else {
                // Deduct penalty (cost already deducted)
                const { data: profile } = await supabase.from('game_profiles').select('zcoins').eq('user_id', userProfile.user_id).single();
                const currentCoins = profile?.zcoins || 0;

                const newZcoins = Math.max(0, currentCoins - challenge.failurePenalty);

                await supabase.from('game_profiles')
                    .update({ zcoins: newZcoins })
                    .eq('user_id', userProfile.user_id);

                await supabase.from('player_challenges')
                    .update({
                        status: 'failed',
                        failed_at: new Date().toISOString(),
                        proof_url: uploadedUrl,
                        ai_feedback: verificationResult.feedbackAr // Save AI feedback
                    })
                    .eq('user_id', userProfile.user_id)
                    .eq('challenge_id', challenge.id);

                setResult('fail');
                // onFail(challenge.failurePenalty); DEFERRED to close
            }

            // Do not refresh game data here - it causes the modal to reset/close
            // await refreshGameData(); 
            setStep('result');
        } catch (error) {
            console.error('Verification error:', error);

            // REFUND: Return the deducted ZCoins on any error
            try {
                const { data: profile } = await supabase.from('game_profiles').select('zcoins').eq('user_id', userProfile.user_id).single();
                if (profile) {
                    await supabase.from('game_profiles')
                        .update({ zcoins: profile.zcoins + challenge.cost })
                        .eq('user_id', userProfile.user_id);
                }

                await supabase.from('player_challenges')
                    .delete()
                    .eq('user_id', userProfile.user_id)
                    .eq('challenge_id', challenge.id);
            } catch (refundError) {
                console.error('Refund error:', refundError);
            }

            toast.error('حدث خطأ - تم استرداد عملاتك 💎 تواصل مع مدير الموقع');
            setStep('upload'); // Go back to upload
        }
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'easy': return 'bg-green-500';
            case 'medium': return 'bg-yellow-500';
            case 'hard': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <>
            {/* Scrollbar styles for this modal */}
            <style>{`
                .modal-scroll::-webkit-scrollbar {
                    width: 12px;
                }
                .modal-scroll::-webkit-scrollbar-track {
                    background: linear-gradient(180deg, #1a0533 0%, #0d1b2a 100%);
                    border-radius: 6px;
                    border: 1px solid rgba(168, 85, 247, 0.3);
                }
                .modal-scroll::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, #a855f7 0%, #ec4899 50%, #a855f7 100%);
                    border-radius: 6px;
                    border: 2px solid #1a0533;
                    box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
                }
                .modal-scroll::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, #c084fc 0%, #f472b6 100%);
                    box-shadow: 0 0 15px rgba(168, 85, 247, 0.8);
                }
            `}</style>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                <div className="w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 my-4 max-h-[85vh] flex flex-col">
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex-shrink-0">
                        <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 ${getDifficultyColor(challenge.difficulty)} text-white text-xs font-bold rounded-full`}>
                                {challenge.difficulty === 'easy' ? 'سهل' : challenge.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{challenge.title}</h2>
                                <p className="text-purple-200 text-sm">{challenge.titleAr}</p>
                            </div>
                        </div>
                    </div>

                    {/* Content - Scrollable with always-visible scrollbar */}
                    <div className="p-6 overflow-y-scroll flex-1 min-h-0" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#a855f7 rgba(30, 20, 50, 0.8)'
                    }}>
                        {step === 'confirm' && (
                            <div className="space-y-6">
                                {/* Character */}
                                <div className="flex justify-center">
                                    <ZersuCharacter mood="challenge" size="medium" />
                                </div>

                                <p className="text-gray-300 text-center">{challenge.description}</p>

                                {/* Cost/Reward */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-center">
                                        <div className="text-red-400 font-bold">-{challenge.cost} 💎</div>
                                        <div className="text-xs text-gray-500">التكلفة</div>
                                    </div>
                                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-center">
                                        <div className="text-green-400 font-bold">+{challenge.reward} 💎</div>
                                        <div className="text-xs text-gray-500">المكافأة</div>
                                    </div>
                                    <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-3 text-center">
                                        <div className="text-orange-400 font-bold">-{challenge.failurePenalty} 💎</div>
                                        <div className="text-xs text-gray-500">عند الفشل</div>
                                    </div>
                                </div>

                                {!canAfford && (
                                    <div className="text-center text-red-400 bg-red-500/10 rounded-lg p-3">
                                        ⚠️ لا تملك عملات كافية! تحتاج {challenge.cost} 💎
                                    </div>
                                )}

                                <button
                                    onClick={handleStartChallenge}
                                    disabled={!canAfford}
                                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ابدأ التحدي! ⚔️
                                </button>
                            </div>
                        )}

                        {step === 'schedule' && (
                            <div className="space-y-6">
                                {/* Zersu asking when */}
                                <div className="flex justify-center">
                                    <img
                                        src="https://i.ibb.co/rGMR1Q98/zersu-villhaha.png"
                                        alt="Zersu"
                                        className="w-32 h-32 object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                                    />
                                </div>

                                <div className="text-center">
                                    <p className="text-white font-bold text-lg mb-1">متى ستقوم بالمهمة؟ 🕐</p>
                                    <p className="text-gray-400 text-sm">Zersu ينتظرك... لا تخذله!</p>
                                </div>

                                {/* Current time display */}
                                <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700">
                                    <p className="text-xs text-gray-500 mb-1">الوقت الحالي</p>
                                    <p className="text-xl font-bold text-purple-400">
                                        {new Date().toLocaleString('ar-SA', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            day: 'numeric',
                                            month: 'short'
                                        })}
                                    </p>
                                </div>

                                {/* Time selection buttons */}
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: 'الآن', value: 0 },
                                        { label: 'ساعة', value: 1 },
                                        { label: '٢ س', value: 2 },
                                        { label: '٣ س', value: 3 },
                                        { label: '٦ س', value: 6 },
                                        { label: '١٢ س', value: 12 },
                                        { label: '١٨ س', value: 18 },
                                        { label: '٢٤ س', value: 24 },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setScheduledDelay(option.value)}
                                            className={`p-3 rounded-xl text-sm font-bold transition-all ${scheduledDelay === option.value
                                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white scale-105 shadow-lg shadow-purple-500/30'
                                                : 'bg-slate-800 text-gray-400 hover:bg-slate-700 border border-slate-700'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Selected time info */}
                                {scheduledDelay > 0 && (
                                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                                        <p className="text-purple-300 text-sm mb-1">ستبدأ في</p>
                                        <p className="text-white font-bold text-lg">
                                            {new Date(Date.now() + scheduledDelay * 60 * 60 * 1000).toLocaleString('ar-SA', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            ⏰ سيظهر عداد تنازلي في صفحة المهام
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={handleScheduleConfirm}
                                    className={`w-full py-4 font-bold text-lg rounded-xl hover:scale-[1.02] transition-all ${scheduledDelay === 0
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                        }`}
                                >
                                    {scheduledDelay === 0 ? 'ابدأ الآن! 🚀' : `جدولة بعد ${scheduledDelay} ساعة ⏰`}
                                </button>
                            </div>
                        )}

                        {step === 'upload' && (
                            <div className="space-y-6">
                                <div className="flex justify-center">
                                    <ZersuCharacter mood="challenge" size="small" />
                                </div>

                                <div className="text-center">
                                    <p className="text-white font-bold mb-2">ارفع صورة الدليل 📸</p>
                                    <p className="text-gray-400 text-sm">{challenge.description}</p>
                                </div>

                                {/* Upload Area */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${proofImage ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-purple-500'
                                        }`}>
                                        {!proofImage ? (
                                            <div>
                                                <Camera className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                                                <p className="text-gray-400">اضغط لالتقاط صورة أو اختر من المعرض</p>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <img src={proofImage} alt="proof" className="max-h-48 mx-auto rounded-lg" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setProofImage(null); setProofFile(null); }}
                                                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center z-20"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmitProof}
                                    disabled={!proofImage}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    إرسال للتحقق ⚡
                                </button>
                            </div>
                        )}

                        {step === 'verifying' && (
                            <VerifyingScreen />
                        )}

                        {step === 'result' && (
                            <div className="text-center py-8 space-y-6 animate-in zoom-in">
                                <div className="flex justify-center">
                                    <ZersuCharacter mood={result === 'success' ? 'sad' : 'laughing'} size="medium" />
                                </div>

                                {result === 'success' ? (
                                    <>
                                        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
                                            <CheckCircle className="w-10 h-10 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-black text-green-400">نجاح! 🎉</h3>
                                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/20 rounded-full border border-green-500/50">
                                            <span className="text-2xl">💎</span>
                                            <span className="text-xl font-bold text-green-400">+{challenge.reward}</span>
                                        </div>
                                        {/* Zersu's AI-generated reaction */}
                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-green-500/30">
                                            <p className="text-gray-300 italic text-right">"{aiResponse || 'لا بأس... هذه المرة فقط! 😤'}"</p>
                                            <p className="text-gray-500 text-sm text-right mt-1">- Zersu (حزين)</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
                                            <XCircle className="w-10 h-10 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-black text-red-400">فشل! 💀</h3>
                                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-red-500/20 rounded-full border border-red-500/50">
                                            <span className="text-2xl">💎</span>
                                            <span className="text-xl font-bold text-red-400">-{challenge.failurePenalty}</span>
                                        </div>
                                        {/* Zersu's AI-generated reaction */}
                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-red-500/30">
                                            <p className="text-gray-300 italic text-right">"{aiResponse || 'هاهاها! ضعيف جداً! 😈'}"</p>
                                            <p className="text-gray-500 text-sm text-right mt-1">- Zersu (يضحك بسخرية)</p>
                                        </div>
                                    </>
                                )}

                                <button
                                    onClick={() => {
                                        if (result === 'success') {
                                            if (onSuccess) onSuccess(challenge.reward);
                                        } else {
                                            if (onFail) onFail(challenge.failurePenalty);
                                        }
                                        onClose();
                                    }}
                                    className="w-full py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors"
                                >
                                    إغلاق
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

// ============================================
// Create Challenge Wizard Modal
// ============================================
const CreateChallengeModal = ({
    onClose,
    onSuccess,
    userZcoins,
    userId
}: {
    onClose: () => void;
    onSuccess: () => void;
    userZcoins: number;
    userId: string;
}) => {
    const [step, setStep] = useState<'mockery' | 'input' | 'enhancing' | 'review' | 'schedule'>('mockery');
    const [userTitle, setUserTitle] = useState('');
    const [userDescription, setUserDescription] = useState('');
    const [enhancedChallenge, setEnhancedChallenge] = useState<EnhancedChallenge | null>(null);
    const [scheduledDelay, setScheduledDelay] = useState<number>(0);
    const { enhanceChallenge, isEnhancing } = useZersuAI();
    const { permission, requestPermission, scheduleNotification } = useNotifications();

    // Move to input after mockery animation
    useEffect(() => {
        if (step === 'mockery') {
            const timer = setTimeout(() => {
                setStep('input');
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const handleEnhance = async () => {
        if (!userTitle.trim() || !userDescription.trim()) return;
        setStep('enhancing');

        try {
            const result = await enhanceChallenge(userTitle, userDescription);
            setEnhancedChallenge(result);
            setStep('review');
        } catch (error) {
            console.error(error);
            toast.error("فشل Zersu في تحليل تحديك... حاول مرة أخرى");
            setStep('input');
        }
    };

    const handleConfirmChallenge = async () => {
        if (!enhancedChallenge) return;
        setStep('schedule');
    };

    const handleSaveToList = async () => {
        if (!enhancedChallenge) return;

        // Save to user_challenges ONLY (No deduction, No scheduling)
        const { error: createError } = await supabase
            .from('user_challenges')
            .insert({
                user_id: userId,
                title: enhancedChallenge.title,
                title_ar: enhancedChallenge.titleAr,
                description: enhancedChallenge.description,
                description_ar: enhancedChallenge.descriptionAr,
                cost: enhancedChallenge.cost,
                reward: enhancedChallenge.reward,
                failure_penalty: Math.floor(enhancedChallenge.reward / 2),
                difficulty: enhancedChallenge.difficulty,
                time_limit: '24h',
                is_active: true
            });

        if (createError) {
            console.error('Save error:', createError);
            toast.error('حدث خطأ في حفظ التحدي');
            return;
        }

        toast.success('تمت إضافة التحدي إلى قائمتك! 📝');
        onSuccess();
        onClose();
    };

    const handleFinalize = async () => {
        if (!enhancedChallenge) return;

        // Deduct cost
        const { error: deductError } = await supabase.from('game_profiles')
            .update({ zcoins: userZcoins - enhancedChallenge.cost })
            .eq('user_id', userId);

        if (deductError) {
            toast.error('فشل في إنشاء التحدي - رصيد غير كافي؟');
            return;
        }

        // Save to user_challenges
        const { data: challengeData, error: createError } = await supabase
            .from('user_challenges')
            .insert({
                user_id: userId,
                title: enhancedChallenge.title,
                title_ar: enhancedChallenge.titleAr,
                description: enhancedChallenge.description,
                description_ar: enhancedChallenge.descriptionAr,
                cost: enhancedChallenge.cost,
                reward: enhancedChallenge.reward,
                failure_penalty: Math.floor(enhancedChallenge.reward / 2),
                difficulty: enhancedChallenge.difficulty,
                time_limit: '24h',
                is_active: true
            })
            .select()
            .single();

        if (createError || !challengeData) {
            console.error('Create error:', createError);
            toast.error('حدث خطأ في حفظ التحدي');
            return;
        }

        // Schedule in player_challenges
        const now = new Date();
        const scheduledAt = scheduledDelay === 0 ? now : new Date(now.getTime() + scheduledDelay * 60 * 60 * 1000);
        const deadlineAt = new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000);

        await supabase.from('player_challenges').insert({
            user_id: userId,
            challenge_id: challengeData.id,
            status: scheduledDelay === 0 ? 'active' : 'scheduled',
            scheduled_at: scheduledAt.toISOString(),
            deadline_at: deadlineAt.toISOString()
        });

        if (scheduledDelay > 0) {
            if (permission !== 'granted') await requestPermission();
            scheduleNotification(challengeData.id, enhancedChallenge.titleAr, scheduledAt);
        }

        toast.success(scheduledDelay === 0 ? 'بدأ التحدي! أثبت نفسك!' : 'تمت جدولة التحدي بنجاح');
        onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in overflow-y-auto">
            <div className="w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-red-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 my-4">

                {/* Header */}
                <div className="relative bg-gradient-to-r from-red-900 to-slate-900 p-4 border-b border-red-500/30">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Swords className="w-6 h-6 text-red-500" />
                        <h2 className="text-xl font-bold text-white">اصنع تحديك الخاص</h2>
                    </div>
                </div>

                <div className="p-6">
                    {step === 'mockery' && (
                        <div className="text-center space-y-6 py-8">
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500/20 blur-[60px] rounded-full animate-pulse"></div>
                                <img
                                    src="https://i.ibb.co/rGMR1Q98/zersu-villhaha.png"
                                    alt="Zersu Laughing"
                                    className="relative w-40 h-40 mx-auto object-contain drop-shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-bounce"
                                />
                            </div>
                            <h3 className="text-2xl font-black text-red-500 animate-pulse">
                                "هااا؟! لم تعجبك تحدياتي؟!"
                            </h3>
                            <p className="text-gray-300 text-lg">
                                "أرني ما لديك إذاً... يا بطل! 😈"
                            </p>
                        </div>
                    )}

                    {step === 'input' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-5">
                            <div className="text-center mb-6">
                                <p className="text-gray-400">أخبر Zersu بالمهمة التي تريد القيام بها...</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">عنوان التحدي</label>
                                    <input
                                        type="text"
                                        value={userTitle}
                                        onChange={(e) => setUserTitle(e.target.value)}
                                        placeholder="مثال: الجري لمدة 30 دقيقة"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder-gray-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">الوصف (كيف ستثبت ذلك؟)</label>
                                    <textarea
                                        value={userDescription}
                                        onChange={(e) => setUserDescription(e.target.value)}
                                        placeholder="مثال: سأجري في الحديقة وأصور الساعة بيدي..."
                                        rows={3}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder-gray-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleEnhance}
                                disabled={!userTitle || !userDescription}
                                className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-lg rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-5 h-5" />
                                متابعة (تحليل Zersu)
                            </button>
                        </div>
                    )}

                    {step === 'enhancing' && (
                        <div className="text-center space-y-8 py-8">
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="absolute inset-0 border-4 border-red-500/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
                                <div className="absolute inset-2 border-4 border-t-red-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <img src="https://i.ibb.co/rGMR1Q98/zersu-villhaha.png" className="w-16 h-16 opacity-50" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-red-400 mb-2">Zersu يقوم بتحليل سهولة مهمتك...</h3>
                                <p className="text-gray-500 text-sm">"هل تظن أنك ستغش بمهام سهلة؟ هيهات!"</p>
                            </div>
                        </div>
                    )}

                    {step === 'review' && enhancedChallenge && (
                        <div className="space-y-6 animate-in zoom-in-95">
                            {/* AI Mockery */}
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-4 items-start">
                                <img src="https://i.ibb.co/rGMR1Q98/zersu-villhaha.png" className="w-12 h-12 rounded-full bg-slate-900" />
                                <div>
                                    <p className="text-red-300 font-bold text-sm mb-1">Zersu يقول:</p>
                                    <p className="text-white italic">"{enhancedChallenge.mockeryAr}"</p>
                                </div>
                            </div>

                            {/* Challenge Card */}
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 relative overflow-hidden group hover:border-red-500/50 transition-all">
                                <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-xl
                                    ${enhancedChallenge.difficulty === 'easy' ? 'bg-green-500' :
                                        enhancedChallenge.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                    {enhancedChallenge.difficulty === 'easy' ? 'سهل' :
                                        enhancedChallenge.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 mt-2">{enhancedChallenge.titleAr}</h3>
                                <p className="text-gray-400 text-sm mb-4">{enhancedChallenge.descriptionAr}</p>

                                <div className="flex items-center gap-4 text-sm border-t border-slate-800 pt-3">
                                    <div className="flex items-center gap-1 text-red-400">
                                        <span>-{enhancedChallenge.cost}</span>
                                        <span>💎 تكلفة</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-green-400">
                                        <span>+{enhancedChallenge.reward}</span>
                                        <span>💎 مكافأة</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleConfirmChallenge}
                                    disabled={userZcoins < enhancedChallenge.cost || !enhancedChallenge.isValid}
                                    className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {!enhancedChallenge.isValid ? 'التحدي غير صالح ❌' :
                                        userZcoins < enhancedChallenge.cost ? 'لا تملك رصيداً كافياً ❌' : 'قبلت التحدي! 🔥'}
                                </button>

                                {userZcoins < enhancedChallenge.cost && enhancedChallenge.isValid && (
                                    <button
                                        onClick={handleSaveToList}
                                        className="w-full py-3 bg-slate-800 border border-slate-700 text-gray-300 font-bold rounded-xl hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        أضفه للقائمة (القيام به لاحقاً)
                                    </button>
                                )}

                                {/* Cancel / Go Back Button */}
                                <button
                                    onClick={() => { setStep('input'); setEnhancedChallenge(null); }}
                                    className="w-full py-3 bg-transparent border border-slate-600 text-gray-400 font-bold rounded-xl hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowRight className="w-4 h-4 rotate-180" />
                                    غيرت رأيي (رجوع)
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'schedule' && (
                        <div className="space-y-6 animate-in slide-in-from-right-5">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                                    <Calendar className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">متى ستبدأ؟</h3>
                                <p className="text-gray-400 text-sm">يمكنك البدء فوراً أو الجدولة لوقت لاحق</p>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[0, 1, 2, 4, 12, 24].map((hours) => (
                                    <button
                                        key={hours}
                                        onClick={() => setScheduledDelay(hours)}
                                        className={`p-4 rounded-xl border transition-all ${scheduledDelay === hours
                                            ? 'bg-purple-600 border-purple-400 text-white'
                                            : 'bg-slate-800 border-slate-700 text-gray-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        <span className="block font-bold text-lg">{hours === 0 ? 'الآن' : `+${hours}`}</span>
                                        <span className="text-xs">{hours === 0 ? '🔥' : 'ساعة'}</span>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleFinalize}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {scheduledDelay === 0 ? 'ابدأ التحدي الآن!' : 'تأكيد الجدولة'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
// ============================================
// AAA Game Home Component
const GameHome = () => {
    const navigate = useNavigate();
    const context = useContext(GameContext);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [characterMood, setCharacterMood] = useState<'idle' | 'talking' | 'challenge'>('idle');
    const [dailyUsage, setDailyUsage] = useState(0);
    const DAILY_LIMIT = 2; // User requested limit
    const [dialogIndex, setDialogIndex] = useState(0);
    const [stats, setStats] = useState({ challenges: 0 });
    const [activeTab, setActiveTab] = useState('home');
    const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
    const [showAdModal, setShowAdModal] = useState(false);
    const [playerChallenges, setPlayerChallenges] = useState<Record<string, { status: string; scheduled_at: string | null }>>({});

    // AI-Generated Challenges State
    const [challenges, setChallenges] = useState<Challenge[]>(defaultChallenges);
    const [loadingChallenges, setLoadingChallenges] = useState(true);
    const [generatingChallenges, setGeneratingChallenges] = useState(false);
    const { generateChallenges: generateAIChallenges, getFallbackChallenges } = useAIChallengeGenerator();


    const dialogs = [
        "مرحباً يا بشري... هل جئت لتحديني؟ 😈",
        "لا تظن أنك ستهزمني بسهولة!",
        "هل أنت جاهز للتحدي الأول؟",
        "أثبت لي أنك تستحق ZCoins!"
    ];

    // Fetch or generate AI challenges
    useEffect(() => {
        const loadChallenges = async () => {
            if (!context?.userProfile?.user_id) {
                setLoadingChallenges(false);
                return;
            }

            setLoadingChallenges(true);

            try {
                // First, check if user has their own challenges generated
                const { data: userChallenges, error: userError } = await supabase
                    .from('user_challenges')
                    .select('*')
                    .eq('user_id', context.userProfile.user_id)
                    .eq('is_active', true)
                    .order('cost', { ascending: true });

                if (!userError && userChallenges && userChallenges.length > 0) {
                    // User already has AI-generated challenges - convert to local format
                    const formattedChallenges: Challenge[] = userChallenges.map((c: any) => ({
                        id: c.id,
                        title: c.title,
                        titleAr: c.title_ar,
                        description: c.description_ar || c.description,
                        cost: c.cost,
                        reward: c.reward,
                        failurePenalty: c.failure_penalty,
                        timeLimit: c.time_limit || '24h',
                        difficulty: c.difficulty as 'easy' | 'medium' | 'hard'
                    }));
                    setChallenges(formattedChallenges);
                    setLoadingChallenges(false);
                    return;
                }

                // User doesn't have challenges yet - need to generate them
                setGeneratingChallenges(true);

                // Generate new challenges via AI
                await generateAIChallenges(context.userProfile.user_id);

                // Fetch from database to get proper IDs
                const { data: savedChallenges, error: fetchError } = await supabase
                    .from('user_challenges')
                    .select('*')
                    .eq('user_id', context.userProfile.user_id)
                    .eq('is_active', true)
                    .order('cost', { ascending: true });

                if (!fetchError && savedChallenges && savedChallenges.length > 0) {
                    const formattedChallenges: Challenge[] = savedChallenges.map((c: any) => ({
                        id: c.id,
                        title: c.title,
                        titleAr: c.title_ar,
                        description: c.description_ar || c.description,
                        cost: c.cost,
                        reward: c.reward,
                        failurePenalty: c.failure_penalty,
                        timeLimit: c.time_limit || '24h',
                        difficulty: c.difficulty as 'easy' | 'medium' | 'hard'
                    }));
                    setChallenges(formattedChallenges);
                } else {
                    // Use fallback challenges if everything fails
                    setChallenges(defaultChallenges);
                }

                const { count, error: countError } = await supabase
                    .from('user_challenges')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', context.userProfile.user_id)
                    .gte('created_at', new Date().toISOString().split('T')[0]); // Challenges created today

                if (!countError) {
                    setDailyUsage(count || 0);
                }
            } catch (error) {
                console.error('Error loading challenges:', error);
                setChallenges(defaultChallenges);
            } finally {
                setLoadingChallenges(false);
                setGeneratingChallenges(false);
            }
        };

        loadChallenges();
    }, [context?.userProfile?.user_id]);

    // Realtime subscription for user_challenges - auto refresh when challenges change
    useEffect(() => {
        if (!context?.userProfile?.user_id) return;

        const userId = context.userProfile.user_id;

        // Subscribe to changes in user_challenges table for this user
        const subscription = supabase
            .channel('user-challenges-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'user_challenges',
                    filter: `user_id=eq.${userId}`
                },
                async (payload) => {
                    console.log('Challenge realtime update:', payload);

                    // Refetch all active challenges when any change happens
                    const { data: updatedChallenges, error } = await supabase
                        .from('user_challenges')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('is_active', true)
                        .order('cost', { ascending: true });

                    if (!error && updatedChallenges) {
                        const formattedChallenges: Challenge[] = updatedChallenges.map((c: any) => ({
                            id: c.id,
                            title: c.title,
                            titleAr: c.title_ar,
                            description: c.description_ar || c.description,
                            cost: c.cost,
                            reward: c.reward,
                            failurePenalty: c.failure_penalty,
                            timeLimit: c.time_limit || '24h',
                            difficulty: c.difficulty as 'easy' | 'medium' | 'hard'
                        }));
                        setChallenges(formattedChallenges);
                    }
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(subscription);
        };
    }, [context?.userProfile?.user_id]);

    useEffect(() => {
        // Fetch user's completed challenges count and initialize challenge status map
        const fetchData = async () => {
            // Fetch current user's challenge statuses
            if (context?.userProfile?.user_id) {
                const { data: userChallenges } = await supabase
                    .from('player_challenges')
                    .select('challenge_id, status, scheduled_at')
                    .eq('user_id', context.userProfile.user_id);

                if (userChallenges) {
                    const challengeMap: Record<string, { status: string; scheduled_at: string | null }> = {};
                    let completedCount = 0;
                    
                    userChallenges.forEach((c: any) => {
                        // Count completed challenges
                        if (c.status === 'completed') {
                            completedCount++;
                        }
                        
                        // Keep the most recent status (later entries override earlier ones)
                        if (!challengeMap[c.challenge_id] ||
                            c.status === 'completed' ||
                            (c.status === 'active' && challengeMap[c.challenge_id].status !== 'completed') ||
                            (c.status === 'scheduled' && !['completed', 'active'].includes(challengeMap[c.challenge_id].status))) {
                            challengeMap[c.challenge_id] = { status: c.status, scheduled_at: c.scheduled_at };
                        }
                    });
                    
                    setPlayerChallenges(challengeMap);
                    
                    // Set stats: user's completed challenges
                    setStats({
                        challenges: completedCount
                    });
                }
            } else {
                // If no user profile, show zero
                setStats({
                    challenges: 0
                });
            }
        };
        fetchData();

        // Auto-advance dialog
        const timer = setInterval(() => {
            setDialogIndex(prev => (prev + 1) % dialogs.length);
            setCharacterMood(prev => prev === 'talking' ? 'challenge' : 'talking');
        }, 4000);

        return () => clearInterval(timer);
    }, []);


    if (!context) return null;
    const { userProfile, isLoading, refreshGameData } = context;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                    <p className="text-purple-400 font-bold animate-pulse">جاري تحميل الساحة...</p>
                </div>
            </div>
        );
    }

    if (!userProfile) {
        return <GameLoginFlow />;
    }

    const handleChallengeSuccess = (reward: number) => {
        toast.success(`ربحت ${reward} ZCoins! 🎉`);
        refreshGameData();
    };

    const handleChallengeFail = (penalty: number) => {
        toast.error(`خسرت ${penalty} ZCoins! 😢`);
        refreshGameData();
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'easy': return { bg: 'bg-green-500', border: 'border-green-500/30', hover: 'hover:border-green-400/50' };
            case 'medium': return { bg: 'bg-yellow-500', border: 'border-yellow-500/30', hover: 'hover:border-yellow-400/50' };
            case 'hard': return { bg: 'bg-red-500', border: 'border-red-500/30', hover: 'hover:border-red-400/50' };
            default: return { bg: 'bg-gray-500', border: 'border-gray-500/30', hover: 'hover:border-gray-400/50' };
        }
    };

    return (
        <div className="min-h-screen relative pb-20 md:pb-8">
            {/* Challenge Modal */}
            {selectedChallenge && (
                <ChallengeModal
                    key={selectedChallenge.id}
                    challenge={selectedChallenge}
                    onClose={() => {
                        setSelectedChallenge(null);
                        refreshGameData(); // Refresh when modal closes
                    }}
                    userZcoins={userProfile?.zcoins ?? 0}
                    onSuccess={handleChallengeSuccess}
                    onFail={handleChallengeFail}
                />
            )}

            {/* Hero Section - Optimized for performance */}
            <div className="relative pt-8 pb-12 px-4">
                {/* Simplified Particles - Reduced count for better performance */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1.5 h-1.5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                            style={{
                                left: `${10 + (i * 9)}%`,
                                top: `${15 + (i * 8)}%`,
                                animation: `pulse 2s ease-in-out ${i * 0.2}s infinite`,
                                opacity: 0.5
                            }}
                        />
                    ))}
                </div>

                {/* Character Section with integrated message */}
                <div className="relative z-10 flex flex-col items-center">
                    {/* Zersu Character - Larger with message at bottom */}
                    <div className="relative mb-4">
                        <ZersuCharacter 
                            mood={characterMood === 'challenge' ? 'laughing' : 'challenge'} 
                            size="hero"
                            showMessage={true}
                            message={dialogs[dialogIndex]}
                        />
                    </div>

                    {/* Enhanced Stats Grid - Larger and more responsive */}
                    <div className="grid grid-cols-3 gap-4 w-full max-w-xl mt-8 px-2">
                        {/* ZCoins Wallet - Premium Design */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative bg-gradient-to-br from-slate-900/90 to-blue-950/90 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/30 shadow-lg overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                {/* Shine Effect */}
                                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-full transition-all duration-700"></div>

                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-3xl md:text-4xl drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">💎</div>
                                    <span className="text-2xl md:text-3xl font-black bg-gradient-to-b from-blue-300 to-blue-500 bg-clip-text text-transparent">
                                        {userProfile?.zcoins ?? 0}
                                    </span>
                                    <span className="text-xs font-bold text-blue-400/80 uppercase tracking-wider">ZCoins</span>
                                </div>

                                {/* Action Button (Ad) */}
                                {(userProfile?.zcoins ?? 0) < 3 && (
                                    <button
                                        onClick={() => setShowAdModal(true)}
                                        className="mt-3 w-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-xl py-2 text-xs text-blue-200 flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Tv className="w-3 h-3" />
                                        <span>+2 مجاناً</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ZGold Wallet - ULTRA PREMIUM */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-yellow-500/30 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                            <div className="relative bg-gradient-to-br from-amber-950/90 to-yellow-950/90 backdrop-blur-sm rounded-2xl p-4 border border-yellow-500/50 shadow-[0_0_25px_rgba(234,179,8,0.2)] overflow-hidden group-hover:scale-105 transition-transform duration-300 ring-1 ring-yellow-500/30">
                                {/* Shine Effect */}
                                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-full transition-all duration-700"></div>

                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-3xl md:text-4xl drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]">🟡</div>
                                    <span className="text-2xl md:text-3xl font-black text-yellow-300">
                                        {userProfile?.zgold ?? 0}
                                    </span>
                                    <span className="text-xs font-bold text-yellow-500/80 uppercase tracking-wider">ZGold</span>
                                </div>

                                <button className="mt-3 w-full bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-500/30 rounded-xl py-2 text-xs text-yellow-200 flex items-center justify-center gap-1 transition-colors">
                                    <span>شحن</span>
                                </button>
                            </div>
                        </div>

                        {/* Points Wallet - Premium Design */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative bg-gradient-to-br from-purple-950/90 to-slate-900/90 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30 shadow-lg overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                {/* Shine Effect */}
                                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-full transition-all duration-700"></div>

                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-3xl md:text-4xl drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]">🏆</div>
                                    <span className="text-2xl md:text-3xl font-black bg-gradient-to-b from-purple-300 to-purple-500 bg-clip-text text-transparent">
                                        {userProfile?.points ?? 0}
                                    </span>
                                    <span className="text-xs font-bold text-purple-400/80 uppercase tracking-wider">Points</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ad Reward Modal */}
                    <AdRewardModal
                        isOpen={showAdModal}
                        onClose={() => setShowAdModal(false)}
                        userId={userProfile?.user_id ?? ''}
                        currentZcoins={userProfile?.zcoins ?? 0}
                        onRewardEarned={(newZcoins) => {
                            refreshGameData();
                        }}
                    />

                    {/* Stats Badge */}
                    <div className="flex gap-4 mt-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-lg">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            <span className="text-gray-200 text-sm font-medium">أنجزت <span className="text-yellow-400 font-bold">{stats.challenges}</span> تحدي</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Challenge Button */}
            {/* Create Challenge Hero Card */}
            <div className="container mx-auto px-4 max-w-2xl mt-8 mb-8">
                <div
                    onClick={() => setShowCreateModal(true)}
                    className="relative group cursor-pointer transform hover:scale-[1.02] transition-all duration-300"
                >
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-600/20 blur-[80px] rounded-full group-hover:bg-purple-600/30 transition-all"></div>

                    <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">

                        {/* Left: Icon/Visual */}
                        <div className="relative">
                            <div className={`absolute inset-0 bg-purple-500/20 blur-xl rounded-full ${dailyUsage < DAILY_LIMIT ? 'animate-pulse' : ''}`}></div>
                            <div className="relative w-24 h-24 bg-gradient-to-br from-slate-800 to-black rounded-2xl border border-purple-500/30 flex items-center justify-center transform group-hover:rotate-3 transition-transform duration-500">
                                <Swords className={`w-12 h-12 ${dailyUsage < DAILY_LIMIT ? 'text-purple-400' : 'text-gray-500'}`} />
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black rounded-lg border border-purple-500/50 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-yellow-400 animate-spin-slow" />
                                </div>
                            </div>
                        </div>

                        {/* Center: Content */}
                        <div className="flex-1 text-center sm:text-right space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md">
                                <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75 ${dailyUsage >= DAILY_LIMIT ? 'hidden' : ''}`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${dailyUsage >= DAILY_LIMIT ? 'bg-gray-500' : 'bg-purple-500'}`}></span>
                                </span>
                                <span className="text-xs font-bold text-purple-300 tracking-wider">NEW FEATURE</span>
                            </div>

                            <h3 className={`text-2xl font-black ${dailyUsage >= DAILY_LIMIT ? 'text-gray-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200'} drop-shadow-sm`}>
                                هل تجرؤ على تحدي ZERSU؟
                            </h3>

                            <p className="text-gray-400 text-sm leading-relaxed max-w-lg mx-auto sm:mx-0">
                                صمم تحديك الخاص، وسيقوم الذكاء الاصطناعي بتحليله... والسخرية منك إذا كان سهلاً!
                                <br />
                                <span className={`text-xs ${dailyUsage >= DAILY_LIMIT ? 'text-red-400' : 'text-purple-400'}`}>
                                    (المحاولات المتبقية اليوم: {Math.max(0, DAILY_LIMIT - dailyUsage)})
                                </span>
                            </p>
                        </div>

                        {/* Right: Action Button */}
                        <div className="relative">
                            <button className={`relative px-8 py-4 bg-gradient-to-r ${dailyUsage >= DAILY_LIMIT ? 'from-gray-700 to-gray-600 cursor-not-allowed' : 'from-purple-600 to-pink-600 hover:scale-105'} text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-3 group-hover:shadow-purple-500/25`}>
                                {dailyUsage >= DAILY_LIMIT ? (
                                    <>
                                        <X className="w-5 h-5" />
                                        انتهى الحد اليومي
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                        انشئ التحدي
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Challenges Section */}
            <div className="container mx-auto px-4 max-w-2xl">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    {generatingChallenges ? 'جاري إنشاء تحدياتك...' : 'تحدياتك الخاصة'}
                </h2>

                {/* Loading State for AI Generation */}
                {(loadingChallenges || generatingChallenges) ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500/30 blur-3xl animate-pulse"></div>
                            <div className="relative">
                                <Sparkles className="w-16 h-16 text-purple-400 animate-pulse" />
                            </div>
                        </div>

                        <div className="text-center space-y-3">
                            <div className="flex items-center justify-center gap-3">
                                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                                <h3 className="text-lg font-bold text-white">
                                    {generatingChallenges ? 'الذكاء الاصطناعي يصمم لك تحديات فريدة!' : 'جاري تحميل التحديات...'}
                                </h3>
                            </div>
                            <p className="text-gray-400 text-sm">
                                {generatingChallenges
                                    ? '🤖 انتظر قليلاً... سنعطيك تحديات مخصصة لك!'
                                    : 'انتظر قليلاً...'}
                            </p>

                            {generatingChallenges && (
                                <div className="flex justify-center gap-1 mt-4">
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className="w-3 h-3 rounded-full bg-purple-500 animate-bounce"
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">

                        {challenges
                            // Filter out completed challenges
                            .filter((challenge) => {
                                const playerStatus = playerChallenges[challenge.id]?.status;
                                return playerStatus !== 'completed';
                            })
                            .map((challenge) => {
                                const colors = getDifficultyColor(challenge.difficulty);
                                const canAfford = (userProfile?.zcoins ?? 0) >= challenge.cost;
                                const playerStatus = playerChallenges[challenge.id]?.status;
                                const isScheduled = playerStatus === 'scheduled';
                                const isActive = playerStatus === 'active';
                                const isInProgress = isScheduled || isActive;

                                return (
                                    <div
                                        key={challenge.id}
                                        onClick={() => setSelectedChallenge(challenge)}
                                        className={`relative group cursor-pointer transition-all duration-300 hover:scale-[1.02] ${!canAfford && !isInProgress ? 'opacity-60' : ''}`}
                                    >
                                        <div className={`relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 ${isInProgress ? 'border-purple-500/50' : colors.border} rounded-2xl p-5 ${colors.hover} transition-all`}>
                                            {/* Difficulty Badge */}
                                            <div className={`absolute -top-3 right-4 px-3 py-1 ${colors.bg} text-white text-xs font-bold rounded-full`}>
                                                {challenge.difficulty === 'easy' ? 'سهل' : challenge.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                                            </div>

                                            {/* Status Badge - Shows when scheduled or active */}
                                            {isInProgress && (
                                                <div className="absolute -top-3 left-4 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full flex items-center gap-1 animate-pulse">
                                                    {isScheduled ? (
                                                        <>
                                                            <Clock className="w-3 h-3" />
                                                            مجدول
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Zap className="w-3 h-3" />
                                                            قيد التنفيذ
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 bg-gradient-to-br ${isInProgress
                                                    ? 'from-purple-500 to-pink-500'
                                                    : challenge.difficulty === 'easy'
                                                        ? 'from-green-500 to-emerald-500'
                                                        : challenge.difficulty === 'medium'
                                                            ? 'from-yellow-500 to-orange-500'
                                                            : 'from-red-500 to-pink-500'
                                                    } rounded-xl shadow-lg`}>
                                                    {isInProgress ? (
                                                        <Clock className="w-6 h-6 text-white" />
                                                    ) : (
                                                        <Upload className="w-6 h-6 text-white" />
                                                    )}
                                                </div>

                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-white mb-1">{challenge.title}</h3>
                                                    <p className="text-gray-400 text-sm mb-3">{challenge.description}</p>

                                                    <div className="flex flex-wrap gap-3">
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <span className="text-red-400">-{challenge.cost}</span>
                                                            <span>💎</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <span className="text-green-400">+{challenge.reward}</span>
                                                            <span>💎</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                                            <Clock className="w-4 h-4" />
                                                            {challenge.timeLimit}
                                                        </div>
                                                    </div>
                                                </div>

                                                <ChevronRight className="w-6 h-6 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                                            </div>

                                            {/* Progress overlay for in-progress challenges */}
                                            {isInProgress && (
                                                <div className="absolute inset-0 bg-purple-500/5 rounded-2xl pointer-events-none"></div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                )}

                {/* Quick Actions */}

                <div className="grid grid-cols-2 gap-4 mt-8">
                    <button
                        onClick={() => navigate('/leaderboard')}
                        className="p-4 bg-slate-800/50 border border-yellow-500/30 rounded-xl hover:bg-slate-800 hover:border-yellow-400/50 transition-all group"
                    >
                        <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-white font-bold text-sm">المتصدرون</span>
                    </button>

                    <button
                        onClick={() => navigate('/shop')}
                        className="p-4 bg-slate-800/50 border border-pink-500/30 rounded-xl hover:bg-slate-800 hover:border-pink-400/50 transition-all group"
                    >
                        <Sparkles className="w-8 h-8 text-pink-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-white font-bold text-sm">المتجر</span>
                    </button>
                </div>
            </div>

            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            {showCreateModal && context?.userProfile && (
                <CreateChallengeModal
                    userId={context.userProfile.user_id}
                    userZcoins={context.userProfile.zcoins}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        navigate('/zetsuchallenge/active-tasks');
                    }}
                />
            )}
        </div>
    );
};

// Main Page

const ZetsuChallengePage = () => {
    const navigate = useNavigate();

    // Auto-scroll to challenges if route matches or if requested
    const location = useLocation();
    useEffect(() => {
        if (location.pathname.includes('/challenges')) {
            // Wait for load then scroll
            setTimeout(() => {
                const element = document.getElementById('challenges-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
        }
    }, [location.pathname]);

    return (
        <GameProvider>
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-[#0a0e17] to-[#050505] text-white relative overflow-hidden font-['Tajawal']">
                
                {/* Touch Ripple Effect */}
                <TouchRipple />

                {/* Dynamic Weather System (Background) */}
                <WeatherDisplay />

                {/* Additional Ambient Glow (Optional overlay on top of weather) */}
                <div className="fixed inset-0 pointer-events-none z-[1]">
                    <div className="absolute w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] -top-64 left-1/4 mix-blend-overlay"></div>
                    <div className="absolute w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[80px] bottom-0 right-0 mix-blend-overlay"></div>
                </div>

                <div className="relative z-10">
                    <Navbar />
                </div>

                <div className="relative z-10 pt-20">
                    {/* Header with Settings Button */}
                    <div className="text-center py-4 px-4 flex items-center justify-between max-w-4xl mx-auto">
                        <div className="w-10"></div> {/* Spacer for centering */}

                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 backdrop-blur-sm">
                            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                            <span className="text-purple-300 text-sm font-bold tracking-wider">ZERSU'S ARENA</span>
                            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                        </div>

                        <button
                            onClick={() => navigate('/zetsusettings')}
                            className="p-2 bg-slate-800/50 hover:bg-slate-700/80 rounded-full border border-purple-500/30 hover:border-purple-500/60 transition-all group backdrop-blur-sm"
                            title="إعدادات الكابوس"
                        >
                            <SettingsIcon className="w-6 h-6 text-purple-400 group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>

                    <GameHome />
                </div>
            </div>
        </GameProvider>
    );
};

export default ZetsuChallengePage;

// Force Refresh
