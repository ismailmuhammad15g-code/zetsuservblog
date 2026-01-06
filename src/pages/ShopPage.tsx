import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import BottomNavigation from '@/components/zersu-game/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, Sparkles, Palette, Music, Image, Check, Crown, Zap, Shield, Gem, Gift } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import DailyRewardsModal from '@/components/shop/DailyRewardsModal';
import shopkeeperImage from '../images/shopkeeper.png';
import zcoinImage from '../images/zcoin.png';
import zgoldImage from '../images/zgold.png';

interface ShopItem {
    id: string;
    name: string;
    nameAr: string;
    description: string;
    price: number;
    currency: 'zcoins' | 'zgold';
    icon: React.ReactNode;
    category: 'background' | 'emoji' | 'sound' | 'badge' | 'aura';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    preview?: string;
}

const shopItems: ShopItem[] = [
    // --- ZGold Items (Premium) ---
    {
        id: 'aura-legendary',
        name: 'Legendary Aura',
        nameAr: 'هالة الأسطورة ⚡',
        description: 'هالة ذهبية متحركة تظهر خلفك في التحديات',
        price: 50,
        currency: 'zgold',
        icon: <Zap className="w-6 h-6 text-yellow-400" />,
        category: 'aura',
        rarity: 'legendary',
        preview: 'linear-gradient(45deg, #FFD700, #FFA500)'
    },
    {
        id: 'bg-cyber-city',
        name: 'Cyber City',
        nameAr: 'مدينة السايبر 🌃',
        description: 'خلفية حصرية لمدينة المستقبل',
        price: 25,
        currency: 'zgold',
        icon: <Image className="w-6 h-6 text-cyan-400" />,
        category: 'background',
        rarity: 'epic',
        preview: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)'
    },
    {
        id: 'badge-vip',
        name: 'VIP Badge',
        nameAr: 'شارة VIP 👑',
        description: 'تظهر للجميع أنك لاعب مميز',
        price: 15,
        currency: 'zgold',
        icon: <Crown className="w-6 h-6 text-purple-400" />,
        category: 'badge',
        rarity: 'epic'
    },

    // --- ZCoins Items (Regular) ---
    {
        id: 'emoji-pack-1',
        name: 'Emoji Starter',
        nameAr: 'حزمة إيموجي البداية 😄',
        description: 'مجموعة إيموجي أساسية للمحادثة',
        price: 30,
        currency: 'zcoins',
        icon: <Sparkles className="w-6 h-6 text-blue-400" />,
        category: 'emoji',
        rarity: 'common'
    },
    {
        id: 'sound-cheer',
        name: 'Crowd Cheer',
        nameAr: 'تشجيع الجمهور 📣',
        description: 'صوت حماسي عند الفوز',
        price: 50,
        currency: 'zcoins',
        icon: <Music className="w-6 h-6 text-green-400" />,
        category: 'sound',
        rarity: 'rare'
    }
];

