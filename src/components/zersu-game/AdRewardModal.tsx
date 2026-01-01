import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Gift, X, Loader2, Volume2, Eye, Coins, Tv, ExternalLink } from 'lucide-react';

interface Ad {
    id: string;
    title: string;
    image_url: string;
    destination_url: string;
    size: string;
}

interface AdRewardModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    currentZcoins: number;
    onRewardEarned: (newZcoins: number) => void;
}

const ADFLOW_API_KEY = '6fd2fd44-702a-4e06-8092-7c0658707be2';
const ADFLOW_API_URL = 'https://rjiowrlvauerxsmueoej.supabase.co/functions/v1';
const REWARD_AMOUNT = 2;
const MIN_WATCH_TIME = 5;

const AdRewardModal: React.FC<AdRewardModalProps> = ({
    isOpen,
    onClose,
    userId,
    currentZcoins,
    onRewardEarned
}) => {
    const [ad, setAd] = useState<Ad | null>(null);
    const [loading, setLoading] = useState(true);
    const [watching, setWatching] = useState(false);
    const [countdown, setCountdown] = useState(MIN_WATCH_TIME);
    const [canClaim, setCanClaim] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isOpen]);

    const fetchAd = useCallback(async () => {
        setLoading(true);
        setError(null);
        setImageLoaded(false);

        const url = `${ADFLOW_API_URL}/get-ads?api_key=${ADFLOW_API_KEY}&size=300x250`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${ADFLOW_API_KEY}`,
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`خطأ: ${response.status}`);
            }

            const data = await response.json();

            if (data.ads && data.ads.length > 0) {
                const randomAd = data.ads[Math.floor(Math.random() * data.ads.length)];
                setAd(randomAd);
            } else {
                setError('لا توجد إعلانات متاحة حالياً');
            }
        } catch (err: any) {
            setError(`فشل في تحميل الإعلان`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchAd();
            setWatching(false);
            setCountdown(MIN_WATCH_TIME);
            setCanClaim(false);
        }
    }, [isOpen, fetchAd]);

    useEffect(() => {
        if (!watching || countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    setCanClaim(true);
                    setWatching(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [watching, countdown]);

    const handleStartWatching = () => {
        setWatching(true);
        setCountdown(MIN_WATCH_TIME);
    };

    const handleAdClick = () => {
        if (ad) {
            fetch(`${ADFLOW_API_URL}/track-ad`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ad_id: ad.id, event_type: 'click' })
            }).catch(() => { });

            window.open(ad.destination_url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleClaimReward = async () => {
        if (!canClaim || claiming) return;

        setClaiming(true);
        try {
            const newZcoins = currentZcoins + REWARD_AMOUNT;

            const { error } = await supabase
                .from('game_profiles')
                .update({ zcoins: newZcoins })
                .eq('user_id', userId);

            if (error) throw error;

            toast.success(`🎉 حصلت على ${REWARD_AMOUNT} ZCoins!`);
            onRewardEarned(newZcoins);
            onClose();
        } catch (err) {
            toast.error('فشل في الحصول على المكافأة');
        } finally {
            setClaiming(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-xl">
            <div className="w-full max-w-sm sm:max-w-md bg-gradient-to-br from-slate-900 via-amber-900/10 to-slate-900 rounded-2xl border-2 border-yellow-500/50 shadow-[0_0_60px_rgba(234,179,8,0.3)] overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header - Compact */}
                <div className="relative bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 px-4 py-3">
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 pr-8">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Tv className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">شاهد واربح! 📺</h2>
                            <div className="flex items-center gap-2">
                                <Gift className="w-4 h-4 text-yellow-200" />
                                <span className="text-yellow-100 text-sm font-bold">+{REWARD_AMOUNT} 💎</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-yellow-500/30"></div>
                                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-yellow-500 animate-spin"></div>
                            </div>
                            <p className="text-gray-400 mt-4 font-medium">جاري تحميل الإعلان...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <X className="w-8 h-8 text-red-400" />
                            </div>
                            <p className="text-red-400 mb-4 font-medium">{error}</p>
                            <button
                                onClick={fetchAd}
                                className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
                            >
                                حاول مرة أخرى
                            </button>
                        </div>
                    ) : ad ? (
                        <div className="space-y-4">
                            {/* Ad Container - Full Width with proper aspect ratio */}
                            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden border-2 border-slate-600 shadow-lg">
                                {/* Loading skeleton */}
                                {!imageLoaded && (
                                    <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                                    </div>
                                )}

                                {/* Ad Image - Responsive container */}
                                <div
                                    className="relative w-full cursor-pointer group"
                                    onClick={handleAdClick}
                                    style={{ minHeight: '200px' }}
                                >
                                    <img
                                        src={ad.image_url}
                                        alt={ad.title}
                                        onLoad={() => setImageLoaded(true)}
                                        className={`w-full h-auto object-contain transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                            } ${watching ? '' : 'group-hover:scale-105'}`}
                                        style={{
                                            maxHeight: '280px',
                                            minHeight: '180px',
                                            objectFit: 'contain',
                                            backgroundColor: '#1e293b'
                                        }}
                                    />

                                    {/* Click prompt */}
                                    {imageLoaded && !watching && !canClaim && (
                                        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ExternalLink className="w-3 h-3" />
                                            اضغط لزيارة الموقع
                                        </div>
                                    )}
                                </div>

                                {/* Ad label */}
                                <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
                                    إعلان
                                </div>

                                {/* Watching indicator - Small badge at bottom, ad stays visible */}
                                {watching && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-3 py-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Volume2 className="w-4 h-4 text-yellow-400 animate-pulse" />
                                                <span className="text-white text-sm font-medium">جاري المشاهدة...</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="relative w-8 h-8">
                                                    <svg className="w-8 h-8 transform -rotate-90">
                                                        <circle cx="16" cy="16" r="14" stroke="#334155" strokeWidth="3" fill="none" />
                                                        <circle
                                                            cx="16" cy="16" r="14"
                                                            stroke="#fbbf24"
                                                            strokeWidth="3"
                                                            fill="none"
                                                            strokeLinecap="round"
                                                            strokeDasharray={88}
                                                            strokeDashoffset={88 - (88 * (MIN_WATCH_TIME - countdown) / MIN_WATCH_TIME)}
                                                            className="transition-all duration-1000"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-sm font-bold text-yellow-400">{countdown}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Success overlay */}
                                {canClaim && (
                                    <div className="absolute inset-0 bg-green-500/30 backdrop-blur-sm flex items-center justify-center animate-pulse">
                                        <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold text-lg flex items-center gap-2 shadow-lg">
                                            <Eye className="w-6 h-6" />
                                            تمت المشاهدة! ✓
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Button */}
                            {!watching && !canClaim && (
                                <button
                                    onClick={handleStartWatching}
                                    disabled={!imageLoaded}
                                    className="w-full py-4 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black font-bold text-lg rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-yellow-500/30 disabled:opacity-50"
                                >
                                    <Play className="w-6 h-6" fill="currentColor" />
                                    ابدأ المشاهدة ({MIN_WATCH_TIME} ثوانٍ)
                                </button>
                            )}

                            {watching && (
                                <div className="text-center p-3 bg-slate-800/80 rounded-xl border border-yellow-500/30">
                                    <div className="flex items-center justify-center gap-2 text-yellow-400">
                                        <Volume2 className="w-5 h-5 animate-pulse" />
                                        <span className="font-bold">شاهد الإعلان حتى النهاية</span>
                                    </div>
                                </div>
                            )}

                            {canClaim && (
                                <button
                                    onClick={handleClaimReward}
                                    disabled={claiming}
                                    className="w-full py-4 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 text-white font-bold text-lg rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-500/40 disabled:opacity-50 animate-pulse"
                                >
                                    {claiming ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <Coins className="w-6 h-6" />
                                            احصل على {REWARD_AMOUNT} ZCoins! 🎉
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default AdRewardModal;
