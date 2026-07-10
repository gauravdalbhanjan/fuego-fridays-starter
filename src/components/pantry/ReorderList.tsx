import { useState } from "react";
import {
  ShoppingCart,
  ExternalLink,
  Check,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReorderItem } from "@/types";
import { DELIVERY_SERVICES } from "@/services/delivery";
import { cn } from "@/lib/utils";

interface ReorderListProps {
  items: ReorderItem[];
  onConfirm: (original: ReorderItem[], final: ReorderItem[]) => void;
}

const URGENCY_CONFIG = {
  critical: {
    label: "Critical",
    color: "bg-red-100 text-red-700",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  soon: {
    label: "Soon",
    color: "bg-amber-100 text-amber-700",
    icon: <Clock className="h-3 w-3" />,
  },
  upcoming: {
    label: "Upcoming",
    color: "bg-blue-100 text-blue-700",
    icon: <Zap className="h-3 w-3" />,
  },
};

export function ReorderList({ items: initialItems, onConfirm }: ReorderListProps) {
  const [items, setItems] = useState<ReorderItem[]>(initialItems);
  const [selectedService, setSelectedService] = useState(DELIVERY_SERVICES[0]);
  const [ordered, setOrdered] = useState(false);

  function toggleItem(itemId: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.itemId === itemId ? { ...i, included: !i.included } : i,
      ),
    );
  }

  function handleReorder() {
    const includedItems = items.filter((i) => i.included);
    if (includedItems.length === 0) return;

    const url = selectedService.buildCartUrl(includedItems);
    window.open(url, "_blank");

    // Record feedback
    onConfirm(initialItems, items);
    setOrdered(true);
  }

  if (items.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <p className="font-medium text-muted-foreground">
            No items to reorder
          </p>
          <p className="text-sm text-muted-foreground">
            Upload more receipts to build consumption patterns
          </p>
        </div>
      </Card>
    );
  }

  if (ordered) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <Check className="h-6 w-6" />
        </div>
        <div>
          <p className="font-medium">Order sent!</p>
          <p className="text-sm text-muted-foreground">
            Your feedback has been recorded to improve future predictions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOrdered(false)}
        >
          Done
        </Button>
      </Card>
    );
  }

  const includedCount = items.filter((i) => i.included).length;

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold">
            Reorder List
          </h3>
          <p className="text-sm text-muted-foreground">
            {includedCount} of {items.length} items selected
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleReorder}
          disabled={includedCount === 0}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Reorder via {selectedService.name}
        </Button>
      </div>

      {/* Service selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {DELIVERY_SERVICES.map((service) => (
          <button
            key={service.id}
            onClick={() => setSelectedService(service)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selectedService.id === service.id
                ? "border-fuego-500 bg-fuego-50 text-fuego-700"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {service.name}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => {
          const urgencyConfig = URGENCY_CONFIG[item.urgency];
          return (
            <div
              key={item.itemId}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all",
                item.included
                  ? "border-border/60 bg-card"
                  : "border-border/30 bg-muted/30 opacity-60",
              )}
            >
              <button
                onClick={() => toggleItem(item.itemId)}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                  item.included
                    ? "border-fuego-500 bg-fuego-500 text-white"
                    : "border-border",
                )}
                aria-label={`${item.included ? "Remove" : "Add"} ${item.name}`}
              >
                {item.included && <Check className="h-3 w-3" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      !item.included && "line-through",
                    )}
                  >
                    {item.name}
                  </span>
                  {item.brand && (
                    <span className="text-xs text-muted-foreground">
                      {item.brand}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    Out{" "}
                    {new Date(item.predictedOutDate).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                  <span>·</span>
                  <span>{Math.round(item.confidence * 100)}% conf.</span>
                </div>
              </div>

              <Badge
                variant="secondary"
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  urgencyConfig.color,
                )}
              >
                {urgencyConfig.icon}
                {urgencyConfig.label}
              </Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
