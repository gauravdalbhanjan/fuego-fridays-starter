import { Package, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PantryItem, StockStatus } from "@/types";
import { getStockStatus } from "@/services/predictions";
import { cn } from "@/lib/utils";

interface PantryListProps {
  items: PantryItem[];
  onRemove: (id: string) => void;
}

const STATUS_CONFIG: Record<
  StockStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  "in-stock": {
    label: "In Stock",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  "running-low": {
    label: "Running Low",
    color: "bg-amber-100 text-amber-700",
    icon: <TrendingDown className="h-3.5 w-3.5" />,
  },
  "out-of-stock": {
    label: "Out of Stock",
    color: "bg-red-100 text-red-700",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

// Group items by category
function groupByCategory(items: PantryItem[]): Map<string, PantryItem[]> {
  const grouped = new Map<string, PantryItem[]>();
  for (const item of items) {
    const cat = item.category || "Other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }
  return grouped;
}

export function PantryList({ items, onRemove }: PantryListProps) {
  if (items.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <Package className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <p className="font-medium text-muted-foreground">Pantry is empty</p>
          <p className="text-sm text-muted-foreground">
            Upload a receipt to start tracking items
          </p>
        </div>
      </Card>
    );
  }

  const grouped = groupByCategory(items);

  return (
    <div className="space-y-4">
      {Array.from(grouped).map(([category, categoryItems]) => (
        <div key={category}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </h4>
          <div className="space-y-1.5">
            {categoryItems.map((item) => {
              const status = getStockStatus(item);
              const config = STATUS_CONFIG[status];
              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card px-3 py-2.5 transition-colors hover:border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {item.name}
                      </span>
                      {item.brand && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.brand}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {item.quantity} {item.unit}
                      </span>
                      {item.consumptionRateDays && (
                        <span>· every {Math.round(item.consumptionRateDays)}d</span>
                      )}
                      {item.predictedOutDate && (
                        <span>
                          · out{" "}
                          {new Date(item.predictedOutDate).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.isStaple && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5"
                      >
                        Staple
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "flex items-center gap-1 text-[10px] px-1.5",
                        config.color,
                      )}
                    >
                      {config.icon}
                      {config.label}
                    </Badge>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="hidden text-xs text-muted-foreground hover:text-destructive group-hover:inline"
                      aria-label={`Remove ${item.name}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
