import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { Loader2, Bookmark, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface BookmarkedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  created_at: string;
  author_name: string;
  category?: Category | null;
}
export default function Bookmarks() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<BookmarkedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchBookmarks(session.user.id);
    });
  }, [navigate]);

  const fetchBookmarks = async (userId: string) => {
    try {
      const { data: bookmarks, error } = await supabase
        .from("bookmarks")
        .select(`
          post_id,
          posts (
            id,
            title,
            slug,
            excerpt,
            cover_image,
            created_at,
            author_name,
            category_id
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (bookmarks && bookmarks.length > 0) {
        const postsData = bookmarks
          .map((b: any) => b.posts)
          .filter(Boolean);

        // Fetch categories
        const categoryIds = [...new Set(postsData.map((p: any) => p.category_id).filter(Boolean))];
        let categories: { id: string; name: string; slug: string; color: string }[] = [];
        
        if (categoryIds.length > 0) {
          const { data: catData } = await supabase
            .from("categories")
            .select("id, name, slug, color")
            .in("id", categoryIds);
          categories = catData || [];
        }

        const postsWithCategories = postsData.map((post: any) => ({
          ...post,
          category: categories.find(c => c.id === post.category_id) || null
        }));

        setPosts(postsWithCategories);
      }
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bookmark className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Saved Posts</h1>
              <p className="text-muted-foreground text-sm">
                Your bookmarked articles
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No saved posts yet</h2>
            <p className="text-muted-foreground mb-6">
              Start saving posts to read later by clicking the bookmark icon
            </p>
            <Button asChild>
              <Link to="/">Browse Posts</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                id={post.id}
                title={post.title}
                excerpt={post.excerpt || ""}
                slug={post.slug}
                coverImage={post.cover_image || ""}
                createdAt={post.created_at}
                authorName={post.author_name}
                category={post.category || undefined}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
