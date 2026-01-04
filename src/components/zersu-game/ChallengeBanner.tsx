import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Trophy, Swords } from 'lucide-react';
import idleImage from '../../images/idle.png';
import zcoinImage from '../../images/zcoin.png';

const ChallengeBanner = () => {
    const navigate = useNavigate();

    return (
        <div className="relative overflow-hidden rounded-2xl my-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border border-purple-500/30 shadow-2xl shadow-purple-500/20">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ top: '20%', left: '10%', animationDelay: '0s' }}></div>
                <div className="absolute w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{ top: '60%', left: '80%', animationDelay: '0.5s' }}></div>
                <div className="absolute w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ top: '80%', left: '30%', animationDelay: '1s' }}></div>
                <div className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ top: '10%', left: '90%' }}></div>
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-900/50 via-transparent to-pink-900/50"></div>
            </div>

            <div className="relative z-10 p-8 flex flex-col lg:flex-row items-center gap-8">
                {/* Left Content */}
                <div className="flex-1 text-center lg:text-left">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 mb-4">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 text-sm font-bold tracking-wider">NEW GAME MODE</span>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-200 mb-4 tracking-tight">
                        ZERSU'S ARENA
                    </h2>

                    {/* Subtitle */}
                    <p className="text-gray-300 text-lg mb-6 max-w-md">
                        هل تجرؤ على التحدي؟ <span className="text-purple-400 font-bold">Zersu</span> ينتظرك لاختبار مهاراتك!
                    </p>

                    {/* Stats Row */}
                    <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-6">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            <span className="text-white text-sm">+500 لاعب</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                            <Zap className="w-5 h-5 text-blue-400" />
                            <span className="text-white text-sm">تحديات يومية</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                            <Swords className="w-5 h-5 text-red-400" />
                            <span className="text-white text-sm">جوائز ZCoins</span>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={() => navigate('/zetsuchallenge')}
                        className="group relative inline-flex items-center gap-3 px-8 py-4 text-lg font-bold text-white rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        {/* Button gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-size-200 animate-gradient-x"></div>
                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        <span className="relative z-10 flex items-center gap-2">
                            <Swords className="w-5 h-5" />
                            ابدأ التحدي الآن
                            <img src={zcoinImage} className="w-5 h-5" alt="ZCoins" />
                        </span>
                    </button>
                </div>

                {/* Right - Character */}
                <div className="relative flex-shrink-0">
                    {/* Glow effect behind character */}
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-500/50 to-transparent blur-3xl scale-150"></div>

                    {/* Character image */}
                    <div className="relative">
                        <img
                            src={idleImage}
                            alt="Zersu"
                            className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:drop-shadow-[0_0_50px_rgba(168,85,247,0.8)] transition-all duration-500 hover:scale-110"
                        />
                        {/* Floating badge */}
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce shadow-lg">
                            BOSS
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom decorative line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
        </div>
    );
};

export default ChallengeBanner;
