import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ShareButtons } from "@/components/ShareButtons";
import { PostLikes } from "@/components/PostLikes";
import { PostComments } from "@/components/PostComments";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ArrowLeft, Loader2, Calendar, User, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";

export default function Post() {
  const { slug } = useParams<{ slug: string }>();
  const [imageError, setImageError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  useEffect(() => {
    if (post?.user_id) {
      checkAdminRole(post.user_id);
    }
  }, [post?.user_id]);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    setIsAdmin(data?.some(r => r.role === "admin") ?? false);
  };

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
        <div className="flex items-center justify-between mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>
          <ShareButtons title={post.title} />
        </div>

        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 text-balance">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="flex items-center gap-1">
                {post.author_name}
                {isAdmin && <VerifiedBadge />}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.created_at}>
                {format(new Date(post.created_at), "MMMM d, yyyy")}
              </time>
            </div>
          </div>
        </header>

        {post.cover_image && !imageError ? (
          <div className="mb-10 rounded-lg overflow-hidden bg-muted">
            <img 
              src={post.cover_image} 
              alt={post.title}
              className="w-full h-auto"
              onError={() => setImageError(true)}
            />
          </div>
        ) : post.cover_image && imageError ? (
          <div className="mb-10 rounded-lg overflow-hidden bg-muted h-64 flex items-center justify-center">
            <ImageOff className="h-12 w-12 text-muted-foreground/50" />
          </div>
        ) : null}

        <div className="text-base leading-relaxed">
          <MarkdownRenderer content={post.content} />
        </div>

        {/* Likes and Comments Section */}
        <div className="mt-10 pt-8 border-t border-border space-y-6">
          <div className="flex items-center gap-4">
            <PostLikes postId={post.id} />
            <ShareButtons title={post.title} />
          </div>
          
          <PostComments postId={post.id} />
        </div>

        <div className="mt-8 pt-8 border-t border-border flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            More posts
          </Link>
        </div>
      </article>
    </Layout>
  );
}
