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
  const [animating, setAnimating] = useState(false);
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
        setLikesCount(prev => prev - 1);
      }
    } else {
      // Like with animation
      setAnimating(true);
      
      const { error } = await supabase
        .from("likes")
        .insert({ post_id: postId, user_id: user.id });

      if (!error) {
        setLiked(true);
        setLikesCount(prev => prev + 1);
      } else if (error.code === "23505") {
        // Already liked (unique constraint violation)
        setLiked(true);
      }
      
      setTimeout(() => setAnimating(false), 600);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "gap-2 transition-all",
        liked && "text-red-500 hover:text-red-600"
      )}
      onClick={handleLike}
    >
      <div className="relative">
        <Heart 
          className={cn(
            "h-5 w-5 transition-all",
            liked && "fill-current",
            animating && "animate-ping absolute"
          )} 
        />
        {animating && (
          <>
            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(6)].map((_, i) => (
                <span 
                  key={i}
                  className="absolute w-1 h-1 bg-red-500 rounded-full animate-[particle_0.6s_ease-out_forwards]"
                  style={{
                    transform: `rotate(${i * 60}deg) translateY(-8px)`,
                    animationDelay: `${i * 0.05}s`
                  }}
                />
              ))}
            </div>
          </>
        )}
        {!animating && <Heart className={cn("h-5 w-5", liked && "fill-current")} />}
      </div>
      <span>{likesCount}</span>
    </Button>
  );
}
