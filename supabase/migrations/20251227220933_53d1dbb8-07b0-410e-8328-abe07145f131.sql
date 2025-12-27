-- Allow users to read their own posts (including drafts)
CREATE POLICY "Users can read their own posts"
ON public.posts
FOR SELECT
USING (auth.uid() = user_id);
