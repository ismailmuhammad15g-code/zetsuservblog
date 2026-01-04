import React, { useState, useEffect, useRef } from 'react';

// Import local images for optimal bundling
import idleImage from '../../images/idle.png';
import shopkeeperImage from '../../images/shopkeeper.png';

type CharacterType = 'idle' | 'shopkeeper';

interface ZersuCharacterProps {
    type?: CharacterType;
    className?: string;
    size?: 'small' | 'medium' | 'large' | 'xl' | 'hero';
}

const ZersuCharacter: React.FC<ZersuCharacterProps> = ({
    type = 'idle',
    className = '',
    size = 'medium'
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get the correct image source
    const imageSrc = type === 'shopkeeper' ? shopkeeperImage : idleImage;

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Preload image when in view
    useEffect(() => {
        if (isInView) {
            const img = new Image();
            img.src = imageSrc;
            img.onload = () => setIsLoaded(true);
        }
    }, [isInView, imageSrc]);

    // Size classes - responsive and optimized
    const sizeClasses: Record<string, string> = {
        small: 'w-20 h-20 sm:w-24 sm:h-24',
        medium: 'w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48',
        large: 'w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72',
        xl: 'w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96',
        hero: 'w-64 h-64 sm:w-80 sm:h-80 md:w-[400px] md:h-[400px] lg:w-[500px] lg:h-[500px]'
    };

    return (
        <div
            ref={containerRef}
            className={`relative flex items-center justify-center ${sizeClasses[size]} ${className}`}
        >
            {/* Skeleton loader - shows while image is loading */}
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3/4 h-3/4 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 animate-pulse" />
                    <div className="absolute w-1/2 h-1/2 rounded-full bg-purple-500/30 blur-2xl animate-ping" style={{ animationDuration: '2s' }} />
                </div>
            )}

            {/* Glow effect behind character */}
            <div
                className={`absolute inset-0 bg-gradient-to-t from-purple-600/40 via-purple-500/20 to-transparent blur-3xl rounded-full transition-opacity duration-700
                    ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Main character image */}
            {isInView && (
                <img
                    src={imageSrc}
                    alt="Zersu Character"
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setIsLoaded(true)}
                    className={`relative z-10 w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(147,51,234,0.5)] transition-all duration-700 ease-out
                        ${isLoaded ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'}
                        hover:scale-105 hover:drop-shadow-[0_25px_60px_rgba(168,85,247,0.6)]
                    `}
                />
            )}
        </div>
    );
};

export default ZersuCharacter;
