import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, ExternalLink, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        fetchNotifications();
      } else {
        setLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchNotifications();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          toast({
            title: newNotification.title,
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);

      toast({ title: "All changed to read" });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const notification = notifications.find(n => n.id === id);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleLinkClick = (link: string | null) => {
    if (link) {
      setIsOpen(false);
      navigate(link);
    }
  };

  if (!user) {
    return (
      <Button variant="ghost" size="icon" onClick={() => navigate("/auth")} className="text-zinc-400 hover:text-white">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors duration-300">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      {/* Responsive Width: w-[95vw] on mobile, w-[380px] on desktop */}
      <PopoverContent className="w-[95vw] sm:w-[420px] p-0 bg-black/95 border border-zinc-800 text-zinc-100 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl rounded-2xl overflow-hidden mr-2 sm:mr-0" align="end" sideOffset={8}>

        {/* Header - Glass Effect */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-white" />
            <h4 className="font-bold text-sm tracking-[0.2em] uppercase text-white">Notifications</h4>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-all duration-300 flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/10"
              >
                <Check className="h-3 w-3" />
                Mark All Read
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[60vh] sm:h-[450px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-4">
              <span className="inline-block w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest animate-pulse">Loading Updates...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-zinc-600 gap-6 animate-in fade-in duration-500">
              <div className="h-20 w-20 rounded-full bg-zinc-900/50 flex items-center justify-center border border-zinc-800 shadow-inner">
                <Bell className="h-8 w-8 opacity-20" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">All Caught Up</p>
                <p className="text-xs text-zinc-700">No new notifications at the moment.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative group p-5 transition-all duration-300 hover:bg-white/5 ${!notification.is_read ? 'bg-gradient-to-r from-white/5 to-transparent' : ''
                    }`}
                >
                  <div className="flex gap-4 items-start">
                    {/* Status Indicator */}
                    <div className="mt-1.5 flex-shrink-0">
                      <div className={`h-2 w-2 rounded-full transition-all duration-500 ${!notification.is_read
                          ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] scale-110'
                          : 'bg-zinc-800'
                        }`} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-4">
                        <p className={`text-sm leading-snug font-medium transition-colors ${!notification.is_read ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'
                          }`}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-zinc-600 font-medium tabular-nums whitespace-nowrap uppercase tracking-wide">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-500 leading-relaxed pr-4 font-light tracking-wide line-clamp-2">
                        {notification.message}
                      </p>

                      {/* Action Bar - Always visible on mobile, slide up on desktop */}
                      <div className="flex items-center gap-3 mt-4 pt-2 border-t border-white/5 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0 transition-all duration-300">
                        {notification.link && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[10px] px-4 font-bold uppercase tracking-wider bg-transparent border-zinc-700 text-zinc-300 hover:bg-white hover:text-black hover:border-white transition-all shadow-none"
                            onClick={() => handleLinkClick(notification.link)}
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            View
                          </Button>
                        )}
                        {!notification.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-[10px] px-3 font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/10"
                            onClick={(e) => markAsRead(notification.id, e)}
                          >
                            <Check className="h-3 w-3 mr-2" />
                            Mark Read
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 ml-auto rounded-full text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          onClick={(e) => deleteNotification(notification.id, e)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
