import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

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

        <section>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Failed to load posts.</p>
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="animate-slide-up">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  excerpt={post.excerpt}
                  slug={post.slug}
                  authorName={post.author_name}
                  createdAt={post.created_at}
                  coverImage={post.cover_image}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">No posts published yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back soon for new content.
              </p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
