import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ShareButtons } from "@/components/ShareButtons";
import { PostLikes } from "@/components/PostLikes";
import { PostComments } from "@/components/PostComments";
import { BookmarkButton } from "@/components/BookmarkButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { usePostViews } from "@/hooks/usePostViews";
import { ArrowLeft, Loader2, Calendar, User, ImageOff, Eye } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_name: string;
  cover_image: string | null;
  audio_url: string | null;
  audio_type: string | null;
  user_id: string;
  // Add other fields as needed if strictly typed, but for now this covers what's used
}

export default function Post() {
  const { slug } = useParams<{ slug: string }>();
  const [imageError, setImageError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSoundBanner, setShowSoundBanner] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

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
      return data as unknown as Post;
    },
    enabled: !!slug,
  });

  const { viewsCount, isLoading: viewsLoading } = usePostViews(post?.id || "");

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

  // Show banner when post has audio - MUST be before early returns
  useEffect(() => {
    if (post?.audio_url) {
      setShowSoundBanner(true);
    }
  }, [post?.audio_url]);

  // Auto-scroll when playing music + detect manual scroll to stop
  useEffect(() => {
    if (!isPlaying || !autoScrollEnabled) return;

    let isAutoScrolling = false;

    const scrollInterval = setInterval(() => {
      isAutoScrolling = true;
      window.scrollBy({
        top: 1,
        behavior: 'auto'
      });
      // Reset flag after a short delay
      setTimeout(() => { isAutoScrolling = false; }, 100);
    }, 50); // Very slow scroll - 1px every 50ms = 20px per second

    // Detect manual scroll (wheel, touch, keyboard)
    const handleManualScroll = (e: Event) => {
      // If this scroll wasn't triggered by our auto-scroll
      if (!isAutoScrolling) {
        setAutoScrollEnabled(false);
      }
    };

    window.addEventListener('wheel', handleManualScroll, { passive: true });
    window.addEventListener('touchmove', handleManualScroll, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
        setAutoScrollEnabled(false);
      }
    });

    return () => {
      clearInterval(scrollInterval);
      window.removeEventListener('wheel', handleManualScroll);
      window.removeEventListener('touchmove', handleManualScroll);
    };
  }, [isPlaying, autoScrollEnabled]);

  // Helper functions (not hooks, so can be here)
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => { });
      }
      setIsPlaying(!isPlaying);
      setShowSoundBanner(false);
    }
  };

  const handleEnableSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => { });
      setIsPlaying(true);
    }
    setShowSoundBanner(false);
  };

  const handleDismissBanner = () => {
    setShowSoundBanner(false);
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
      <article className="container py-12 md:py-20 max-w-3xl animate-fade-in relative">
        {/* Hidden audio element */}
        {post?.audio_url && (
          <audio
            ref={audioRef}
            src={post.audio_url}
            onEnded={() => setIsPlaying(false)}
            loop
          />
        )}

        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>
          <ShareButtons
            title={post.title}
            autoScrollEnabled={autoScrollEnabled}
            onToggleAutoScroll={() => setAutoScrollEnabled(!autoScrollEnabled)}
            showAutoScrollToggle={!!post?.audio_url}
          />
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
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {viewsLoading ? (
                <span className="inline-block w-12 h-4 bg-muted animate-pulse rounded"></span>
              ) : (
                <span>{viewsCount} views</span>
              )}
            </div>
            {/* Audio Play Button - Small inline version */}
            {post?.audio_url && (
              <button
                onClick={togglePlay}
                className="flex items-center gap-2 transition-colors hover:text-foreground"
                title={isPlaying ? "Pause Music" : "Play Music"}
              >
                {isPlaying ? (
                  <div className="flex items-center gap-1 h-4">
                    <div className="w-0.5 bg-primary animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ animationDelay: '0s', height: '60%' }} />
                    <div className="w-0.5 bg-primary animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ animationDelay: '0.15s', height: '100%' }} />
                    <div className="w-0.5 bg-primary animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ animationDelay: '0.3s', height: '80%' }} />
                  </div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" className="h-4 w-4 text-muted-foreground fill-current">
                    <g transform="translate(1.4 1.4) scale(2.81 2.81)">
                      <path d="M 81.73 50.284 c 4.068 -2.349 4.068 -8.22 0 -10.569 L 48.051 20.271 L 14.372 0.827 c -4.068 -2.349 -9.153 0.587 -9.153 5.284 V 45 v 38.889 c 0 4.697 5.085 7.633 9.153 5.284 l 33.679 -19.444 L 81.73 50.284 z" fill="currentColor" />
                    </g>
                  </svg>
                )}
                <span className="text-xs">{isPlaying ? 'Playing' : 'Play'}</span>
              </button>
            )}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <PostLikes postId={post.id} />
              <ShareButtons title={post.title} />
            </div>
            <BookmarkButton postId={post.id} variant="full" />
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

      {/* Sound Permission Banner - Small bottom bar */}
      {showSoundBanner && post?.audio_url && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-zinc-900 text-white px-4 py-2 flex items-center justify-between max-w-md mx-auto rounded-t-lg shadow-2xl">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" className="fill-white">
                <g transform="translate(1.4 1.4) scale(2.81 2.81)">
                  <path d="M 81.73 50.284 c 4.068 -2.349 4.068 -8.22 0 -10.569 L 48.051 20.271 L 14.372 0.827 c -4.068 -2.349 -9.153 0.587 -9.153 5.284 V 45 v 38.889 c 0 4.697 5.085 7.633 9.153 5.284 l 33.679 -19.444 L 81.73 50.284 z" />
                </g>
              </svg>
              <span className="text-xs font-medium">This post has music</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEnableSound}
                className="bg-white text-zinc-900 text-xs font-semibold px-3 py-1 rounded hover:bg-zinc-200 transition-colors"
              >
                Play
              </button>
              <button
                onClick={handleDismissBanner}
                className="text-zinc-400 hover:text-white text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
