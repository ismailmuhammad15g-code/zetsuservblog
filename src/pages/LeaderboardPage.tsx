import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import BottomNavigation from '@/components/zersu-game/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Crown, User, Loader2, Star, Lock, TrendingUp, Target, Zap, RefreshCw } from 'lucide-react';

interface LeaderboardEntry {
    user_id: string;
    points: number;
    zcoins: number;
    server_region: string;
    username?: string;
    avatar_url?: string;
}

type LeaderboardTab = 'rank' | 'level';

const LeaderboardPage = () => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [selectedTab, setSelectedTab] = useState<LeaderboardTab>('rank');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Get current user
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id || null);
        });
    }, []);

    const fetchLeaderboard = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const { data: profiles, error } = await supabase
                .from('game_profiles')
                .select('*')
                .order('zcoins', { ascending: false })
                .limit(100);

            if (error) {
                console.error('Leaderboard fetch error:', error);
                setLeaderboard([
                    { user_id: '1', points: 1500, zcoins: 150, server_region: 'MIDDLE_EAST', username: 'Champion1' },
                    { user_id: '2', points: 1200, zcoins: 120, server_region: 'EUROPE', username: 'ProPlayer' },
                    { user_id: '3', points: 950, zcoins: 95, server_region: 'ASIA', username: 'ZersuSlayer' },
                ]);
            } else if (profiles && profiles.length > 0) {
                const typedProfiles = profiles as any[];
                typedProfiles.sort((a, b) => (b.points || b.zcoins || 0) - (a.points || a.zcoins || 0));

                const userIds = typedProfiles.map(p => p.user_id);
                const { data: userProfiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', userIds);

                const enrichedData: LeaderboardEntry[] = typedProfiles.map(p => {
                    const userProfile = userProfiles?.find(up => up.id === p.user_id);
                    return {
                        user_id: p.user_id,
                        points: p.points || 0,
                        zcoins: p.zcoins || 0,
                        server_region: p.server_region || 'GLOBAL',
                        username: userProfile?.username || `Player_${p.user_id.slice(0, 6)}`,
                        avatar_url: userProfile?.avatar_url
                    };
                });
                setLeaderboard(enrichedData);
            } else {
                setLeaderboard([]);
            }
        } catch (error) {
            console.error('Error:', error);
            setLeaderboard([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Crown className="w-7 h-7 text-yellow-400 drop-shadow-lg" />;
            case 2: return <Medal className="w-6 h-6 text-gray-300 drop-shadow-lg" />;
            case 3: return <Medal className="w-6 h-6 text-amber-600 drop-shadow-lg" />;
            default: return <span className="w-7 h-7 flex items-center justify-center text-gray-400 font-bold text-lg">#{rank}</span>;
        }
    };

    const getRankStyle = (rank: number, isCurrentUser: boolean) => {
        if (isCurrentUser) {
            return 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/70 ring-2 ring-purple-400/50';
        }
        switch (rank) {
            case 1: return 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border-yellow-500/60';
            case 2: return 'bg-gradient-to-r from-gray-400/30 to-gray-500/30 border-gray-400/60';
            case 3: return 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border-amber-600/60';
            default: return 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-700/60';
        }
    };

    // Calculate stats
    const totalPlayers = leaderboard.length;
    const totalPoints = leaderboard.reduce((sum, e) => sum + (e.points || 0), 0);
    const currentUserRank = currentUserId ? leaderboard.findIndex(e => e.user_id === currentUserId) + 1 : 0;
    const currentUserData = currentUserId ? leaderboard.find(e => e.user_id === currentUserId) : null;

    return (
        <div className="min-h-screen bg-[#0a0e17] text-white pb-24 md:pb-8">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-3xl -top-64 left-1/2 -translate-x-1/2"></div>
                <div className="absolute w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl bottom-0 -right-32"></div>
            </div>

            <Navbar />

            <div className="relative z-10 pt-20 px-3 sm:px-4">
                <div className="container mx-auto max-w-2xl">
                    {/* Header */}
                    <div className="text-center mb-5">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 mb-3">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            <span className="text-yellow-300 font-bold">قائمة المتصدرين</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">
                            LEADERBOARD
                        </h1>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                        <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 text-center">
                            <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
                            <div className="text-lg font-bold text-white">{totalPlayers}</div>
                            <div className="text-xs text-gray-500">لاعب</div>
                        </div>
                        <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 text-center">
                            <Target className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                            <div className="text-lg font-bold text-white">{totalPoints.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">إجمالي النقاط</div>
                        </div>
                        <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 text-center">
                            <Zap className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                            <div className="text-lg font-bold text-white">{currentUserRank || '-'}</div>
                            <div className="text-xs text-gray-500">ترتيبك</div>
                        </div>
                    </div>

                    {/* Your Stats (if logged in) */}
                    {currentUserData && (
                        <div className="mb-5 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {currentUserData.avatar_url ? (
                                        <img src={currentUserData.avatar_url} alt="" className="w-10 h-10 rounded-full border-2 border-purple-400" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                                            <User className="w-5 h-5 text-white" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-sm text-purple-300">أنت</div>
                                        <div className="font-bold text-white">{currentUserData.username}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-purple-300">#{currentUserRank}</div>
                                    <div className="text-sm text-gray-400">{currentUserData.points} نقطة</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs + Refresh */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedTab('rank')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${selectedTab === 'rank'
                                        ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/30'
                                        : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50'
                                    }`}
                            >
                                <Star className="w-4 h-4" />
                                Rank
                            </button>
                            <button
                                onClick={() => setSelectedTab('level')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${selectedTab === 'level'
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                        : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50'
                                    }`}
                            >
                                <Lock className="w-3.5 h-3.5" />
                                L.V
                                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">قريباً</span>
                            </button>
                        </div>
                        <button
                            onClick={() => fetchLeaderboard(true)}
                            disabled={refreshing}
                            className="p-2.5 bg-slate-800/50 rounded-xl text-gray-400 hover:bg-slate-700/50 hover:text-white transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Content */}
                    {selectedTab === 'rank' ? (
                        <>
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                                </div>
                            ) : leaderboard.length === 0 ? (
                                <div className="text-center py-16">
                                    <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">لا يوجد لاعبون بعد. كن أول المتصدرين!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {leaderboard.map((entry, index) => {
                                        const rank = index + 1;
                                        const isCurrentUser = entry.user_id === currentUserId;
                                        return (
                                            <div
                                                key={entry.user_id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${getRankStyle(rank, isCurrentUser)}`}
                                            >
                                                {/* Rank Badge */}
                                                <div className="flex-shrink-0 w-10 flex items-center justify-center">
                                                    {getRankIcon(rank)}
                                                </div>

                                                {/* Avatar */}
                                                <div className="flex-shrink-0">
                                                    {entry.avatar_url ? (
                                                        <img
                                                            src={entry.avatar_url}
                                                            alt={entry.username}
                                                            className={`w-11 h-11 rounded-full object-cover border-2 ${rank === 1 ? 'border-yellow-400' :
                                                                    rank === 2 ? 'border-gray-400' :
                                                                        rank === 3 ? 'border-amber-500' :
                                                                            'border-white/20'
                                                                }`}
                                                        />
                                                    ) : (
                                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                                                                rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                                                                    rank === 3 ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                                                                        'bg-gradient-to-br from-purple-500 to-pink-500'
                                                            }`}>
                                                            <User className="w-5 h-5 text-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* User Info - IMPROVED VISIBILITY */}
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className={`font-bold text-base truncate ${isCurrentUser ? 'text-purple-300' : 'text-white'
                                                        }`}>
                                                        {entry.username}
                                                        {isCurrentUser && <span className="text-xs ml-2 text-purple-400">(أنت)</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span>🌍 {entry.server_region}</span>
                                                        <span>•</span>
                                                        <span>💎 {entry.zcoins}</span>
                                                    </div>
                                                </div>

                                                {/* Points Badge */}
                                                <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full ${rank === 1 ? 'bg-yellow-500/30 border border-yellow-500/50' :
                                                        rank === 2 ? 'bg-gray-400/20 border border-gray-400/40' :
                                                            rank === 3 ? 'bg-amber-500/30 border border-amber-500/50' :
                                                                'bg-slate-700/50 border border-slate-600/50'
                                                    }`}>
                                                    <Star className={`w-4 h-4 ${rank <= 3 ? 'text-yellow-400' : 'text-gray-400'
                                                        }`} />
                                                    <span className={`font-bold text-sm ${rank <= 3 ? 'text-yellow-400' : 'text-gray-300'
                                                        }`}>
                                                        {entry.points}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                                <Lock className="w-9 h-9 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                                قريباً...
                            </h3>
                            <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                نظام ترتيب المستويات قيد التطوير. ترقبوا!
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
};

export default LeaderboardPage;
