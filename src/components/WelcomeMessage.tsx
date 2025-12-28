import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, MessageCircle, Send, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type UserStatus = "loading" | "authenticated" | "guest";

export function WelcomeMessage() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [userStatus, setUserStatus] = useState<UserStatus>("loading");
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserStatus = async () => {
      // Check if already shown this session
      const shown = sessionStorage.getItem("welcomeMessageShown");
      if (shown) return;

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUserStatus("authenticated");
        // Show after 5 seconds for logged-in users
        setTimeout(() => {
          setIsVisible(true);
          setIsExpanded(true);
        }, 5000);
      } else {
        setUserStatus("guest");
        // Show after 10 seconds for guests
        setTimeout(() => {
          setIsVisible(true);
          setIsExpanded(true);
        }, 10000);
      }
    };

    checkUserStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUserStatus("authenticated");
      } else {
        setUserStatus("guest");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleClose = () => {
    setIsExpanded(false);
    setTimeout(() => setIsVisible(false), 300);
    sessionStorage.setItem("welcomeMessageShown", "true");
  };

  const handlePrimaryAction = () => {
    sessionStorage.setItem("welcomeMessageShown", "true");
    if (userStatus === "authenticated") {
      navigate("/contact");
    } else {
      navigate("/auth");
    }
  };

  const handleBubbleClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  if (!isVisible || userStatus === "loading") return null;

  const isAuthenticated = userStatus === "authenticated";

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
          <div className={`p-4 border-b border-border ${
            isAuthenticated 
              ? "bg-gradient-to-r from-primary/10 to-primary/5" 
              : "bg-gradient-to-r from-green-500/10 to-emerald-500/5"
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isAuthenticated 
                    ? "bg-primary/20" 
                    : "bg-green-500/20"
                }`}>
                  {isAuthenticated ? (
                    <Sparkles className="h-5 w-5 text-primary" />
                  ) : (
                    <UserPlus className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">ZetsuServ Team</p>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Message content */}
          <div className="p-4 space-y-3">
            {isAuthenticated ? (
              // Message for logged-in users
              <div className="space-y-2">
                <p className="text-sm leading-relaxed">
                  <span className="text-lg">👋</span> <strong>Need any help?</strong>
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Having trouble with something? Questions about our services? 
                  Our team is here to assist you. Don't hesitate to reach out!
                </p>
              </div>
            ) : (
              // Message for guests
              <div className="space-y-2">
                <p className="text-sm leading-relaxed">
                  <span className="text-lg">🚀</span> <strong>Join our community!</strong>
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Want to create posts, join conversations, and connect with others? 
                  Sign up now and be part of our growing community. It only takes a minute!
                </p>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-2 pt-1">
              <Button 
                onClick={handlePrimaryAction}
                size="sm"
                className={`flex-1 gap-2 ${
                  isAuthenticated 
                    ? "" 
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
              >
                {isAuthenticated ? (
                  <>
                    <Send className="h-3 w-3" />
                    Contact Us
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3" />
                    Sign Up Free
                  </>
                )}
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

          {/* Tail decoration */}
          <div className="absolute -bottom-2 right-4 w-4 h-4 bg-card border-r border-b border-border transform rotate-45" />
        </div>
      </div>

      {/* Floating action button */}
      <button
        onClick={handleBubbleClick}
        className={`
          w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center
          hover:scale-110 active:scale-95 transition-all duration-200
          ${isExpanded ? "scale-0" : "scale-100"}
          ${isAuthenticated 
            ? "bg-primary text-primary-foreground" 
            : "bg-green-500 text-white"
          }
        `}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
