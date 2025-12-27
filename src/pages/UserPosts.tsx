import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Plus, Edit, Trash2, Eye, EyeOff, Image as ImageIcon, 
  ArrowLeft, X, FileText, Clock, Calendar, BarChart3, Sparkles,
  BookOpen, Share2, Copy, ExternalLink, CheckCircle2, AlertCircle,
  PenTool, Type, AlignLeft
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
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
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
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [viewMode, setViewMode] = useState<"all" | "published" | "drafts">("all");
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Calculate reading time
  const calculateReadingTime = (text: string) => {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  };

  // Filter posts based on view mode
  const filteredPosts = posts.filter(post => {
    if (viewMode === "published") return post.published;
    if (viewMode === "drafts") return !post.published;
    return true;
  });

  // Stats
  const stats = {
    total: posts.length,
    published: posts.filter(p => p.published).length,
    drafts: posts.filter(p => !p.published).length,
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
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

  const copyPostLink = (slug: string) => {
    const url = `${window.location.origin}/post/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!" });
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
    setEditorTab("write");
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
    setEditorTab("write");
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading posts...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b border-border">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          <div className="container relative py-8 md:py-12 px-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Link 
                to="/" 
                className="absolute top-4 left-4 md:static p-2 md:p-0 rounded-full bg-background/80 md:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              
              <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-background shadow-xl">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                  {profile?.full_name?.charAt(0) || username?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {profile?.full_name || username}'s Posts
                  </h1>
                  {isOwner && (
                    <Badge variant="secondary" className="w-fit gap-1">
                      <Sparkles className="h-3 w-3" />
                      Creator
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mb-4">@{username}</p>
                
                {/* Stats */}
                <div className="flex flex-wrap gap-4 md:gap-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{stats.published}</p>
                      <p className="text-xs text-muted-foreground">Published</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{stats.drafts}</p>
                      <p className="text-xs text-muted-foreground">Drafts</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {isOwner && (
                <Button onClick={() => openEditor()} size="lg" className="gap-2 w-full sm:w-auto mt-4 md:mt-0 shadow-lg">
                  <Plus className="h-5 w-5" />
                  New Post
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container py-6 md:py-8 px-4">
          {/* Filter Tabs */}
          {isOwner && posts.length > 0 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {(["all", "published", "drafts"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="capitalize whitespace-nowrap"
                >
                  {mode === "all" && <BarChart3 className="h-4 w-4 mr-2" />}
                  {mode === "published" && <Eye className="h-4 w-4 mr-2" />}
                  {mode === "drafts" && <EyeOff className="h-4 w-4 mr-2" />}
                  {mode} ({mode === "all" ? stats.total : mode === "published" ? stats.published : stats.drafts})
                </Button>
              ))}
            </div>
          )}

          {/* Posts Grid */}
          {filteredPosts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <PenTool className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {viewMode === "all" ? "No posts yet" : `No ${viewMode} posts`}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {isOwner 
                    ? "Start sharing your thoughts and ideas with the world!" 
                    : "This creator hasn't published any posts yet."}
                </p>
                {isOwner && (
                  <Button onClick={() => openEditor()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create your first post
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {filteredPosts.map(post => (
                <Card 
                  key={post.id} 
                  className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/30"
                >
                  <div className="flex flex-col sm:flex-row">
                    {post.cover_image ? (
                      <div className="relative w-full sm:w-40 md:w-48 h-48 sm:h-auto shrink-0 overflow-hidden">
                        <img 
                          src={post.cover_image} 
                          alt={post.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent sm:hidden" />
                      </div>
                    ) : (
                      <div className="hidden sm:flex w-40 md:w-48 shrink-0 bg-muted items-center justify-center">
                        <FileText className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1 p-4 md:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant={post.published ? "default" : "secondary"} className="text-xs">
                              {post.published ? (
                                <><Eye className="h-3 w-3 mr-1" /> Published</>
                              ) : (
                                <><EyeOff className="h-3 w-3 mr-1" /> Draft</>
                              )}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {calculateReadingTime(post.content)} min read
                            </span>
                          </div>
                          
                          <h3 className="text-lg md:text-xl font-semibold mb-2 line-clamp-2">
                            <Link 
                              to={`/post/${post.slug}`} 
                              className="hover:text-primary transition-colors"
                            >
                              {post.title}
                            </Link>
                          </h3>
                          
                          {post.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {post.excerpt}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(post.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </div>
                        </div>
                        
                        {isOwner && (
                          <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                            {post.published && (
                              <>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8"
                                  onClick={() => copyPostLink(post.slug)}
                                  title="Copy link"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8"
                                  asChild
                                  title="Open in new tab"
                                >
                                  <Link to={`/post/${post.slug}`} target="_blank">
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </>
                            )}
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              onClick={() => openEditor(post)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletePostId(post.id)}
                              title="Delete"
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
        </div>

        {/* Enhanced Post Editor Dialog */}
        <Dialog open={showEditor} onOpenChange={resetForm}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">
                    {editingPost ? "Edit Post" : "Create New Post"}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    Write your content using Markdown • {calculateReadingTime(content)} min read
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                    <Switch
                      id="published-toggle"
                      checked={published}
                      onCheckedChange={setPublished}
                    />
                    <Label htmlFor="published-toggle" className="text-sm cursor-pointer">
                      {published ? "Published" : "Draft"}
                    </Label>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Cover Image */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Cover Image
                  </Label>
                  {coverImage ? (
                    <div className="relative rounded-xl overflow-hidden group">
                      <img src={coverImage} alt="Cover" className="w-full h-48 md:h-64 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setCoverImage(null)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                      {uploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <>
                          <div className="p-3 rounded-full bg-muted mb-3">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium">Click to upload cover image</span>
                          <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</span>
                        </>
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

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Enter an engaging title..."
                    className="text-lg font-semibold h-12"
                  />
                </div>

                {/* Excerpt */}
                <div className="space-y-2">
                  <Label htmlFor="excerpt" className="flex items-center gap-2">
                    <AlignLeft className="h-4 w-4" />
                    Excerpt (optional)
                  </Label>
                  <Input
                    id="excerpt"
                    value={excerpt}
                    onChange={e => setExcerpt(e.target.value)}
                    placeholder="Brief description that appears in post previews..."
                  />
                </div>

                {/* Content with Tabs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Content
                    </Label>
                    <Tabs value={editorTab} onValueChange={(v) => setEditorTab(v as "write" | "preview")}>
                      <TabsList className="h-8">
                        <TabsTrigger value="write" className="text-xs px-3">
                          <PenTool className="h-3 w-3 mr-1" />
                          Write
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="text-xs px-3">
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  {editorTab === "write" ? (
                    <Textarea
                      id="content"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Write your post content here... 

# Markdown is supported

- Use **bold** and *italic* text
- Create lists and headings
- Add links and images"
                      className="min-h-[300px] md:min-h-[400px] font-mono text-sm resize-none"
                    />
                  ) : (
                    <div className="min-h-[300px] md:min-h-[400px] p-4 border rounded-lg bg-muted/30 overflow-y-auto">
                      {content ? (
                        <MarkdownRenderer content={content} />
                      ) : (
                        <p className="text-muted-foreground text-center py-12">
                          Start writing to see the preview...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t shrink-0 bg-muted/30">
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={resetForm} className="sm:w-auto">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSavePost} 
                  disabled={saving || !title.trim() || !content.trim()}
                  className="gap-2 sm:w-auto"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {editingPost ? "Update Post" : "Create Post"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this post?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The post and all its data will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeletePost} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}