import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Bot, Sparkles, ImageOff } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface ZersuAIPostCardProps {
    id: string;
    title: string;
    description: string;
    coverImage?: string | null;
    createdAt: string;
}

import { Link } from "react-router-dom";

export function ZersuAIPostCard({
    id,
    title,
    description,
    coverImage,
    createdAt,
}: ZersuAIPostCardProps) {
    const [imageError, setImageError] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Truncate description if too long
    const maxLength = 300;
    const shouldTruncate = description.length > maxLength;
    const displayDescription = shouldTruncate && !expanded
        ? description.substring(0, maxLength) + "..."
        : description;

    return (
        <article className="group relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 p-4 md:p-6 transition-all duration-300 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10">
            {/* AI Badge - Top Right */}
            <div className="absolute top-3 right-3 z-10 pointer-events-none">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 backdrop-blur-sm">
                    <Bot className="h-3 w-3" />
                    AI
                </span>
            </div>

            {/* Glow effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                {/* Cover Image */}
                {coverImage && !imageError ? (
                    <Link to={`/ai-post/${id}`} className="md:w-48 md:h-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted relative block">
                        <img
                            src={coverImage}
                            alt={title}
                            className="w-full h-48 md:h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={() => setImageError(true)}
                            loading="lazy"
                        />
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </Link>
                ) : coverImage && imageError ? (
                    <div className="md:w-48 md:h-32 flex-shrink-0 overflow-hidden rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <ImageOff className="h-8 w-8 text-purple-500/30" />
                    </div>
                ) : null}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Author */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                            <Sparkles className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-purple-400">Zersu</span>
                        <span className="text-xs text-muted-foreground">
                            · {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ar })}
                        </span>
                    </div>

                    {/* Title */}
                    <Link to={`/ai-post/${id}`} className="block">
                        <h3 className="text-lg font-semibold tracking-tight mb-2 group-hover:text-purple-400 transition-colors line-clamp-2">
                            {title}
                        </h3>
                    </Link>

                    {/* Description */}
                    <div className="text-sm text-muted-foreground prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown
                            components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="text-foreground">{children}</strong>,
                                em: ({ children }) => <em className="text-purple-400">{children}</em>,
                                code: ({ children }) => (
                                    <code className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs">
                                        {children}
                                    </code>
                                ),
                            }}
                        >
                            {displayDescription}
                        </ReactMarkdown>
                    </div>

                    {/* Read More */}
                    {shouldTruncate && (
                        <Link
                            to={`/ai-post/${id}`}
                            className="mt-2 inline-block text-sm text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            اقرأ المزيد...
                        </Link>
                    )}
                </div>
            </div>

            {/* Bottom decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        </article>
    );
}

export default ZersuAIPostCard;
