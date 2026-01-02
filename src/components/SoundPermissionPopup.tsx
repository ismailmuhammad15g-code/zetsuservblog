import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, X, Sparkles } from 'lucide-react';
import { useSound } from '@/contexts/SoundContext';

export const SoundPermissionPopup: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const { isMuted, toggleMute, playSound } = useSound();

    useEffect(() => {
        // Check if user has already made a choice
        const hasChosenSound = localStorage.getItem('zetsu_sound_permission');

        if (!hasChosenSound) {
            // Show popup after a short delay
            const timer = setTimeout(() => {
                setIsVisible(true);
                setIsAnimating(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('zetsu_sound_permission', 'accepted');
        // Ensure audio is unmuted
        if (isMuted) {
            toggleMute();
        }
        // Play a welcoming sound
        playSound('success');
        closePopup();
    };

    const handleDecline = () => {
        localStorage.setItem('zetsu_sound_permission', 'declined');
        // Mute the audio
        if (!isMuted) {
            toggleMute();
        }
        closePopup();
    };

    const closePopup = () => {
        setIsAnimating(false);
        setTimeout(() => setIsVisible(false), 300);
    };

    if (!isVisible) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-[100] transition-all duration-300 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
            <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-purple-500/20 p-4 max-w-[280px]">
                {/* Close button */}
                <button
                    onClick={handleDecline}
                    className="absolute -top-2 -left-2 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-colors"
                >
                    <X className="w-3 h-3 text-gray-400" />
                </button>

                {/* Icon */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Volume2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm flex items-center gap-1">
                            تجربة تفاعلية
                            <Sparkles className="w-3 h-3 text-yellow-400" />
                        </h3>
                        <p className="text-gray-400 text-xs">مؤثرات صوتية</p>
                    </div>
                </div>

                {/* Message */}
                <p className="text-gray-300 text-xs mb-4 leading-relaxed">
                    هل تريد تفعيل الصوت لتجربة أفضل؟ 🎵
                </p>

                {/* Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleAccept}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-bold rounded-lg transition-all transform hover:scale-105"
                    >
                        <Volume2 className="w-3.5 h-3.5" />
                        نعم
                    </button>
                    <button
                        onClick={handleDecline}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-gray-300 text-xs font-medium rounded-lg transition-all"
                    >
                        <VolumeX className="w-3.5 h-3.5" />
                        لا
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SoundPermissionPopup;
