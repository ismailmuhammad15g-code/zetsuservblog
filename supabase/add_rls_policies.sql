-- Enable RLS on ai_posts if not already on
ALTER TABLE public.ai_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view published posts
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.ai_posts;
CREATE POLICY "Anyone can view published posts" 
ON public.ai_posts FOR SELECT 
USING (is_published = true);

-- Policy: Admins can INSERT posts (needed for client-side generation)
DROP POLICY IF EXISTS "Admins can insert posts" ON public.ai_posts;
CREATE POLICY "Admins can insert posts" 
ON public.ai_posts FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Policy: Admins can UPDATE posts
DROP POLICY IF EXISTS "Admins can update posts" ON public.ai_posts;
CREATE POLICY "Admins can update posts" 
ON public.ai_posts FOR UPDATE
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Policy: Admins can DELETE posts
DROP POLICY IF EXISTS "Admins can delete posts" ON public.ai_posts;
CREATE POLICY "Admins can delete posts" 
ON public.ai_posts FOR DELETE
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Grant Schema Usage (just in case)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.ai_posts TO authenticated;
