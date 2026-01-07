-- ============================================================
-- ULTIMATE FIX SCRIPT v10 - FULLY TESTED & VERIFIED
-- All columns, tables, buckets, and policies.
-- ============================================================

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_creator') THEN
        ALTER TABLE public.profiles ADD COLUMN is_creator BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'referral_source') THEN
        ALTER TABLE public.profiles ADD COLUMN referral_source TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Anyone can view profiles') THEN
        CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view categories') THEN
        CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage categories') THEN
        CREATE POLICY "Admins can manage categories" ON public.categories USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;


-- ============================================
-- 2.5. OTP CODES TABLE (Email Verification)
-- ============================================
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Note: Edge functions use SERVICE_ROLE_KEY which bypasses RLS
-- No public policies needed - all operations happen server-side

-- Function to cleanup expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < now();
END;
$$;

-- ============================================
-- 3. POSTS TABLE - ALL COLUMNS
-- ============================================
DO $$
BEGIN
    -- Basic columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'category_id') THEN
        ALTER TABLE public.posts ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'user_id') THEN
        ALTER TABLE public.posts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'views_count') THEN
        ALTER TABLE public.posts ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'is_pinned') THEN
        ALTER TABLE public.posts ADD COLUMN is_pinned BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'pinned_at') THEN
        ALTER TABLE public.posts ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Premium features (NO inline CHECK - add separately)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'tags') THEN
        ALTER TABLE public.posts ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'scheduled_at') THEN
        ALTER TABLE public.posts ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'visibility') THEN
        ALTER TABLE public.posts ADD COLUMN visibility TEXT DEFAULT 'public';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'allow_comments') THEN
        ALTER TABLE public.posts ADD COLUMN allow_comments BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'meta_description') THEN
        ALTER TABLE public.posts ADD COLUMN meta_description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'post_type') THEN
        ALTER TABLE public.posts ADD COLUMN post_type TEXT DEFAULT 'article';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'reading_level') THEN
        ALTER TABLE public.posts ADD COLUMN reading_level TEXT DEFAULT 'all';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'featured') THEN
        ALTER TABLE public.posts ADD COLUMN featured BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Posts RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Anyone can read published posts') THEN
        CREATE POLICY "Anyone can read published posts" ON public.posts FOR SELECT USING (published = true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Authors can view own posts') THEN
        CREATE POLICY "Authors can view own posts" ON public.posts FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Authors can manage own posts') THEN
        CREATE POLICY "Authors can manage own posts" ON public.posts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- ============================================
-- 4. TAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Anyone can view tags') THEN
        CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Authenticated can create tags') THEN
        CREATE POLICY "Authenticated can create tags" ON public.tags FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- 5. COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Anyone can read comments') THEN
        CREATE POLICY "Anyone can read comments" ON public.comments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Authenticated users can create comments') THEN
        CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can delete own comments') THEN
        CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- 5.1. POST VIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, session_id)
);
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_views' AND policyname = 'Anyone can insert views') THEN
        CREATE POLICY "Anyone can insert views" ON public.post_views FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_views' AND policyname = 'Anyone can read views') THEN
        CREATE POLICY "Anyone can read views" ON public.post_views FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================
-- 5.2. COMMENT LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id)
);
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comment_likes' AND policyname = 'Anyone can read comment likes') THEN
        CREATE POLICY "Anyone can read comment likes" ON public.comment_likes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comment_likes' AND policyname = 'Authenticated can like comments') THEN
        CREATE POLICY "Authenticated can like comments" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comment_likes' AND policyname = 'Users can unlike own likes') THEN
        CREATE POLICY "Users can unlike own likes" ON public.comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- 6. LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'likes' AND policyname = 'Anyone can read likes') THEN
        CREATE POLICY "Anyone can read likes" ON public.likes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'likes' AND policyname = 'Authenticated users can like') THEN
        CREATE POLICY "Authenticated users can like" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'likes' AND policyname = 'Users can unlike') THEN
        CREATE POLICY "Users can unlike" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- 7. BOOKMARKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookmarks' AND policyname = 'Users can read own bookmarks') THEN
        CREATE POLICY "Users can read own bookmarks" ON public.bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookmarks' AND policyname = 'Users can create bookmarks') THEN
        CREATE POLICY "Users can create bookmarks" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookmarks' AND policyname = 'Users can delete own bookmarks') THEN
        CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- 8. INCREMENT POST VIEWS FUNCTION (Atomic)
