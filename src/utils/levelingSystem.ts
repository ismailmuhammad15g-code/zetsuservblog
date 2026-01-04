import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Calculates the XP required to reach the NEXT level from the current level.
 * Formula: level * 100
 * Level 1 -> 100 XP needed for Level 2
 * Level 2 -> 200 XP needed for Level 3
 */
export const getXpForNextLevel = (level: number): number => {
    return level * 100;
};

/**
 * Calculates current level progress as a percentage.
 */
export const getLevelProgress = (currentXp: number, currentLevel: number): number => {
    const required = getXpForNextLevel(currentLevel);
    if (required === 0) return 0;
    return Math.min(100, (currentXp / required) * 100);
};

export interface LevelUpdateResult {
    newLevel: number;
    newXp: number;
    newTotalXp: number;
    levelsGained: number;
}

/**
 * Awards XP to a user and handles leveling up logic.
 * Updates the game_profiles table in Supabase.
 */
export const awardXp = async (userId: string, xpAmount: number): Promise<LevelUpdateResult | null> => {
    try {
        // 1. Fetch current stats
        const { data: profile, error: fetchError } = await supabase
            .from('game_profiles')
            .select('level, xp, total_xp')
            .eq('user_id', userId)
            .single();

        if (fetchError || !profile) {
            console.error('Error fetching profile for XP award:', fetchError);
            return null;
        }

        const profileData = profile as any;
        let { level, xp, total_xp } = profileData;

        // Handle nulls just in case
        level = level || 1;
        xp = xp || 0;
        total_xp = total_xp || 0;

        // 2. Add XP
        xp += xpAmount;
        total_xp += xpAmount;

        let levelsGained = 0;
        let required_xp = getXpForNextLevel(level);

        // 3. Check for level up(s)
        // While we have enough XP to level up...
        while (xp >= required_xp) {
            xp -= required_xp;
            level++;
            levelsGained++;
            required_xp = getXpForNextLevel(level);
        }

        // 4. Update Supabase
        const { error: updateError } = await supabase
            .from('game_profiles')
            .update({
                level,
                xp,
                total_xp
            } as any)
            .eq('user_id', userId);

        if (updateError) {
            console.error('Error updating stats:', updateError);
            return null;
        }

        // 5. Notify user if leveled up
        if (levelsGained > 0) {
            toast.success(`مبروك! وصلت للمستوى ${level}! 🎉`, {
                description: 'أنت تزداد قوة يوماً بعد يوم!',
                duration: 5000,
            });
        }

        return { newLevel: level, newXp: xp, newTotalXp: total_xp, levelsGained };

    } catch (error) {
        console.error('Unexpected error in awardXp:', error);
        return null;
    }
};
