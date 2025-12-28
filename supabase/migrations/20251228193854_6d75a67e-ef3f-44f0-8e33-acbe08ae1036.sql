-- Add scheduled_at column for post scheduling
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add views_count column for tracking post views
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;

-- Create index for scheduled posts
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON public.posts(scheduled_at) WHERE scheduled_at IS NOT NULL AND published = false;

-- Create index for views count
CREATE INDEX IF NOT EXISTS idx_posts_views ON public.posts(views_count DESC);

-- Create a table to track unique views per user/session
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id UUID DEFAULT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, session_id)
);

-- Enable RLS on post_views
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert views
CREATE POLICY "Anyone can insert views" ON public.post_views
  FOR INSERT WITH CHECK (true);

-- Allow reading view counts
CREATE POLICY "Anyone can read views" ON public.post_views
  FOR SELECT USING (true);