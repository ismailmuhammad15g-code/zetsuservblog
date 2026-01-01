import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { supabase } from '@/integrations/supabase/client';
import Onboarding from './Onboarding';
import ZersuCharacter from './ZersuCharacter';
import WorldMap from './WorldMap';
import { Shield, Sword, Sparkles, AlertTriangle, UserX } from 'lucide-react';

const GameLoginFlow = () => {
    const { joinGame } = useGame();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [showAuthError, setShowAuthError] = useState(false);

    // Check if user is authenticated
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setIsAuthenticated(!!user);
        };
        checkAuth();
    }, []);

    const handleContinueClick = () => {
        if (!isAuthenticated) {
            setShowAuthError(true);
            return;
        }
        setStep(2);
    };

    const handleServerSelect = async (server: string) => {
        setLoading(true);
        // Connection delay for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
            await joinGame(server);

            // Update server player count
            await supabase.rpc('increment_server_players', { server_id: server }).catch(() => { });

            setStep(3);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const cancelGameJoin = () => {
        window.location.href = '/';
    };

    const finishOnboarding = () => {
        window.location.reload();
    };

    const goToRegister = () => {
        window.location.href = '/register';
    };

    // Auth Error Modal
    if (showAuthError) {
        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-gradient-to-br from-red-900/90 to-slate-900/90 backdrop-blur-xl rounded-3xl border border-red-500/50 shadow-2xl shadow-red-500/20 overflow-hidden animate-in zoom-in-95">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-600 to-red-800 p-6 text-center">
                        <div className="w-16 h-16 bg-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserX className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white">❌ خطأ!</h2>
                    </div>

                    {/* Content */}
                    <div className="p-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-red-400 mb-4">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-bold">أنت غير مسجل!</span>
                        </div>

                        <p className="text-gray-300 mb-2">
                            You are not registered on <span className="text-purple-400 font-bold">ZetsuservBlog</span>!
                        </p>
                        <p className="text-gray-400 text-sm mb-8">
                            يجب عليك التسجيل أولاً لتحدي Zersu والحصول على ZCoins!
                        </p>

                        {/* Zersu mocking */}
                        <div className="flex justify-center mb-6">
                            <ZersuCharacter mood="laughing" size="medium" />
                        </div>
                        <p className="text-gray-500 italic text-sm mb-8">
                            "هاهاها! تظن أنك تستطيع تحديي بدون حساب؟ اذهب وسجل أولاً يا جبان!" 😈
                        </p>

                        {/* Buttons */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={goToRegister}
                                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-lg shadow-green-500/30"
                            >
                                سجّل الآن! 🚀
                            </button>
                            <button
                                onClick={() => window.location.href = '/auth'}
                                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors"
                            >
                                لدي حساب - تسجيل الدخول
                            </button>
                            <button
                                onClick={cancelGameJoin}
                                className="w-full py-3 bg-slate-700 text-gray-300 font-bold rounded-xl hover:bg-slate-600 transition-colors"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 3) {
        return <Onboarding onComplete={finishOnboarding} />;
    }

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 z-50 overflow-y-auto">
            {/* Animated background */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute w-96 h-96 bg-purple-500 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
                <div className="absolute w-96 h-96 bg-cyan-500 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                {step === 1 && (
                    <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Header */}
                        <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-center">
                            <div className="absolute inset-0 bg-black/20"></div>
                            <div className="relative">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-sm mb-3">
                                    <Sparkles className="w-4 h-4" />
                                    <span>Welcome Challenger</span>
                                </div>
                                <h1 className="text-3xl font-black text-white">ZERSU'S ARENA</h1>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                {/* Character */}
                                <div className="flex-shrink-0">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-purple-500/30 blur-2xl rounded-full"></div>
                                        <ZersuCharacter mood="challenge" size="large" />
                                    </div>
                                </div>

                                {/* Text */}
                                <div className="text-center md:text-right flex-1">
                                    <h2 className="text-2xl font-bold text-white mb-4">
                                        هل تريد المتابعة بحسابك من <span className="text-purple-400">ZetsuservBlog</span>؟
                                    </h2>
                                    <p className="text-gray-400 mb-6">
                                        ستحصل على <span className="text-yellow-400 font-bold">5 ZCoins</span> كهدية ترحيبية لبدء التحديات!
                                    </p>

                                    {/* Features */}
                                    <div className="space-y-3 mb-8">
                                        <div className="flex items-center gap-3 text-gray-300">
                                            <Shield className="w-5 h-5 text-green-400" />
                                            <span>حسابك آمن ومحمي</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-300">
                                            <Sword className="w-5 h-5 text-red-400" />
                                            <span>تحديات يومية جديدة</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-300">
                                            <Sparkles className="w-5 h-5 text-yellow-400" />
                                            <span>مكافآت ورتب حصرية</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 mt-6">
                                <button
                                    onClick={handleContinueClick}
                                    className="flex-1 py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-lg shadow-green-500/30"
                                >
                                    نعم، ابدأ المغامرة! 🎮
                                </button>
                                <button
                                    onClick={cancelGameJoin}
                                    className="flex-1 py-4 px-6 bg-slate-700 text-gray-300 font-bold text-lg rounded-xl hover:bg-slate-600 transition-colors"
                                >
                                    لا، ربما لاحقاً
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="w-full animate-in fade-in slide-in-from-right duration-500">
                        <WorldMap onServerSelect={handleServerSelect} isConnecting={loading} />

                        {/* Back button */}
                        <div className="text-center mt-6">
                            <button
                                onClick={() => setStep(1)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ← العودة
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameLoginFlow;
