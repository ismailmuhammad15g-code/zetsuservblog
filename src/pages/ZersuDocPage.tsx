import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    FileJson,
    Sparkles,
    Clock,
    Zap,
    Bot,
    Newspaper,
    FileText,
    RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

interface NewsItem {
    id: string;
    content: string;
    created_at: string;
}

interface AIPostConfig {
    posts_today: number;
    max_posts_per_day: number;
    last_post_at: string | null;
    next_scheduled_at: string | null;
    is_enabled: boolean;
}

export default function ZersuDocPage() {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [instructions, setInstructions] = useState("");
    const [newNewsContent, setNewNewsContent] = useState("");
    const [showJsonPreview, setShowJsonPreview] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Check admin auth
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                navigate("/auth");
                return;
            }

            setUser(session.user);

            const { data: roles } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", session.user.id);

            const hasAdminRole = roles?.some(r => r.role === "admin") ?? false;

            if (!hasAdminRole) {
                navigate("/");
                return;
            }

            setIsAdmin(hasAdminRole);
            setCheckingAuth(false);
        };

        checkAuth();
    }, [navigate]);

    // Fetch instructions
    const { data: instructionsData } = useQuery({
        queryKey: ["ai-instructions"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("ai_documentation")
                .select("*")
                .eq("type", "instructions")
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: isAdmin,
    });

    // Fetch news items
    const { data: newsItems = [], isLoading: loadingNews } = useQuery({
        queryKey: ["ai-news"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("ai_documentation")
                .select("*")
                .eq("type", "news")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as NewsItem[];
        },
        enabled: isAdmin,
    });

    // Fetch config
    const { data: config, refetch: refetchConfig } = useQuery({
        queryKey: ["ai-post-config"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("ai_post_config")
                .select("*")
                .eq("id", "global")
                .maybeSingle();

            if (error) throw error;
            return data as AIPostConfig | null;
        },
        enabled: isAdmin,
    });

    // Fetch AI posts
    const { data: aiPosts = [] } = useQuery({
        queryKey: ["ai-posts"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("ai_posts")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(5);

            if (error) throw error;
            return data;
        },
        enabled: isAdmin,
    });

    // Update instructions when data loads
    useEffect(() => {
        if (instructionsData?.content) {
            setInstructions(instructionsData.content);
        }
    }, [instructionsData]);

    // Save instructions mutation
    const saveInstructionsMutation = useMutation({
        mutationFn: async (content: string) => {
            if (instructionsData?.id) {
                const { error } = await supabase
                    .from("ai_documentation")
                    .update({ content, updated_at: new Date().toISOString() })
                    .eq("id", instructionsData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("ai_documentation")
                    .insert({ type: "instructions", content });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ai-instructions"] });
            toast({ title: "تم الحفظ", description: "تم حفظ التعليمات بنجاح" });
        },
        onError: (error: Error) => {
            toast({ title: "خطأ", description: error.message, variant: "destructive" });
        },
    });

    // Add news mutation
    const addNewsMutation = useMutation({
        mutationFn: async (content: string) => {
            const { error } = await supabase
                .from("ai_documentation")
                .insert({ type: "news", content });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ai-news"] });
            setNewNewsContent("");
            toast({ title: "تمت الإضافة", description: "تمت إضافة الخبر بنجاح" });
        },
        onError: (error: Error) => {
            toast({ title: "خطأ", description: error.message, variant: "destructive" });
        },
    });

    // Delete news mutation
    const deleteNewsMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("ai_documentation")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ai-news"] });
            toast({ title: "تم الحذف", description: "تم حذف الخبر" });
        },
    });

    // Toggle AI enabled
    const toggleAIMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            const { error } = await supabase
                .from("ai_post_config")
                .upsert({ id: "global", is_enabled: enabled, updated_at: new Date().toISOString() });
            if (error) throw error;
        },
        onSuccess: () => {
            refetchConfig();
            toast({ title: "تم التحديث", description: "تم تحديث حالة الذكاء الاصطناعي" });
        },
    });

    // Generate AI post manually (Client-Side)
    const generateAIPost = async () => {
        setIsGenerating(true);
        try {
            // 1. Check Rate Limits using RPC (still useful)
            const { data: canPost } = await supabase.rpc('can_ai_post');
            if (!canPost) {
                toast({
                    title: "تم الوصول للحد الأقصى",
                    description: "يمكنك إنشاء منشورين فقط يومياً 🛑",
                    variant: "destructive",
                });
                setIsGenerating(false);
                return;
            }

            // 2. Get documentation JSON
            const { data: docJson } = await supabase.rpc("get_ai_documentation_json");

            // 3. Construct Prompt
            const prompt = `You are Zersu (زيرسو), the official AI administrator of ZetsuServ.

CURRENT DOCUMENTATION & NEWS:
${JSON.stringify(docJson, null, 2)}

YOUR TASK:
Write a SHORT, OFFICIAL, and SERIOUS announcement or update.

CRITICAL RULES (STRICT COMPLIANCE REQUIRED):
1. TONE: Extremely Professional, Formal, and Serious. Like a breaking news anchor or a corporate official.
2. NO POETRY. NO RHYMES. NO FLOWERY ALLEGORIES. NO DRAMA.
3. START DIRECTLY. Do not use phrases like "Greetings chosens" or "In the shadows". Start with "Update:", "Announcement:", or "Notice:".
4. Language: Arabic (Modern Standard/Fusha).
5. Length: Short and concise (under 150 words).
6. CONTENT: Pure facts based on the documentation/news provided. If no news, give a serious tip about website features.
7. Be "The System" speaking to "The Users".

RESPOND WITH JSON ONLY (no markdown, no explanation):
{
    "title": "Short Formal Title (Arabic)",
    "description": "The official statement text",
    "imagePrompt": "A specific, high-quality, serious digital art description describing the EVENT in the news. Do NOT use generic cyberpunk text. If it's about a server update, show servers. If it's about a feature, show that feature abstractly."
}`;

            // 4. Call AI API Directly (Client-Side to bypass Cloudflare)
            // Using a rotation of keys to ensuring reliability
            const apiKeys = [
                'sk-8s5lZUboc3EDTzMjTNP6y2Vp3I6sAVKcdexeJtVUs4fVwGGZ9BvGTTSgBOw',
                'sk-FAHTfp476ZZ8Eg5UkvTXfmjif7wwUZtAYueRrhVgUEQ4Sh1-FI6HMqoDJAvdS6oumro9sZg',
                'sk-TybF3uEzGuQ1w_M0bRG29Poc7NP_XG9M2pK3NgoCL_naYmsTUI3ZxJC1X9PqZJ9fdvfIhQvJmfGHNw'
            ];

            let aiResponse = null;
            let lastError = null;

            for (const key of apiKeys) {
                try {
                    const response = await fetch('https://api.routeway.ai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${key}`
                        },
                        body: JSON.stringify({
                            model: 'kimi-k2-0905:free',
                            messages: [{ role: 'user', content: prompt }]
                        })
                    });

                    if (response.ok) {
                        aiResponse = await response.json();
                        break;
                    }
                } catch (e) {
                    console.warn("Key failed, trying next", e);
                    lastError = e;
                }
            }

            if (!aiResponse) {
                throw new Error("Failed to contact AI API. Please try again later.");
            }

            const content = aiResponse.choices?.[0]?.message?.content;
            if (!content) throw new Error("Empty response from AI");

            // Parse JSON
            let postData;
            try {
                // Try to find JSON block if mixed with text
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                postData = JSON.parse(jsonMatch ? jsonMatch[0] : content);
            } catch (e) {
                console.error("JSON Parse Error", content);
                throw new Error("AI returned invalid data format");
            }

            // 5. Generate Image URL
            const imagePrompt = postData.imagePrompt || postData.title;
            const encodedPrompt = encodeURIComponent(imagePrompt);
            const randomSeed = Math.floor(Math.random() * 1000000);
            // Using the new short URL format which handles redirects correctly
            const finalImageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=800&height=400&nologo=true&seed=${randomSeed}&model=flux`;

            // 6. Insert Directly to Supabase
            const { data: newPost, error: insertError } = await supabase
                .from('ai_posts')
                .insert({
                    title: postData.title,
                    description: postData.description,
                    cover_image: finalImageUrl,
                    is_published: true
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // 7. Update Stats
            await supabase.rpc('record_ai_post');

            queryClient.invalidateQueries({ queryKey: ["ai-posts"] });
            refetchConfig();

            toast({
                title: "🎉 تم إنشاء المنشور!",
                description: `العنوان: ${newPost.title}`,
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: "خطأ",
                description: error.message || "Unknown error",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Get JSON preview
    const getJsonPreview = () => {
        return JSON.stringify(
            {
                instructions: instructions || "No instructions set",
                news: newsItems.map(n => ({ content: n.content, date: n.created_at })),
                generated_at: new Date().toISOString(),
            },
            null,
            2
        );
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
            <Layout>
                <div className="container py-20 text-center">
                    <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
                    <p className="text-muted-foreground">Admin access required.</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container py-8 max-w-4xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link to="/admin">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                                <Bot className="h-6 w-6 text-purple-500" />
                                Zersu AI Documentation
                            </h1>
                            <p className="text-muted-foreground text-xs md:text-sm">
                                Configure what Zersu AI knows and posts about
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                        <Switch
                            checked={config?.is_enabled ?? true}
                            onCheckedChange={(checked) => toggleAIMutation.mutate(checked)}
                        />
                        <span className="text-sm text-muted-foreground">
                            {config?.is_enabled ? "Active" : "Paused"}
                        </span>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 rounded-xl border bg-gradient-to-br from-purple-500/10 to-transparent">
                        <div className="flex items-center gap-2 mb-2">
                            <Newspaper className="h-4 w-4 text-purple-500" />
                            <span className="text-sm text-muted-foreground">Posts Today</span>
                        </div>
                        <p className="text-2xl font-bold">
                            {config?.posts_today ?? 0} / {config?.max_posts_per_day ?? 2}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl border bg-gradient-to-br from-blue-500/10 to-transparent">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">Last Post</span>
                        </div>
                        <p className="text-sm font-medium truncate">
                            {config?.last_post_at
                                ? new Date(config.last_post_at).toLocaleString("ar-EG")
                                : "Never"}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl border bg-gradient-to-br from-green-500/10 to-transparent">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Next Scheduled</span>
                        </div>
                        <p className="text-sm font-medium truncate">
                            {config?.next_scheduled_at
                                ? new Date(config.next_scheduled_at).toLocaleString("ar-EG")
                                : "Auto"}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl border bg-gradient-to-br from-amber-500/10 to-transparent">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <span className="text-sm text-muted-foreground">Total AI Posts</span>
                        </div>
                        <p className="text-2xl font-bold">{aiPosts.length}</p>
                    </div>
                </div>

                {/* Generate Button */}
                <div className="mb-8 p-4 rounded-xl border-2 border-dashed border-purple-500/30 bg-purple-500/5">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-center md:text-left">
                            <h3 className="font-semibold flex items-center justify-center md:justify-start gap-2">
                                <Sparkles className="h-5 w-5 text-purple-500" />
                                Generate AI Post Now
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manually trigger Zersu to create a new post based on current documentation
                            </p>
                        </div>
                        <Button
                            onClick={generateAIPost}
                            disabled={isGenerating || (config?.posts_today ?? 0) >= (config?.max_posts_per_day ?? 2)}
                            className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4 mr-2" />
                                    Generate Post
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Instructions Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <Label className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            AI Instructions
                        </Label>
                        <Button
                            size="sm"
                            onClick={() => saveInstructionsMutation.mutate(instructions)}
                            disabled={saveInstructionsMutation.isPending}
                        >
                            {saveInstructionsMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Save
                        </Button>
                    </div>
                    <Textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Write instructions for Zersu AI here...&#10;&#10;Example:&#10;- You are Zersu, the mysterious AI guardian of ZetsuServ&#10;- Write posts about gaming, technology, and community updates&#10;- Use both Arabic and English&#10;- Be engaging and slightly dramatic"
                        rows={8}
                        className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                        These instructions tell Zersu AI how to write posts and what personality to use.
                    </p>
                </div>

                {/* News Section */}
                <div className="mb-8">
                    <Label className="text-lg flex items-center gap-2 mb-4">
                        <Newspaper className="h-5 w-5 text-green-500" />
                        Latest News & Updates
                    </Label>

                    {/* Add News Form */}
                    <div className="flex gap-2 mb-4">
                        <Input
                            value={newNewsContent}
                            onChange={(e) => setNewNewsContent(e.target.value)}
                            placeholder="Add a news item (e.g., 'New game mode released!' or 'خصم 50% على ZCoins')"
                            className="flex-1"
                        />
                        <Button
                            onClick={() => {
                                if (newNewsContent.trim()) {
                                    addNewsMutation.mutate(newNewsContent.trim());
                                }
                            }}
                            disabled={!newNewsContent.trim() || addNewsMutation.isPending}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    </div>

                    {/* News List */}
                    <div className="space-y-2">
                        {loadingNews ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : newsItems.length > 0 ? (
                            newsItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm">{item.content}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(item.created_at).toLocaleString("ar-EG")}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteNewsMutation.mutate(item.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-4 text-muted-foreground text-sm">
                                No news items yet. Add some news for Zersu to reference!
                            </p>
                        )}
                    </div>
                </div>

                {/* JSON Preview */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <Label className="text-lg flex items-center gap-2">
                            <FileJson className="h-5 w-5 text-amber-500" />
                            JSON Preview (What AI Sees)
                        </Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowJsonPreview(!showJsonPreview)}
                        >
                            {showJsonPreview ? "Hide" : "Show"} Preview
                        </Button>
                    </div>
                    {showJsonPreview && (
                        <pre className="p-4 rounded-lg bg-muted/50 border overflow-auto text-xs font-mono max-h-64">
                            {getJsonPreview()}
                        </pre>
                    )}
                </div>

                {/* Recent AI Posts */}
                {aiPosts.length > 0 && (
                    <div>
                        <Label className="text-lg flex items-center gap-2 mb-4">
                            <Bot className="h-5 w-5 text-purple-500" />
                            Recent AI Posts
                        </Label>
                        <div className="space-y-3">
                            {aiPosts.map((post) => (
                                <div
                                    key={post.id}
                                    className="p-4 rounded-lg border bg-gradient-to-r from-purple-500/5 to-transparent"
                                >
                                    <div className="flex items-start gap-3">
                                        {post.cover_image && (
                                            <img
                                                src={post.cover_image}
                                                alt={post.title}
                                                className="w-16 h-16 rounded-lg object-cover"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <h4 className="font-medium">{post.title}</h4>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {post.description}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(post.created_at).toLocaleString("ar-EG")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
