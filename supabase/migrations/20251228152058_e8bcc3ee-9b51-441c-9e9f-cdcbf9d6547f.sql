-- Allow anyone to check if a user is admin (for verification badge display)
CREATE POLICY "Anyone can view admin roles"
ON public.user_roles
FOR SELECT
USING (role = 'admin'::app_role);