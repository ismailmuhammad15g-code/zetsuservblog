import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { SearchAndFilter } from "@/components/SearchAndFilter";
import { Loader2, TrendingUp, Clock, Sparkles } from "lucide-react";
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

  const filteredPosts = useMemo(() => {
    if (!posts) return [];

    let result = [...posts];

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
        // For now, we'll sort by created_at as we don't have view counts
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "trending":
        // Sort by most recent
        result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
      case "latest":
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [posts, searchQuery, selectedCategory, sortBy]);

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
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory
                  ? "No posts match your search criteria."
                  : "No posts published yet."}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || selectedCategory
                  ? "Try adjusting your filters."
                  : "Check back soon for new content."}
              </p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
