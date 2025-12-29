-- Remove the public SELECT policy that exposes OTP codes
DROP POLICY IF EXISTS "Allow selecting OTP codes by email" ON public.otp_codes;

-- Remove the public UPDATE policy 
DROP POLICY IF EXISTS "Allow updating OTP codes" ON public.otp_codes;

-- Remove the public INSERT policy
DROP POLICY IF EXISTS "Allow inserting OTP codes" ON public.otp_codes;

-- Add DELETE policy for service role (cleanup)
-- Note: The edge function uses SERVICE_ROLE_KEY which bypasses RLS entirely
-- So we don't need any public policies - all operations happen server-side