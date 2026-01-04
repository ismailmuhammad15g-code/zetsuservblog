import React, { useState, useContext, useEffect } from 'react';
import { GameContext } from '../../contexts/GameContext';
import { useZersuAI } from '../../hooks/useZersuAI';
import { useAIChallengeGenerator } from '../../hooks/useAIChallengeGenerator';
import ZersuCharacter from './ZersuCharacter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Clock, Trophy, Target, Shield, Flame, AlertTriangle, CheckCircle, XCircle, Zap, TrendingUp, Loader2, Sparkles } from 'lucide-react';

interface Challenge {
    id: string;
    title: string;
    title_ar: string | null;
    description: string;
    description_ar: string | null;
    cost: number;
    reward: number;
    failure_penalty: number;
    difficulty: string;
    verification_type: string;
    time_limit: string | null;
    icon: string | null;
}

const iconMap: Record<string, React.ReactNode> = {
    'target': <Target className="w-6 h-6" />,
    'zap': <Zap className="w-6 h-6" />,
    'flame': <Flame className="w-6 h-6" />,
    'shield': <Shield className="w-6 h-6" />,
    'trending-up': <TrendingUp className="w-6 h-6" />,
    'trophy': <Trophy className="w-6 h-6" />,
};

const ChallengeSystem = () => {
    const gameContext = useContext(GameContext);
    const { userProfile, refreshGameData } = gameContext!;
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loadingChallenges, setLoadingChallenges] = useState(true);
    const [generatingChallenges, setGeneratingChallenges] = useState(false);
    const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
    const [challengeStatus, setChallengeStatus] = useState<'idle' | 'active' | 'verifying' | 'completed' | 'failed'>('idle');
    const [proofImage, setProofImage] = useState<string | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const { verifyChallenge } = useZersuAI();
    const { generateChallenges: generateAIChallenges, getFallbackChallenges } = useAIChallengeGenerator();

    // Fetch or generate challenges
    useEffect(() => {
        const initChallenges = async () => {
            if (!userProfile?.user_id) {
                setLoadingChallenges(false);
                return;
            }

            setLoadingChallenges(true);

            try {
                // First, check if user has their own challenges generated
                const { data: userChallenges, error: userError } = await supabase
                    .from('user_challenges')
                    .select('*')
                    .eq('user_id', userProfile.user_id)
                    .eq('is_active', true)
                    .order('cost', { ascending: true });

                if (!userError && userChallenges && userChallenges.length > 0) {
                    // User already has AI-generated challenges
                    setChallenges(userChallenges);
                    setLoadingChallenges(false);
                    return;
                }

                // User doesn't have challenges yet - need to generate them
                setGeneratingChallenges(true);

                // Generate new challenges via AI
                const newChallenges = await generateAIChallenges(userProfile.user_id);

                // Fetch from database to get proper IDs
                const { data: savedChallenges, error: fetchError } = await supabase
                    .from('user_challenges')
                    .select('*')
                    .eq('user_id', userProfile.user_id)
                    .eq('is_active', true)
                    .order('cost', { ascending: true });

                if (!fetchError && savedChallenges && savedChallenges.length > 0) {
                    setChallenges(savedChallenges);
                } else {
                    // Use fallback challenges if everything fails
                    const fallback = getFallbackChallenges();
                    setChallenges(fallback.map((c, i) => ({
                        ...c,
                        id: `fallback-${i}`,
                        title_ar: c.title_ar,
                        description_ar: c.description_ar,
                        time_limit: c.time_limit,
                        icon: c.icon
                    })));
                }

            } catch (error) {
                console.error('Error loading challenges:', error);
                // Use fallback
                const fallback = getFallbackChallenges();
                setChallenges(fallback.map((c, i) => ({
                    ...c,
                    id: `fallback-${i}`,
                    title_ar: c.title_ar,
                    description_ar: c.description_ar,
                    time_limit: c.time_limit,
                    icon: c.icon
                })));
            } finally {
                setLoadingChallenges(false);
                setGeneratingChallenges(false);
            }
        };

        initChallenges();
    }, [userProfile?.user_id]);

    const getDifficultyConfig = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return { color: 'from-green-500 to-emerald-500', bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400', label: 'سهل' };
            case 'medium': return { color: 'from-yellow-500 to-orange-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', label: 'متوسط' };
            case 'hard': return { color: 'from-red-500 to-pink-500', bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', label: 'صعب' };
            default: return { color: 'from-gray-500 to-gray-600', bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400', label: 'عادي' };
        }
    };

    const startChallenge = async (challenge: Challenge) => {
        if (!userProfile) return;
        if (userProfile.zcoins < challenge.cost) {
            toast.error("لا تملك عملات كافية! 😈");
            return;
        }

        const { error } = await supabase.from('game_profiles')
            .update({ zcoins: userProfile.zcoins - challenge.cost })
            .eq('user_id', userProfile.user_id);

        if (error) {
            toast.error("فشل في بدء التحدي");
            return;
        }

        await supabase.from('player_challenges').insert({
            user_id: userProfile.user_id,
            challenge_id: challenge.id,
            status: 'active'
        });

        await refreshGameData();
        setSelectedChallenge(challenge);
        setChallengeStatus('active');
        toast.success(`تم قبول التحدي! -${challenge.cost} ZCoins`);
    };

    const handleProofSubmit = async () => {
        if (!userProfile || !selectedChallenge) return;
        setChallengeStatus('verifying');

        let uploadedUrl = null;
        if (proofFile) {
            const fileName = `${userProfile.user_id}/${Date.now()}_${proofFile.name}`;
            const { data, error } = await supabase.storage.from('proof-images').upload(fileName, proofFile);
            if (!error && data) {
                uploadedUrl = data.path;
            }
        }

        try {
            const verificationResult = await verifyChallenge({
                challengeTitle: selectedChallenge.title,
                proofImage: proofImage || '',
                userId: userProfile.user_id
            });

            if (verificationResult.success) {
                await supabase.from('game_profiles')
                    .update({ zcoins: userProfile.zcoins + selectedChallenge.reward })
                    .eq('user_id', userProfile.user_id);

                await supabase.from('player_challenges')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        proof_url: uploadedUrl,
                        reward_claimed: selectedChallenge.reward
                    })
                    .eq('user_id', userProfile.user_id)
                    .eq('challenge_id', selectedChallenge.id);

                setChallengeStatus('completed');
                toast.success(`نجاح! +${selectedChallenge.reward} ZCoins`);
            } else {
                const penalty = selectedChallenge.failure_penalty;
                const newZcoins = Math.max(0, userProfile.zcoins - penalty);

                await supabase.from('game_profiles')
                    .update({ zcoins: newZcoins })
                    .eq('user_id', userProfile.user_id);

                await supabase.from('player_challenges')
                    .update({
                        status: 'failed',
                        failed_at: new Date().toISOString(),
                        proof_url: uploadedUrl
                    })
                    .eq('user_id', userProfile.user_id)
                    .eq('challenge_id', selectedChallenge.id);

                setChallengeStatus('failed');
                toast.error(`فشل! -${penalty} ZCoins`);
            }

            await refreshGameData();

        } catch (error) {
            console.error("Verification failed:", error);
            setChallengeStatus('failed');
            toast.error("خطأ في النظام");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProofFile(e.target.files[0]);
            setProofImage(URL.createObjectURL(e.target.files[0]));
        }
    };

    const resetSelection = () => {
        setSelectedChallenge(null);
        setChallengeStatus('idle');
        setProofImage(null);
        setProofFile(null);
    };

    // Loading state - generating challenges with AI
    if (loadingChallenges || generatingChallenges) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/30 blur-3xl animate-pulse"></div>
                    <div className="relative">
                        <Sparkles className="w-16 h-16 text-purple-400 animate-pulse" />
                    </div>
                </div>

                <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                        <h3 className="text-xl font-bold text-white">
                            {generatingChallenges ? 'جاري إنشاء تحدياتك الخاصة...' : 'جاري تحميل التحديات...'}
                        </h3>
                    </div>
                    <p className="text-gray-400 text-sm">
                        {generatingChallenges
                            ? '🤖 الذكاء الاصطناعي يصمم لك تحديات فريدة!'
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
        );
    }

    return (
        <div className="min-h-[500px] relative">
            {/* Premium Header with ZCoins */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 relative z-10">
                <div className="text-center md:text-right">
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-2 flex items-center justify-center md:justify-start gap-3 drop-shadow-lg">
                        <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                            تحدياتك الخاصة
                        </span>
                    </h2>
                    <p className="text-purple-200/80 text-sm font-medium">تحديات مُصممة خصيصاً لك بالذكاء الاصطناعي! 🎮</p>
                </div>

                {/* Glassmorphic ZCoins Display */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 blur-xl rounded-2xl group-hover:bg-yellow-500/30 transition-all duration-500"></div>
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-4 transition-transform hover:scale-105 duration-300">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center shadow-lg border-2 border-yellow-300/50">
                            <span className="text-2xl animate-bounce">💎</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-yellow-200/90 uppercase tracking-widest font-bold">رصيدك الحالي</span>
                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-100 filter drop-shadow-sm">
                                {userProfile?.zcoins?.toLocaleString() ?? 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {!selectedChallenge ? (
                /* Challenge Cards Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {challenges.map(challenge => {
                        const config = getDifficultyConfig(challenge.difficulty);
                        const canAfford = (userProfile?.zcoins ?? 0) >= challenge.cost;

                        return (
                            <div
                                key={challenge.id}
                                className={`relative group rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${canAfford ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                                    }`}
                                onClick={() => canAfford && startChallenge(challenge)}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>

                                <div className={`relative p-4 bg-slate-800/80 backdrop-blur-sm border ${config.border} rounded-xl`}>
                                    <div className={`absolute top-3 right-3 ${config.bg} ${config.text} px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.border}`}>
                                        {config.label}
                                    </div>

                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color} text-white shadow-lg flex-shrink-0`}>
                                            {iconMap[challenge.icon || 'target'] || <Target className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 pt-0.5 min-w-0">
                                            <h3 className="text-base font-bold text-white truncate">{challenge.title}</h3>
                                            <p className="text-gray-400 text-xs">{challenge.title_ar}</p>
                                        </div>
                                    </div>

                                    <p className="text-gray-300 text-xs mb-4 line-clamp-2">
                                        {challenge.description_ar || challenge.description}
                                    </p>

                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="bg-black/30 rounded-lg p-2 text-center">
                                            <div className="text-red-400 text-sm font-bold">-{challenge.cost}</div>
                                            <div className="text-[9px] text-gray-500">التكلفة</div>
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-2 text-center">
                                            <div className="text-green-400 text-sm font-bold">+{challenge.reward}</div>
                                            <div className="text-[9px] text-gray-500">المكافأة</div>
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-2 text-center">
                                            <Clock className="w-3 h-3 text-blue-400 mx-auto" />
                                            <div className="text-[9px] text-gray-500">{challenge.time_limit}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 text-[10px] text-red-400/80">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>عند الفشل: -{challenge.failure_penalty} 💎</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Active Challenge View */
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/30 overflow-hidden animate-in zoom-in-95">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    {iconMap[selectedChallenge.icon || 'target']}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{selectedChallenge.title}</h2>
                                    <p className="text-purple-200 text-sm">{selectedChallenge.title_ar}</p>
                                </div>
                            </div>
                            <button onClick={resetSelection} className="text-white/70 hover:text-white text-xl">✕</button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="lg:w-1/3 flex flex-col items-center relative min-h-[300px]">
                                <ZersuCharacter
                                    type="idle"
                                    size="large"
                                    className="z-10"
                                />
                                {/* Integrated Message Bubble */}
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-[240px]">
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl relative animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-white/10"></div>
                                        <p className="text-white text-sm font-medium text-center italic leading-relaxed">
                                            {challengeStatus === 'active' ? `"أرني ما لديك يا بطل! 😈"` :
                                                challengeStatus === 'verifying' ? `"دعني أرى... مممم 🤔"` :
                                                    challengeStatus === 'completed' ? `"تباً! لقد فعلتها... 😤"` : `"هاهاها! حاولت جيداً! 🤣"`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:w-2/3">
                                {challengeStatus === 'active' && (
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                <Upload className="w-4 h-4 text-purple-400" />
                                                ارفع الدليل
                                            </h3>
                                        </div>

                                        <div className="relative">
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${proofImage ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-purple-500'}`}>
                                                {!proofImage ? (
                                                    <div>
                                                        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                                        <p className="text-gray-400 text-sm">اسحب أو انقر للتحميل</p>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <img src={proofImage} alt="proof" className="max-h-40 mx-auto rounded-lg" />
                                                        <button onClick={(e) => { e.stopPropagation(); setProofImage(null); setProofFile(null); }} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm z-20">✕</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button onClick={handleProofSubmit} disabled={!proofImage} className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
                                            إرسال للتحقق ⚡
                                        </button>
                                    </div>
                                )}

                                {challengeStatus === 'verifying' && (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-purple-300">جاري التحقق...</p>
                                    </div>
                                )}

                                {challengeStatus === 'completed' && (
                                    <div className="text-center py-8 animate-in zoom-in">
                                        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-black text-green-400 mb-2">نجاح! 🎉</h3>
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/50 mb-4">
                                            <span>💎</span>
                                            <span className="text-green-400 font-bold">+{selectedChallenge.reward}</span>
                                        </div>
                                        <br />
                                        <button onClick={resetSelection} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-xl hover:scale-105 transition-transform">التالي ➔</button>
                                    </div>
                                )}

                                {challengeStatus === 'failed' && (
                                    <div className="text-center py-8 animate-in zoom-in">
                                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <XCircle className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-black text-red-400 mb-2">فشل! 💀</h3>
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-full border border-red-500/50 mb-4">
                                            <span>💎</span>
                                            <span className="text-red-400 font-bold">-{selectedChallenge.failure_penalty}</span>
                                        </div>
                                        <br />
                                        <button onClick={resetSelection} className="px-6 py-2 bg-slate-700 text-gray-300 font-bold rounded-xl hover:bg-slate-600 transition-colors">حاول مرة أخرى</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChallengeSystem;
