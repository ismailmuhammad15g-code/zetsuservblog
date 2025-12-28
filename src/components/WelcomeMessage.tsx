import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function WelcomeMessage() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkNewUser = async () => {
      // Check if already shown this session
      const shown = sessionStorage.getItem("welcomeMessageShown");
      if (shown) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if user is new (created within last 5 minutes)
      const createdAt = new Date(session.user.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      if (diffMinutes < 5 && !hasBeenShown) {
        setTimeout(() => {
          setIsVisible(true);
          setIsExpanded(true);
          setHasBeenShown(true);
        }, 2000); // Show after 2 seconds
      }
    };

    checkNewUser();
  }, [hasBeenShown]);

  const handleClose = () => {
    setIsExpanded(false);
    setTimeout(() => setIsVisible(false), 300);
    sessionStorage.setItem("welcomeMessageShown", "true");
  };

  const handleContactClick = () => {
    sessionStorage.setItem("welcomeMessageShown", "true");
    navigate("/contact");
  };

  const handleBubbleClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Message bubble */}
      <div
        className={`
          transform transition-all duration-300 ease-out origin-bottom-right
          ${isExpanded 
            ? "scale-100 opacity-100 translate-y-0" 
            : "scale-95 opacity-0 translate-y-2 pointer-events-none"
          }
        `}
      >
        <div className="relative bg-card border border-border rounded-2xl rounded-br-md shadow-2xl max-w-xs overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">ZetsuServ Team</p>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Message content */}
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              <p className="text-sm leading-relaxed">
                <span className="text-lg">👋</span> <strong>Welcome to ZetsuServ!</strong>
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Need help getting started? We're here for you! Don't hesitate to reach out if you have any questions.
              </p>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
              <Button 
                onClick={handleContactClick}
                size="sm"
                className="flex-1 gap-2"
              >
                <Send className="h-3 w-3" />
                Contact Us
              </Button>
              <Button 
                onClick={handleClose}
                variant="outline"
                size="sm"
              >
                Later
              </Button>
            </div>
          </div>

          {/* Tail */}
          <div className="absolute -bottom-2 right-4 w-4 h-4 bg-card border-r border-b border-border transform rotate-45" />
        </div>
      </div>

      {/* Floating action button */}
      <button
        onClick={handleBubbleClick}
        className={`
          w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg
          flex items-center justify-center
          hover:scale-110 active:scale-95 transition-all duration-200
          ${isExpanded ? "scale-0" : "scale-100"}
        `}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}