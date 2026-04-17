-- Fix Notifications Schema and Permissions

-- 1. Create notifications table if it doesn't exist (Idempotent)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  link TEXT,
  related_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  related_comment_id UUID REFERENCES public.comments(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Configure RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Policy: Users can see only their own notifications
CREATE POLICY "Users can see their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Service Role (Edge Functions) can insert notifications
-- Note: Service role bypasses RLS anyway, but good to be explicit or if using a constrained role
CREATE POLICY "Service role can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true); 

-- 3. Enable Realtime for notifications
-- This is crucial for the Bell icon to update live
BEGIN;
  -- Remove if already exists to avoid error
  DROP PUBLICATION IF EXISTS supabase_realtime;
  -- Re-create publication (standard Supabase setup)
  CREATE PUBLICATION supabase_realtime FOR TABLES public.notifications;
COMMIT;
-- OR just alter if publication exists (safest for existing setups)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- 4. Ensure Push Subscriptions Table Exists and is Secure
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can manage their own subscriptions" 
ON public.push_subscriptions FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Grants (Just to be sure)
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;

GRANT ALL ON public.push_subscriptions TO service_role;
GRANT ALL ON public.push_subscriptions TO authenticated;
