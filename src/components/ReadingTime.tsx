import { Clock } from "lucide-react";

interface ReadingTimeProps {
  content: string;
  className?: string;
}

export const ReadingTime = ({ content, className }: ReadingTimeProps) => {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);

  return (
    <div className={`flex items-center gap-1 text-muted-foreground ${className}`}>
      <Clock className="h-3.5 w-3.5" />
      <span className="text-xs">{readingTime} min read</span>
    </div>
  );
};
