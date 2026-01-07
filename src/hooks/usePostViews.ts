import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Simple session-based view tracking using localStorage
const getViewedPosts = (): string[] => {
  try {
    const viewed = localStorage.getItem('viewed_posts');
    return viewed ? JSON.parse(viewed) : [];
  } catch {
    return [];
  }
};

const markPostAsViewed = (postId: string) => {
  try {
    const viewed = getViewedPosts();
    if (!viewed.includes(postId)) {
      viewed.push(postId);
      localStorage.setItem('viewed_posts', JSON.stringify(viewed));
    }
  } catch {
    // Ignore localStorage errors
  }
};

const hasViewedPost = (postId: string): boolean => {
  return getViewedPosts().includes(postId);
};

export function usePostViews(postId: string) {
  const [viewsCount, setViewsCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!postId) {
      setIsLoading(false);
      return;
    }

    const trackAndFetchViews = async () => {
      setIsLoading(true);

      // Only track if not already viewed in this session
      if (!hasViewedPost(postId)) {
        try {
          // Use RPC for atomic increment
          const { error } = await supabase.rpc('increment_post_views', { p_post_id: postId });

          if (error) {
            console.error('RPC increment error:', error);
          } else {
            // Mark as viewed to prevent duplicate counts
            markPostAsViewed(postId);
          }
        } catch (err) {
          console.error('View tracking error:', err);
        }
      }

      // Always fetch current count
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('views_count')
          .eq('id', postId)
          .single();

        if (!error && data) {
          setViewsCount(data.views_count || 0);
        }
      } catch (err) {
        console.error('Fetch views error:', err);
      }

      setIsLoading(false);
    };

    trackAndFetchViews();
  }, [postId]);

  return { viewsCount: viewsCount ?? 0, isLoading };
}
