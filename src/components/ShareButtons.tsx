import { Twitter, Facebook, Linkedin, Link as LinkIcon, Share2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonsProps {
  title: string;
  url?: string;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  showAutoScrollToggle?: boolean;
}

export function ShareButtons({ title, url, autoScrollEnabled, onToggleAutoScroll, showAutoScrollToggle }: ShareButtonsProps) {
  const { toast } = useToast();
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "The link has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually from the address bar.",
        variant: "destructive",
      });
    }
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], "_blank", "width=600,height=400");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleShare("twitter")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Twitter className="h-4 w-4" />
          Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleShare("facebook")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Facebook className="h-4 w-4" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleShare("linkedin")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Linkedin className="h-4 w-4" />
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={copyLink}
          className="flex items-center gap-2 cursor-pointer"
        >
          <LinkIcon className="h-4 w-4" />
          Copy link
        </DropdownMenuItem>
        {showAutoScrollToggle && (
          <DropdownMenuItem
            onClick={onToggleAutoScroll}
            className="flex items-center gap-2 cursor-pointer"
          >
            <ScrollText className="h-4 w-4" />
            Auto-scroll: {autoScrollEnabled ? 'ON' : 'OFF'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
