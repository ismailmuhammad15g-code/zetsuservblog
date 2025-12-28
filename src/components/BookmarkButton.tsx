import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface BookmarkButtonProps {
  postId: string;
  variant?: "icon" | "full";
}

export function BookmarkButton({ postId, variant = "icon" }: BookmarkButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkBookmark(session.user.id);
      }
    });
  }, [postId]);

  const checkBookmark = async (userId: string) => {
    const { data } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    setBookmarked(!!data);
  };

  const handleBookmark = async () => {
    if (!user) {
      toast({ title: "Please sign in to save posts", variant: "destructive" });
      return;
    }

    setLoading(true);

    if (bookmarked) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (!error) {
        setBookmarked(false);
        toast({ title: "Removed from saved posts" });
      }
    } else {
      const { error } = await supabase
        .from("bookmarks")
        .insert({ post_id: postId, user_id: user.id });

      if (!error) {
        setBookmarked(true);
        toast({ title: "Saved to bookmarks!" });
      } else if (error.code === "23505") {
        setBookmarked(true);
      }
    }

    setLoading(false);
  };

  if (variant === "full") {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "gap-2 transition-all",
          bookmarked && "text-primary"
        )}
        onClick={handleBookmark}
        disabled={loading}
      >
        <Bookmark 
          className={cn(
            "h-5 w-5 transition-all",
            bookmarked && "fill-current"
          )} 
        />
        <span>{bookmarked ? "Saved" : "Save"}</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-9 w-9 transition-all",
        bookmarked && "text-primary"
      )}
      onClick={handleBookmark}
      disabled={loading}
    >
      <Bookmark 
        className={cn(
          "h-5 w-5 transition-all",
          bookmarked && "fill-current"
        )} 
      />
    </Button>
  );
}
