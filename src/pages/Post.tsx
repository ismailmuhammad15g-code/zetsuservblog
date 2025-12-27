import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ArrowLeft, Loader2, Calendar, User } from "lucide-react";
import { format } from "date-fns";

export default function Post() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-20 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-semibold mb-4">Post not found</h1>
          <p className="text-muted-foreground mb-8">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm hover:text-muted-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="container py-12 md:py-20 max-w-3xl animate-fade-in">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 text-balance">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{post.author_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.created_at}>
                {format(new Date(post.created_at), "MMMM d, yyyy")}
              </time>
            </div>
          </div>
        </header>

        {post.cover_image && (
          <div className="mb-10 rounded-lg overflow-hidden">
            <img 
              src={post.cover_image} 
              alt={post.title}
              className="w-full h-auto"
            />
          </div>
        )}

        <div className="text-base leading-relaxed">
          <MarkdownRenderer content={post.content} />
        </div>
      </article>
    </Layout>
  );
}
