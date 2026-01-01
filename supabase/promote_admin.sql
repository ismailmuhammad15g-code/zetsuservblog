-- Give Admin Role and Verification to zetsuserv@gmail.com

-- 1. Ensure user has admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'zetsuserv@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Add is_verified column if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 3. Mark user as Verified and Creator
UPDATE public.profiles
SET 
  is_verified = true, 
  is_creator = true,
  full_name = 'ZetsuServ Admin' -- Optional: set a default name
WHERE id IN (SELECT id FROM auth.users WHERE email = 'zetsuserv@gmail.com');

-- 4. Verify email (optional, if they are stuck in unverified state)
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'zetsuserv@gmail.com' AND email_confirmed_at IS NULL;
