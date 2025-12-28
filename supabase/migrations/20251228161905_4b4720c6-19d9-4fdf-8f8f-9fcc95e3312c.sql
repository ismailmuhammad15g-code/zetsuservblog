-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_post', 'new_comment', 'comment_reply', 'like')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  related_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  related_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users can read their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (via triggers/functions)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to notify followers when a new post is created
CREATE OR REPLACE FUNCTION public.notify_new_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Notify all users except the post author when a post is published
  IF NEW.published = true AND (OLD IS NULL OR OLD.published = false) THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, related_post_id)
    SELECT 
      p.id,
      'new_post',
      'New Post Published',
      'A new post "' || NEW.title || '" has been published!',
      '/post/' || NEW.slug,
      NEW.id
    FROM public.profiles p
    WHERE p.id != COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new posts
CREATE TRIGGER on_post_published
  AFTER INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_post();

-- Create function to notify post author when someone comments
CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
  post_title TEXT;
  post_slug TEXT;
BEGIN
  -- Get the post author and title
  SELECT user_id, title, slug INTO post_author_id, post_title, post_slug
  FROM public.posts
  WHERE id = NEW.post_id;
  
  -- Notify the post author if they're not the commenter
  IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, related_post_id, related_comment_id)
    VALUES (
      post_author_id,
      'new_comment',
      'New Comment on Your Post',
      'Someone commented on your post "' || post_title || '"',
      '/post/' || post_slug,
      NEW.post_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new comments
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_comment();