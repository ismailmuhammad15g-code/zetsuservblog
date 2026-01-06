import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Flame, TrendingUp, Clock, Eye, Heart, MessageCircle, Hash, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  created_at: string;
  author_name: string;
  user_id: string | null;
  category_id: string | null;
  views_count: number;
  is_pinned: boolean;
  categories?: { name: string; slug: string; color: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  post_count?: number;
}

export default function Explore() {
  // Fetch trending posts (most viewed in last 7 days)
  const { data: trendingPosts, isLoading: loadingTrending } = useQuery({
    queryKey: ["trending-posts"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from("posts")
        .select("*, categories(name, slug, color)")
        .eq("published", true)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("views_count", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as Post[];
    },
  });

  // Fetch most liked posts
  const { data: popularPosts, isLoading: loadingPopular } = useQuery({
    queryKey: ["popular-posts"],
    queryFn: async () => {
      // Get posts with their like counts
      const { data: posts, error } = await supabase
        .from("posts")
        .select("*, categories(name, slug, color)")
        .eq("published", true)
        .order("views_count", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      // Get like counts for each post
      const postsWithLikes = await Promise.all(
        (posts || []).map(async (post) => {
          const { count } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);
          return { ...post, likeCount: count || 0 };
        })
      );
      
      // Sort by likes
      return postsWithLikes.sort((a, b) => b.likeCount - a.likeCount) as (Post & { likeCount: number })[];
    },
  });

  // Fetch latest posts
  const { data: latestPosts, isLoading: loadingLatest } = useQuery({
    queryKey: ["latest-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, categories(name, slug, color)")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as Post[];
    },
  });

  // Fetch categories with post counts
  const { data: trendingCategories, isLoading: loadingCategories } = useQuery({
    queryKey: ["trending-categories"],
    queryFn: async () => {
      const { data: categories, error } = await supabase
        .from("categories")
        .select("*");
      
      if (error) throw error;
      
      // Get post counts for each category
      const categoriesWithCounts = await Promise.all(
        (categories || []).map(async (cat) => {
          const { count } = await supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id)
            .eq("published", true);
          return { ...cat, post_count: count || 0 };
        })
      );
      
      return categoriesWithCounts.sort((a, b) => (b.post_count || 0) - (a.post_count || 0)) as Category[];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["explore-stats"],
    queryFn: async () => {
      const [postsRes, viewsRes, likesRes, commentsRes] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("published", true),
        supabase.from("post_views").select("*", { count: "exact", head: true }),
        supabase.from("likes").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
      ]);
      
      return {
        totalPosts: postsRes.count || 0,
        totalViews: viewsRes.count || 0,
        totalLikes: likesRes.count || 0,
        totalComments: commentsRes.count || 0,
      };
    },
  });

  const PostSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-border rounded-xl p-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Explore</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Discover trending posts, popular topics, and the latest content from our community.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalViews?.toLocaleString() || "—"}</p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Heart className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalLikes?.toLocaleString() || "—"}</p>
                <p className="text-xs text-muted-foreground">Total Likes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <MessageCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalComments?.toLocaleString() || "—"}</p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Hash className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalPosts?.toLocaleString() || "—"}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="trending" className="w-full">
              <TabsList className="w-full justify-start mb-6 bg-muted/50 p-1">
                <TabsTrigger value="trending" className="gap-2">
                  <Flame className="h-4 w-4" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="popular" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Popular
                </TabsTrigger>
                <TabsTrigger value="latest" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Latest
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trending" className="space-y-4">
                {loadingTrending ? (
                  <PostSkeleton />
                ) : trendingPosts && trendingPosts.length > 0 ? (
                  trendingPosts.map((post, index) => (
                    <div key={post.id} className="relative">
                      {index < 3 && (
                        <div className="absolute -left-3 top-4 z-10">
                          <Badge 
                            variant="secondary" 
                            className={`
                              ${index === 0 ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" : ""}
                              ${index === 1 ? "bg-slate-400/20 text-slate-600 dark:text-slate-300" : ""}
                              ${index === 2 ? "bg-amber-600/20 text-amber-700 dark:text-amber-400" : ""}
                            `}
                          >
                            #{index + 1}
                          </Badge>
                        </div>
                      )}
                      <PostCard
                        id={post.id}
                        title={post.title}
                        excerpt={post.excerpt || ""}
                        slug={post.slug}
                        createdAt={post.created_at}
                        authorName={post.author_name}
                        coverImage={post.cover_image}
                        category={post.categories ? { ...post.categories, id: post.category_id || "" } : null}
                        content={post.content}
                        userId={post.user_id}
                        viewsCount={post.views_count}
                        isPinned={post.is_pinned}
                        audioUrl={post.audio_url}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Flame className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No trending posts this week</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="popular" className="space-y-4">
                {loadingPopular ? (
                  <PostSkeleton />
                ) : popularPosts && popularPosts.length > 0 ? (
                  popularPosts.map((post, index) => (
                    <div key={post.id} className="relative">
                      {index < 3 && (
                        <div className="absolute -left-3 top-4 z-10">
                          <Badge 
                            variant="secondary"
                            className={`
                              ${index === 0 ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" : ""}
                              ${index === 1 ? "bg-slate-400/20 text-slate-600 dark:text-slate-300" : ""}
                              ${index === 2 ? "bg-amber-600/20 text-amber-700 dark:text-amber-400" : ""}
                            `}
                          >
                            #{index + 1}
                          </Badge>
                        </div>
                      )}
                      <PostCard
                        id={post.id}
                        title={post.title}
                        excerpt={post.excerpt || ""}
                        slug={post.slug}
                        createdAt={post.created_at}
                        authorName={post.author_name}
                        coverImage={post.cover_image}
                        category={post.categories ? { ...post.categories, id: post.category_id || "" } : null}
                        content={post.content}
                        userId={post.user_id}
                        viewsCount={post.views_count}
                        isPinned={post.is_pinned}
                        audioUrl={post.audio_url}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No popular posts yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="latest" className="space-y-4">
                {loadingLatest ? (
                  <PostSkeleton />
                ) : latestPosts && latestPosts.length > 0 ? (
                  latestPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      id={post.id}
                      title={post.title}
                      excerpt={post.excerpt || ""}
                      slug={post.slug}
                      createdAt={post.created_at}
                      authorName={post.author_name}
                      coverImage={post.cover_image}
                      category={post.categories ? { ...post.categories, id: post.category_id || "" } : null}
                      content={post.content}
                      userId={post.user_id}
                      viewsCount={post.views_count}
                      isPinned={post.is_pinned}
                      audioUrl={post.audio_url}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No posts yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Topics */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hash className="h-5 w-5 text-primary" />
                  Trending Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingCategories ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : trendingCategories && trendingCategories.length > 0 ? (
                  trendingCategories.slice(0, 8).map((cat, index) => (
                    <a
                      key={cat.id}
                      href={`/?category=${cat.slug}`}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-sm">{index + 1}</span>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium text-sm group-hover:text-primary transition-colors">
                          {cat.name}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {cat.post_count} posts
                      </Badge>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No categories yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Growing Community</h3>
                    <p className="text-xs text-muted-foreground">Join the conversation</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Discover insights, share knowledge, and connect with fellow readers and writers.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
