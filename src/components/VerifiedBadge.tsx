import { BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  className?: string;
}

export function VerifiedBadge({ className }: VerifiedBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <BadgeCheck className={`h-4 w-4 text-blue-500 fill-blue-500/20 ${className || ""}`} />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Verified Admin</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
