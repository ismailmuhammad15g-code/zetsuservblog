import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface PostLikesProps {
  postId: string;
}

export function PostLikes({ postId }: PostLikesProps) {
  const [user, setUser] = useState<User | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    fetchLikes();
  }, [postId]);

  const fetchLikes = async () => {
    const { data, error } = await supabase
      .from("likes")
      .select("*")
      .eq("post_id", postId);

    if (!error && data) {
      setLikesCount(data.length);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setLiked(data.some(like => like.user_id === session.user.id));
      }
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Please sign in to like posts", variant: "destructive" });
      return;
    }

    if (liked) {
      // Unlike
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (!error) {
        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      }
    } else {
      // Like with animation
      setIsAnimating(true);

      const { error } = await supabase
        .from("likes")
        .insert({ post_id: postId, user_id: user.id });

      if (!error) {
        setLiked(true);
        setLikesCount(prev => prev + 1);
      } else if (error.code === "23505") {
        setLiked(true);
      }

      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "group gap-2 px-3 py-2 rounded-full transition-all duration-300",
        "hover:bg-rose-500/10 dark:hover:bg-rose-500/20",
        liked
          ? "text-rose-500 hover:text-rose-600"
          : "text-muted-foreground hover:text-rose-500"
      )}
      onClick={handleLike}
    >
      <div className="relative flex items-center justify-center">
        <Heart
          className={cn(
            "h-5 w-5 transition-all duration-300 ease-out",
            liked && "fill-rose-500 text-rose-500 scale-110",
            isAnimating && "scale-125",
            !liked && "group-hover:scale-110"
          )}
        />

        {/* Pulse effect on like */}
        {isAnimating && (
          <span
            className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping"
            style={{ animationDuration: '0.4s' }}
          />
        )}
      </div>

      <span
        className={cn(
          "text-sm font-medium transition-all duration-300",
          liked && "text-rose-500",
          isAnimating && "scale-110"
        )}
      >
        {likesCount}
      </span>
    </Button>
  );
}
