import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ShareButtons } from "@/components/ShareButtons";
import { ArrowLeft, Loader2, Calendar, Bot, ImageOff, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function AiPost() {
    const { id } = useParams<{ id: string }>();
    const [imageError, setImageError] = useState(false);

    const { data: post, isLoading, error } = useQuery({
        queryKey: ["ai-post", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("ai_posts")
                .select("*")
                .eq("id", id)
                .eq("is_published", true)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!id,
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
                        The AI post you're looking for doesn't exist.
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
                        <Bot className="h-3 w-3" />
                        Official AI Update
                    </div>

                    <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 text-balance">
                        {post.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                                <Sparkles className="h-3 w-3 text-white" />
                            </div>
                            <span className="flex items-center gap-1 font-medium text-purple-400">
                                Zersu AI
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
                    <div className="mb-10 rounded-lg overflow-hidden bg-muted border border-purple-500/20 shadow-lg shadow-purple-900/10">
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

                <div className="text-base leading-relaxed prose prose-invert prose-purple max-w-none">
                    <MarkdownRenderer content={post.description} />
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
