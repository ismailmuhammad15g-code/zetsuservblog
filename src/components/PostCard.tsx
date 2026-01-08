import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, ImageOff, Pin, Eye, Clock, Music, PlayCircle, PauseCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "./VerifiedBadge";
import { CategoryBadge } from "./CategoryBadge";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface PostCardProps {
  id: string;
  title: string;
  excerpt?: string | null;
  slug: string;
  authorName: string;
  createdAt: string;
  coverImage?: string | null;
  userId?: string | null;
  category?: Category | null;
  isPinned?: boolean;
  viewsCount?: number;
  content?: string;
  audioUrl?: string | null;
}

export function PostCard({
  title,
  excerpt,
  slug,
  authorName,
  createdAt,
  coverImage,
  userId,
  category,
  isPinned = false,
  viewsCount = 0,
  content = "",
  audioUrl = null
}: PostCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Calculate reading time
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));

  useEffect(() => {
    if (userId) {
      checkVerification(userId);
    }
  }, [userId]);

  const checkVerification = async (uid: string) => {
    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);

    // Check if user is verified in profile
    const { data: profile } = await supabase
      .from("profiles")
      // @ts-ignore
      .select("is_verified")
      .eq("id", uid)
      .maybeSingle();

    const isAdmin = roles?.some(r => r.role === "admin") ?? false;
    // @ts-ignore
    const isProfileVerified = profile?.is_verified ?? false;

    setIsVerified(isAdmin || isProfileVerified);
  };

  const handleAudioToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error("Audio playback failed:", err);
        toast({
          title: "Audio Playback Failed",
          description: "Unable to play audio. Please try again or check your connection.",
          variant: "destructive"
        });
      });
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  return (
    <article className="group py-4 mb-3 border border-border/40 rounded-xl px-4 hover:border-border hover:bg-muted/20 transition-all duration-200">
      <Link to={`/post/${slug}`} className="block">
        <div className="flex gap-4">
          {/* Cover Image - Left side */}
          {coverImage && !imageError ? (
            <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
              <img
                src={coverImage}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
            </div>
          ) : coverImage && imageError ? (
            <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 overflow-hidden rounded-lg bg-muted/50 flex items-center justify-center">
              <ImageOff className="h-6 w-6 text-muted-foreground/40" />
            </div>
          ) : null}

          {/* Content - Right side */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            {/* Top Row: Badges */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {isPinned && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-foreground text-background">
                  <Pin className="h-2.5 w-2.5" />
                  Pinned
                </span>
              )}
              {audioUrl && (
                <button
                  onClick={handleAudioToggle}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${isPlaying
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-foreground hover:bg-foreground hover:text-background'
                    }`}
                >
                  {isPlaying ? (
                    <PauseCircle className="h-2.5 w-2.5" />
                  ) : (
                    <Music className="h-2.5 w-2.5" />
                  )}
                  {isPlaying ? 'Playing' : 'Audio'}
                </button>
              )}
              {category && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                  {category.name}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-base md:text-lg font-semibold tracking-tight group-hover:text-muted-foreground transition-colors line-clamp-2 leading-snug">
              {title}
            </h2>

            {/* Excerpt - only on larger screens */}
            {excerpt && (
              <p className="hidden md:block mt-1 text-sm text-muted-foreground line-clamp-1">
                {excerpt}
              </p>
            )}

            {/* Meta Row - compact on mobile */}
            <div className="mt-1.5 flex items-center text-[10px] md:text-xs text-muted-foreground overflow-hidden">
              <span className="flex items-center gap-1 shrink-0">
                <span className="truncate max-w-[80px] md:max-w-none">{authorName}</span>
                {isVerified && <VerifiedBadge />}
              </span>
              <span className="mx-1 text-muted-foreground/30 shrink-0">•</span>
              <time dateTime={createdAt} className="shrink-0">
                {formatDistanceToNow(new Date(createdAt), { addSuffix: false })}
              </time>
              <span className="hidden md:inline mx-1 text-muted-foreground/30">•</span>
              <span className="hidden md:flex items-center gap-0.5 shrink-0">
                <Clock className="h-3 w-3" />
                {readingTime}m
              </span>
              {viewsCount > 0 && (
                <>
                  <span className="mx-1 text-muted-foreground/30 shrink-0">•</span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    <Eye className="h-3 w-3" />
                    {viewsCount}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Arrow indicator */}
          <ArrowUpRight className="h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground self-center" />
        </div>
      </Link>
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="none" className="hidden" crossOrigin="anonymous" />
      )}
    </article>
  );
}
