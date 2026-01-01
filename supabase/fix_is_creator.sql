-- Add is_creator column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT false;

-- Add updated_at if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
