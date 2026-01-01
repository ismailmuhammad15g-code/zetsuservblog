import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import Post from "./pages/Post";
import About from "./pages/About";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import UserPosts from "./pages/UserPosts";
import Contact from "./pages/Contact";
import Bookmarks from "./pages/Bookmarks";
import Community from "./pages/Community";
import NotFound from "./pages/NotFound";
import { WelcomeMessage } from "./components/WelcomeMessage";
import { ScrollToTop } from "./components/ScrollToTop";
import { BackToTop } from "./components/BackToTop";
import { SourceSurveyModal } from "./components/onboarding/SourceSurveyModal";
import ZetsuChallengePage from "./pages/ZetsuChallengePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ShopPage from "./pages/ShopPage";
import ActiveTasksPage from "./pages/ActiveTasksPage";
import { MultiplayerPage } from "./pages/MultiplayerPage";
import { VsChallengePage } from "./pages/VsChallengePage";

import { SoundProvider } from "./contexts/SoundContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SoundProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <SourceSurveyModal />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/post/:slug" element={<Post />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/community" element={<Community />} />
            <Route path="/zetsuchallenge" element={<ZetsuChallengePage />} />
            <Route path="/zetsuchallenge/challenges" element={<ZetsuChallengePage />} />
            <Route path="/zetsuchallenge/active-tasks" element={<ActiveTasksPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/multiplayer" element={<MultiplayerPage />} />
            <Route path="/vschallenge/:sessionId" element={<VsChallengePage />} />

            {/* User posts (canonical + legacy aliases) */}
            <Route path="/:username/post" element={<UserPosts />} />
            <Route path="/user/:username" element={<UserPosts />} />
            <Route path="/user/:username/post" element={<UserPosts />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <WelcomeMessage />
          <BackToTop />
        </BrowserRouter>
      </TooltipProvider>
    </SoundProvider>
  </QueryClientProvider>
);

export default App;
