import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { notifyAllUsersNewPost } from "@/hooks/useSendPushNotification";
import {
  Loader2,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Eye,
  ArrowLeft,
  X,
  FileText,
  Megaphone,
  Tags,
  Pin,
  PinOff,
  Clock,
  CalendarClock,
  BarChart3,
  Bot
} from "lucide-react";
import { AdminStats } from "@/components/admin/AdminStats";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  published: boolean;
  author_name: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  pinned_at: string | null;
  scheduled_at: string | null;
  views_count: number;
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image: "",
    published: false,
    scheduled_at: "",
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Check if user is admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdminRole = roles?.some(r => r.role === "admin") ?? false;

      if (!hasAdminRole) {
        // Redirect non-admin users to homepage
        navigate("/");
        return;
      }

      setIsAdmin(hasAdminRole);
      setCheckingAuth(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        } else {
          setUser(session.user);
        }
      }
    );

    checkAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Post[];
    },
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const scheduledAt = data.scheduled_at ? new Date(data.scheduled_at).toISOString() : null;
      const isNewPost = !data.id;
      const isPublishing = data.published && !scheduledAt;

      let savedPost: Post | null = null;

      if (data.id) {
        // Check if we're publishing an existing unpublished post
        const existingPost = posts?.find(p => p.id === data.id);
        const wasUnpublished = existingPost && !existingPost.published;
        const isNowPublishing = isPublishing && wasUnpublished;

        const { data: updatedData, error } = await supabase
          .from("posts")
          .update({
            title: data.title,
            slug: data.slug,
            excerpt: data.excerpt || null,
            content: data.content,
            cover_image: data.cover_image || null,
            published: scheduledAt ? false : data.published,
            scheduled_at: scheduledAt,
          })
          .eq("id", data.id)
          .select()
          .single();

        if (error) throw error;

        if (isNowPublishing && updatedData) {
          savedPost = updatedData as Post;
        }
      } else {
        const { data: insertedData, error } = await supabase.from("posts").insert({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt || null,
          content: data.content,
          cover_image: data.cover_image || null,
          published: scheduledAt ? false : data.published,
          scheduled_at: scheduledAt,
        }).select().single();

        if (error) throw error;

        if (isPublishing && insertedData) {
          savedPost = insertedData as Post;
        }
      }

      // Send push notification if publishing a new post
      if (savedPost && isPublishing) {
        notifyAllUsersNewPost({
          title: savedPost.title,
          excerpt: savedPost.excerpt,
          content: savedPost.content,
          slug: savedPost.slug,
          id: savedPost.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({ title: "Success", description: "Post saved successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({ title: "Deleted", description: "Post deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("posts")
        .update({
          is_pinned: isPinned,
          pinned_at: isPinned ? new Date().toISOString() : null
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { isPinned }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({
        title: isPinned ? "Pinned" : "Unpinned",
        description: isPinned ? "Post pinned to top" : "Post unpinned"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      cover_image: "",
      published: false,
      scheduled_at: "",
    });
    setEditingPost(null);
    setShowEditor(false);
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      cover_image: post.cover_image || "",
      published: post.published,
      scheduled_at: post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : "",
    });
    setShowEditor(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingPost?.id,
    });
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have admin privileges.
        </p>
        <div className="flex gap-4">
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to blog
            </Button>
          </Link>
          <Button onClick={handleLogout} variant="ghost">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <FileText className="h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tags className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2">
              <Megaphone className="h-4 w-4" />
              Announcements
            </TabsTrigger>
            <Link to="/admin/doc">
              <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted gap-2 text-purple-400 border border-purple-500/30 ml-2">
                <Bot className="h-4 w-4" />
                Zersu AI
              </div>
            </Link>
          </TabsList>

          <TabsContent value="stats">
            <AdminStats />
          </TabsContent>

          <TabsContent value="posts">
            {showEditor ? (
              <div className="max-w-3xl animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    {editingPost ? "Edit Post" : "New Post"}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            title: e.target.value,
                            slug: editingPost ? formData.slug : generateSlug(e.target.value),
                          });
                        }}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Input
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="Brief description of the post"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cover_image">Cover Image URL</Label>
                    <Input
                      id="cover_image"
                      value={formData.cover_image}
                      onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Content (Markdown)</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                      rows={16}
                      className="font-mono text-sm"
                      placeholder="Write your post in Markdown..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled_at" className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      Schedule Post (Optional)
                    </Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    {formData.scheduled_at && (
                      <p className="text-xs text-muted-foreground">
                        Post will be published automatically at this time. Published toggle will be ignored if scheduled.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="published"
                      checked={formData.published}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, published: checked })
                      }
                      disabled={!!formData.scheduled_at}
                    />
                    <Label htmlFor="published" className={formData.scheduled_at ? "text-muted-foreground" : ""}>
                      Published {formData.scheduled_at && "(Disabled - Scheduled)"}
                    </Label>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingPost ? "Update Post" : "Create Post"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-semibold">Posts</h2>
                  <Button onClick={() => setShowEditor(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Post
                  </Button>
                </div>

                {loadingPosts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : posts && posts.length > 0 ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left text-sm font-medium px-4 py-3">Title</th>
                          <th className="text-left text-sm font-medium px-4 py-3 hidden md:table-cell">Status</th>
                          <th className="text-left text-sm font-medium px-4 py-3 hidden lg:table-cell">Views</th>
                          <th className="text-left text-sm font-medium px-4 py-3 hidden sm:table-cell">Date</th>
                          <th className="text-right text-sm font-medium px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {posts.map((post) => (
                          <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {post.is_pinned && (
                                  <Pin className="h-4 w-4 text-rose-500 shrink-0" />
                                )}
                                <span className="font-medium">{post.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                {post.scheduled_at && !post.published ? (
                                  <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Scheduled
                                  </span>
                                ) : (
                                  <span className={`text-xs px-2 py-1 rounded ${post.published
                                      ? "bg-primary/10 text-primary"
                                      : "bg-muted text-muted-foreground"
                                    }`}>
                                    {post.published ? "Published" : "Draft"}
                                  </span>
                                )}
                                {post.is_pinned && (
                                  <span className="text-xs px-2 py-1 rounded bg-rose-500/10 text-rose-500 flex items-center gap-1">
                                    <Pin className="h-3 w-3" />
                                    Pinned
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Eye className="h-4 w-4" />
                                {post.views_count || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                              {new Date(post.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => pinMutation.mutate({ id: post.id, isPinned: !post.is_pinned })}
                                  title={post.is_pinned ? "Unpin post" : "Pin post"}
                                  className={post.is_pinned ? "text-rose-500 hover:text-rose-600" : ""}
                                >
                                  {post.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                                </Button>
                                {post.published && (
                                  <Link to={`/post/${post.slug}`} target="_blank">
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(post)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Delete this post?")) {
                                      deleteMutation.mutate(post.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground mb-4">No posts yet</p>
                    <Button onClick={() => setShowEditor(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first post
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
