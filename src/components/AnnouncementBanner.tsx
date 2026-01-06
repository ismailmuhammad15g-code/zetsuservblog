import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Megaphone, Sparkles, Zap, ExternalLink, Newspaper, ChevronDown } from "lucide-react";

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
  const [isExpanded, setIsExpanded] = useState(false);

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

  const firstAnnouncement = announcements[0];
  const hasMultiple = announcements.length > 1;

  return (
    <div className="bg-gradient-to-r from-black via-slate-900 to-black text-white relative z-50 shadow-lg border-b border-white/10">
      {/* Main announcement bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={() => hasMultiple && setIsExpanded(!isExpanded)}
          className={`flex-1 flex items-center gap-3 ${hasMultiple ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {(() => {
              const Icon = IconComponent[firstAnnouncement.icon] || Megaphone;
              return (
                <>
                  <Icon className="h-4 w-4 flex-shrink-0 text-white" />
                  <span className="text-sm font-medium truncate">
                    {firstAnnouncement.text}
                  </span>
                  {firstAnnouncement.link && (
                    <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-70" />
                  )}
                </>
              );
            })()}
          </div>
          {hasMultiple && (
            <div className="flex items-center gap-1 text-xs text-white/70 flex-shrink-0">
              <span className="hidden sm:inline">+{announcements.length - 1}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          )}
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 p-1.5 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
          aria-label="Close announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Dropdown list - Microsoft style */}
      {isExpanded && hasMultiple && (
        <div className="absolute top-full left-0 right-0 bg-black border-b border-white/10 shadow-2xl z-50 animate-slide-down">
          <div className="max-h-[60vh] overflow-y-auto">
            {announcements.map((announcement) => {
              const Icon = IconComponent[announcement.icon] || Megaphone;
              const content = (
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0">
                  <Icon className="h-4 w-4 flex-shrink-0 text-white" />
                  <span className="text-sm font-medium flex-1">{announcement.text}</span>
                  {announcement.link && (
                    <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                  )}
                </div>
              );

              if (announcement.link) {
                return (
                  <a
                    key={announcement.id}
                    href={announcement.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <div key={announcement.id}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
