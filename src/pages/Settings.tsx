import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, FileText, Sparkles, Bell, BarChart3 } from "lucide-react";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { UserStats } from "@/components/UserStats";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_creator: boolean | null;
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [creatingDashboard, setCreatingDashboard] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [hasPosts, setHasPosts] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const dashboardPath = (profile?.username || username) ? `/${profile?.username || username}/post` : "/me/post";
  const isCreator = Boolean(profile?.is_creator) || hasPosts;

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/auth");
          return;
        }
        setUser(session.user);
        await Promise.all([
          fetchProfile(session.user.id),
          fetchHasPosts(session.user.id),
        ]);
      } finally {
        setLoading(false);
      }
    };
    getSession();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setUsername(data.username || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchHasPosts = async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) throw error;
      setHasPosts((count ?? 0) > 0);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // 1. Get Signed URL from Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('get-gcs-signed-url', {
        body: { filename: file.name, contentType: file.type, folder: 'avatars' }
      });

      if (functionError) throw new Error(`Function error: ${functionError.message}`);
      if (!data?.uploadUrl || !data?.publicUrl) throw new Error('Invalid response from server');

      const { uploadUrl, publicUrl } = data;

      // 2. Upload directly to Google Cloud Storage
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast({ title: "Avatar updated successfully!" });
    } catch (error: any) {
      toast({ title: "Error uploading avatar", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, username: username || null })
        .eq("id", user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, full_name: fullName, username } : null);
      toast({ title: "Profile updated successfully!" });
    } catch (error: any) {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleStartPosting = async () => {
    if (!user || !username) {
      toast({ title: "Please set a username first", variant: "destructive" });
      return;
    }
    setCreatingDashboard(true);

    const steps = [
      "Loading your dashboard...",
      "Preparing your creative space...",
      "Setting up your hobby zone...",
      "Almost there...",
    ];

    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_creator: true, username })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, is_creator: true, username } : prev));
      toast({ title: "Dashboard enabled!" });
      navigate(`/${username}/post`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setCreatingDashboard(false);
    }
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

  if (creatingDashboard) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "0.5s" }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo animation */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/50 flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="h-12 w-12 text-primary-foreground animate-pulse" />
            </div>
            <div className="absolute -inset-2 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: "2s" }} />
          </div>

          {/* Text */}
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-center bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {loadingStep}
          </h2>
          <p className="text-muted-foreground text-center mb-8">Please wait...</p>

          {/* Loading dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-primary animate-bounce shadow-sm shadow-primary/50"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-8 w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12 px-4 md:px-6 max-w-2xl animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-semibold mb-6 md:mb-8">Settings</h1>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg md:text-xl">Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="relative group">
                <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-border">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-xl md:text-2xl">
                    {fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 md:h-6 md:w-6" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className="text-center sm:text-left">
                <p className="font-medium">{fullName || "No name set"}</p>
                <p className="text-sm text-muted-foreground break-all">{user?.email}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="yourname"
                />
                <p className="text-xs text-muted-foreground">
                  Your unique username for your profile URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PushNotificationToggle showLabel={true} />
          </CardContent>
        </Card>

        {/* Stats Card - Only show for creators */}
        {isCreator && user && (
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <BarChart3 className="h-5 w-5 text-primary" />
                Your Statistics
              </CardTitle>
              <CardDescription>
                Track the performance of your posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserStats userId={user.id} />
            </CardContent>
          </Card>
        )}

        {/* Creator Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <FileText className="h-5 w-5 text-primary" />
              {isCreator ? "Dashboard" : "Start Posting"}
            </CardTitle>
            <CardDescription>
              {isCreator
                ? "Manage your posts, drafts, and create new content"
                : "Create your own blog posts and share your thoughts with the world"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCreator ? (
              <Button onClick={() => navigate(dashboardPath)} className="w-full gap-2">
                <FileText className="h-4 w-4" />
                Go to Dashboard
              </Button>
            ) : (
              <Button onClick={handleStartPosting} className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                Start Posting 📜
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
