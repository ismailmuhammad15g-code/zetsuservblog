import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, ImageOff, Pin, Eye, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "./VerifiedBadge";
import { CategoryBadge } from "./CategoryBadge";

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
  content = ""
}: PostCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

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
      .select("is_verified")
      .eq("id", uid)
      .maybeSingle();

    const isAdmin = roles?.some(r => r.role === "admin") ?? false;
    const isProfileVerified = profile?.is_verified ?? false;

    setIsVerified(isAdmin || isProfileVerified);
  };

  return (
    <article className="group py-6 border-b border-border last:border-0">
      <Link to={`/post/${slug}`} className="block">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {coverImage && !imageError ? (
            <div className="md:w-48 md:h-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
              <img
                src={coverImage}
                alt={title}
                className="w-full h-48 md:h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
            </div>
          ) : coverImage && imageError ? (
            <div className="md:w-48 md:h-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
              <ImageOff className="h-8 w-8 text-muted-foreground/50" />
            </div>
          ) : null}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </span>
                  )}
                  {category && (
                    <CategoryBadge name={category.name} color={category.color} size="sm" />
                  )}
                </div>
                <h2 className="text-lg font-medium tracking-tight group-hover:text-muted-foreground transition-colors line-clamp-2">
                  {title}
                </h2>
              </div>
              <ArrowUpRight className="h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
            </div>

            {excerpt && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {excerpt}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {authorName}
                {isVerified && <VerifiedBadge />}
              </span>
              <span>·</span>
              <time dateTime={createdAt}>
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </time>
              {content && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {readingTime} min
                  </span>
                </>
              )}
              {viewsCount > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {viewsCount}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
