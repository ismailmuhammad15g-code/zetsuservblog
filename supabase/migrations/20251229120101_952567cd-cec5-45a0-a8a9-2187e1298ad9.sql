-- Enable pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Update the notify_new_post function to also trigger push notifications
CREATE OR REPLACE FUNCTION public.notify_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text;
  anon_key text;
BEGIN
  -- Notify all users except the post author when a post is published
  IF NEW.published = true AND (OLD IS NULL OR OLD.published = false) THEN
    -- Insert in-app notifications
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
    
    -- Get Supabase URL and anon key from environment
    supabase_url := current_setting('app.settings.supabase_url', true);
    anon_key := current_setting('app.settings.supabase_anon_key', true);
    
    -- Trigger push notification via edge function (if configured)
    IF supabase_url IS NOT NULL AND supabase_url != '' THEN
      PERFORM extensions.http_post(
        url := supabase_url || '/functions/v1/send-push-notification',
        body := json_build_object(
          'title', 'New Post: ' || NEW.title,
          'body', COALESCE(NEW.excerpt, LEFT(NEW.content, 100) || '...'),
          'url', '/post/' || NEW.slug,
          'tag', 'new-post-' || NEW.id
        )::text,
        headers := json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(anon_key, '')
        )::jsonb
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_notify_new_post ON public.posts;
CREATE TRIGGER trigger_notify_new_post
  AFTER INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_post();