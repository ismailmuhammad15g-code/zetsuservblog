-- Function to check if AI SHOULD post now (rate limiting + schedule)
-- Returns true if:
-- 1. AI is enabled
-- 2. Daily limit not reached (or new day)
-- 3. Scheduled time has passed (or no schedule set)
CREATE OR REPLACE FUNCTION public.should_generate_ai_post()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    config_record RECORD;
    current_date DATE := CURRENT_DATE;
BEGIN
    SELECT * INTO config_record FROM public.ai_post_config WHERE id = 'global';
    
    IF config_record IS NULL THEN
        -- Initialize if missing
        INSERT INTO public.ai_post_config (id, posts_today, max_posts_per_day, is_enabled) 
        VALUES ('global', 0, 2, true);
        RETURN true;
    END IF;
    
    -- If not enabled, return false
    IF NOT config_record.is_enabled THEN
        RETURN false;
    END IF;
    
    -- If different day, reset counter (implicitly allows posting)
    IF config_record.last_post_date IS NULL OR config_record.last_post_date < current_date THEN
        -- We'll just return true here, and let the record_ai_post function handle the reset
        -- or we can do a "dry run" reset here? No, 'can_ai_post' handles logic.
        -- But 'can_ai_post' modifies data! That's bad for a GET request maybe.
        -- Actually 'can_ai_post' does modify data.
        
        -- Let's stick to strict read-only check mostly, but 'can_ai_post' is already defined to mutate.
        -- We can re-use can_ai_post() which does the daily reset if needed.
        
        IF public.can_ai_post() THEN
             -- Check schedule
             IF config_record.next_scheduled_at IS NULL OR config_record.next_scheduled_at <= now() THEN
                 RETURN true;
             END IF;
        END IF;
        
        RETURN false;
    END IF;
    
    -- Same day check
    IF config_record.posts_today >= config_record.max_posts_per_day THEN
        RETURN false;
    END IF;
    
    -- Check schedule
    IF config_record.next_scheduled_at IS NOT NULL AND config_record.next_scheduled_at > now() THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- Grant EXECUTE to public/authenticated
GRANT EXECUTE ON FUNCTION public.should_generate_ai_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_generate_ai_post TO anon;
GRANT EXECUTE ON FUNCTION public.should_generate_ai_post TO service_role;
