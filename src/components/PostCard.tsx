import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight } from "lucide-react";

interface PostCardProps {
  id: string;
  title: string;
  excerpt?: string | null;
  slug: string;
  authorName: string;
  createdAt: string;
  coverImage?: string | null;
}

export function PostCard({ 
  title, 
  excerpt, 
  slug, 
  authorName, 
  createdAt,
  coverImage 
}: PostCardProps) {
  return (
    <article className="group py-6 border-b border-border last:border-0">
      <Link to={`/post/${slug}`} className="block">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {coverImage && (
            <div className="md:w-48 md:h-32 flex-shrink-0 overflow-hidden rounded-lg">
              <img 
                src={coverImage} 
                alt={title}
                className="w-full h-48 md:h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-medium tracking-tight group-hover:text-muted-foreground transition-colors line-clamp-2">
                {title}
              </h2>
              <ArrowUpRight className="h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
            </div>
            
            {excerpt && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {excerpt}
              </p>
            )}
            
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{authorName}</span>
              <span>·</span>
              <time dateTime={createdAt}>
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </time>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
