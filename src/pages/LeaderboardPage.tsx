import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import BottomNavigation from '@/components/zersu-game/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Crown, User, Loader2, Star, Lock } from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [selectedTab, setSelectedTab] = useState<LeaderboardTab>('rank');

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // Fetch game profiles with points (for ranking)
                const { data: profiles, error } = await supabase
                    .from('game_profiles')
                    .select('user_id, points, zcoins, server_region')
                    .order('points', { ascending: false })
                    .limit(50);

                if (error) {
                    console.error('Leaderboard fetch error:', error);
                    // Fallback data
                    setLeaderboard([
                        { user_id: '1', points: 1500, zcoins: 150, server_region: 'MIDDLE_EAST', username: 'Champion1' },
                        { user_id: '2', points: 1200, zcoins: 120, server_region: 'EUROPE', username: 'ProPlayer' },
                        { user_id: '3', points: 950, zcoins: 95, server_region: 'ASIA', username: 'ZersuSlayer' },
                    ]);
                } else if (profiles && profiles.length > 0) {
                    // Fetch usernames from profiles table
                    const userIds = profiles.map(p => p.user_id);
                    const { data: userProfiles } = await supabase
                        .from('profiles')
                        .select('id, username, avatar_url')
                        .in('id', userIds);

                    const enrichedData = profiles.map(p => {
                        const userProfile = userProfiles?.find(up => up.id === p.user_id);
                        return {
                            ...p,
                            points: p.points || 0,
                            zcoins: p.zcoins || 0,
                            username: userProfile?.username || 'مجهول',
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
            }
        };

        fetchLeaderboard();
    }, []);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
            case 2: return <Medal className="w-6 h-6 text-gray-300" />;
            case 3: return <Medal className="w-6 h-6 text-amber-600" />;
            default: return <span className="w-6 h-6 flex items-center justify-center text-gray-400 font-bold">{rank}</span>;
        }
    };

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1: return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50';
            case 2: return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/50';
            case 3: return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/50';
            default: return 'bg-slate-800/50 border-slate-700/50';
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0e17] text-white pb-20 md:pb-8">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-3xl -top-64 left-1/2 -translate-x-1/2"></div>
            </div>

            <Navbar />

            <div className="relative z-10 pt-24 px-4">
                <div className="container mx-auto max-w-2xl">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 mb-4">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            <span className="text-yellow-300 font-bold">قائمة المتصدرين</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">
                            LEADERBOARD
                        </h1>
                        <p className="text-gray-400 mt-2">أفضل اللاعبين حسب النقاط</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 justify-center">
                        <button
                            onClick={() => setSelectedTab('rank')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${selectedTab === 'rank'
                                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/30'
                                    : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50'
                                }`}
                        >
                            <Star className="w-5 h-5" />
                            Rank
                        </button>
                        <button
                            onClick={() => setSelectedTab('level')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${selectedTab === 'level'
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                                    : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50'
                                }`}
                        >
                            <Lock className="w-4 h-4" />
                            L.V
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">قريباً</span>
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
                                <div className="text-center py-20">
                                    <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">لا يوجد لاعبون بعد. كن أول المتصدرين!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {leaderboard.map((entry, index) => {
                                        const rank = index + 1;
                                        return (
                                            <div
                                                key={entry.user_id}
                                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.02] ${getRankStyle(rank)}`}
                                            >
                                                {/* Rank */}
                                                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                                    {getRankIcon(rank)}
                                                </div>

                                                {/* Avatar */}
                                                <div className="flex-shrink-0">
                                                    {entry.avatar_url ? (
                                                        <img
                                                            src={entry.avatar_url}
                                                            alt={entry.username}
                                                            className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                            <User className="w-6 h-6 text-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-white truncate">{entry.username}</div>
                                                    <div className="text-xs text-gray-500">{entry.server_region}</div>
                                                </div>

                                                {/* Points */}
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 rounded-full border border-yellow-500/30">
                                                    <span className="text-lg">⭐</span>
                                                    <span className="font-bold text-yellow-400">{entry.points}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                                <Lock className="w-10 h-10 text-purple-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                                قريباً...
                            </h3>
                            <p className="text-gray-400 max-w-sm mx-auto">
                                نظام ترتيب المستويات قيد التطوير. ترقبوا التحديث القادم!
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
