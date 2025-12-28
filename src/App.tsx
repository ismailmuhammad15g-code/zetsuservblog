import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Post from "./pages/Post";
import About from "./pages/About";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import UserPosts from "./pages/UserPosts";
import Contact from "./pages/Contact";
import Bookmarks from "./pages/Bookmarks";
import NotFound from "./pages/NotFound";
import { WelcomeMessage } from "./components/WelcomeMessage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/post/:slug" element={<Post />} />
          <Route path="/about" element={<About />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/bookmarks" element={<Bookmarks />} />

          {/* User posts (canonical + legacy aliases) */}
          <Route path="/:username/post" element={<UserPosts />} />
          <Route path="/user/:username" element={<UserPosts />} />
          <Route path="/user/:username/post" element={<UserPosts />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        <WelcomeMessage />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
