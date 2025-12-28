import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Eye, 
  Heart, 
  FileText, 
  Users, 
  TrendingUp,
  MessageSquare,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";

interface PostStats {
  id: string;
  title: string;
  slug: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  published: boolean;
}

export function AdminStats() {
  // Fetch posts with their stats
  const { data: postsStats, isLoading: loadingPosts } = useQuery({
    queryKey: ["admin-posts-stats"],
    queryFn: async () => {
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("id, title, slug, views_count, published")
        .eq("published", true)
        .order("views_count", { ascending: false });

      if (postsError) throw postsError;

      // Get likes count for each post
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

      return postsWithStats as PostStats[];
    },
  });

  // Fetch total counts
  const { data: totalStats } = useQuery({
    queryKey: ["admin-total-stats"],
    queryFn: async () => {
      const [postsResult, usersResult, commentsResult, likesResult, viewsResult] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact" }).eq("published", true),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("comments").select("id", { count: "exact" }),
        supabase.from("likes").select("id", { count: "exact" }),
        supabase.from("post_views").select("id", { count: "exact" }),
      ]);

      return {
        totalPosts: postsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalComments: commentsResult.count || 0,
        totalLikes: likesResult.count || 0,
        totalViews: viewsResult.count || 0,
      };
    },
  });

  // Get top posts by views
  const topByViews = postsStats?.slice(0, 5) || [];

  // Get top posts by likes
  const topByLikes = [...(postsStats || [])]
    .sort((a, b) => b.likes_count - a.likes_count)
    .slice(0, 5);

  // Get top posts by comments
  const topByComments = [...(postsStats || [])]
    .sort((a, b) => b.comments_count - a.comments_count)
    .slice(0, 5);

  if (loadingPosts) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats?.totalPosts || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats?.totalViews || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
            <Heart className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats?.totalLikes || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats?.totalComments || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Posts Tables */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top by Views */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-purple-500" />
              Top Posts by Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topByViews.length > 0 ? (
                topByViews.map((post, index) => (
                  <Link 
                    key={post.id} 
                    to={`/post/${post.slug}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 text-purple-500 text-xs font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.views_count} views
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top by Likes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-rose-500" />
              Top Posts by Likes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topByLikes.length > 0 ? (
                topByLikes.map((post, index) => (
                  <Link 
                    key={post.id} 
                    to={`/post/${post.slug}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.likes_count} likes
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top by Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-amber-500" />
              Top Posts by Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topByComments.length > 0 ? (
                topByComments.map((post, index) => (
                  <Link 
                    key={post.id} 
                    to={`/post/${post.slug}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.comments_count} comments
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
