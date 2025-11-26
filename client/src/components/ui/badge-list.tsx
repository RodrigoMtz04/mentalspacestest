import { Badge } from "@/components/ui/badge";

interface BadgeListProps {
  items: string[];
  className?: string;
}

export default function BadgeList({ items, className }: BadgeListProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className || ""}`}>
      {items.map((item, index) => (
        <Badge 
          key={index} 
          variant="outline" 
          className="bg-muted text-foreground hover:bg-muted/80 hover:text-foreground"
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}
