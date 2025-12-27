import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-nav">
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
          <Link to="/auth">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Sign in
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
            <Link to="/auth" onClick={() => setIsOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
