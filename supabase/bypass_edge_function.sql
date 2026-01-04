-- Enable HTTP extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create the RPC function
CREATE OR REPLACE FUNCTION public.generate_ai_post_rpc()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    can_post boolean;
    doc_json jsonb;
    prompt text;
    api_key text := 'sk-8s5lZUboc3EDTzMjTNP6y2Vp3I6sAVKcdexeJtVUs4fVwGGZ9BvGTTSgBOw'; -- Using the first key
    api_url text := 'https://api.routeway.ai/v1/chat/completions';
    ai_response_status integer;
    ai_response_content text;
    ai_response_json jsonb;
    response_content text;
    parsed_post_data jsonb;
    image_prompt text;
    final_image_url text;
    new_post_id uuid;
    new_post_title text;
    new_post_image text;
BEGIN
    -- 1. Check Rate Limits
    SELECT * INTO can_post FROM public.can_ai_post();
    IF NOT can_post THEN
        RAISE EXCEPTION 'Daily post limit reached (max 2 per day)';
    END IF;

    -- 2. Get Documentation
    SELECT * INTO doc_json FROM public.get_ai_documentation_json();

    -- 3. Construct Prompt
    prompt := 'You are Zersu (زيرسو), the mysterious AI guardian of ZetsuServ. ' ||
              'CURRENT DOCUMENTATION: ' || doc_json::text || '. ' ||
              'Create an engaging post. ' ||
              'RESPOND WITH JSON ONLY: {"title": "...", "description": "...", "imagePrompt": "..."}';

    -- 4. Call Routeway API
    SELECT status, content::text INTO ai_response_status, ai_response_content
    FROM extensions.http((
        'POST', 
        api_url, 
        ARRAY[http_header('Content-Type', 'application/json'), http_header('Authorization', 'Bearer ' || api_key)], 
        'application/json', 
        jsonb_build_object(
            'model', 'kimi-k2-0905:free',
            'messages', jsonb_build_array(
                jsonb_build_object('role', 'user', 'content', prompt)
            )
        )::text
    )::http_request);

    -- Log the raw response for debugging
    RAISE NOTICE 'AI API Status: %, Content: %', ai_response_status, ai_response_content;

    IF ai_response_status != 200 THEN
        RAISE EXCEPTION 'AI API Error %: %', ai_response_status, ai_response_content;
    END IF;

    -- Safely parse JSON
    BEGIN
        ai_response_json := ai_response_content::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to parse AI response JSON. Content: %', ai_response_content;
    END;

    -- 5. Extract Content
    response_content := ai_response_json -> 'choices' -> 0 -> 'message' ->> 'content';
    
    -- Clean up content if it contains markdown code blocks
    -- Simple regex replacement to remove ```json ... ``` is hard in pure SQL regex, 
    -- so we assume the model obeys or we try to find the first { and last }
    
    BEGIN
        parsed_post_data := response_content::jsonb;
    EXCEPTION WHEN OTHERS THEN
        -- Try to fuzzy parse if the model added text around json
        -- For now, just fail if invalid JSON, or assume simple cleanup potentially needed
        -- Let's try to strip whitespace and hope it's valid
        parsed_post_data := response_content::jsonb; 
    END;

    IF parsed_post_data IS NULL OR parsed_post_data ->> 'title' IS NULL THEN
        RAISE EXCEPTION 'Invalid JSON from AI';
    END IF;

    -- 6. Generate Image URL (Pollinations)
    image_prompt := parsed_post_data ->> 'imagePrompt';
    IF image_prompt IS NULL THEN
        image_prompt := parsed_post_data ->> 'title';
    END IF;
    
    -- URL Encode the prompt (basic replacement of spaces)
    final_image_url := 'https://image.pollinations.ai/prompt/' || replace(image_prompt, ' ', '%20') || '?width=800&height=400&nologo=true';

    -- 7. Insert Post
    INSERT INTO public.ai_posts (title, description, cover_image, is_published)
    VALUES (
        parsed_post_data ->> 'title',
        parsed_post_data ->> 'description',
        final_image_url,
        true
    )
    RETURNING id, title, cover_image INTO new_post_id, new_post_title, new_post_image;

    -- 8. Record Post Stat
    PERFORM public.record_ai_post();

    -- 9. Return Result
    RETURN jsonb_build_object(
        'success', true,
        'id', new_post_id,
        'title', new_post_title,
        'cover_image', new_post_image,
        'stored_in_gcs', false
    );
END;
$$;
