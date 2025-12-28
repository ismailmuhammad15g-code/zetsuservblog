import { useState } from "react";
import { X, Megaphone, Sparkles, Zap, ExternalLink, Newspaper } from "lucide-react";

interface Announcement {
  id: string;
  text: string;
  icon?: "megaphone" | "sparkles" | "zap" | "newspaper";
  link?: string;
}

const announcements: Announcement[] = [
  { 
    id: "1", 
    text: "📰 اقرأ مدونتنا الرسمية ZetsuBlog على Hashnode!", 
    icon: "newspaper",
    link: "https://zetsu.hashnode.dev/"
  },
  { id: "2", text: "🎉 مرحباً بك في ZetsuServ Blog - مصدرك للرؤى التقنية!", icon: "sparkles" },
  { id: "3", text: "⚡ ميزات جديدة قادمة قريباً - ترقبوا!", icon: "zap" },
  { id: "4", text: "📢 انضم إلى مجتمعنا وابدأ بمشاركة أفكارك!", icon: "megaphone" },
];

export function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const IconComponent = {
    megaphone: Megaphone,
    sparkles: Sparkles,
    zap: Zap,
    newspaper: Newspaper,
  };

  return (
    <div className="bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground relative overflow-hidden z-50 shadow-md">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-16">
            {[...announcements, ...announcements].map((announcement, index) => {
              const Icon = IconComponent[announcement.icon || "megaphone"];
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
