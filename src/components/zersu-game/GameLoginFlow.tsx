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
            await supabase.rpc('increment_server_players' as any, { server_id: server });

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

    // Auth Error Modal - ENHANCED & SCROLLABLE
    if (showAuthError) {
        return (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                <style>{`
                    .horror-scroll::-webkit-scrollbar { width: 8px; }
                    .horror-scroll::-webkit-scrollbar-track { background: #1a0505; }
                    .horror-scroll::-webkit-scrollbar-thumb { background: #7f1d1d; border-radius: 4px; }
                    .horror-scroll::-webkit-scrollbar-thumb:hover { background: #991b1b; }
                `}</style>
                <div className="w-full max-w-md max-h-[90vh] bg-gradient-to-b from-black via-red-950/20 to-black rounded-3xl border border-red-900/50 shadow-[0_0_50px_rgba(220,38,38,0.2)] overflow-hidden animate-in zoom-in-95 duration-500 overflow-y-auto horror-scroll">

                    {/* Header with creepy gradient */}
                    <div className="relative bg-gradient-to-br from-red-950 to-black p-8 text-center border-b border-red-900/30">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-30"></div>
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-pulse">
                                <UserX className="w-10 h-10 text-red-500" />
                            </div>
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 drop-shadow-sm">
                                ❌ ACCESS DENIED
                            </h2>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 text-center space-y-6">
                        <div className="flex flex-col items-center gap-3 text-red-400">
                            <AlertTriangle className="w-8 h-8 animate-bounce" />
                            <span className="font-bold text-xl tracking-widest text-red-500 uppercase">Unregistered Soul</span>
                        </div>

                        <div className="space-y-2">
                            <p className="text-gray-400 text-lg">
                                You are not known in the realm of <span className="text-red-500 font-black font-mono">ZetsuservBlog</span>.
                            </p>
                            <p className="text-gray-500 text-sm">
                                Only registered warriors may challenge Zersu.
                            </p>
                        </div>

                        {/* Zersu mocking */}
                        <div className="relative py-4 group">
                            <div className="absolute inset-0 bg-red-500/5 blur-[40px] group-hover:bg-red-500/10 transition-all duration-700"></div>
                            <div className="relative transform hover:scale-105 transition-transform duration-300">
                                <ZersuCharacter type="idle" size="medium" />
                            </div>
                            <p className="text-red-400/80 italic text-sm mt-4 font-serif">
                                "Ha! You think you can enter MY arena without a name?
                                <br />
                                <span className="text-red-500 font-bold">Pathetic!</span> Go register... if you dare!" 😈
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col gap-4 mt-4">
                            <button
                                onClick={() => window.location.href = '/register?type=horror&redirectTo=/zetsuchallenge'}
                                className="relative w-full py-4 group overflow-hidden rounded-xl bg-red-950 border border-red-800 hover:border-red-500 transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_40px_rgba(220,38,38,0.5)]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-900 opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                <div className="relative flex items-center justify-center gap-2 text-red-100 font-black text-lg tracking-wider group-hover:scale-105 transition-transform">
                                    <span>REGISTER NOW</span>
                                    <span className="text-2xl">🩸</span>
                                </div>
                            </button>

                            <button
                                onClick={() => window.location.href = '/auth?type=horror&redirectTo=/zetsuchallenge'}
                                className="w-full py-3 bg-slate-900/50 text-purple-400 font-bold rounded-xl border border-purple-900/30 hover:bg-purple-900/20 hover:border-purple-500/50 transition-all"
                            >
                                I have an account - Login
                            </button>

                            <button
                                onClick={cancelGameJoin}
                                className="w-full py-3 text-gray-500 font-bold hover:text-gray-300 transition-colors text-sm"
                            >
                                Flee (Cancel)
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
                    <div className="relative w-full max-w-4xl mx-auto perspective-1000">
                        {/* Decorative glow behind the card */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/30 to-blue-600/30 blur-3xl rounded-full opacity-50 animate-pulse-slow"></div>

                        <div className="relative bg-slate-900/95 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden ring-1 ring-white/5 transform transition-all hover:scale-[1.005] duration-500">

                            {/* Cinematic Header */}
                            <div className="relative h-32 overflow-hidden bg-black">
                                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 to-transparent z-10"></div>
                                {/* Pattern overlay */}
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 via-blue-800/20 to-purple-800/20 animate-pulse"></div>

                                <div className="relative z-20 h-full flex items-center justify-between px-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30 backdrop-blur-md">
                                            <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="text-purple-200 text-xs font-bold tracking-[0.2em] uppercase">Enter the Arena</span>
                                            <h1 className="text-3xl font-black text-white italic tracking-tighter drop-shadow-lg">
                                                ZERSU'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">CHALLENGE</span>
                                            </h1>
                                        </div>
                                    </div>
                                    {/* Status Badge */}
                                    <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                                        <span className="text-gray-300 text-xs font-medium">Servers Online</span>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content Grid */}
                            <div className="grid md:grid-cols-[1.2fr,2fr] gap-0">

                                {/* Left Column: Avatar Display */}
                                <div className="relative min-h-[400px] bg-gradient-to-b from-slate-800/50 to-slate-900/50 flex items-center justify-center p-8 border-r border-white/5 overflow-hidden">
                                    {/* Spotlight effect */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-purple-500/10 via-transparent to-transparent blur-xl"></div>

                                    <div className="relative z-10 transform scale-125 hover:scale-135 transition-transform duration-700 ease-out cursor-pointer group">
                                        <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full group-hover:bg-purple-500/40 transition-all duration-500"></div>
                                        <ZersuCharacter type="idle" size="large" />
                                    </div>

                                    {/* Floor reflection simulation */}
                                    <div className="absolute bottom-10 w-32 h-4 bg-black/40 blur-md rounded-[100%]"></div>
                                </div>

                                {/* Right Column: Content & Actions */}
                                <div className="p-8 md:p-10 flex flex-col justify-center text-right" dir="rtl">
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                                                هل أنت جاهز للمواجهة <br />
                                                في <span className="text-transparent bg-clip-text bg-gradient-to-l from-purple-400 to-cyan-400">ZetsuservBlog</span>؟
                                            </h2>
                                            <p className="mt-4 text-lg text-slate-400 leading-relaxed font-light">
                                                سجّل دخولك الآن واحصل على حزمة البداية المجانية:
                                                <span className="mr-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-bold">
                                                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span> 5 ZCoins
                                                </span>
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 py-4">
                                            {[
                                                { icon: Shield, text: "حماية كاملة للحساب", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                                { icon: Sword, text: "نظام قتال متقدم (PvP)", color: "text-red-400", bg: "bg-red-500/10" },
                                                { icon: Sparkles, text: "جوائز يومية قيمة", color: "text-amber-400", bg: "bg-amber-500/10" }
                                            ].map((feature, idx) => (
                                                <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-800 transition-colors group">
                                                    <div className={`p-2 rounded-lg ${feature.bg} ${feature.color} group-hover:scale-110 transition-transform`}>
                                                        <feature.icon className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-gray-300 font-medium">{feature.text}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-col gap-3 pt-4">
                                            <button
                                                onClick={handleContinueClick}
                                                className="relative group w-full py-4 bg-gradient-to-l from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-lg rounded-xl overflow-hidden shadow-lg shadow-purple-900/20 transition-all hover:-translate-y-1"
                                            >
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out skew-y-12"></div>
                                                <span className="relative flex items-center justify-center gap-2">
                                                    نعم، ابدأ التحدي!
                                                    <Sword className="w-5 h-5 rotate-90" />
                                                </span>
                                            </button>

                                            <button
                                                onClick={cancelGameJoin}
                                                className="w-full py-4 text-slate-500 font-medium hover:text-slate-300 transition-colors text-sm hover:underline decoration-slate-700 underline-offset-4"
                                            >
                                                لا، ليس الآن
                                            </button>
                                        </div>
                                    </div>
                                </div>
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
