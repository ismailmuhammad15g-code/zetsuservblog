import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GameContext } from '../../contexts/GameContext';
import { Sparkles, Star, Swords, Trophy, TrendingUp, Shield, Zap } from 'lucide-react';
import ZersuCharacter from './ZersuCharacter';

const ZersuHeroSection = () => {
    const navigate = useNavigate();
    const gameContext = useContext(GameContext);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    const userProfile = gameContext?.userProfile;
    const username = userProfile?.username || 'Challenger';
    const level = userProfile?.level || 1;
    const xp = userProfile?.xp || 0;
    const zcoins = userProfile?.zcoins || 0;
    const wins = userProfile?.wins || 0;
    const losses = userProfile?.losses || 0;

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setIsLoggedIn(!!user);
        };
        checkAuth();
    }, []);

    const handleChallengeClick = () => {
        if (isLoggedIn === false) {
            setShowLoginPrompt(true);
            setTimeout(() => setShowLoginPrompt(false), 3000);
            return;
        }
        navigate('/zetsuchallenge');
    };

    const xpToNextLevel = level * 25;
    const xpProgress = Math.min((xp / xpToNextLevel) * 100, 100);

    return (
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden py-8 px-4">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950/50 to-slate-950" />

            {/* Floating geometric shapes */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-20 h-20 border border-purple-500/20 rotate-45 animate-float" style={{ animationDuration: '6s' }} />
                <div className="absolute top-40 right-20 w-16 h-16 border border-purple-500/15 rotate-12 animate-float" style={{ animationDuration: '8s', animationDelay: '1s' }} />
                <div className="absolute bottom-32 left-1/4 w-12 h-12 border border-purple-500/10 -rotate-12 animate-float" style={{ animationDuration: '7s', animationDelay: '2s' }} />
                <div className="absolute bottom-20 right-1/3 w-24 h-24 border border-purple-500/10 rotate-45 animate-float" style={{ animationDuration: '9s', animationDelay: '0.5s' }} />
            </div>

            {/* Central glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px]" />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">

                {/* Top Header - Username & Level */}
                <div className="flex flex-col items-center mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-yellow-500/90 text-black text-xs font-black rounded-md shadow-lg">
                            {zcoins} 💎
                        </span>
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                            تحدِ <span className="text-purple-400">{username}</span>
                        </h1>
                    </div>

                    {/* XP Bar */}
                    <div className="flex items-center gap-3 w-full max-w-xs">
                        <div className="flex items-center gap-1.5 text-yellow-400">
                            <Star className="w-4 h-4 fill-yellow-400" />
                            <span className="text-sm font-bold">مستوى {level}</span>
                        </div>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${xpProgress}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-400">XP {xp}/{xpToNextLevel}</span>
                    </div>
                </div>

                {/* Character Display - Large and Prominent */}
                <div className="relative mb-6">
                    <ZersuCharacter
                        type="idle"
                        size="hero"
                        className="relative z-10"
                    />

                    {/* Floating sparkles around character */}
                    <div className="absolute top-10 right-0 text-yellow-400 animate-bounce" style={{ animationDelay: '0.2s' }}>
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="absolute top-20 left-0 text-purple-400 animate-bounce" style={{ animationDelay: '0.5s' }}>
                        <Sparkles className="w-4 h-4" />
                    </div>
                </div>

                {/* Stats Panel - Glassmorphic */}
                <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 mb-6 shadow-2xl">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Wins */}
                        <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                                <span className="text-gray-300 text-sm">انتصاراتك</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold">{wins}</span>
                                <div className="w-12 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${wins > 0 ? Math.min((wins / (wins + losses || 1)) * 100, 100) : 0}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* XP Points */}
                        <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                <span className="text-gray-300 text-sm">نقاط الخبرة</span>
                            </div>
                            <span className="text-white font-bold">{xp}</span>
                        </div>

                        {/* Losses */}
                        <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-red-400" />
                                <span className="text-gray-300 text-sm">انتصارات حيدر</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold">{losses}</span>
                                <div className="w-12 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${losses > 0 ? Math.min((losses / (wins + losses || 1)) * 100, 100) : 0}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Easy Points */}
                        <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-400" />
                                <span className="text-gray-300 text-sm">نقاط السهولة</span>
                            </div>
                            <span className="text-white font-bold">{Math.floor(xp * 0.4)}</span>
                        </div>
                    </div>
                </div>

                {/* Crystal Ball CTA */}
                <div className="relative group cursor-pointer mb-8" onClick={handleChallengeClick}>
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-purple-600 p-1 shadow-[0_0_40px_rgba(168,85,247,0.6)] group-hover:shadow-[0_0_60px_rgba(168,85,247,0.8)] transition-all duration-300 group-hover:scale-110">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-900 to-slate-900 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400/50 via-pink-400/30 to-transparent blur-sm" />
                            <Swords className="absolute w-8 h-8 text-purple-300" />
                        </div>
                    </div>
                    <p className="text-center text-purple-300 text-xs mt-2 font-medium">ابدأ التحدي</p>
                </div>

                {/* Login Prompt */}
                {showLoginPrompt && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-500/90 text-white font-bold rounded-xl shadow-lg animate-bounce">
                        ⚠️ يجب تسجيل الدخول أولاً!
                        <button
                            onClick={() => navigate('/auth')}
                            className="ml-4 px-3 py-1 bg-white text-red-500 rounded-lg text-sm hover:bg-gray-100"
                        >
                            تسجيل الدخول
                        </button>
                    </div>
                )}
            </div>

            {/* Animation keyframes */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(45deg); }
                    50% { transform: translateY(-20px) rotate(45deg); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
            `}</style>
        </section>
    );
};

export default ZersuHeroSection;
