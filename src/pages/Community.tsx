import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { SearchAndFilter } from "@/components/SearchAndFilter";
import { Loader2, TrendingUp, Clock, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type SortOption = "latest" | "popular" | "trending";

export default function Community() {
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

  // Filter only community posts (non-admin posts)
  const communityPosts = useMemo(() => {
    if (!posts || adminIds.length === 0) return posts || [];
    return posts.filter(post => !post.user_id || !adminIds.includes(post.user_id));
  }, [posts, adminIds]);

  const filteredPosts = useMemo(() => {
    if (!communityPosts) return [];

    let result = [...communityPosts];

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
  }, [communityPosts, searchQuery, selectedCategory, sortBy]);

  return (
    <Layout>
      <div className="container py-12 md:py-20">
        <header className="mb-12 md:mb-16 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Community
            </h1>
          </div>
          <p className="text-muted-foreground max-w-lg">
            Discover amazing content created by our community members. 
            Share your thoughts, stories, and ideas with everyone.
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

        <section>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Failed to load posts.</p>
            </div>
          ) : filteredPosts && filteredPosts.length > 0 ? (
            <div className="animate-slide-up">
              {filteredPosts.map((post) => (
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
                  viewsCount={post.views_count}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-border rounded-lg">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory
                  ? "No community posts match your search criteria."
                  : "No community posts yet."}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || selectedCategory
                  ? "Try adjusting your filters."
                  : "Be the first to share your thoughts!"}
              </p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
