import React, { useEffect, useState, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import BottomNavigation from '@/components/zersu-game/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
    User, Loader2, Trophy, Star, Zap, Target, Shield,
    TrendingUp, Award, Crown, Flame, Gem, Coins,
    Calendar, Globe, ChevronRight, Sparkles, Camera,
    ShoppingBag, Music, Image
} from 'lucide-react';
import { getXpForNextLevel, getLevelProgress } from '@/utils/levelingSystem';

interface PlayerStats {
    user_id: string;
    username: string;
    avatar_url: string | null;
    email: string;
    level: number;
    xp: number;
    total_xp: number;
    zcoins: number;
    zgold: number;
    points: number;
    wins: number;
    losses: number;
    draws: number;
    games_played: number;
    challenges_completed: number;
    server_region: string;
    created_at: string;
}

interface InventoryItem {
    item_id: string;
    item_name: string;
    item_name_ar: string;
    item_type: string;
    is_equipped: boolean;
}

const PlayerStatsPage = () => {
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('stats');
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchPlayerStats = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Fetch game profile
                const { data: gameProfile } = await supabase
                    .from('game_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                // Fetch user profile
                const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', user.id)
                    .single();

                // Fetch inventory
                const { data: inventoryData } = await supabase
                    .from('user_inventory')
                    .select('item_id, item_name, item_name_ar, item_type, is_equipped')
                    .eq('user_id', user.id)
                    .order('purchased_at', { ascending: false });

                if (inventoryData) {
                    setInventory(inventoryData);
                }

                if (gameProfile) {
                    const gp = gameProfile as any; // Type assertion for dynamic columns
                    setStats({
                        user_id: user.id,
                        username: userProfile?.username || 'مجهول',
                        avatar_url: userProfile?.avatar_url || null,
                        email: user.email || '',
                        level: gp.level || 1,
                        xp: gp.xp || 0,
                        total_xp: gp.total_xp || 0,
                        zcoins: gp.zcoins || 0,
                        zgold: gp.zgold || 0,
                        points: gp.points || 0,
                        wins: gp.wins || 0,
                        losses: gp.losses || 0,
                        draws: gp.draws || 0,
                        games_played: gp.games_played || 0,
                        challenges_completed: gp.challenges_completed || 0,
                        server_region: gp.server_region || 'GLOBAL',
                        created_at: gp.created_at || new Date().toISOString(),
                    });
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayerStats();
    }, []);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('يرجى اختيار ملف صورة صالح');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
                return;
            }

            setUploading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('يجب تسجيل الدخول أولاً');
                setUploading(false);
                return;
            }

            // Upload to ImgBB
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'فشل في رفع الصورة');
            }

            const publicUrl = data.data.url;

            // Update Supabase Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Update Local State
            setStats(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
            toast.success('تم تحديث الصورة الشخصية بنجاح! ⭐');

        } catch (error) {
            console.error('Upload error:', error);
            toast.error('حدث خطأ أثناء رفع الصورة');
        } finally {
            setUploading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };



    const getWinRate = () => {
        if (!stats || stats.games_played === 0) return 0;
        return Math.round((stats.wins / stats.games_played) * 100);
    };

    const getRankTitle = (level: number) => {
        if (level >= 50) return { title: 'LEGENDARY', titleAr: 'أسطوري', color: 'from-yellow-400 to-orange-500' };
        if (level >= 40) return { title: 'MASTER', titleAr: 'متمرس', color: 'from-purple-400 to-pink-500' };
        if (level >= 30) return { title: 'DIAMOND', titleAr: 'ماسي', color: 'from-cyan-400 to-blue-500' };
        if (level >= 20) return { title: 'PLATINUM', titleAr: 'بلاتيني', color: 'from-gray-300 to-gray-500' };
        if (level >= 10) return { title: 'GOLD', titleAr: 'ذهبي', color: 'from-yellow-500 to-amber-600' };
        if (level >= 5) return { title: 'SILVER', titleAr: 'فضي', color: 'from-gray-400 to-gray-600' };
        return { title: 'BRONZE', titleAr: 'برونزي', color: 'from-amber-600 to-amber-800' };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0e17] text-white flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-[#0a0e17] text-white">
                <Navbar />
                <div className="pt-24 px-4 text-center">
                    <p className="text-gray-400">يرجى تسجيل الدخول للوصول إلى إحصائياتك</p>
                </div>
            </div>
        );
    }

    const rankInfo = getRankTitle(stats.level);
    const { level, xp } = stats;
    const requiredXp = getXpForNextLevel(level);
    const progress = getLevelProgress(xp, level);

    return (
        <div className="min-h-screen bg-[#0a0e17] text-white pb-24 md:pb-8">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl -top-64 left-1/2 -translate-x-1/2"></div>
                <div className="absolute w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-3xl bottom-0 right-0"></div>
            </div>

            <Navbar />

            <div className="relative z-10 pt-20 px-3 sm:px-4">
                <div className="container mx-auto max-w-2xl">

                    {/* Profile Header Card */}
                    <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden mb-6">
                        {/* Rank Banner - Taller */}
                        <div className={`h-28 sm:h-32 bg-gradient-to-r ${rankInfo.color} relative`}>
                            <div className="absolute inset-0 bg-black/20"></div>
                            <div className="absolute bottom-3 right-4 text-white/90 text-base font-bold tracking-wider">
                                {rankInfo.title}
                            </div>
                            <Sparkles className="absolute top-4 right-4 w-6 h-6 text-white/50 animate-pulse" />
                        </div>

                        {/* Profile Info - More Padding */}
                        <div className="px-5 sm:px-6 pb-6 -mt-10">
                            {/* Avatar Row */}
                            <div className="flex items-end gap-4 mb-4">
                                {/* Avatar - Bigger with Upload */}
                                <div className="relative flex-shrink-0 group">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />

                                    <div
                                        className="relative cursor-pointer transition-transform active:scale-95"
                                        onClick={triggerFileInput}
                                    >
                                        {stats.avatar_url ? (
                                            <img
                                                src={stats.avatar_url}
                                                alt={stats.username}
                                                className={`w-24 h-24 rounded-2xl object-cover border-4 border-slate-800 shadow-xl ${uploading ? 'opacity-50' : ''}`}
                                            />
                                        ) : (
                                            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-4 border-slate-800 shadow-xl ${uploading ? 'opacity-50' : ''}`}>
                                                <User className="w-10 h-10 text-white" />
                                            </div>
                                        )}

                                        {/* Camera Overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-2xl">
                                            <Camera className="w-8 h-8 text-white drop-shadow-lg" />
                                        </div>

                                        {/* Loading Spinner */}
                                        {uploading && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-lg" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Level Badge */}
                                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center border-3 border-slate-800 shadow-lg pointer-events-none">
                                        <span className="text-sm font-black text-black">{stats.level}</span>
                                    </div>
                                </div>

                                {/* Rank & Region - Stacked Vertically */}
                                <div className="flex-1 pt-8">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Crown className="w-5 h-5 text-yellow-400" />
                                        <span className={`text-base font-bold bg-gradient-to-r ${rankInfo.color} bg-clip-text text-transparent`}>
                                            {rankInfo.titleAr}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                                        <Globe className="w-4 h-4" />
                                        <span>{stats.server_region}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Username - Full Width */}
                            <h1 className="text-2xl sm:text-3xl font-black text-white mb-4 break-words leading-tight">
                                {stats.username}
                            </h1>

                            {/* XP Progress Bar */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-gray-400">المستوى {stats.level}</span>
                                    <span className="text-purple-400 font-bold">{stats.xp} / {requiredXp} XP</span>
                                </div>
                                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 relative"
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 text-center">
                                    إجمالي XP: {stats.total_xp.toLocaleString()}
                                </div>
                            </div>

                            {/* Currency Row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                        <Gem className="w-5 h-5 text-yellow-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">ZCoins</div>
                                        <div className="text-lg font-bold text-yellow-400">{stats.zcoins.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <Coins className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">ZGold</div>
                                        <div className="text-lg font-bold text-amber-400">{stats.zgold.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <StatCard
                            icon={<Star className="w-5 h-5" />}
                            label="النقاط"
                            value={stats.points.toLocaleString()}
                            color="yellow"
                        />
                        <StatCard
                            icon={<Trophy className="w-5 h-5" />}
                            label="الانتصارات"
                            value={stats.wins.toString()}
                            color="green"
                        />
                        <StatCard
                            icon={<Shield className="w-5 h-5" />}
                            label="معدل الفوز"
                            value={`${getWinRate()}%`}
                            color="blue"
                        />
                        <StatCard
                            icon={<Target className="w-5 h-5" />}
                            label="التحديات المكتملة"
                            value={stats.challenges_completed.toString()}
                            color="purple"
                        />
                    </div>

                    {/* Battle Stats */}
                    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 mb-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-400" />
                            إحصائيات المعارك
                        </h3>
                        <div className="grid grid-cols-4 gap-3 text-center">
                            <div>
                                <div className="text-2xl font-black text-white">{stats.games_played}</div>
                                <div className="text-xs text-gray-500">المباريات</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-green-400">{stats.wins}</div>
                                <div className="text-xs text-gray-500">فوز</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-red-400">{stats.losses}</div>
                                <div className="text-xs text-gray-500">خسارة</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-gray-400">{stats.draws}</div>
                                <div className="text-xs text-gray-500">تعادل</div>
                            </div>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 mb-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-400" />
                            معلومات الحساب
                        </h3>
                        <div className="space-y-3">
                            <InfoRow label="تاريخ الانضمام" value={new Date(stats.created_at).toLocaleDateString('ar-EG')} />
                            <InfoRow label="المنطقة" value={stats.server_region} />
                            <InfoRow label="معرف اللاعب" value={stats.user_id.slice(0, 8) + '...'} />
                        </div>
                    </div>

                    {/* Inventory Section */}
                    {inventory.length > 0 && (
                        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-yellow-400" />
                                المشتريات ({inventory.length})
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {inventory.map((item) => (
                                    <div
                                        key={item.item_id}
                                        className="relative bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-3 border border-purple-500/30 hover:border-purple-500/50 transition-all"
                                    >
                                        <div className="flex flex-col items-center text-center">
                                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-2">
                                                {item.item_type === 'emoji' && <Sparkles className="w-5 h-5 text-purple-400" />}
                                                {item.item_type === 'background' && <Image className="w-5 h-5 text-cyan-400" />}
                                                {item.item_type === 'sound' && <Music className="w-5 h-5 text-green-400" />}
                                                {item.item_type === 'badge' && <Crown className="w-5 h-5 text-yellow-400" />}
                                                {item.item_type === 'aura' && <Zap className="w-5 h-5 text-orange-400" />}
                                            </div>
                                            <p className="text-xs font-bold text-white line-clamp-2">
                                                {item.item_name_ar}
                                            </p>
                                            {item.is_equipped && (
                                                <span className="mt-1 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-[10px] text-green-300">
                                                    مجهز
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
};

// Sub-components
const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => {
    const colorClasses: Record<string, string> = {
        yellow: 'text-yellow-400 bg-yellow-500/20',
        green: 'text-green-400 bg-green-500/20',
        blue: 'text-blue-400 bg-blue-500/20',
        purple: 'text-purple-400 bg-purple-500/20',
    };

    return (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
            <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-2`}>
                {icon}
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
        </div>
    );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className="text-white font-medium text-sm">{value}</span>
    </div>
);

export default PlayerStatsPage;
