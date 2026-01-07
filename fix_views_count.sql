-- ============================================
-- FIX: Views Count System
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create the atomic increment function
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

-- 2. Ensure views_count column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'views_count') THEN
        ALTER TABLE public.posts ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Ensure post_views table has correct structure
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, session_id)
);
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- 4. Add RLS policies for post_views
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_views' AND policyname = 'Anyone can insert views') THEN
        CREATE POLICY "Anyone can insert views" ON public.post_views FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_views' AND policyname = 'Anyone can read views') THEN
        CREATE POLICY "Anyone can read views" ON public.post_views FOR SELECT USING (true);
    END IF;
END $$;

-- Done! Views will now increment correctly.
