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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { notifyAllUsersNewPost } from "@/hooks/useSendPushNotification";
import {
  Loader2, Plus, Edit, Trash2, Eye, EyeOff, Image as ImageIcon,
  ArrowLeft, X, FileText, Clock, Calendar, BarChart3, Sparkles,
  BookOpen, Copy, ExternalLink, CheckCircle2, AlertCircle,
  PenTool, Type, AlignLeft, Tag, Globe, Lock, Link2, MessageSquare,
  Zap, GraduationCap, Search, Settings2, CalendarClock, Music
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  category_id: string | null;
  tags: string[];
  post_type: string;
  visibility: string;
  allow_comments: boolean;
  meta_description: string | null;
  reading_level: string;
  scheduled_at: string | null;
  audio_url: string | null;
  audio_type: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_creator: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const POST_TYPES = [
  { value: "article", label: "Article", icon: FileText },
  { value: "tutorial", label: "Tutorial", icon: GraduationCap },
  { value: "news", label: "News", icon: Zap },
  { value: "review", label: "Review", icon: Search },
  { value: "announcement", label: "Announcement", icon: MessageSquare },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", icon: Globe, description: "Anyone can see" },
  { value: "unlisted", label: "Unlisted", icon: Link2, description: "Only with link" },
  { value: "private", label: "Private", icon: Lock, description: "Only you" },
];

const READING_LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function UserPosts() {
  const { username } = useParams<{ username: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [viewMode, setViewMode] = useState<"all" | "published" | "drafts">("all");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Premium features
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [postType, setPostType] = useState("article");
  const [visibility, setVisibility] = useState("public");
  const [allowComments, setAllowComments] = useState(true);
  const [metaDescription, setMetaDescription] = useState("");
  const [readingLevel, setReadingLevel] = useState("all");
  const [scheduledAt, setScheduledAt] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioType, setAudioType] = useState("");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioInputType, setAudioInputType] = useState<"url" | "file">("url");

  const navigate = useNavigate();
  const { toast } = useToast();

  const calculateReadingTime = (text: string) => {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  };

  const filteredPosts = posts.filter(post => {
    if (viewMode === "published") return post.published;
    if (viewMode === "drafts") return !post.published;
    return true;
  });

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.published).length,
    drafts: posts.filter(p => !p.published).length,
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      const { data: categoriesData } = await supabase.from('categories').select('*');
      if (categoriesData) setCategories(categoriesData);

      if (username === "me" && session?.user) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (myProfile) {
          setProfile(myProfile);
          setIsOwner(true);
          await fetchPosts(session.user.id);
          return;
        }
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (!profileData) {
        if (session?.user) {
          const { data: ownProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (ownProfile) {
            setProfile(ownProfile);
            setIsOwner(true);
            await fetchPosts(session.user.id);
            return;
          }
        }
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
      setPosts((data as unknown as Post[]) || []);
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
      // Upload to ImgBB (free unlimited image hosting)
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      setCoverImage(data.data.url);
      toast({ title: "✓ تم رفع الصورة بنجاح!" });
    } catch (error: any) {
      console.error('Upload Error:', error);
      toast({ title: "Error uploading image", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
    if (!validAudioTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an audio file (MP3, WAV, OGG, or WebM)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 20MB for Edge Function proxy)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Audio file must be less than 20MB for direct upload. For larger files, please upload to Catbox.moe manually and use the URL option.",
        variant: "destructive"
      });
      return;
    }

    setUploadingAudio(true);

    try {
      // Use Supabase Edge Function to proxy the upload to Catbox (bypassing CORS)
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('upload-audio', {
        body: formData,
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No URL returned from upload service');

      setAudioUrl(data.url);
      setAudioType('file');
      toast({ title: "✓ Audio uploaded successfully!" });
    } catch (error: any) {
      console.error('Audio Upload Error:', error);
      toast({
        title: "Error uploading audio",
        description: error.message || "An unexpected error occurred during upload.",
        variant: "destructive"
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + Date.now();
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSavePost = async () => {
    if (!user || !title.trim() || !content.trim()) {
      toast({ title: "Please fill in title and content", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const slug = generateSlug(title);
      const isPublishing = published;

      const postData = {
        title,
        content,
        excerpt: excerpt || null,
        cover_image: coverImage,
        published,
        category_id: selectedCategoryId || null,
        tags,
        post_type: postType,
        visibility,
        allow_comments: allowComments,
        meta_description: metaDescription || null,
        reading_level: readingLevel,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        audio_url: audioUrl || null,
        audio_type: audioType || null,
      };

      if (editingPost) {
        const wasUnpublished = !editingPost.published;
        const isNowPublishing = isPublishing && wasUnpublished;

        const { data: updatedPost, error } = await supabase
          .from("posts")
          .update(postData)
          .eq("id", editingPost.id)
          .select()
          .single();

        if (error) throw error;
        toast({ title: "Post updated!" });

        if (isNowPublishing && updatedPost) {
          notifyAllUsersNewPost({
            title: updatedPost.title,
            excerpt: updatedPost.excerpt,
            content: updatedPost.content,
            slug: updatedPost.slug,
            id: updatedPost.id,
          });
        }
      } else {
        const { data: newPost, error } = await supabase
          .from("posts")
          .insert({
            ...postData,
            slug,
            user_id: user.id,
            author_name: profile?.full_name || user.email?.split("@")[0] || "Anonymous",
          })
          .select()
          .single();

        if (error) throw error;
        toast({ title: "Post created!" });

        if (isPublishing && newPost) {
          notifyAllUsersNewPost({
            title: newPost.title,
            excerpt: newPost.excerpt,
            content: newPost.content,
            slug: newPost.slug,
            id: newPost.id,
          });
        }
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
      setSelectedCategoryId(post.category_id);
      setTags(post.tags || []);
      setPostType(post.post_type || "article");
      setVisibility(post.visibility || "public");
      setAllowComments(post.allow_comments ?? true);
      setMetaDescription(post.meta_description || "");
      setReadingLevel(post.reading_level || "all");
      setScheduledAt(post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : "");
      setAudioUrl(post.audio_url || "");
      setAudioType(post.audio_type || "");
      if (post.audio_url && post.audio_type) {
        setAudioInputType(post.audio_type as "url" | "file");
      }
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
    setSelectedCategoryId(null);
    setTags([]);
    setTagInput("");
    setPostType("article");
    setVisibility("public");
    setAllowComments(true);
    setMetaDescription("");
    setReadingLevel("all");
    setScheduledAt("");
    setShowAdvanced(false);
    setAudioUrl("");
    setAudioType("");
    setAudioInputType("url");
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
                    {profile?.full_name || profile?.username || username}'s Posts
                  </h1>
                  {isOwner && (
                    <Badge variant="secondary" className="w-fit gap-1">
                      <Sparkles className="h-3 w-3" />
                      Creator
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mb-4">@{profile?.username ?? username}</p>

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
                            {post.post_type && post.post_type !== "article" && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {post.post_type}
                              </Badge>
                            )}
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

                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {post.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
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

        {/* Premium Post Editor Dialog */}
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

                {/* Audio/Music Section */}
                <div className="space-y-4 p-4 border border-border rounded-lg">
                  <Label className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Add Audio/Music (Optional)
                  </Label>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={audioInputType === "url" ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => {
                        setAudioInputType("url");
                        if (audioType === "file") {
                          setAudioUrl("");
                          setAudioType("");
                        }
                      }}
                    >
                      URL
                    </Button>
                    <Button
                      type="button"
                      variant={audioInputType === "file" ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => {
                        setAudioInputType("file");
                        if (audioType === "url") {
                          setAudioUrl("");
                          setAudioType("");
                        }
                      }}
                    >
                      Upload File
                    </Button>
                    {audioUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAudioUrl("");
                          setAudioType("");
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove Audio
                      </Button>
                    )}
                  </div>

                  {audioInputType === "url" ? (
                    <div className="space-y-2">
                      <Input
                        id="audio_url"
                        value={audioType === "url" ? audioUrl : ""}
                        onChange={(e) => {
                          setAudioUrl(e.target.value);
                          setAudioType("url");
                        }}
                        placeholder="https://example.com/audio.mp3"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter a direct URL to an audio file (MP3, WAV, OGG, or WebM)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          id="audio_file"
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioUpload}
                          disabled={uploadingAudio}
                          className="cursor-pointer"
                        />
                        {uploadingAudio && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload an audio file (Max 10MB, MP3, WAV, OGG, or WebM)
                      </p>
                      {audioUrl && audioType === "file" && (
                        <p className="text-xs text-green-600">
                          ✓ Audio file uploaded successfully
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Title & Category Row */}
                <div className="grid gap-4 sm:grid-cols-2">
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

                  <div className="space-y-2">
                    <Label htmlFor="category" className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Category
                    </Label>
                    <Select
                      value={selectedCategoryId || "no-category"}
                      onValueChange={(val) => setSelectedCategoryId(val === "no-category" ? null : val)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-category">No Category</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Post Type & Visibility Row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Post Type
                    </Label>
                    <Select value={postType} onValueChange={setPostType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POST_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Visibility
                    </Label>
                    <Select value={visibility} onValueChange={setVisibility}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VISIBILITY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <opt.icon className="h-4 w-4" />
                              {opt.label}
                              <span className="text-muted-foreground text-xs">- {opt.description}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags <span className="text-muted-foreground text-xs">(max 5)</span>
                  </Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[48px]">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        #{tag}
                        <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {tags.length < 5 && (
                      <Input
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Add tag..."
                        className="flex-1 min-w-[120px] h-7 border-0 shadow-none focus-visible:ring-0 p-0"
                      />
                    )}
                  </div>
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

                {/* Content */}
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
                      placeholder="Write your post content here using Markdown..."
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

                {/* Advanced Settings */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Advanced Settings
                      </span>
                      <span className="text-xs text-muted-foreground">{showAdvanced ? "Hide" : "Show"}</span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    <Separator />

                    {/* Reading Level & Comments */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          Reading Level
                        </Label>
                        <Select value={readingLevel} onValueChange={setReadingLevel}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {READING_LEVELS.map(level => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4" />
                          Schedule Publishing
                        </Label>
                        <Input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={e => setScheduledAt(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* SEO Meta Description */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        SEO Meta Description
                      </Label>
                      <Textarea
                        value={metaDescription}
                        onChange={e => setMetaDescription(e.target.value)}
                        placeholder="Brief description for search engines (max 160 characters)"
                        maxLength={160}
                        className="h-20"
                      />
                      <p className="text-xs text-muted-foreground text-right">{metaDescription.length}/160</p>
                    </div>

                    {/* Allow Comments Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Allow Comments</p>
                          <p className="text-sm text-muted-foreground">Let readers comment on this post</p>
                        </div>
                      </div>
                      <Switch checked={allowComments} onCheckedChange={setAllowComments} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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