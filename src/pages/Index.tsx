import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { SearchAndFilter } from "@/components/SearchAndFilter";
import { Loader2, TrendingUp, Clock, Sparkles, Crown, Users, ArrowRight, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";

type SortOption = "latest" | "popular" | "trending";

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("latest");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch admin user IDs
  const { data: adminIds = [] } = useQuery({
    queryKey: ["admin-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (error) throw error;
      return data.map(r => r.user_id);
    },
  });

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, categories(*)")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Separate admin posts from community posts, with pinned posts first
  const { pinnedPosts, adminPosts, communityPosts } = useMemo(() => {
    if (!posts) return { pinnedPosts: [], adminPosts: [], communityPosts: [] };
    
    // Pinned posts always first (sorted by pinned_at)
    const pinned = posts
      .filter(post => post.is_pinned)
      .sort((a, b) => new Date(b.pinned_at || 0).getTime() - new Date(a.pinned_at || 0).getTime());
    
    // Admin posts (excluding pinned)
    const admins = posts.filter(post => 
      !post.is_pinned && post.user_id && adminIds.includes(post.user_id)
    );
    
    // Community posts (excluding pinned)
    const community = posts.filter(post => 
      !post.is_pinned && (!post.user_id || !adminIds.includes(post.user_id))
    );
    
    return { pinnedPosts: pinned, adminPosts: admins, communityPosts: community };
  }, [posts, adminIds]);

  // Filter and sort function
  const filterAndSort = (postsToFilter: typeof posts) => {
    if (!postsToFilter) return [];

    let result = [...postsToFilter];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.excerpt?.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query) ||
          post.author_name.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter((post) => post.category_id === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case "popular":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "trending":
        result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
      case "latest":
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  };

  const filteredPinnedPosts = useMemo(() => filterAndSort(pinnedPosts), [pinnedPosts, searchQuery, selectedCategory, sortBy]);
  const filteredAdminPosts = useMemo(() => filterAndSort(adminPosts), [adminPosts, searchQuery, selectedCategory, sortBy]);
  const filteredCommunityPosts = useMemo(() => filterAndSort(communityPosts), [communityPosts, searchQuery, selectedCategory, sortBy]);

  return (
    <Layout>
      <div className="container py-12 md:py-20">
        <header className="mb-12 md:mb-16 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            ZetsuServ Blog
          </h1>
          <p className="text-muted-foreground max-w-lg">
            A collection of thoughts, tutorials, and technical explorations. 
            Written with clarity and purpose.
          </p>
        </header>

        <SearchAndFilter
          categories={categories}
          onSearch={setSearchQuery}
          onCategoryFilter={setSelectedCategory}
          selectedCategory={selectedCategory}
        />

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <span className="text-sm text-muted-foreground shrink-0">Sort by:</span>
          <Button
            variant={sortBy === "latest" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSortBy("latest")}
            className="shrink-0"
          >
            <Clock className="h-4 w-4 mr-1" />
            Latest
          </Button>
          <Button
            variant={sortBy === "trending" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSortBy("trending")}
            className="shrink-0"
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Trending
          </Button>
          <Button
            variant={sortBy === "popular" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSortBy("popular")}
            className="shrink-0"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Popular
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Failed to load posts.</p>
          </div>
        ) : (
          <>
            {/* Pinned Posts Section - Always First */}
            {filteredPinnedPosts.length > 0 && (
              <section className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30">
                    <Pin className="h-5 w-5 text-rose-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Pinned Posts</h2>
                    <p className="text-sm text-muted-foreground">Important content pinned by administrators</p>
                  </div>
                </div>

                <div className="animate-slide-up rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent p-4">
                  {filteredPinnedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      id={post.id}
                      title={post.title}
                      excerpt={post.excerpt}
                      slug={post.slug}
                      authorName={post.author_name}
                      createdAt={post.created_at}
                      coverImage={post.cover_image}
                      userId={post.user_id}
                      category={post.categories}
                      isPinned={true}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Official Posts Section */}
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Official Posts</h2>
                  <p className="text-sm text-muted-foreground">Important updates and announcements from the team</p>
                </div>
              </div>

              {filteredAdminPosts.length > 0 ? (
                <div className="animate-slide-up rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4">
                  {filteredAdminPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      id={post.id}
                      title={post.title}
                      excerpt={post.excerpt}
                      slug={post.slug}
                      authorName={post.author_name}
                      createdAt={post.created_at}
                      coverImage={post.cover_image}
                      userId={post.user_id}
                      category={post.categories}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-amber-500/30 rounded-lg bg-amber-500/5">
                  <Crown className="h-10 w-10 mx-auto text-amber-500/30 mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery || selectedCategory
                      ? "No official posts match your criteria."
                      : "No official posts yet."}
                  </p>
                </div>
              )}
            </section>

            {/* Community Posts Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Community Posts</h2>
                    <p className="text-sm text-muted-foreground">Discover content from our amazing community</p>
                  </div>
                </div>
                <Link to="/community">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>

              {filteredCommunityPosts.length > 0 ? (
                <div className="animate-slide-up">
                  {filteredCommunityPosts.slice(0, 5).map((post) => (
                    <PostCard
                      key={post.id}
                      id={post.id}
                      title={post.title}
                      excerpt={post.excerpt}
                      slug={post.slug}
                      authorName={post.author_name}
                      createdAt={post.created_at}
                      coverImage={post.cover_image}
                      userId={post.user_id}
                      category={post.categories}
                    />
                  ))}
                  {filteredCommunityPosts.length > 5 && (
                    <div className="text-center pt-6">
                      <Link to="/community">
                        <Button variant="outline" className="gap-2">
                          <Users className="h-4 w-4" />
                          View All {filteredCommunityPosts.length} Community Posts
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery || selectedCategory
                      ? "No community posts match your criteria."
                      : "No community posts yet."}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Be the first to share your thoughts!
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
