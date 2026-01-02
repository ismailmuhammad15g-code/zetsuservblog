import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define types locally if not available globally
interface GameProfile {
    user_id: string;
    zcoins: number;
    zgold?: number;
    points?: number;
    wins?: number;
    losses?: number;
    draws?: number;
    games_played?: number;
    server_region: string;
}

interface PlayerChallenge {
    id: string;
    challenge_id: string;
    status: 'active' | 'completed' | 'failed';
    proof_url: string | null;
    reward_claimed: number;
}

interface GameContextType {
    userProfile: GameProfile | null;
    activeChallenges: PlayerChallenge[];
    isLoading: boolean;
    refreshGameData: () => Promise<void>;
    joinGame: (serverRegion: string) => Promise<void>;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
    const [userProfile, setUserProfile] = useState<GameProfile | null>(null);
    const [activeChallenges, setActiveChallenges] = useState<PlayerChallenge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserId(session?.user?.id ?? null);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const refreshGameData = async () => {
        if (!userId) {
            setUserProfile(null);
            setActiveChallenges([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            // Fetch profile
            const { data: profile, error: profileError } = await supabase
                .from('game_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Error fetching game profile:', profileError);
            }

            setUserProfile(profile);

            // Fetch active challenges
            const { data: challenges, error: challengesError } = await supabase
                .from('player_challenges')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'active');

            if (challengesError) {
                console.error('Error fetching challenges:', challengesError);
            }

            setActiveChallenges((challenges as unknown as PlayerChallenge[]) || []);

        } catch (error) {
            console.error('Error in refreshGameData:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshGameData();
    }, [userId]);

    const joinGame = async (serverRegion: string) => {
        if (!userId) return;

        const { error } = await supabase
            .from('game_profiles')
            .insert({
                user_id: userId,
                server_region: serverRegion,
                zcoins: 5 // Start with 5 coins
            });

        if (error) {
            toast.error("Failed to join the game server. Try again.");
            throw error;
        }

        toast.success(`Welcome to the ${serverRegion} server, challenger!`);
        await refreshGameData();
    };

    return (
        <GameContext.Provider value={{ userProfile, activeChallenges, isLoading, refreshGameData, joinGame }}>
            {children}
        </GameContext.Provider>
    );
};
