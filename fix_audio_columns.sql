-- Run this script in your Supabase Dashboard > SQL Editor to fix the "schema cache" error

-- 1. Add audio_url column if it doesn't exist
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL;

-- 2. Add audio_type column if it doesn't exist
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS audio_type TEXT DEFAULT NULL CHECK (audio_type IN ('url', 'file', NULL));

-- 3. Create an index for performance
CREATE INDEX IF NOT EXISTS idx_posts_audio_url ON public.posts(audio_url) WHERE audio_url IS NOT NULL;

-- 4. Force a schema cache reload (optional, but good practice)
NOTIFY pgrst, 'reload schema';
