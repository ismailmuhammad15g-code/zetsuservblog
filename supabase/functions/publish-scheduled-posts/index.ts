import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for scheduled posts to publish...');

    // Get all posts that are scheduled and due to be published
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, slug')
      .eq('published', false)
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledPosts?.length || 0} posts to publish`);

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No scheduled posts to publish',
          publishedCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update each post to published
    const publishedIds: string[] = [];
    for (const post of scheduledPosts) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ 
          published: true,
          scheduled_at: null // Clear the scheduled time
        })
        .eq('id', post.id);

      if (updateError) {
        console.error(`Error publishing post ${post.id}:`, updateError);
      } else {
        console.log(`Published post: ${post.title}`);
        publishedIds.push(post.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Published ${publishedIds.length} posts`,
        publishedCount: publishedIds.length,
        publishedIds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in publish-scheduled-posts:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
