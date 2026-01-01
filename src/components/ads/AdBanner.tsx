import React, { useState, useEffect, useMemo } from 'react';
import { useAds, AdSize, Ad } from '@/hooks/useAdSystem';
import { ExternalLink } from 'lucide-react';

interface AdBannerProps {
    size: AdSize;
    className?: string;
    showLabel?: boolean;
    rounded?: boolean;
    shadow?: boolean;
}

const sizeMap: Record<AdSize, { width: number; height: number; label: string }> = {
    '728x90': { width: 728, height: 90, label: 'Leaderboard' },
    '300x250': { width: 300, height: 250, label: 'Medium Rectangle' },
    '336x280': { width: 336, height: 280, label: 'Large Rectangle' },
    '160x600': { width: 160, height: 600, label: 'Wide Skyscraper' },
    '320x50': { width: 320, height: 50, label: 'Mobile Banner' },
};

export const AdBanner: React.FC<AdBannerProps> = ({
    size,
    className = '',
    showLabel = true,
    rounded = true,
    shadow = true,
}) => {
    const { ads, loading, error, trackClick } = useAds(size);
    const dimensions = sizeMap[size];
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Pick a random ad (memoized to prevent re-picking on re-render)
    const ad = useMemo(() => {
        if (ads.length === 0) return null;
        return ads[Math.floor(Math.random() * ads.length)];
    }, [ads]);

    // Reset image state when ad changes
    useEffect(() => {
        setImageLoaded(false);
        setImageError(false);
    }, [ad?.id]);

    const handleClick = () => {
        if (!ad) return;
        trackClick(ad.id);
        window.open(ad.destination_url, '_blank', 'noopener,noreferrer');
    };

    // Loading skeleton
    if (loading) {
        return (
            <div
                className={`animate-pulse bg-gradient-to-br from-slate-700 to-slate-800 ${rounded ? 'rounded-xl' : ''} ${className}`}
                style={{
                    width: '100%',
                    maxWidth: dimensions.width,
                    height: dimensions.height,
                }}
            >
                <div className="w-full h-full flex items-center justify-center">
                    <div className="text-gray-500 text-sm">جاري التحميل...</div>
                </div>
            </div>
        );
    }

    // No ads or error - return nothing
    if (error || !ad || imageError) {
        return null;
    }

    return (
        <div
            className={`relative overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] ${rounded ? 'rounded-xl' : ''} ${shadow ? 'shadow-lg hover:shadow-xl' : ''} ${className}`}
            style={{
                width: '100%',
                maxWidth: dimensions.width,
                height: dimensions.height,
            }}
            onClick={handleClick}
        >
            {/* Loading shimmer while image loads */}
            {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 animate-pulse flex items-center justify-center">
                    <div className="text-gray-500 text-sm">جاري التحميل...</div>
                </div>
            )}

            {/* Ad Image */}
            <img
                src={ad.image_url}
                alt={ad.title}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={`w-full h-full object-cover transition-all duration-300 group-hover:brightness-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
            />

            {/* Ad Label */}
            {showLabel && imageLoaded && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] rounded font-medium">
                    إعلان
                </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-black px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shadow-lg">
                    <ExternalLink className="w-3.5 h-3.5" />
                    زيارة
                </div>
            </div>
        </div>
    );
};

// Specialized components for common use cases
export const HeaderAd: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`hidden md:flex justify-center py-2 ${className}`}>
        <AdBanner size="728x90" />
    </div>
);

export const SidebarAd: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`sticky top-20 ${className}`}>
        <AdBanner size="300x250" />
    </div>
);

export const MobileAd: React.FC<{ className?: string; fixed?: boolean }> = ({ className, fixed = false }) => (
    <div className={`md:hidden ${fixed ? 'fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur p-2' : ''} ${className}`}>
        <AdBanner size="320x50" className="mx-auto" />
    </div>
);

export const InContentAd: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`my-6 flex justify-center ${className}`}>
        <AdBanner size="336x280" />
    </div>
);

export const SkyscraperAd: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`hidden lg:block sticky top-20 ${className}`}>
        <AdBanner size="160x600" />
    </div>
);

export default AdBanner;
