-- ============================================
-- AI-GENERATED CHALLENGES SYSTEM
-- ============================================

-- 1. Create user_challenges table for storing AI-generated challenges per user
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 1 CHECK (cost > 0),
  reward INTEGER NOT NULL DEFAULT 5 CHECK (reward > 0),
  failure_penalty INTEGER NOT NULL DEFAULT 2 CHECK (failure_penalty > 0),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  verification_type TEXT NOT NULL DEFAULT 'ai_verification',
  time_limit TEXT DEFAULT '24h',
  icon TEXT DEFAULT 'target',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

-- 2. Add challenges_generated flag to game_profiles
ALTER TABLE public.game_profiles 
ADD COLUMN IF NOT EXISTS challenges_generated BOOLEAN DEFAULT false;

-- 3. RLS Policies for user_challenges
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_challenges' AND policyname = 'Users can view own challenges') THEN
        CREATE POLICY "Users can view own challenges" ON public.user_challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_challenges' AND policyname = 'Users can create own challenges') THEN
        CREATE POLICY "Users can create own challenges" ON public.user_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_challenges' AND policyname = 'Users can update own challenges') THEN
        CREATE POLICY "Users can update own challenges" ON public.user_challenges FOR UPDATE TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON public.user_challenges(user_id);

-- 5. Enable Realtime for user_challenges table
-- This allows the frontend to subscribe to changes in real-time
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'user_challenges'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_challenges;
    END IF;
END $$;

-- Done!
SELECT 'AI-Generated Challenges system tables created successfully with Realtime!' as status;
