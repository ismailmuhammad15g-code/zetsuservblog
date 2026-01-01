-- Add referral_source column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Verify column exists (optional check)
-- SELECT * FROM public.profiles LIMIT 1;
