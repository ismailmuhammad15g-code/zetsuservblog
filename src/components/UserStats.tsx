import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Eye, 
  Heart, 
  FileText, 
  MessageSquare,
  TrendingUp,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";

interface UserPostStats {
  id: string;
  title: string;
  slug: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
}

interface UserStatsProps {
  userId: string;
}

export function UserStats({ userId }: UserStatsProps) {
  // Fetch user's posts with stats
  const { data: userStats, isLoading } = useQuery({
    queryKey: ["user-stats", userId],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("posts")
        .select("id, title, slug, views_count")
        .eq("user_id", userId)
        .eq("published", true)
        .order("views_count", { ascending: false });

      if (error) throw error;

      // Get likes and comments for each post
      const postsWithStats = await Promise.all(
        (posts || []).map(async (post) => {
          const [likesResult, commentsResult] = await Promise.all([
            supabase
              .from("likes")
              .select("id", { count: "exact" })
              .eq("post_id", post.id),
            supabase
              .from("comments")
              .select("id", { count: "exact" })
              .eq("post_id", post.id),
          ]);

          return {
            ...post,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
          };
        })
      );

      // Calculate totals
      const totalViews = postsWithStats.reduce((sum, p) => sum + p.views_count, 0);
      const totalLikes = postsWithStats.reduce((sum, p) => sum + p.likes_count, 0);
      const totalComments = postsWithStats.reduce((sum, p) => sum + p.comments_count, 0);

      return {
        posts: postsWithStats as UserPostStats[],
        totals: {
          posts: postsWithStats.length,
          views: totalViews,
          likes: totalLikes,
          comments: totalComments,
        },
      };
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userStats || userStats.posts.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No published posts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Posts</CardTitle>
            <FileText className="h-3.5 w-3.5 text-blue-500" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold">{userStats.totals.posts}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Views</CardTitle>
            <Eye className="h-3.5 w-3.5 text-purple-500" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold">{userStats.totals.views}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Likes</CardTitle>
            <Heart className="h-3.5 w-3.5 text-rose-500" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold">{userStats.totals.likes}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Comments</CardTitle>
            <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold">{userStats.totals.comments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Posts */}
      {userStats.posts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Your Top Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userStats.posts.slice(0, 5).map((post, index) => (
                <Link
                  key={post.id}
                  to={`/post/${post.slug}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.views_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.likes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.comments_count}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
