import { forwardRef } from "react";
import { BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  className?: string;
}

export const VerifiedBadge = forwardRef<HTMLSpanElement, VerifiedBadgeProps>(
  ({ className }, ref) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span ref={ref} className="inline-flex">
              <BadgeCheck className={`h-4 w-4 text-blue-500 fill-blue-500/20 ${className || ""}`} />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Verified Account</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

VerifiedBadge.displayName = "VerifiedBadge";
