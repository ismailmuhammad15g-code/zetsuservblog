import { useState } from "react";
import { X, Megaphone, Sparkles, Zap } from "lucide-react";

interface Announcement {
  id: string;
  text: string;
  icon?: "megaphone" | "sparkles" | "zap";
  link?: string;
}

const announcements: Announcement[] = [
  { id: "1", text: "🎉 Welcome to ZetsuServ Blog - Your source for tech insights!", icon: "sparkles" },
  { id: "2", text: "⚡ New features coming soon - Stay tuned!", icon: "zap" },
  { id: "3", text: "📢 Join our community and start sharing your thoughts!", icon: "megaphone" },
];

export function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const IconComponent = {
    megaphone: Megaphone,
    sparkles: Sparkles,
    zap: Zap,
  };

  return (
    <div className="bg-primary text-primary-foreground relative overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-12">
            {[...announcements, ...announcements].map((announcement, index) => {
              const Icon = IconComponent[announcement.icon || "megaphone"];
              return (
                <span key={`${announcement.id}-${index}`} className="inline-flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4" />
                  {announcement.text}
                </span>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 p-1 hover:bg-primary-foreground/10 rounded-full transition-colors flex-shrink-0"
          aria-label="Close announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
