-- Add audio fields to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL;

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS audio_type TEXT DEFAULT NULL CHECK (audio_type IN ('url', 'file', NULL));

-- Create index for faster queries on posts with audio
CREATE INDEX IF NOT EXISTS idx_posts_audio_url ON public.posts(audio_url) WHERE audio_url IS NOT NULL;
