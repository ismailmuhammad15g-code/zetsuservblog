import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  Megaphone,
  Sparkles,
  Zap,
  Newspaper,
  GripVertical,
  ExternalLink
} from "lucide-react";

interface Announcement {
  id: string;
  text: string;
  icon: string;
  link: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const iconOptions = [
  { value: "megaphone", label: "Megaphone", icon: Megaphone },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "zap", label: "Zap", icon: Zap },
  { value: "newspaper", label: "Newspaper", icon: Newspaper },
];

export function AnnouncementManager() {
  const [showEditor, setShowEditor] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    text: "",
    icon: "megaphone",
    link: "",
    is_active: true,
    display_order: 0,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Announcement[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("announcements")
          .update({
            text: data.text,
            icon: data.icon,
            link: data.link || null,
            is_active: data.is_active,
            display_order: data.display_order,
          })
          .eq("id", data.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("announcements").insert({
          text: data.text,
          icon: data.icon,
          link: data.link || null,
          is_active: data.is_active,
          display_order: data.display_order,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Success", description: "Announcement saved successfully" });
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
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Deleted", description: "Announcement deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("announcements")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      text: "",
      icon: "megaphone",
      link: "",
      is_active: true,
      display_order: announcements?.length || 0,
    });
    setEditingAnnouncement(null);
    setShowEditor(false);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      text: announcement.text,
      icon: announcement.icon,
      link: announcement.link || "",
      is_active: announcement.is_active,
      display_order: announcement.display_order,
    });
    setShowEditor(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingAnnouncement?.id,
    });
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    if (iconOption) {
      const Icon = iconOption.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <Megaphone className="h-4 w-4" />;
  };

  if (showEditor) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">
            {editingAnnouncement ? "Edit Announcement" : "New Announcement"}
          </h3>
          <Button variant="ghost" size="sm" onClick={resetForm}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="text">Announcement Text</Label>
            <Input
              id="text"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder="🎉 Your announcement message here..."
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select 
                value={formData.icon} 
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">Link (Optional)</Label>
            <Input
              id="link"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="https://example.com"
              type="url"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAnnouncement ? "Update" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Announcements</h3>
        <Button onClick={() => setShowEditor(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : announcements && announcements.length > 0 ? (
        <div className="space-y-2">
          {announcements.map((announcement) => (
            <div 
              key={announcement.id} 
              className={`flex items-center gap-3 p-4 border border-border rounded-lg transition-colors ${
                announcement.is_active ? "bg-background" : "bg-muted/50 opacity-60"
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              
              <div className="flex-shrink-0">
                {getIconComponent(announcement.icon)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{announcement.text}</p>
                {announcement.link && (
                  <a 
                    href={announcement.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {announcement.link}
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={announcement.is_active}
                  onCheckedChange={(checked) => 
                    toggleActiveMutation.mutate({ id: announcement.id, is_active: checked })
                  }
                />
                <Button variant="ghost" size="sm" onClick={() => handleEdit(announcement)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    if (confirm("Delete this announcement?")) {
                      deleteMutation.mutate(announcement.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No announcements yet</p>
          <Button onClick={() => setShowEditor(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create your first announcement
          </Button>
        </div>
      )}
    </div>
  );
}