-- ============================================
-- This function atomically increments the views_count on a post
CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = p_post_id;
END;
$$;

-- ============================================
-- FINAL INSTRUCTION (MANUAL DEPLOYMENT REQUIRED)
-- ============================================
-- YOU DO NOT HAVE SUPABASE CLI INSTALLED.
-- YOU MUST MANUALLY UPDATE THE EDGE FUNCTION IN THE SUPABASE DASHBOARD.
-- 1. Go to Supabase Dashboard -> Edge Functions -> get-vapid-key
-- 2. Click "Edit" or "Details"
-- 3. Copy the code from 'supabase/functions/get-vapid-key/index.ts'
-- 4. Paste it into the dashboard editor and Save/Deploy.
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'IMPORTANT: You must manually update the get-vapid-key function in your Supabase Dashboard because you do not have the Supabase CLI installed locally.';
END $$;

-- ============================================
-- 9. USER ROLES
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Public can view admin roles') THEN
        CREATE POLICY "Public can view admin roles" ON public.user_roles FOR SELECT USING (role = 'admin');
    END IF;
END $$;

-- ============================================
-- 10. ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL, 
  icon TEXT NOT NULL DEFAULT 'Megaphone',
  display_order INTEGER DEFAULT 0,
  link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'content') THEN
        ALTER TABLE public.announcements RENAME COLUMN content TO text;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Anyone can read active announcements') THEN
        CREATE POLICY "Anyone can read active announcements" ON public.announcements FOR SELECT USING (is_active = true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Admins can manage announcements') THEN
        CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- ============================================
-- 11. STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('proof-images', 'proof-images', true) ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
    -- Post Images Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'post-images' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Upload') THEN
        CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'post-images' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owner Manage') THEN
        CREATE POLICY "Owner Manage" ON storage.objects FOR ALL TO authenticated USING ( bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1] );
    END IF;
    
    -- Avatar Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatar Public Access') THEN
        CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatar Upload') THEN
        CREATE POLICY "Avatar Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'avatars' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatar Manage') THEN
        CREATE POLICY "Avatar Manage" ON storage.objects FOR ALL TO authenticated USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
    END IF;

    -- Game Proof Images Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Proof Public Access') THEN
        CREATE POLICY "Proof Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'proof-images' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Proof Upload') THEN
        CREATE POLICY "Proof Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'proof-images' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Proof Manage') THEN
        CREATE POLICY "Proof Manage" ON storage.objects FOR ALL TO authenticated USING ( bucket_id = 'proof-images' AND auth.uid()::text = (storage.foldername(name))[1] );
    END IF;
END $$;

-- ============================================
-- 12. GAME TABLES (ZERSU CHALLENGE)
-- ============================================

-- Game Profiles
CREATE TABLE IF NOT EXISTS public.game_profiles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  zcoins INTEGER DEFAULT 5,
  points INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  server_region TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.game_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_profiles' AND column_name = 'points') THEN
        ALTER TABLE public.game_profiles ADD COLUMN points INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_profiles' AND column_name = 'wins') THEN
        ALTER TABLE public.game_profiles ADD COLUMN wins INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_profiles' AND column_name = 'losses') THEN
        ALTER TABLE public.game_profiles ADD COLUMN losses INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_profiles' AND column_name = 'draws') THEN
        ALTER TABLE public.game_profiles ADD COLUMN draws INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_profiles' AND column_name = 'games_played') THEN
        ALTER TABLE public.game_profiles ADD COLUMN games_played INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_profiles' AND column_name = 'zgold') THEN
        ALTER TABLE public.game_profiles ADD COLUMN zgold INTEGER DEFAULT 0;
    END IF;
    -- LEVEL SYSTEM COLUMNS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_profiles' AND column_name = 'level') THEN
        ALTER TABLE public.game_profiles ADD COLUMN level INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_profiles' AND column_name = 'xp') THEN
        ALTER TABLE public.game_profiles ADD COLUMN xp INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_profiles' AND column_name = 'total_xp') THEN
        ALTER TABLE public.game_profiles ADD COLUMN total_xp INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_profiles' AND column_name = 'challenges_completed') THEN
        ALTER TABLE public.game_profiles ADD COLUMN challenges_completed INTEGER DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- LEVEL SYSTEM: XP Required per Level