const ShopPage = () => {
    const [activeTab, setActiveTab] = useState('shop');
    const [userProfile, setUserProfile] = useState<{ zcoins: number; zgold: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasedItems, setPurchasedItems] = useState<string[]>([]);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'premium' | 'regular'>('all');
    const [showRewardsModal, setShowRewardsModal] = useState(false);
    const [showCouponInput, setShowCouponInput] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Fetch game profile with zgold
                    const { data: profile } = await supabase
                        .from('game_profiles')
                        .select('zcoins, zgold')
                        .eq('user_id', user.id)
                        .single();

                    if (profile) {
                        setUserProfile({
                            zcoins: profile.zcoins ?? 0,
                            zgold: profile.zgold ?? 0
                        });
                    }

                    // Fetch purchased items from inventory
                    const { data: inventory } = await supabase
                        .from('user_inventory')
                        .select('item_id')
                        .eq('user_id', user.id);

                    if (inventory) {
                        setPurchasedItems(inventory.map(item => item.item_id));
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const handlePurchase = async (item: ShopItem) => {
        if (!userProfile) return;

        const currentBalance = item.currency === 'zgold' ? userProfile.zgold : userProfile.zcoins;

        if (currentBalance < item.price) {
            toast.error(
                item.currency === 'zgold'
                    ? 'رصيد ZGold غير كافي! اشحن الآن'
                    : 'رصيد ZCoins غير كافي! أكمل التحديات'
            );
            return;
        }

        if (purchasedItems.includes(item.id)) {
            toast.info('لديك هذا العنصر بالفعل!');
            return;
        }

        setPurchasing(item.id);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('يجب تسجيل الدخول أولاً!');
                return;
            }

            // First, add item to inventory (this will fail if duplicate)
            const { error: inventoryError } = await supabase
                .from('user_inventory')
                .insert({
                    user_id: user.id,
                    item_id: item.id,
                    item_type: item.category,
                    item_name: item.name,
                    item_name_ar: item.nameAr,
                    purchase_price: item.price,
                    currency_type: item.currency,
                    is_equipped: false
                });

            if (inventoryError) {
                // If duplicate, show appropriate message
                if (inventoryError.code === '23505') { // Unique violation
                    toast.info('لديك هذا العنصر بالفعل!');
                } else {
                    throw inventoryError;
                }
                return;
            }

            // Only deduct currency after inventory insert succeeds
            const updateData = item.currency === 'zgold'
                ? { zgold: userProfile.zgold - item.price }
                : { zcoins: userProfile.zcoins - item.price };

            const { error: updateError } = await supabase
                .from('game_profiles')
                .update(updateData)
                .eq('user_id', user.id);

            if (updateError) {
                // Rollback: Remove the inventory item we just added
                await supabase
                    .from('user_inventory')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('item_id', item.id);
                throw updateError;
            }

            // Update local state
            setUserProfile(prev => prev ? { ...prev, ...updateData } : null);
            setPurchasedItems([...purchasedItems, item.id]);

            // Celebration effects
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: item.rarity === 'legendary'
                    ? ['#FFD700', '#FFA500', '#FF6347']
                    : ['#00CED1', '#9370DB', '#FFD700']
            });

            // Show premium success toast
            toast.success(
                <div className="flex items-center gap-3">
                    <div className="text-3xl">🎉</div>
                    <div>
                        <p className="font-bold text-lg">تم الشراء بنجاح!</p>
                        <p>حصلت على {item.nameAr}</p>
                    </div>
                </div>,
                {
                    duration: 5000,
                    style: {
                        background: item.rarity === 'legendary'
                            ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '16px'
                    }
                }
            );

        } catch (error) {
            console.error('Purchase error:', error);
            toast.error('فشل في الشراء، حاول مرة أخرى');
        } finally {
            setPurchasing(null);
        }
    };

    const handleRedeemCoupon = async () => {
        if (!couponCode.trim() || redeeming) return;

        setRedeeming(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('يجب تسجيل الدخول أولاً!');
                return;
            }

            const { data, error } = await supabase.rpc('redeem_coupon', {
                p_user_id: user.id,
                p_coupon_code: couponCode.trim()
            });

            if (error) throw error;

            if (data && data.length > 0 && data[0].success) {
                const reward = data[0];

                // Celebration effects
                confetti({
                    particleCount: 150,
                    spread: 90,
                    origin: { y: 0.5 },
                    colors: reward.reward_currency === 'zgold'
                        ? ['#FFD700', '#FFA500', '#FF6347']
                        : ['#00CED1', '#9370DB', '#FFD700', '#FF69B4']
                });

                // Update local balance
                if (reward.reward_currency === 'zcoins') {
                    setUserProfile(prev => prev ? { ...prev, zcoins: prev.zcoins + reward.reward_amount } : null);
                } else {
                    setUserProfile(prev => prev ? { ...prev, zgold: prev.zgold + reward.reward_amount } : null);
                }

                // Success toast
                toast.success(
                    <div className="flex items-center gap-3">
                        <div className="text-4xl">🎊</div>
                        <div>
                            <p className="font-bold text-lg">تم تفعيل القسيمة بنجاح!</p>
                            <p>حصلت على {reward.reward_amount} {reward.reward_currency === 'zgold' ? 'ZGold' : 'ZCoins'}!</p>
                        </div>
                    </div>,
                    {
                        duration: 6000,
                        style: {
                            background: reward.reward_currency === 'zgold'
                                ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '16px'
                        }
                    }
                );

                // Reset and close
                setCouponCode('');
                setShowCouponInput(false);
            } else {
                const errorMsg = data[0]?.message || 'كود القسيمة غير صالح';
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error('Coupon redemption error:', error);
            toast.error('فشل في تفعيل القسيمة، حاول مرة أخرى');
        } finally {
            setRedeeming(false);
        }
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'legendary': return 'border-yellow-500/50 from-yellow-900/40 to-amber-900/40 shadow-yellow-500/20';
            case 'epic': return 'border-purple-500/50 from-purple-900/40 to-fuchsia-900/40 shadow-purple-500/20';
            case 'rare': return 'border-blue-500/50 from-blue-900/40 to-cyan-900/40 shadow-blue-500/20';
            default: return 'border-slate-700 from-slate-800 to-slate-900';
        }
    };

    const filteredItems = shopItems.filter(item => {
        if (filter === 'premium') return item.currency === 'zgold';
        if (filter === 'regular') return item.currency === 'zcoins';
        return true;
    });

    return (
        <div className="min-h-screen bg-[#050510] text-white pb-24 font-tajawal overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/5 rounded-full blur-[120px]"></div>
            </div>

            <Navbar />

            <div className="relative z-10 pt-24 px-4 container mx-auto max-w-4xl">
                {/* Header Section */}
                <div className="text-center mb-10">
                    <span className="inline-block py-1 px-3 rounded-full bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold mb-4 tracking-wider">
                        PREMIUM STORE
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black mb-4">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                            ZERSU SHOP
                        </span>
                    </h1>
                    <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
                        قم بترقية تجربتك واقتناء عناصر أسطورية باستخدام ZGold أو ZCoins.
                    </p>
                </div>

                {/* Coupon Section */}
                <div className="mb-8 max-w-md mx-auto">
                    {!showCouponInput ? (
                        <button
                            onClick={() => setShowCouponInput(true)}
                            className="w-full group relative overflow-hidden rounded-2xl border-2 border-gradient-to-r from-pink-500/30 to-purple-500/30 bg-gradient-to-br from-pink-900/20 via-purple-900/20 to-indigo-900/20 p-4 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(236,72,153,0.3)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative flex items-center justify-center gap-3">
                                <Gift className="w-6 h-6 text-pink-400 animate-pulse" />
                                <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">
                                    هل لديك قسيمة؟ 🎁
                                </span>
                                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">اضغط هنا لإدخال كود القسيمة</p>
                        </button>
                    ) : (
                        <div className="relative overflow-hidden rounded-2xl border-2 border-gradient-to-r from-pink-500/50 to-purple-500/50 bg-gradient-to-br from-pink-900/30 via-purple-900/30 to-indigo-900/30 p-6 shadow-[0_0_40px_rgba(236,72,153,0.2)]">
                            {/* Animated background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 animate-pulse"></div>

                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                                        إدخال القسيمة
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowCouponInput(false);
                                            setCouponCode('');
                                        }}
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleRedeemCoupon()}
                                            placeholder="أدخل كود القسيمة هنا..."
                                            className="w-full px-4 py-3 bg-black/40 border-2 border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                            disabled={redeeming}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Gift className="w-5 h-5 text-purple-400/50" />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleRedeemCoupon}
                                        disabled={!couponCode.trim() || redeeming}
                                        className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${couponCode.trim() && !redeeming
                                                ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:scale-[1.02] shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                                                : 'bg-gray-700/50 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        {redeeming ? (
                                            <>
                                                <div className="animate-spin">⏳</div>
                                                جاري التحقق...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5" />
                                                تفعيل القسيمة
                                            </>
                                        )}
                                    </button>


                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Shopkeeper Character with Golden Glow */}
                <div className="relative flex justify-center mb-10">
                    {/* Multiple golden glow layers */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-80 h-80 bg-yellow-500/30 rounded-full blur-[80px] animate-pulse" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-64 h-64 bg-amber-400/40 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 bg-yellow-300/50 rounded-full blur-[40px] animate-pulse" style={{ animationDelay: '1s' }} />
                    </div>

                    {/* Shopkeeper Image - CLICKABLE for Rewards */}
                    <div className="relative group cursor-pointer" onClick={() => setShowRewardsModal(true)}>
                        <img
                            src={shopkeeperImage}
                            alt="Zersu Shopkeeper"
                            className="relative z-10 w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-[0_0_40px_rgba(234,179,8,0.8)] transition-all duration-500 hover:scale-110 hover:drop-shadow-[0_0_60px_rgba(234,179,8,1)]"
                        />

                        {/* Gift badge indicator */}
                        <div className="absolute -top-2 -right-2 z-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-2 shadow-lg animate-bounce">
                            <Gift className="w-6 h-6 text-white" />
                        </div>

                        {/* Animated sparkles */}
                        <div className="absolute top-0 right-5 w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
                        <div className="absolute top-10 left-0 w-2 h-2 bg-amber-300 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                        <div className="absolute bottom-10 right-0 w-2 h-2 bg-yellow-300 rounded-full animate-ping" style={{ animationDuration: '1.8s', animationDelay: '1s' }} />

                        {/* Speech bubble - Enhanced with rewards hint */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 backdrop-blur-md border border-yellow-500/30 rounded-2xl px-6 py-3 shadow-xl group-hover:scale-105 transition-transform">
                            <p className="text-yellow-300 text-sm font-bold text-center whitespace-nowrap">
                                "اضغط للحصول على جوائز يومية! 🎁"
                            </p>
                        </div>
                    </div>
                </div>

                {/* Wallet Overview */}
                <div className="grid grid-cols-2 gap-4 mb-10 max-w-lg mx-auto">
                    {/* ZGold Wallet */}
                    <div className="relative group overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-amber-950/40 p-4 transition-all hover:border-yellow-500/60 hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                        <div className="absolute inset-0 bg-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <p className="text-xs text-yellow-500/80 font-bold uppercase tracking-wider mb-1">ZGold</p>
                                <p className="text-2xl font-black text-yellow-300 drop-shadow-md">{userProfile?.zgold ?? 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-700 flex items-center justify-center shadow-lg border border-yellow-300/30">
                                <img src={zgoldImage} alt="ZGold" className="w-8 h-8 filter drop-shadow" />
                            </div>
                        </div>
                        <button className="mt-3 w-full py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-xl text-yellow-300 text-xs font-bold transition-all flex items-center justify-center gap-2">
                            <span>شحن الآن</span>
                            <Zap className="w-3 h-3" />
                        </button>
                    </div>

                    {/* ZCoins Wallet */}
                    <div className="relative group overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-slate-950/40 p-4 transition-all hover:border-blue-500/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                        <div className="absolute inset-0 bg-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <p className="text-xs text-blue-500/80 font-bold uppercase tracking-wider mb-1">ZCoins</p>
                                <p className="text-2xl font-black text-blue-300 drop-shadow-md">{userProfile?.zcoins ?? 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center shadow-lg border border-blue-300/30">
                                <img src={zcoinImage} alt="ZCoins" className="w-8 h-8 filter drop-shadow" />
                            </div>
                        </div>
                        <button className="mt-3 w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-300 text-xs font-bold transition-all flex items-center justify-center gap-2">
                            <span>كسب مجاني</span>
                            <Sparkles className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex justify-center gap-2 mb-8">
                    {[
                        { id: 'all', label: 'الكل' },
                        { id: 'premium', label: 'المميزة (ZGold)' },
                        { id: 'regular', label: 'العادية (ZCoins)' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === tab.id
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                                : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredItems.map(item => {
                        const owned = purchasedItems.includes(item.id);
                        const currentBalance = item.currency === 'zgold' ? (userProfile?.zgold ?? 0) : (userProfile?.zcoins ?? 0);
                        const canAfford = currentBalance >= item.price;

                        return (
                            <div
                                key={item.id}
                                className={`relative group overflow-hidden rounded-2xl border bg-gradient-to-br p-1 transition-all duration-300 ${owned
                                        ? 'hover:scale-[1.01] opacity-80'
                                        : 'hover:scale-[1.05] hover:shadow-2xl'
                                    } ${getRarityColor(item.rarity)}`}
                            >
                                {/* Glow effect on hover */}
                                {!owned && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                )}

                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0"></div>

                                <div className="relative z-10 bg-black/40 rounded-xl p-4 h-full flex flex-col">
                                    {/* Badge */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-xl bg-gradient-to-br ${item.currency === 'zgold' ? 'from-yellow-500/20 to-orange-500/20 text-yellow-400' : 'from-blue-500/20 to-purple-500/20 text-blue-400'} group-hover:scale-110 transition-transform`}>
                                            {item.icon}
                                        </div>
                                        {item.rarity === 'legendary' && (
                                            <span className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[10px] font-black rounded uppercase tracking-wider shadow animate-pulse">
                                                Legendary
                                            </span>
                                        )}
                                        {item.rarity === 'epic' && (
                                            <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black rounded uppercase tracking-wider shadow">
                                                Epic
                                            </span>
                                        )}
                                    </div>

                                    {/* Owned Badge */}
                                    {owned && (
                                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500/20 backdrop-blur-sm border border-green-500/30 px-2 py-1 rounded-lg">
                                            <Check className="w-3 h-3 text-green-400" />
                                            <span className="text-[10px] font-bold text-green-400">مملوك</span>
                                        </div>
                                    )}

                                    <h3 className="text-xl font-bold mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                                        {item.nameAr}
                                    </h3>
                                    <p className="text-gray-400 text-xs mb-4 line-clamp-2 min-h-[2.5rem]">{item.description}</p>

                                    <div className="mt-auto flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <img
                                                src={item.currency === 'zgold' ? zgoldImage : zcoinImage}
                                                alt={item.currency}
                                                className="w-5 h-5 object-contain"
                                            />
                                            <span className={`text-xl font-black ${item.currency === 'zgold' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                                {item.price}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handlePurchase(item)}
                                            disabled={owned || !canAfford || !!purchasing}
                                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${owned ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default' :
                                                !canAfford ? 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed' :
                                                    item.currency === 'zgold'
                                                        ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-orange-500/20 hover:scale-105 hover:shadow-orange-500/40'
                                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20 hover:scale-105 hover:shadow-purple-500/40'
                                                }`}
                                        >
                                            {owned ? (
                                                <>مملوك <Check className="w-3 h-3" /></>
                                            ) : !canAfford ? (
                                                'غير كافي'
                                            ) : purchasing === item.id ? (
                                                <div className="animate-spin">⏳</div>
                                            ) : (
                                                <>شراء</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Daily Rewards Modal */}
            <DailyRewardsModal
                isOpen={showRewardsModal}
                onClose={() => setShowRewardsModal(false)}
                onRewardClaimed={(amount) => {
                    // Update user profile with new zcoins
                    setUserProfile(prev => prev ? { ...prev, zcoins: prev.zcoins + amount } : null);
                }}
            />

            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
};

export default ShopPage;
