import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Zap, Trophy, Swords, Users, Star, ChevronRight } from 'lucide-react';

const ZersuHeroSection = () => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [stats, setStats] = useState({ players: 0, challenges: 0 });
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    useEffect(() => {
        // Check auth status
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setIsLoggedIn(!!user);
        };
        checkAuth();

        // Fetch stats
        const fetchStats = async () => {
            try {
                const [profilesResult, challengesResult] = await Promise.all([
                    supabase.from('game_profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('player_challenges').select('*', { count: 'exact', head: true }).eq('status', 'completed')
                ]);
                setStats({
                    players: profilesResult.count || 0,
                    challenges: challengesResult.count || 0
                });
            } catch (error) {
                console.log('Stats fallback to defaults');
                setStats({ players: 0, challenges: 0 });
            }
        };
        fetchStats();
    }, []);

    const handleChallengeClick = () => {
        if (isLoggedIn === false) {
            setShowLoginPrompt(true);
            setTimeout(() => setShowLoginPrompt(false), 3000);
            return;
        }
        navigate('/zetsuchallenge');
    };

    return (
        <section className="relative py-16 md:py-24 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px] -top-48 left-1/2 -translate-x-1/2"></div>
                <div className="absolute w-[400px] h-[400px] bg-blue-500/15 rounded-full blur-[100px] bottom-0 -left-48"></div>
                <div className="absolute w-[400px] h-[400px] bg-pink-500/15 rounded-full blur-[100px] bottom-0 -right-48"></div>
            </div>

            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{
                backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
            }}></div>

            <div className="container relative z-10 mx-auto px-4">
                <div className="flex flex-col items-center text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-6 animate-pulse">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <span className="text-purple-300 text-sm font-bold tracking-wider">ZERSU'S ARENA</span>
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                    </div>

                    {/* Character Image */}
                    <div
                        className="relative mb-8 group cursor-pointer"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        {/* Glow effect */}
                        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isHovered
                                ? 'bg-gradient-to-t from-purple-500/60 to-pink-500/40 blur-[80px] scale-150'
                                : 'bg-gradient-to-t from-purple-500/40 to-transparent blur-[60px] scale-125'
                            }`}></div>

                        {/* Character */}
                        <img
                            src={isHovered
                                ? "https://i.ibb.co/rGMR1Q98/zersu-villhaha.png"
                                : "https://i.ibb.co/5gMzf6XK/zersu-challengeface.png"
                            }
                            alt="Zersu"
                            className={`relative w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 object-contain transition-all duration-500 ${isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'
                                }`}
                        />

                        {/* Floating particles */}
                        <div className="absolute -top-4 -right-4 w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="absolute -bottom-4 -left-4 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                        <div className="absolute top-1/2 -right-8 w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-4">
                        <span className="text-white">هل أنت جاهز </span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-pulse">
                            لتحدي Zersu؟
                        </span>
                    </h2>

                    {/* Subtitle */}
                    <p className="text-gray-400 text-lg md:text-xl max-w-lg mb-8">
                        ادخل الساحة، أكمل التحديات، واربح <span className="text-yellow-400 font-bold">ZCoins</span> لتثبت جدارتك!
                    </p>

                    {/* Stats */}
                    <div className="flex flex-wrap justify-center gap-4 mb-10">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-gray-300">
                                <span className="text-white font-bold">{stats.players}</span> لاعب
                            </span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-gray-300">
                                <span className="text-white font-bold">{stats.challenges}</span> تحدي مكتمل
                            </span>
                        </div>
                    </div>

                    {/* CTA Button - Crystal style */}
                    <div className="relative">
                        <button
                            onClick={handleChallengeClick}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className="group relative px-10 py-5 text-xl font-black text-white rounded-2xl overflow-hidden transition-all duration-300 hover:scale-110 active:scale-95"
                        >
                            {/* Button glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 animate-gradient-x"></div>

                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                            {/* Border glow */}
                            <div className="absolute inset-0 rounded-2xl border-2 border-white/30 group-hover:border-white/50"></div>

                            {/* Content */}
                            <span className="relative z-10 flex items-center gap-3">
                                <Swords className="w-6 h-6" />
                                ابدأ التحدي الآن
                                <span className="text-2xl">💎</span>
                            </span>
                        </button>

                        {/* Pulse rings */}
                        <div className="absolute inset-0 -z-10 rounded-2xl bg-purple-500/50 animate-ping" style={{ animationDuration: '2s' }}></div>
                    </div>

                    {/* Login prompt toast */}
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

                    {/* Features */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 w-full max-w-3xl">
                        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-purple-500/50 transition-colors">
                            <Zap className="w-8 h-8 text-yellow-400 mb-3" />
                            <h3 className="text-white font-bold mb-1">تحديات يومية</h3>
                            <p className="text-gray-500 text-sm">تحديات جديدة كل يوم</p>
                        </div>
                        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-purple-500/50 transition-colors">
                            <Trophy className="w-8 h-8 text-purple-400 mb-3" />
                            <h3 className="text-white font-bold mb-1">اربح ZCoins</h3>
                            <p className="text-gray-500 text-sm">جوائز على كل تحدي</p>
                        </div>
                        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-purple-500/50 transition-colors">
                            <Star className="w-8 h-8 text-pink-400 mb-3" />
                            <h3 className="text-white font-bold mb-1">تصدّر الترتيب</h3>
                            <p className="text-gray-500 text-sm">نافس أفضل اللاعبين</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 3s ease infinite;
                }
            `}</style>
        </section>
    );
};

export default ZersuHeroSection;
