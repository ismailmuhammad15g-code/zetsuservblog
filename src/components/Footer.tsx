import { Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold tracking-tight">ZetsuServ</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Thoughts, ideas, and technical explorations.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <a 
                href="mailto:zetsuserv@gmail.com" 
                className="hover:text-foreground transition-colors"
              >
                zetsuserv@gmail.com
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} ZetsuServ. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
