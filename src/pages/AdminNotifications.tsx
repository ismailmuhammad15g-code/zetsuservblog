import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Send, Radio, Loader2, Smartphone, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminNotifications() {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [url, setUrl] = useState("/");
    const [loading, setLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
    const navigate = useNavigate();

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate("/auth");
            return;
        }

        // Check if user is admin (you can adjust this logic based on your needs)
        // For now, checking against specific email or creating a robust role system
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin') // Assuming you have this column or logic
            .eq('id', session.user.id)
            .single();

        // Quick fallback for now if column doesn't exist, enforce specific email
        const ADMIN_EMAILS = ['ismailmuhammad15g@gmail.com', 'zetsuserv@gmail.com'];
        if (!ADMIN_EMAILS.includes(session.user.email || '')) {
            toast.error("Unauthorized access");
            navigate("/");
        }
    };

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('broadcast-notification', {
                body: {
                    title,
                    message,
                    url,
                    type: 'admin_broadcast'
                }
            });

            if (error) throw error;

            toast.success("Broadcast sent successfully! 🚀", {
                description: `Notification sent to ${data?.count || 'all'} users.`
            });

            setTitle("");
            setMessage("");
        } catch (error: any) {
            console.error('Broadcast error:', error);
            toast.error("Failed to broadcast notification", {
                description: error.message || "Unknown error occurred"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="container max-w-6xl py-10 space-y-8 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Broadcast Center</h1>
                    <p className="text-muted-foreground mt-2">
                        Send real-time notifications to all users instantly.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Editor Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Send className="h-5 w-5 text-primary" />
                                    Compose Notification
                                </CardTitle>
                                <CardDescription>
                                    This will be sent to all registered users via Push & In-App.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSendBroadcast} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Title</label>
                                        <Input
                                            placeholder="e.g. New Update Available! 🎉"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="bg-background/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Message</label>
                                        <Textarea
                                            placeholder="Write your message here..."
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            className="min-h-[120px] bg-background/50 resize-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Target URL (Optional)</label>
                                        <Input
                                            placeholder="e.g. /shop or https://..."
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className="bg-background/50"
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            type="submit"
                                            className="w-full h-12 text-base"
                                            disabled={loading || !title || !message}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Broadcasting...
                                                </>
                                            ) : (
                                                <>
                                                    <Radio className="mr-2 h-4 w-4" />
                                                    Broadcast to Everyone
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Preview Column */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Live Preview</h3>
                            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                                <button
                                    onClick={() => setPreviewMode('mobile')}
                                    className={`p-2 rounded-md transition-all ${previewMode === 'mobile' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                                >
                                    <Smartphone className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setPreviewMode('desktop')}
                                    className={`p-2 rounded-md transition-all ${previewMode === 'desktop' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                                >
                                    <Globe className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className={`
              relative mx-auto border-4 border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl transition-all duration-500
              ${previewMode === 'mobile' ? 'w-[320px] h-[600px] rounded-[3rem]' : 'w-full h-[400px] rounded-xl'}
            `}>
                            {/* Fake Status Bar */}
                            {previewMode === 'mobile' && (
                                <div className="absolute top-0 w-full h-6 bg-black z-20 flex justify-between px-6 items-center">
                                    <span className="text-[10px] text-white font-medium">9:41</span>
                                    <div className="flex gap-1.5">
                                        <div className="w-4 h-4 rounded-full bg-transparent border border-white/30" />
                                        <div className="w-4 h-4 rounded-full bg-transparent border border-white/30" />
                                    </div>
                                </div>
                            )}

                            {/* Notification Simulation */}
                            <div className="absolute inset-x-0 top-12 px-4 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-700">
                                {/* Push Notification Style */}
                                <div className="bg-zinc-900/90 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/10 flex gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                        <Bell className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-semibold text-sm text-white truncate max-w-[150px]">
                                                {title || "Notification Title"}
                                            </h4>
                                            <span className="text-[10px] text-zinc-500">now</span>
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                                            {message || "Your notification message will appear here exactly like this preview."}
                                        </p>
                                    </div>
                                </div>

                                {/* In-App Toast Style */}
                                {previewMode === 'desktop' && (
                                    <div className="bg-white text-black rounded-lg p-4 shadow-xl border-l-4 border-primary absolute top-20 right-4 w-80">
                                        <h4 className="font-bold text-sm mb-1">{title || "New Message"}</h4>
                                        <p className="text-xs text-zinc-600">{message || "System update content..."}</p>
                                    </div>
                                )}
                            </div>

                            {/* Mock App Content */}
                            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black opacity-50" />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
