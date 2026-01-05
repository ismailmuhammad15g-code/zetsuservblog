-- ============================================
-- SHOP INVENTORY & DAILY REWARDS SYSTEM
-- ============================================

-- ============================================
-- 1. USER INVENTORY TABLE (Purchased Items)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('background', 'emoji', 'sound', 'badge', 'aura')),
  item_name TEXT NOT NULL,
  item_name_ar TEXT NOT NULL,
  purchase_price INTEGER NOT NULL,
  currency_type TEXT NOT NULL CHECK (currency_type IN ('zcoins', 'zgold')),
  is_equipped BOOLEAN DEFAULT false,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- Policies for user_inventory
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_inventory' AND policyname = 'Users can view own inventory') THEN
        CREATE POLICY "Users can view own inventory" 
        ON public.user_inventory FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_inventory' AND policyname = 'Users can manage own inventory') THEN
        CREATE POLICY "Users can manage own inventory" 
        ON public.user_inventory FOR ALL 
        TO authenticated 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- 2. DAILY REWARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reward_amount INTEGER DEFAULT 10,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, reward_date)
);

ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

-- Policies for daily_rewards
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_rewards' AND policyname = 'Users can view own rewards') THEN
        CREATE POLICY "Users can view own rewards" 
        ON public.daily_rewards FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_rewards' AND policyname = 'Users can claim rewards') THEN
        CREATE POLICY "Users can claim rewards" 
        ON public.daily_rewards FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- 3. DAILY MISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  reward_zcoins INTEGER DEFAULT 5,
  icon TEXT DEFAULT 'target',
  mission_type TEXT NOT NULL CHECK (mission_type IN ('login', 'play_game', 'complete_challenge', 'visit_shop', 'update_profile')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default daily missions
INSERT INTO public.daily_missions (mission_id, title, title_ar, description, description_ar, reward_zcoins, icon, mission_type) VALUES
('daily-login', 'Daily Login', 'تسجيل الدخول اليومي', 'Login to the game', 'سجل دخولك إلى اللعبة', 10, 'calendar', 'login'),
('play-one-game', 'Play a Game', 'العب مباراة', 'Play at least one game today', 'العب مباراة واحدة على الأقل اليوم', 15, 'gamepad', 'play_game'),
('complete-one-challenge', 'Complete a Challenge', 'أكمل تحدياً', 'Complete one challenge today', 'أكمل تحدياً واحداً اليوم', 20, 'target', 'complete_challenge'),
('visit-shop', 'Visit the Shop', 'زر المتجر', 'Check out the shop', 'قم بزيارة المتجر', 5, 'shopping-bag', 'visit_shop'),
('update-profile', 'Update Your Profile', 'حدث ملفك', 'Update your profile picture or info', 'حدث صورتك الشخصية أو معلوماتك', 10, 'user', 'update_profile')
ON CONFLICT (mission_id) DO UPDATE SET 
  title = EXCLUDED.title,
  title_ar = EXCLUDED.title_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  reward_zcoins = EXCLUDED.reward_zcoins;

ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

-- Public can view missions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_missions' AND policyname = 'Anyone can view missions') THEN
        CREATE POLICY "Anyone can view missions" 
        ON public.daily_missions FOR SELECT 
        USING (is_active = true);
    END IF;
END $$;

-- ============================================
-- 4. USER MISSION PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_mission_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reward_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, mission_id, completed_date)
);

ALTER TABLE public.user_mission_progress ENABLE ROW LEVEL SECURITY;

-- Policies for user_mission_progress
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_mission_progress' AND policyname = 'Users can view own mission progress') THEN
        CREATE POLICY "Users can view own mission progress" 
        ON public.user_mission_progress FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_mission_progress' AND policyname = 'Users can manage own mission progress') THEN
        CREATE POLICY "Users can manage own mission progress" 
        ON public.user_mission_progress FOR ALL 
        TO authenticated 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- 5. FUNCTIONS FOR DAILY REWARDS
-- ============================================

-- Function to claim daily reward
CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, reward_amount INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_already_claimed BOOLEAN;
    v_reward_amount INTEGER := 10;
    v_profile_exists BOOLEAN;
