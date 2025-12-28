import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface CommentLikesProps {
  commentId: string;
}

export function CommentLikes({ commentId }: CommentLikesProps) {
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
  }, [commentId]);

  const fetchLikes = async () => {
    const { data, error } = await supabase
      .from("comment_likes")
      .select("*")
      .eq("comment_id", commentId);

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
      toast({ title: "Please sign in to like comments", variant: "destructive" });
      return;
    }

    if (liked) {
      const { error } = await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

      if (!error) {
        setLiked(false);
        setLikesCount(prev => prev - 1);
      }
    } else {
      setAnimating(true);
      
      const { error } = await supabase
        .from("comment_likes")
        .insert({ comment_id: commentId, user_id: user.id });

      if (!error) {
        setLiked(true);
        setLikesCount(prev => prev + 1);
      } else if (error.code === "23505") {
        setLiked(true);
      }
      
      setTimeout(() => setAnimating(false), 400);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-6 px-2 gap-1 text-xs transition-all",
        liked && "text-red-500 hover:text-red-600"
      )}
      onClick={handleLike}
    >
      <Heart 
        className={cn(
          "h-3.5 w-3.5 transition-all",
          liked && "fill-current",
          animating && "scale-125"
        )} 
      />
      {likesCount > 0 && <span>{likesCount}</span>}
    </Button>
  );
}
