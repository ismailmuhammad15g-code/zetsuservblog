-- Add is_pinned column to posts table
ALTER TABLE public.posts 
ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- Add pinned_at timestamp to track when post was pinned
ALTER TABLE public.posts 
ADD COLUMN pinned_at timestamp with time zone DEFAULT NULL;

-- Create index for faster pinned posts queries
CREATE INDEX idx_posts_pinned ON public.posts (is_pinned, pinned_at DESC) WHERE is_pinned = true;