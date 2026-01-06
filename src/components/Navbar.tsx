import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard, Settings, Shield, FileText, Bookmark, Users, TrendingUp } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  avatar_url: string | null;
  full_name: string | null;
  username: string | null;
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;
  const myPostsPath = profile?.username ? `/${profile.username}/post` : "/me/post";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    setIsAdmin(data?.some(r => r.role === "admin") ?? false);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, full_name, username")
      .eq("id", userId)
      .maybeSingle();

    setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setProfile(null);
    navigate("/");
  };

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <header className="glass-nav border-b border-border/50">
      <nav className="container flex items-center justify-between h-16">
        <Link
          to="/"
          className="text-lg font-black tracking-tight hover:opacity-70 transition-opacity bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent"
        >
          ZetsuServ
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors ${isActive("/") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Blog
          </Link>
          <Link
            to="/explore"
            className={`text-sm font-medium transition-colors ${isActive("/explore") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Explore
          </Link>
          <Link
            to="/community"
            className={`text-sm font-medium transition-colors ${isActive("/community") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Community
          </Link>
          <Link
            to="/about"
            className={`text-sm font-medium transition-colors ${isActive("/about") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            About
          </Link>
          <Link
            to="/zetsuchallenge"
            className={`text-sm transition-colors text-purple-500 font-bold hover:text-purple-600 animate-pulse ${isActive("/zetsuchallenge") ? "text-purple-600" : ""
              }`}
          >
            Challenges ⚔️
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 gap-2 px-2 hover:bg-secondary/50 rounded-full transition-colors">
                    <Avatar className="h-7 w-7 ring-2 ring-primary/10">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="text-xs">
                        {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[100px] truncate text-xs font-medium">
                      {profile?.full_name || user.email?.split("@")[0]}
                    </span>
                    {isAdmin && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1 bg-purple-500/10 text-purple-500 border-purple-500/20">
                        <Shield className="h-2.5 w-2.5" />
                        Admin
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 backdrop-blur-xl bg-background/80 border-border/50">
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 cursor-pointer p-2 rounded-lg focus:bg-primary/10">
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to={myPostsPath} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg focus:bg-primary/10">
                      <FileText className="h-4 w-4" />
                      My Posts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/bookmarks" className="flex items-center gap-2 cursor-pointer p-2 rounded-lg focus:bg-primary/10">
                      <Bookmark className="h-4 w-4" />
                      Saved Posts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2 cursor-pointer p-2 rounded-lg focus:bg-primary/10">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive p-2 rounded-lg"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-full hover:bg-primary hover:text-primary-foreground transition-all">
                Sign in
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu / Notifications */}
        <div className="md:hidden flex items-center gap-2">
          {user && <NotificationBell />}
          <button
            className="p-2.5 hover:bg-accent rounded-full transition-colors active:scale-95"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Overlay */}
      {isOpen && (
        <div className="fixed inset-0 top-16 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 transition-all duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Content */}
          <div className="absolute inset-x-0 top-0 h-[calc(100vh-4rem)] overflow-y-auto bg-white dark:bg-zinc-900 border-t border-border shadow-xl">
            <div className="container py-6 flex flex-col gap-2 pb-20">

              {user && (
                <div className="flex items-center gap-4 p-4 mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <p className="font-bold text-base leading-none">{profile?.full_name || user.email?.split("@")[0]}</p>
                    {isAdmin && (
                      <Badge variant="secondary" className="w-fit text-[10px] px-2 py-0.5 h-5 gap-1 bg-purple-500/10 text-purple-500 border-purple-500/20">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold text-muted-foreground px-4 py-2 uppercase tracking-wider">Menu</p>
                <Link
                  to="/"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98] ${isActive("/") ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent text-foreground/80"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <LayoutDashboard className="h-5 w-5 opacity-70" />
                  Blog
                </Link>
                <Link
                  to="/explore"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98] ${isActive("/explore") ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent text-foreground/80"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <TrendingUp className="h-5 w-5 opacity-70" />
                  Explore
                </Link>
                <Link
                  to="/community"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98] ${isActive("/community") ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent text-foreground/80"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Users className="h-5 w-5 opacity-70" />
                  Community
                </Link>
                <Link
                  to="/zetsuchallenge"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98] bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 ${isActive("/zetsuchallenge") ? "text-purple-600 font-bold" : "text-purple-500"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="text-xl">⚔️</span>
                  Challenges
                </Link>
              </div>

              {user ? (
                <>
                  <div className="h-px bg-border/50 my-2 mx-4" />
                  <p className="text-xs font-bold text-muted-foreground px-4 py-2 uppercase tracking-wider">Account</p>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent text-foreground/80 transition-all active:scale-[0.98]"
                    >
                      <LayoutDashboard className="h-5 w-5 opacity-70" />
                      Dashboard
                    </Link>
                  )}
                  <Link
                    to={myPostsPath}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent text-foreground/80 transition-all active:scale-[0.98]"
                  >
                    <FileText className="h-5 w-5 opacity-70" />
                    My Posts
                  </Link>
                  <Link
                    to="/bookmarks"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent text-foreground/80 transition-all active:scale-[0.98]"
                  >
                    <Bookmark className="h-5 w-5 opacity-70" />
                    Saved Posts
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent text-foreground/80 transition-all active:scale-[0.98]"
                  >
                    <Settings className="h-5 w-5 opacity-70" />
                    Settings
                  </Link>

                  <div className="mt-4 px-4">
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive/10 text-destructive font-bold rounded-xl active:scale-[0.98] transition-all"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-8 px-4">
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20">
                      Sign in / Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
