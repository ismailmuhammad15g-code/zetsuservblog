-- Create function to send push notifications via edge function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notification_record RECORD;
BEGIN
  -- This function is called after a notification is inserted
  -- We'll use pg_net to call the edge function (if available)
  -- For now, we just log - the actual push will be triggered from the app
  RAISE LOG 'New notification created for user %: %', NEW.user_id, NEW.title;
  RETURN NEW;
END;
$$;

-- Create trigger for new notifications
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
CREATE TRIGGER on_notification_created
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_notification();