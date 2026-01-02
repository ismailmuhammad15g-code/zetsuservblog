import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gift, X, Loader2, Package, Sparkles, ExternalLink } from 'lucide-react';

interface AdRewardModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    currentZcoins: number;
    onRewardEarned: (newZcoins: number) => void;
}

const MONETAG_DIRECT_LINK = 'https://otieu.com/4/10409516';
const REWARD_AMOUNT = 2;

const AdRewardModal: React.FC<AdRewardModalProps> = ({
    isOpen,
    onClose,
    userId,
    currentZcoins,
    onRewardEarned
}) => {
    const [claiming, setClaiming] = useState(false);

    const handleGetSupplies = async () => {
        if (claiming) return;

        setClaiming(true);

        try {
            // Open the Monetag direct link in a new tab
            window.open(MONETAG_DIRECT_LINK, '_blank', 'noopener,noreferrer');

            // Immediately increment Zcoins
            const newZcoins = currentZcoins + REWARD_AMOUNT;

            // Try to save to database
            const { error } = await supabase
                .from('game_profiles')
                .update({ zcoins: newZcoins })
                .eq('user_id', userId);

            if (error) {
                console.error('Database error:', error);
                // Fallback: Save to localStorage
                localStorage.setItem('zetsu_zcoins_backup', newZcoins.toString());
            }

            // Also save to localStorage as backup
            localStorage.setItem('zetsu_zcoins_backup', newZcoins.toString());

            // Show success message
            toast.success('🎉 رائع! حصلت على موارد لمحاربة زيرسو!', {
                description: `+${REWARD_AMOUNT} ZCoins`,
                duration: 4000,
            });

            // Notify parent component
            onRewardEarned(newZcoins);

            // Close modal after short delay
            setTimeout(() => {
                onClose();
            }, 500);

        } catch (err) {
            console.error('Error:', err);
            toast.error('حدث خطأ، حاول مرة أخرى');
        } finally {
            setClaiming(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <div className="w-full max-w-sm bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-2xl border-2 border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.4)] overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="relative bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 px-6 py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                صندوق الإمدادات
                                <Sparkles className="w-5 h-5 text-yellow-300" />
                            </h2>
                            <p className="text-purple-100 text-sm">احصل على موارد لمحاربة زيرسو!</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Supply Crate Visual */}
                    <div className="relative flex justify-center">
                        <div className="relative">
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>

                            {/* Crate */}
                            <div className="relative w-32 h-32 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 rounded-2xl border-4 border-amber-400 shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform">
                                <div className="absolute inset-2 border-2 border-amber-300/50 rounded-xl"></div>
                                <div className="text-5xl">📦</div>

                                {/* Sparkles */}
                                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300 animate-pulse" />
                                <Sparkles className="absolute -bottom-2 -left-2 w-5 h-5 text-pink-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
                            </div>
                        </div>
                    </div>

                    {/* Reward Info */}
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-full border border-yellow-500/30">
                            <Gift className="w-5 h-5 text-yellow-400" />
                            <span className="text-yellow-300 font-bold text-lg">+{REWARD_AMOUNT} 💎 ZCoins</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleGetSupplies}
                        disabled={claiming}
                        className="w-full py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-purple-500/40 disabled:opacity-50"
                    >
                        {claiming ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <Package className="w-6 h-6" />
                                Get Supplies (+{REWARD_AMOUNT} Zcoins)
                                <ExternalLink className="w-4 h-4 opacity-70" />
                            </>
                        )}
                    </button>

                    {/* Info text */}
                    <p className="text-center text-gray-500 text-xs">
                        سيتم فتح رابط الراعي في تبويب جديد
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdRewardModal;
