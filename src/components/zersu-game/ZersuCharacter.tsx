import React, { useState, useEffect } from 'react';

type Mood = 'normal' | 'happy' | 'sad' | 'angry' | 'laughing' | 'challenge';

interface ZersuCharacterProps {
    mood?: Mood;
    className?: string;
    size?: 'small' | 'medium' | 'large' | 'hero';
    showMessage?: boolean;
    message?: string;
}

// Image URLs
const ZERSU_IMAGES = {
    challenge: "https://i.ibb.co/5gMzf6XK/zersu-challengeface.png",
    sad: "https://i.ibb.co/Fk26rzFX/zersu-sad.png",
    laughing: "https://i.ibb.co/rGMR1Q98/zersu-villhaha.png",
};

// Preload all images on module load for faster display
const preloadImages = () => {
    Object.values(ZERSU_IMAGES).forEach(src => {
        const img = new Image();
        img.src = src;
    });
};

// Execute preload immediately
preloadImages();

const ZersuCharacter: React.FC<ZersuCharacterProps> = ({ 
    mood = 'normal', 
    className = '', 
    size = 'medium',
    showMessage = false,
    message = ''
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    let src = ZERSU_IMAGES.challenge; // Default challenge face

    switch (mood) {
        case 'sad':
        case 'angry':
            src = ZERSU_IMAGES.sad;
            break;
        case 'laughing':
        case 'happy':
            src = ZERSU_IMAGES.laughing;
            break;
        case 'challenge':
        case 'normal':
        default:
            src = ZERSU_IMAGES.challenge;
            break;
    }

    // Size classes - made larger for better visibility
    const sizeClasses = {
        small: 'w-28 h-28',
        medium: 'w-56 h-56',
        large: 'w-80 h-80',
        hero: 'w-72 h-72 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem]'
    };

    const sizeClass = sizeClasses[size] || sizeClasses.medium;

    // Reset load state when src changes
    useEffect(() => {
        setIsLoaded(false);
        setHasError(false);
    }, [src]);

    return (
        <div className={`character-container relative ${className} ${sizeClass}`}>
            {/* Glow effect behind character */}
            <div 
                className="absolute inset-0 bg-gradient-to-t from-purple-500/40 via-pink-500/20 to-transparent blur-3xl scale-125 animate-pulse"
                style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}
            />
            
            {/* Loading skeleton */}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 animate-pulse flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-4 border-purple-500/40 border-t-purple-500 animate-spin" />
                    </div>
                </div>
            )}
            
            {/* Character Image */}
            <img
                src={src}
                alt={`Zersu ${mood}`}
                loading="eager"
                decoding="async"
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                className={`
                    relative z-10 object-contain w-full h-full 
                    drop-shadow-[0_0_40px_rgba(168,85,247,0.5)]
                    hover:scale-105 transition-all duration-300
                    ${isLoaded ? 'opacity-100' : 'opacity-0'}
                `}
                style={{ transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-out' }}
            />

            {/* Message box at bottom of character */}
            {showMessage && message && isLoaded && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xs z-20">
                    <div className="relative">
                        {/* Speech bubble pointer */}
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-slate-800/95" />
                        {/* Message box */}
                        <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl border-2 border-purple-500/40 rounded-2xl px-4 py-3 shadow-2xl">
                            <p className="text-white text-center font-bold text-sm md:text-base">{message}</p>
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 animate-pulse pointer-events-none" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ZersuCharacter;
