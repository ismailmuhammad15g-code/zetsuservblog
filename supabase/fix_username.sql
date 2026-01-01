-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Backfill: Update null usernames using the part before '@' in email
-- This ensures 'UserPosts' page works for existing users
UPDATE public.profiles
SET username = split_part(email, '@', 1)
WHERE username IS NULL;

-- If there are duplicates, the above might fail. 
-- In that case, users can manually set it, or run this safer version:
/*
UPDATE public.profiles
SET username = split_part(email, '@', 1) || '_' || substr(id::text, 1, 4)
WHERE username IS NULL;
*/
