import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, Plus, Edit, Trash2, Eye, EyeOff, Image as ImageIcon, 
  ArrowLeft, X 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import type { User } from "@supabase/supabase-js";

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image: string | null;
  published: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_creator: boolean;
}

export default function UserPosts() {
  const { username } = useParams<{ username: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      // Fetch profile by username
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();
        
      if (!profileData) {
        navigate("/");
        return;
      }
      
      setProfile(profileData);
      setIsOwner(session?.user?.id === profileData.id);
      
      // Fetch posts
      await fetchPosts(profileData.id);
    };
    
    init();
  }, [username, navigate]);

  const fetchPosts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath);

      setCoverImage(publicUrl);
      toast({ title: "Image uploaded!" });
    } catch (error: any) {
      toast({ title: "Error uploading image", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + Date.now();
  };

  const handleSavePost = async () => {
    if (!user || !title.trim() || !content.trim()) {
      toast({ title: "Please fill in title and content", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingPost) {
        // Update existing post
        const { error } = await supabase
          .from("posts")
          .update({
            title,
            content,
            excerpt: excerpt || null,
            cover_image: coverImage,
            published,
          })
          .eq("id", editingPost.id);

        if (error) throw error;
        toast({ title: "Post updated!" });
      } else {
        // Create new post
        const { error } = await supabase
          .from("posts")
          .insert({
            title,
            slug: generateSlug(title),
            content,
            excerpt: excerpt || null,
            cover_image: coverImage,
            published,
            user_id: user.id,
            author_name: profile?.full_name || user.email?.split("@")[0] || "Anonymous",
          });

        if (error) throw error;
        toast({ title: "Post created!" });
      }

      // Refresh posts
      if (profile) await fetchPosts(profile.id);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error saving post", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async () => {
    if (!deletePostId) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", deletePostId);

      if (error) throw error;
      
      setPosts(posts.filter(p => p.id !== deletePostId));
      toast({ title: "Post deleted" });
    } catch (error: any) {
      toast({ title: "Error deleting post", description: error.message, variant: "destructive" });
    } finally {
      setDeletePostId(null);
    }
  };

  const openEditor = (post?: Post) => {
    if (post) {
      setEditingPost(post);
      setTitle(post.title);
      setContent(post.content);
      setExcerpt(post.excerpt || "");
      setCoverImage(post.cover_image);
      setPublished(post.published);
    }
    setShowEditor(true);
  };

  const resetForm = () => {
    setShowEditor(false);
    setEditingPost(null);
    setTitle("");
    setContent("");
    setExcerpt("");
    setCoverImage(null);
    setPublished(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-20 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12 max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Avatar className="h-16 w-16 border-2 border-border">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="text-xl">
              {profile?.full_name?.charAt(0) || username?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">
              {profile?.full_name || username}'s Posts
            </h1>
            <p className="text-muted-foreground">@{username}</p>
          </div>
          {isOwner && (
            <Button onClick={() => openEditor()} className="gap-2">
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          )}
        </div>

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <p className="text-muted-foreground mb-4">No posts yet</p>
              {isOwner && (
                <Button onClick={() => openEditor()}>Create your first post</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {posts.map(post => (
              <Card key={post.id} className="overflow-hidden">
                <div className="flex">
                  {post.cover_image && (
                    <div className="w-32 h-32 shrink-0">
                      <img 
                        src={post.cover_image} 
                        alt={post.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold mb-1">
                          <Link 
                            to={`/post/${post.slug}`} 
                            className="hover:text-primary transition-colors"
                          >
                            {post.title}
                          </Link>
                        </h3>
                        {post.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {post.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {post.published ? (
                            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                              Published
                            </span>
                          ) : (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              Draft
                            </span>
                          )}
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEditor(post)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-destructive"
                            onClick={() => setDeletePostId(post.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Post Editor Dialog */}
        <Dialog open={showEditor} onOpenChange={resetForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? "Edit Post" : "Create New Post"}</DialogTitle>
              <DialogDescription>
                Write your post content using Markdown for formatting
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Cover Image */}
              <div className="space-y-2">
                <Label>Cover Image</Label>
                {coverImage ? (
                  <div className="relative rounded-lg overflow-hidden">
                    <img src={coverImage} alt="Cover" className="w-full h-48 object-cover" />
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      className="absolute top-2 right-2"
                      onClick={() => setCoverImage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Upload cover image</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Post title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt (optional)</Label>
                <Input
                  id="excerpt"
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  placeholder="Brief description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your post content here... (Markdown supported)"
                  className="min-h-[200px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="published"
                  checked={published}
                  onCheckedChange={setPublished}
                />
                <Label htmlFor="published" className="flex items-center gap-2 cursor-pointer">
                  {published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {published ? "Published" : "Draft"}
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSavePost} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingPost ? "Update" : "Create"} Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this post?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The post will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePost} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
