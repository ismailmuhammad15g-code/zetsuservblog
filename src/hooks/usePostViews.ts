import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Generate a unique session ID for anonymous users
const getSessionId = () => {
  let sessionId = localStorage.getItem('view_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('view_session_id', sessionId);
  }
  return sessionId;
};

export function usePostViews(postId: string) {
  const [viewsCount, setViewsCount] = useState(0);
  const [hasTracked, setHasTracked] = useState(false);

  useEffect(() => {
    if (!postId) return;

    const trackView = async () => {
      const sessionId = getSessionId();
      
      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      // Try to insert a view record (will fail silently if already exists due to unique constraint)
      const { error } = await supabase
        .from('post_views')
        .insert({
          post_id: postId,
          viewer_id: user?.id || null,
          session_id: sessionId
        });
      
      if (!error) {
        // View was tracked, increment the counter
        await supabase
          .from('posts')
          .update({ views_count: viewsCount + 1 })
          .eq('id', postId);
        
        setHasTracked(true);
      }
    };

    const fetchViewCount = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('views_count')
        .eq('id', postId)
        .single();
      
      if (!error && data) {
        setViewsCount(data.views_count);
      }
    };

    fetchViewCount();
    
    if (!hasTracked) {
      trackView();
    }
  }, [postId, hasTracked, viewsCount]);

  return viewsCount;
}
