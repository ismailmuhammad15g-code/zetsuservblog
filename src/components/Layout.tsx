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
      <div className="fixed top-0 left-0 right-0 z-50">
        <AnnouncementBanner />
        <Navbar />
      </div>
      <main className="flex-1 pt-[120px]">
        {children}
      </main>
      <Footer />
    </div>
  );
}
