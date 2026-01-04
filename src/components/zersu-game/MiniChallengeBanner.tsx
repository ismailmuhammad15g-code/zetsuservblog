import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Swords } from 'lucide-react';
import idleImage from '../../images/idle.png';

const MiniChallengeBanner = () => {
    const [showBanner, setShowBanner] = useState(true);
    const navigate = useNavigate();

    if (!showBanner) return null;

    return (
        <div className="sticky top-16 z-40 bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-md border-b border-purple-500/30 shadow-lg shadow-purple-500/10">
            <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
                {/* Left side */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                        src={idleImage}
                        alt="Zersu"
                        className="w-10 h-10 object-contain flex-shrink-0 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    />
                    <div className="min-w-0 hidden sm:block">
                        <p className="text-white text-sm font-medium truncate">
                            ملل من المنشورات العادية؟ <span className="text-purple-400 font-bold">تحدى Zersu!</span>
                        </p>
                    </div>
                    <div className="min-w-0 sm:hidden">
                        <p className="text-white text-xs truncate">
                            <span className="text-purple-400 font-bold">تحدى Zersu!</span> 💎
                        </p>
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => navigate('/zetsuchallenge')}
                        className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-full hover:scale-105 transition-transform shadow-lg shadow-purple-500/30"
                    >
                        <Swords className="w-4 h-4" />
                        <span className="hidden sm:inline">ابدأ</span>
                        <span className="sm:hidden">💎</span>
                    </button>
                    <button
                        onClick={() => setShowBanner(false)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        aria-label="إغلاق"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MiniChallengeBanner;
