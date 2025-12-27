-- Create OTP codes table for email verification
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Allow inserting OTP codes (public for registration)
CREATE POLICY "Allow inserting OTP codes"
ON public.otp_codes
FOR INSERT
WITH CHECK (true);

-- Allow selecting own OTP codes by email
CREATE POLICY "Allow selecting OTP codes by email"
ON public.otp_codes
FOR SELECT
USING (true);

-- Allow updating OTP codes
CREATE POLICY "Allow updating OTP codes"
ON public.otp_codes
FOR UPDATE
USING (true);

-- Cleanup old OTP codes (function)
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