BEGIN
    -- Check if user has a game profile
    SELECT EXISTS(
        SELECT 1 FROM public.game_profiles 
        WHERE user_id = p_user_id
    ) INTO v_profile_exists;
    
    IF NOT v_profile_exists THEN
        RETURN QUERY SELECT false, 'User profile not found'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Check if already claimed today
    SELECT EXISTS(
        SELECT 1 FROM public.daily_rewards 
        WHERE user_id = p_user_id 
        AND reward_date = CURRENT_DATE
    ) INTO v_already_claimed;
    
    IF v_already_claimed THEN
        RETURN QUERY SELECT false, 'Already claimed today'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Insert reward claim
    INSERT INTO public.daily_rewards (user_id, reward_date, reward_amount)
    VALUES (p_user_id, CURRENT_DATE, v_reward_amount);
    
    -- Add zcoins to user
    UPDATE public.game_profiles
    SET zcoins = zcoins + v_reward_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT true, 'Reward claimed successfully'::TEXT, v_reward_amount;
END;
$$;

-- Function to check if daily reward is available
CREATE OR REPLACE FUNCTION public.check_daily_reward_status(p_user_id UUID)
RETURNS TABLE(can_claim BOOLEAN, last_claim_date DATE, next_available_time TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_claim_date DATE;
    v_next_available TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get last claim date
    SELECT reward_date INTO v_last_claim_date
    FROM public.daily_rewards
    WHERE user_id = p_user_id
    ORDER BY reward_date DESC
    LIMIT 1;
    
    -- If never claimed or last claim was before today, can claim
    IF v_last_claim_date IS NULL OR v_last_claim_date < CURRENT_DATE THEN
        RETURN QUERY SELECT true, v_last_claim_date, NULL::TIMESTAMP WITH TIME ZONE;
    ELSE
        -- Calculate next available time (tomorrow at midnight UTC)
        v_next_available := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE;
        RETURN QUERY SELECT false, v_last_claim_date, v_next_available;
    END IF;
END;
$$;

-- Function to complete a daily mission
CREATE OR REPLACE FUNCTION public.complete_daily_mission(p_user_id UUID, p_mission_id TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, reward_amount INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_already_completed BOOLEAN;
    v_reward_amount INTEGER;
    v_profile_exists BOOLEAN;
    v_rows_updated INTEGER;
BEGIN
    -- Check if user has a game profile
    SELECT EXISTS(
        SELECT 1 FROM public.game_profiles 
        WHERE user_id = p_user_id
    ) INTO v_profile_exists;
    
    IF NOT v_profile_exists THEN
        RETURN QUERY SELECT false, 'User profile not found'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Get mission reward
    SELECT reward_zcoins INTO v_reward_amount
    FROM public.daily_missions
    WHERE mission_id = p_mission_id AND is_active = true;
    
    IF v_reward_amount IS NULL THEN
        RETURN QUERY SELECT false, 'Mission not found'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Check if already completed today
    SELECT EXISTS(
        SELECT 1 FROM public.user_mission_progress 
        WHERE user_id = p_user_id 
        AND mission_id = p_mission_id
        AND completed_date = CURRENT_DATE
        AND reward_claimed = true
    ) INTO v_already_completed;
    
    IF v_already_completed THEN
        RETURN QUERY SELECT false, 'Mission already completed today'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Mark mission as completed and claim reward
    INSERT INTO public.user_mission_progress (user_id, mission_id, completed_date, reward_claimed, claimed_at)
    VALUES (p_user_id, p_mission_id, CURRENT_DATE, true, now())
    ON CONFLICT (user_id, mission_id, completed_date) 
    DO UPDATE SET reward_claimed = true, claimed_at = now();
    
    -- Add zcoins to user
    UPDATE public.game_profiles
    SET zcoins = zcoins + v_reward_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Verify update succeeded
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated = 0 THEN
        RETURN QUERY SELECT false, 'Failed to update profile'::TEXT, 0;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, 'Mission completed successfully'::TEXT, v_reward_amount;
END;
$$;

-- ============================================
-- 6. ADD ZGOLD COLUMN IF NOT EXISTS
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'game_profiles' 
                   AND column_name = 'zgold') THEN
        ALTER TABLE public.game_profiles ADD COLUMN zgold INTEGER DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- 7. COUPON REDEMPTION SYSTEM
-- ============================================

-- Table to track coupon redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reward_amount INTEGER NOT NULL,
  reward_currency TEXT NOT NULL CHECK (reward_currency IN ('zcoins', 'zgold')),
  UNIQUE(user_id, coupon_code)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies for coupon_redemptions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupon_redemptions' AND policyname = 'Users can view own redemptions') THEN
        CREATE POLICY "Users can view own redemptions" 
        ON public.coupon_redemptions FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupon_redemptions' AND policyname = 'Users can insert own redemptions') THEN
        CREATE POLICY "Users can insert own redemptions" 
        ON public.coupon_redemptions FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Function to redeem a coupon code
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_user_id UUID, p_coupon_code TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, reward_amount INTEGER, reward_currency TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_exists BOOLEAN;
    v_already_redeemed BOOLEAN;
    v_reward_amount INTEGER;
    v_reward_currency TEXT;
    v_is_admin BOOLEAN;
    v_can_redeem BOOLEAN := false;
BEGIN
    -- Check if user has a game profile
    SELECT EXISTS(
        SELECT 1 FROM public.game_profiles 
        WHERE user_id = p_user_id
    ) INTO v_profile_exists;
    
    IF NOT v_profile_exists THEN
        RETURN QUERY SELECT false, 'User profile not found'::TEXT, 0, ''::TEXT;
        RETURN;
    END IF;
    
    -- Normalize coupon code to lowercase
    p_coupon_code := LOWER(TRIM(p_coupon_code));
    
    -- Check if user is admin (has admin role or specific email)
    SELECT EXISTS(
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_user_id AND role = 'admin'
    ) INTO v_is_admin;
    
    -- Define coupon rewards
    CASE p_coupon_code
        WHEN 'zetsu2026' THEN
            v_reward_amount := 100;
            v_reward_currency := 'zcoins';
            v_can_redeem := v_is_admin; -- Admin only, reusable
        WHEN 'zetsugold2026' THEN
            v_reward_amount := 100;
            v_reward_currency := 'zgold';
            v_can_redeem := v_is_admin; -- Admin only, reusable
        WHEN 'zersu2026' THEN
            v_reward_amount := 50;
            v_reward_currency := 'zcoins';
            -- Check if already redeemed by this user
            SELECT EXISTS(
                SELECT 1 FROM public.coupon_redemptions 
                WHERE user_id = p_user_id AND coupon_code = p_coupon_code
            ) INTO v_already_redeemed;
            
            IF v_already_redeemed THEN
                RETURN QUERY SELECT false, 'Coupon already redeemed'::TEXT, 0, ''::TEXT;
                RETURN;
            END IF;
            v_can_redeem := true; -- Available to all players, one-time use
        ELSE
            RETURN QUERY SELECT false, 'Invalid coupon code'::TEXT, 0, ''::TEXT;
            RETURN;
    END CASE;
    
    -- Check if user can redeem this coupon
    IF NOT v_can_redeem THEN
        RETURN QUERY SELECT false, 'This coupon is only available for admins'::TEXT, 0, ''::TEXT;
        RETURN;
    END IF;
    
    -- Add reward to user profile
    IF v_reward_currency = 'zcoins' THEN
        UPDATE public.game_profiles
        SET zcoins = zcoins + v_reward_amount,
            updated_at = now()
        WHERE user_id = p_user_id;
    ELSE
        UPDATE public.game_profiles
        SET zgold = zgold + v_reward_amount,
            updated_at = now()
        WHERE user_id = p_user_id;
    END IF;
    
    -- Record redemption (only for non-admin reusable codes)
    IF p_coupon_code = 'zersu2026' THEN
        INSERT INTO public.coupon_redemptions (user_id, coupon_code, reward_amount, reward_currency)
        VALUES (p_user_id, p_coupon_code, v_reward_amount, v_reward_currency);
    END IF;
    
    RETURN QUERY SELECT true, 'Coupon redeemed successfully'::TEXT, v_reward_amount, v_reward_currency;
END;
$$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Shop inventory, daily rewards, and coupon system created successfully!';
END $$;
