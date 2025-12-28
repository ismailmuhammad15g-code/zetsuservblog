import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard, Settings, Shield, FileText, Bookmark } from "lucide-react";
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

  return (
    <header className="glass-nav border-b border-border/50">
      <nav className="container flex items-center justify-between h-16">
        <Link 
          to="/" 
          className="text-lg font-semibold tracking-tight hover:opacity-70 transition-opacity"
        >
          ZetsuServ
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className={`text-sm transition-colors ${
              isActive("/") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Blog
          </Link>
          <Link
            to="/about"
            className={`text-sm transition-colors ${
              isActive("/about") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            About
          </Link>
          
          {user ? (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">
                      {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[100px] truncate text-xs">
                    {profile?.full_name || user.email?.split("@")[0]}
                  </span>
                  {isAdmin && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                      <Shield className="h-2.5 w-2.5" />
                      Admin
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link to={myPostsPath} className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    My Posts
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/bookmarks" className="flex items-center gap-2 cursor-pointer">
                    <Bookmark className="h-4 w-4" />
                    Saved Posts
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-2 cursor-pointer text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Sign in
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu / Notifications */}
        <div className="md:hidden flex items-center gap-1">
          {user && <NotificationBell />}
          <button
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-border animate-slide-down">
          <div className="container py-4 flex flex-col gap-4">
            <Link
              to="/"
              className={`text-sm py-2 transition-colors ${
                isActive("/") ? "text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Blog
            </Link>
            <Link
              to="/about"
              className={`text-sm py-2 transition-colors ${
                isActive("/about") ? "text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
            
            {user ? (
              <>
                <div className="flex items-center gap-3 py-2 border-t border-border pt-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{profile?.full_name || user.email?.split("@")[0]}</p>
                    {isAdmin && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                        <Shield className="h-2.5 w-2.5" />
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    onClick={() => setIsOpen(false)}
                    className="text-sm py-2 flex items-center gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                )}
                <Link 
                  to={myPostsPath}
                  onClick={() => setIsOpen(false)}
                  className="text-sm py-2 flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  My Posts
                </Link>
                <Link 
                  to="/bookmarks"
                  onClick={() => setIsOpen(false)}
                  className="text-sm py-2 flex items-center gap-2"
                >
                  <Bookmark className="h-4 w-4" />
                  Saved Posts
                </Link>
                <Link 
                  to="/settings" 
                  onClick={() => setIsOpen(false)}
                  className="text-sm py-2 flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="text-sm py-2 text-destructive flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setIsOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