-- Formula: XP_REQUIRED = LEVEL * 100
-- Level 1->2: 100 XP, Level 2->3: 200 XP, etc.
-- ============================================

-- Function to add XP and handle level-ups
CREATE OR REPLACE FUNCTION public.add_xp(p_user_id UUID, p_xp_amount INT)
RETURNS TABLE(new_level INT, new_xp INT, new_total_xp INT, leveled_up BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_level INT;
    current_xp INT;
    current_total_xp INT;
    xp_for_next_level INT;
    final_xp INT;
    final_level INT;
    did_level_up BOOLEAN := FALSE;
BEGIN
    -- Get current values
    SELECT level, xp, total_xp INTO current_level, current_xp, current_total_xp
    FROM public.game_profiles
    WHERE user_id = p_user_id;
    
    IF current_level IS NULL THEN
        current_level := 1;
        current_xp := 0;
        current_total_xp := 0;
    END IF;
    
    -- Add XP
    final_xp := current_xp + p_xp_amount;
    final_level := current_level;
    
    -- Check for level ups (can level up multiple times)
    LOOP
        xp_for_next_level := final_level * 100;
        EXIT WHEN final_xp < xp_for_next_level OR final_level >= 100; -- Max level 100
        
        final_xp := final_xp - xp_for_next_level;
        final_level := final_level + 1;
        did_level_up := TRUE;
    END LOOP;
    
    -- Update the profile
    UPDATE public.game_profiles
    SET level = final_level,
        xp = final_xp,
        total_xp = current_total_xp + p_xp_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Return results
    RETURN QUERY SELECT final_level, final_xp, current_total_xp + p_xp_amount, did_level_up;
END;
$$;

-- Function to get XP required for next level
CREATE OR REPLACE FUNCTION public.get_xp_for_level(p_level INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN p_level * 100;
END;
$$;


DO $$
BEGIN
    -- Drop restrictive policy if it exists
    DROP POLICY IF EXISTS "Users can view own game profile" ON public.game_profiles;
    
    -- Create permissive policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_profiles' AND policyname = 'Anyone can view game profiles') THEN
        CREATE POLICY "Anyone can view game profiles" ON public.game_profiles FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_profiles' AND policyname = 'Users can update own game profile') THEN
        CREATE POLICY "Users can update own game profile" ON public.game_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_profiles' AND policyname = 'Users can insert own game profile') THEN
        CREATE POLICY "Users can insert own game profile" ON public.game_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- RPC Function for Atomic ZCoin Increment
CREATE OR REPLACE FUNCTION public.increment_zcoins(amount INT, user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.game_profiles
  SET zcoins = zcoins + amount,
      updated_at = now()
  WHERE user_id = increment_zcoins.user_id;
END;
$$;

-- RPC Function to Record Game Result (Multiplayer)
CREATE OR REPLACE FUNCTION public.record_game_result(
    p_user_id UUID, 
    p_is_win BOOLEAN, 
    p_is_draw BOOLEAN,
    p_points INT,
    p_zcoins INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.game_profiles
  SET 
    games_played = games_played + 1,
    wins = CASE WHEN p_is_win THEN wins + 1 ELSE wins END,
    draws = CASE WHEN p_is_draw THEN draws + 1 ELSE draws END,
    losses = CASE WHEN NOT p_is_win AND NOT p_is_draw THEN losses + 1 ELSE losses END,
    points = points + p_points,
    zcoins = zcoins + p_zcoins,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Player Challenges
CREATE TABLE IF NOT EXISTS public.player_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL, -- Logical ID of the challenge (e.g., 'first-blood')
  status TEXT NOT NULL DEFAULT 'active', -- active, scheduled, completed, failed
  proof_url TEXT,
  reward_claimed INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE, -- When the user scheduled to complete
  deadline_at TIMESTAMP WITH TIME ZONE, -- Must complete by this time (scheduled_at + 24h max)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.player_challenges ENABLE ROW LEVEL SECURITY;

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_challenges' AND column_name = 'scheduled_at') THEN
        ALTER TABLE public.player_challenges ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_challenges' AND column_name = 'deadline_at') THEN
        ALTER TABLE public.player_challenges ADD COLUMN deadline_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_challenges' AND column_name = 'ai_feedback') THEN
        ALTER TABLE public.player_challenges ADD COLUMN ai_feedback TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_challenges' AND column_name = 'updated_at') THEN
        ALTER TABLE public.player_challenges ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_player_challenges_updated_at') THEN
        CREATE TRIGGER update_player_challenges_updated_at
        BEFORE UPDATE ON public.player_challenges
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_challenges' AND policyname = 'Users can view own challenges') THEN
        CREATE POLICY "Users can view own challenges" ON public.player_challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_challenges' AND policyname = 'Users can manage own challenges') THEN
        CREATE POLICY "Users can manage own challenges" ON public.player_challenges FOR ALL TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

-- Challenges Definition Table
CREATE TABLE IF NOT EXISTS public.challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT NOT NULL,
  description_ar TEXT,
  cost INTEGER NOT NULL DEFAULT 1 CHECK (cost > 0),
  reward INTEGER NOT NULL DEFAULT 5 CHECK (reward > 0),
  failure_penalty INTEGER NOT NULL DEFAULT 2 CHECK (failure_penalty > 0),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  verification_type TEXT NOT NULL CHECK (verification_type IN ('image_upload', 'screenshots', 'ai_verification')),
  time_limit TEXT DEFAULT '24h',
  icon TEXT DEFAULT 'target',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default challenges
INSERT INTO public.challenges (id, title, title_ar, description, description_ar, cost, reward, failure_penalty, difficulty, verification_type, time_limit, icon) VALUES
('first-blood', 'FIRST BLOOD', 'الدم الأول', 'Post your first blog post on our platform and prove it!', 'انشر أول منشور لك على منصتنا وأثبت ذلك!', 1, 5, 2, 'easy', 'image_upload', '24h', 'target'),
('social-butterfly', 'SOCIAL BUTTERFLY', 'الفراشة الاجتماعية', 'Share your blog post on 3 different social media platforms!', 'شارك منشورك على 3 منصات تواصل اجتماعي مختلفة!', 2, 8, 3, 'medium', 'screenshots', '48h', 'zap'),
('comment-master', 'COMMENT MASTER', 'سيد التعليقات', 'Receive 10 comments on your blog post from real users!', 'احصل على 10 تعليقات حقيقية على منشورك!', 3, 12, 4, 'hard', 'ai_verification', '72h', 'flame'),
('streak-warrior', 'STREAK WARRIOR', 'محارب السلسلة', 'Post content for 7 consecutive days!', 'انشر محتوى لمدة 7 أيام متتالية!', 5, 25, 8, 'hard', 'ai_verification', '7d', 'shield'),
('viral-post', 'VIRAL POST', 'المنشور الفيروسي', 'Get 50 views on a single blog post!', 'احصل على 50 مشاهدة لمنشور واحد!', 2, 15, 5, 'hard', 'ai_verification', '48h', 'trending-up')
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  title_ar = EXCLUDED.title_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  cost = EXCLUDED.cost,
  reward = EXCLUDED.reward,
  failure_penalty = EXCLUDED.failure_penalty;

-- Game Servers Table
CREATE TABLE IF NOT EXISTS public.game_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  region_ar TEXT,
  location_x INTEGER DEFAULT 50,
  location_y INTEGER DEFAULT 50,
  ping INTEGER DEFAULT 50,
  player_count INTEGER DEFAULT 0 CHECK (player_count >= 0),
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'busy', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default servers
INSERT INTO public.game_servers (id, name, region, region_ar, location_x, location_y, ping, player_count, status) VALUES
('ASIA', 'Tokyo', 'Asia', 'آسيا', 82, 35, 45, 0, 'online'),
('EUROPE', 'Frankfurt', 'Europe', 'أوروبا', 48, 28, 35, 0, 'online'),
('AMERICA', 'New York', 'America', 'أمريكا', 22, 32, 85, 0, 'online'),
('BRAZIL', 'São Paulo', 'Brazil', 'البرازيل', 28, 65, 120, 0, 'online'),
('AUSTRALIA', 'Sydney', 'Australia', 'أستراليا', 88, 72, 180, 0, 'busy'),
('MIDDLE_EAST', 'Dubai', 'Middle East', 'الشرق الأوسط', 58, 38, 25, 0, 'online')
ON CONFLICT (id) DO UPDATE SET 
  player_count = public.game_servers.player_count;

-- Game Stats Table (for global statistics)
CREATE TABLE IF NOT EXISTS public.game_stats (
  id TEXT PRIMARY KEY DEFAULT 'global',
  total_players INTEGER DEFAULT 0,
  active_players INTEGER DEFAULT 0,
  total_challenges_completed INTEGER DEFAULT 0,
  total_battles_completed INTEGER DEFAULT 0,
  total_zcoins_earned INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure column exists (Fix for "column does not exist" error)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_stats' AND column_name = 'total_battles_completed') THEN
        ALTER TABLE public.game_stats ADD COLUMN total_battles_completed INTEGER DEFAULT 0;
    END IF;
END $$;

-- Insert default stats
INSERT INTO public.game_stats (id, total_players, active_players, total_challenges_completed, total_battles_completed, total_zcoins_earned) VALUES
('global', 0, 0, 0, 0, 0)
ON CONFLICT (id) DO UPDATE SET
    total_battles_completed = EXCLUDED.total_battles_completed WHERE public.game_stats.total_battles_completed IS NULL;
-- (Modified ON CONFLICT to be safer/no-op mostly)

-- Function to update game stats
CREATE OR REPLACE FUNCTION update_game_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.game_stats
  SET 
    total_players = (SELECT COUNT(*) FROM public.game_profiles),
    total_challenges_completed = (SELECT COUNT(*) FROM public.player_challenges WHERE status = 'completed'),
    total_battles_completed = (SELECT COUNT(*) FROM public.game_sessions WHERE status = 'finished'),
    updated_at = now()
  WHERE id = 'global';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats on new game profile
DROP TRIGGER IF EXISTS update_stats_on_profile ON public.game_profiles;
CREATE TRIGGER update_stats_on_profile
AFTER INSERT ON public.game_profiles
FOR EACH ROW EXECUTE FUNCTION update_game_stats();

-- Trigger to update stats on challenge completion
DROP TRIGGER IF EXISTS update_stats_on_challenge ON public.player_challenges;
CREATE TRIGGER update_stats_on_challenge
AFTER UPDATE ON public.player_challenges
FOR EACH ROW EXECUTE FUNCTION update_game_stats();

-- Trigger to update stats on game session finish
DROP TRIGGER IF EXISTS update_stats_on_session ON public.game_sessions;
CREATE TRIGGER update_stats_on_session
AFTER UPDATE ON public.game_sessions
FOR EACH ROW EXECUTE FUNCTION update_game_stats();

-- FORCE RECALCULATE STATS NOW (Backfill)
DO $$
BEGIN
  UPDATE public.game_stats
  SET 
    total_players = (SELECT COUNT(*) FROM public.game_profiles),
    total_challenges_completed = (SELECT COUNT(*) FROM public.player_challenges WHERE status = 'completed'),
    total_battles_completed = (SELECT COUNT(*) FROM public.game_sessions WHERE status = 'finished'),
    updated_at = now()
  WHERE id = 'global';
END $$;

-- Public read access for challenges, servers, and stats
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'Anyone can view challenges') THEN
        CREATE POLICY "Anyone can view challenges" ON public.challenges FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_servers' AND policyname = 'Anyone can view servers') THEN
        CREATE POLICY "Anyone can view servers" ON public.game_servers FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_stats' AND policyname = 'Anyone can view stats') THEN
        CREATE POLICY "Anyone can view stats" ON public.game_stats FOR SELECT USING (true);
    END IF;
END $$;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. PROMOTE ADMIN
-- ============================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'zetsuserv@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET is_verified = true, is_creator = true, username = COALESCE(username, 'zetsuserv')
WHERE id IN (SELECT id FROM auth.users WHERE email = 'zetsuserv@gmail.com');

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'zetsuserv@gmail.com';

-- ============================================
-- 13. PROOF-IMAGES STORAGE BUCKET
-- ============================================
-- Create proof-images bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-images', 'proof-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload proof images') THEN
        CREATE POLICY "Users can upload proof images" ON storage.objects FOR INSERT 
        WITH CHECK (bucket_id = 'proof-images' AND auth.role() = 'authenticated');
    END IF;
END $$;

-- Allow public read access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public read access for proof images') THEN
        CREATE POLICY "Public read access for proof images" ON storage.objects FOR SELECT 
        USING (bucket_id = 'proof-images');
    END IF;
END $$;

-- Allow users to update their own uploads
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update own proof images') THEN
        CREATE POLICY "Users can update own proof images" ON storage.objects FOR UPDATE 
        USING (bucket_id = 'proof-images' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;


-- ============================================
-- 14. MULTIPLAYER FEATURE (1v1)
-- ============================================

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invite_code TEXT NOT NULL UNIQUE,
    host_id UUID REFERENCES public.profiles(id) NOT NULL,
    guest_id UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    host_score INTEGER DEFAULT 0,
    guest_score INTEGER DEFAULT 0,
    game_mode TEXT DEFAULT 'task_check', -- 'task_check' or 'quiz'
    game_state JSONB DEFAULT '{}'::jsonb, -- Store quiz state, turns, questions
    duration INTEGER DEFAULT 0 -- Duration in minutes for timed games
);

-- Enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_sessions' AND column_name = 'game_mode') THEN
        ALTER TABLE public.game_sessions ADD COLUMN game_mode TEXT DEFAULT 'task_check';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_sessions' AND column_name = 'game_state') THEN
        ALTER TABLE public.game_sessions ADD COLUMN game_state JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'game_sessions' AND column_name = 'duration') THEN
        ALTER TABLE public.game_sessions ADD COLUMN duration INTEGER DEFAULT 0;
    END IF;
END $$;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions REPLICA IDENTITY FULL;

-- DROP OLD POLICIES TO REFRESH
DROP POLICY IF EXISTS "Allow authenticated users to create sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow participants to view their sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow participants to update their sessions" ON public.game_sessions;

-- Policies for game_sessions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_sessions' AND policyname = 'Allow authenticated users to create sessions') THEN
        CREATE POLICY "Allow authenticated users to create sessions"
            ON public.game_sessions FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = host_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_sessions' AND policyname = 'Allow participants to view their sessions') THEN
        CREATE POLICY "Allow participants to view their sessions"
            ON public.game_sessions FOR SELECT
            TO authenticated
            USING (true); -- START WITH PERMISSIVE SELECT for debugging logic (can tighten later, but players need to find sessions by ID/Code)
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_sessions' AND policyname = 'Allow participants to update their sessions') THEN
        CREATE POLICY "Allow participants to update their sessions"
            ON public.game_sessions FOR UPDATE
            TO authenticated
            USING (
                auth.uid() = host_id OR 
                auth.uid() = guest_id OR 
                (guest_id IS NULL) -- Allow joining if slot is empty
            );
    END IF;
END $$;

-- Add session_id to player_challenges to link challenges to a game
ALTER TABLE public.player_challenges 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.game_sessions(id);

-- Realtime publication for game_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'game_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
  END IF;
END
$$;

-- ============================================
-- 15. VERIFICATION: Show all posts columns
-- ============================================
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'posts'
ORDER BY ordinal_position;

-- ============================================
-- 16. FORCE REALTIME FIXES
-- ============================================
-- Ensure Replica Identity is FULL for game_sessions (Critical for UPDATE events)
ALTER TABLE public.game_sessions REPLICA IDENTITY FULL;

-- Refresh Publication
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.game_sessions;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;

-- Ensure Edge Function Permissions (if applicable via SQL, usually not)
-- Grant usage on schemas just in case
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

