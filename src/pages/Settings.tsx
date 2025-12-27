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
import { Camera, Loader2, FileText, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_creator: boolean;
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [showStartPosting, setShowStartPosting] = useState(false);
  const [creatingDashboard, setCreatingDashboard] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchProfile(session.user.id);
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
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

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
    setShowStartPosting(false);
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
        .update({ is_creator: true })
        .eq("id", user.id);

      if (error) throw error;
      
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
      <Layout>
        <div className="container py-20 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
          <div className="relative mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-primary/50 animate-pulse" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-primary-foreground animate-bounce" />
          </div>
          <h2 className="text-2xl font-semibold mb-4 text-center">{loadingStep}</h2>
          <p className="text-muted-foreground text-center">Please wait...</p>
          <div className="mt-8 flex gap-1">
            {[0, 1, 2].map(i => (
              <div 
                key={i} 
                className="w-3 h-3 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12 max-w-2xl animate-fade-in">
        <h1 className="text-3xl font-semibold mb-8">Settings</h1>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-2xl">
                    {fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6" />
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
              <div>
                <p className="font-medium">{fullName || "No name set"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
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

              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Start Posting Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Start Posting
            </CardTitle>
            <CardDescription>
              Create your own blog posts and share your thoughts with the world
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                if (!username) {
                  toast({ title: "Please set a username first", variant: "destructive" });
                  return;
                }
                setShowStartPosting(true);
              }}
              className="w-full gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Start Posting 📜
            </Button>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={showStartPosting} onOpenChange={setShowStartPosting}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ready to start posting?</DialogTitle>
              <DialogDescription>
                You're about to unlock your personal blog space where you can create and share your posts with the community.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowStartPosting(false)}>
                Not yet
              </Button>
              <Button onClick={handleStartPosting}>
                Yes, let's go! 🚀
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
