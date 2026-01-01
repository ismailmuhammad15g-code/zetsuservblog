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
import { useNotifications } from '../hooks/useNotifications';
import { toast } from 'sonner';
import { Swords, Trophy, Star, Zap, Users, ChevronRight, Sparkles, Target, Upload, Clock, X, CheckCircle, XCircle, Loader2, Camera, Tv, Bell } from 'lucide-react';
import AdRewardModal from '../components/zersu-game/AdRewardModal';

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

const challenges: Challenge[] = [
    { id: 'first-blood', title: 'FIRST BLOOD', titleAr: 'الدم الأول', description: 'انشر أول منشور لك وارفع صورة للتحقق!', cost: 1, reward: 5, failurePenalty: 2, timeLimit: '24h', difficulty: 'easy' },
    { id: 'social-butterfly', title: 'SOCIAL BUTTERFLY', titleAr: 'الفراشة الاجتماعية', description: 'شارك منشورك على 3 منصات تواصل!', cost: 2, reward: 8, failurePenalty: 3, timeLimit: '48h', difficulty: 'medium' },
    { id: 'comment-master', title: 'COMMENT MASTER', titleAr: 'سيد التعليقات', description: 'احصل على 10 تعليقات على منشورك!', cost: 3, reward: 12, failurePenalty: 4, timeLimit: '72h', difficulty: 'hard' },
];

