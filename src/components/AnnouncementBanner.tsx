import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Megaphone, Sparkles, Zap, ExternalLink, Newspaper, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [currentIndex, setCurrentIndex] = useState(0);

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

  // Auto-rotate announcements every 5 seconds
  useEffect(() => {
    if (!announcements || announcements.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [announcements]);

  if (!isVisible || !announcements || announcements.length === 0) return null;

  const currentAnnouncement = announcements[currentIndex];
  const hasMultiple = announcements.length > 1;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const handleClick = () => {
    if (currentAnnouncement.link) {
      window.open(currentAnnouncement.link, '_blank', 'noopener,noreferrer');
    }
  };

  const Icon = IconComponent[currentAnnouncement.icon] || Megaphone;

  return (
    <div className="bg-gradient-to-r from-black via-slate-900 to-black text-white relative z-50 shadow-lg border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Navigation arrows for multiple announcements */}
        {hasMultiple && (
          <button
            onClick={handlePrevious}
            className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
            aria-label="Previous announcement"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Current announcement */}
        <div
          onClick={handleClick}
          className={`flex-1 flex items-center gap-2 min-w-0 px-3 ${currentAnnouncement.link ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity`}
        >
          <Icon className="h-4 w-4 flex-shrink-0 text-white animate-pulse" />
          <span className="text-sm font-medium truncate">
            {currentAnnouncement.text}
          </span>
          {currentAnnouncement.link && (
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-70" />
          )}
        </div>

        {/* Navigation arrows and counter */}
        {hasMultiple && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-white/50 font-mono">
              {currentIndex + 1}/{announcements.length}
            </span>
            <button
              onClick={handleNext}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Next announcement"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="ml-2 p-1.5 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
          aria-label="Close announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
