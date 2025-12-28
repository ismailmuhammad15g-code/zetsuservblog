import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { AnnouncementBanner } from "./AnnouncementBanner";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-50">
        <AnnouncementBanner />
        <Navbar />
      </div>
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