// Challenge Modal Component
// Entertaining loading screen with rotating messages
const VerifyingScreen = () => {
    const [messageIndex, setMessageIndex] = useState(0);
    const messages = [
        { text: "Zersu يفحص الدليل... 🔍", emoji: "🤔" },
        { text: "هممم... أبحث عن أي غش... 👁️", emoji: "😒" },
        { text: "هل حقاً فعلتها؟ دعني أتحقق... 🧐", emoji: "🤨" },
        { text: "لا تحاول خداعي! 👀", emoji: "😤" },
        { text: "جاري تحليل الصورة بدقة... 🔬", emoji: "🧪" },
        { text: "أراهن أنك فشلت! 😈", emoji: "😂" },
        { text: "لحظة واحدة... 💭", emoji: "🤔" },
        { text: "سأكتشف كل شيء! ⚡", emoji: "🔥" },
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 1500);
        return () => clearInterval(timer);
    }, []);

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
    const { userProfile, refreshGameData } = useGame();
    const navigate = useNavigate();
    const { permission, requestPermission, scheduleNotification } = useNotifications();

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

        // Try to upload image (optional - verification works without it)
        let uploadedUrl: string | null = null;
        if (proofFile) {
            try {
                const fileName = `${userProfile.user_id}/${Date.now()}_${proofFile.name}`;
                const { data, error } = await supabase.storage.from('proof-images').upload(fileName, proofFile);
                if (data && !error) {
                    uploadedUrl = data.path;
                } else {
                    console.warn('Image upload failed (non-critical):', error?.message);
                }
            } catch (uploadError) {
                console.warn('Image upload error (non-critical):', uploadError);
                // Continue without uploaded URL - verification will still work
            }
        }

        // Verify with AI
        try {
            const verificationResult = await verifyChallenge({
                challengeTitle: challenge.title,
                challengeDescription: challenge.description,
                proofImage: proofImage,
                userId: userProfile.user_id
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

// AAA Game Home Component
const GameHome = () => {
    const navigate = useNavigate();
    const context = useContext(GameContext);
    const [characterMood, setCharacterMood] = useState<'idle' | 'talking' | 'challenge'>('idle');
    const [dialogIndex, setDialogIndex] = useState(0);
    const [stats, setStats] = useState({ players: 0, challenges: 0 });
    const [activeTab, setActiveTab] = useState('home');
    const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
    const [showAdModal, setShowAdModal] = useState(false);
    const [playerChallenges, setPlayerChallenges] = useState<Record<string, { status: string; scheduled_at: string | null }>>({});

    const dialogs = [
        "مرحباً يا بشري... هل جئت لتحديني؟ 😈",
        "لا تظن أنك ستهزمني بسهولة!",
        "هل أنت جاهز للتحدي الأول؟",
        "أثبت لي أنك تستحق ZCoins!"
    ];

    useEffect(() => {
        // Fetch global stats
        const fetchData = async () => {
            const { data: globalStats } = await supabase.from('game_stats').select('*').eq('id', 'global').single();

            if (globalStats) {
                setStats({
                    players: globalStats.total_players || 0,
                    // Sum of social challenges AND game battles
                    challenges: (globalStats.total_challenges_completed || 0) + (globalStats.total_battles_completed || 0)
                });
            }

            // Fetch current user's challenge statuses
            if (context?.userProfile?.user_id) {
                const { data: userChallenges } = await supabase
                    .from('player_challenges')
                    .select('challenge_id, status, scheduled_at')
                    .eq('user_id', context.userProfile.user_id);

                if (userChallenges) {
                    const challengeMap: Record<string, { status: string; scheduled_at: string | null }> = {};
                    userChallenges.forEach((c: any) => {
                        // Keep the most recent status (later entries override earlier ones)
                        if (!challengeMap[c.challenge_id] ||
                            c.status === 'completed' ||
                            (c.status === 'active' && challengeMap[c.challenge_id].status !== 'completed') ||
                            (c.status === 'scheduled' && !['completed', 'active'].includes(challengeMap[c.challenge_id].status))) {
                            challengeMap[c.challenge_id] = { status: c.status, scheduled_at: c.scheduled_at };
                        }
                    });
                    setPlayerChallenges(challengeMap);
                }
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

            {/* Hero Section */}
            <div className="relative pt-8 pb-12 px-4">
                {/* Particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`
                            }}
                        />
                    ))}
                </div>

                {/* Character */}
                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/50 via-pink-500/30 to-transparent blur-[60px] scale-150 animate-pulse"></div>
                        <img
                            src={characterMood === 'challenge'
                                ? "https://i.ibb.co/rGMR1Q98/zersu-villhaha.png"
                                : "https://i.ibb.co/5gMzf6XK/zersu-challengeface.png"
                            }
                            alt="Zersu"
                            className="relative w-48 h-48 md:w-56 md:h-56 object-contain drop-shadow-[0_0_40px_rgba(168,85,247,0.6)]"
                        />
                    </div>

                    {/* Dialog */}
                    <div className="mb-6 max-w-sm">
                        <div className="bg-slate-800/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 shadow-xl relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-slate-800/90"></div>
                            <p className="text-white text-center font-medium">{dialogs[dialogIndex]}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                        {/* ZCoins Wallet - Premium Design */}
                        <div className="relative group perspective-1000">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl group-hover:bg-blue-500/30 transition-all duration-500"></div>
                            <div className="relative bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] rounded-2xl p-3 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] overflow-hidden group-hover:scale-[1.02] transition-transform duration-300">
                                {/* Shine Effect */}
                                <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:animate-shine"></div>

                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">💎</span>
                                        <span className="text-xl font-black bg-gradient-to-b from-blue-300 to-blue-600 bg-clip-text text-transparent">
                                            {userProfile?.zcoins ?? 0}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-widest">ZCoins</span>
                                </div>

                                {/* Action Button (Ad) */}
                                {(userProfile?.zcoins ?? 0) < 3 && (
                                    <button
                                        onClick={() => setShowAdModal(true)}
                                        className="mt-2 w-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-lg py-1 text-[10px] text-blue-200 flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Tv className="w-3 h-3" />
                                        <span>+2</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ZGold Wallet - ULTRA PREMIUM */}
                        <div className="relative group perspective-1000">
                            <div className="absolute inset-0 bg-yellow-400/30 rounded-2xl blur-xl group-hover:bg-yellow-400/40 transition-all duration-500 animate-pulse"></div>
                            <div className="relative bg-gradient-to-br from-[#422006] to-[#713f12] rounded-2xl p-3 border border-yellow-400/60 shadow-[0_0_20px_rgba(234,179,8,0.4)] overflow-hidden group-hover:scale-[1.05] transition-transform duration-300 ring-1 ring-yellow-400/50">
                                {/* Shine Effect */}
                                <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-shine"></div>

                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl filter drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">🟡</span>
                                        <span className="text-xl font-black text-yellow-300">
                                            {userProfile?.zgold ?? 0}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-yellow-500/90 uppercase tracking-widest">ZGold</span>
                                </div>

                                <button className="mt-2 w-full bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-400/40 rounded-lg py-1 text-[10px] text-yellow-200 flex items-center justify-center gap-1 transition-colors">
                                    <span>شحن</span>
                                </button>
                            </div>
                        </div>

                        {/* Points Wallet - Premium Design */}
                        <div className="relative group perspective-1000 col-span-2 md:col-span-1">
                            <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-xl group-hover:bg-purple-500/30 transition-all duration-500"></div>
                            <div className="relative bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-2xl p-3 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)] overflow-hidden group-hover:scale-[1.02] transition-transform duration-300">
                                {/* Shine Effect */}
                                <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:animate-shine"></div>

                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">🏆</span>
                                        <span className="text-xl font-black bg-gradient-to-b from-purple-300 to-purple-600 bg-clip-text text-transparent">
                                            {userProfile?.points ?? 0}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-purple-500/80 uppercase tracking-widest">Points</span>
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

                    {/* Stats */}
                    <div className="flex gap-4 mb-8">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-gray-300 text-sm">{stats.players} لاعب</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span className="text-gray-300 text-sm">{stats.challenges} تحدي</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Challenges Section */}
            <div className="container mx-auto px-4 max-w-2xl">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-purple-400" />
                    التحديات المتاحة
                </h2>

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
        </div>
    );
};

// Main Page
const ZetsuChallengePage = () => {
    return (
        <GameProvider>
            <div className="min-h-screen bg-[#0a0e17] text-white relative overflow-hidden">
                {/* Background */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] -top-64 left-1/4"></div>
                    <div className="absolute w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[80px] bottom-0 right-0"></div>
                </div>

                <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
                    backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.5) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(168, 85, 247, 0.5) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}></div>

                <Navbar />

                <div className="relative z-10 pt-20">
                    {/* Header */}
                    <div className="text-center py-4 px-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30">
                            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                            <span className="text-purple-300 text-sm font-bold tracking-wider">ZERSU'S ARENA</span>
                            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                        </div>
                    </div>

                    <GameHome />
                </div>
            </div>
        </GameProvider>
    );
};

export default ZetsuChallengePage;
