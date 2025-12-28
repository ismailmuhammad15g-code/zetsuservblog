import { Badge } from "@/components/ui/badge";

interface CategoryBadgeProps {
  name: string;
  color: string;
  size?: "sm" | "default";
}

export function CategoryBadge({ name, color, size = "default" }: CategoryBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`${size === "sm" ? "text-xs px-2 py-0.5" : ""}`}
      style={{
        borderColor: color,
        color: color,
        backgroundColor: `${color}10`,
      }}
    >
      {name}
    </Badge>
  );
}
