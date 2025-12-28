import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Megaphone, Sparkles, Zap, ExternalLink, Newspaper } from "lucide-react";

interface Announcement {
  id: string;
  text: string;
  icon: string;
  link: string | null;
}

const IconComponent: Record<string, typeof Megaphone> = {
  megaphone: Megaphone,
  sparkles: Sparkles,
  zap: Zap,
  newspaper: Newspaper,
};

export function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(true);

  const { data: announcements } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, text, icon, link")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Announcement[];
    },
  });

  if (!isVisible || !announcements || announcements.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground relative overflow-hidden z-50 shadow-md">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-16">
            {[...announcements, ...announcements].map((announcement, index) => {
              const Icon = IconComponent[announcement.icon] || Megaphone;
              return (
                <span key={`${announcement.id}-${index}`} className="inline-flex items-center gap-2 text-sm font-medium">
                  {announcement.link ? (
                    <a 
                      href={announcement.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 hover:underline hover:opacity-90 transition-opacity"
                    >
                      <Icon className="h-4 w-4" />
                      {announcement.text}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <>
                      <Icon className="h-4 w-4" />
                      {announcement.text}
                    </>
                  )}
                </span>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 p-1.5 hover:bg-primary-foreground/20 rounded-full transition-colors flex-shrink-0"
          aria-label="Close announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
