import { BarChart3, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ConsumptionStat } from "@/types";
import { cn } from "@/lib/utils";

interface ConsumptionInsightsProps {
  stats: ConsumptionStat[];
}

export function ConsumptionInsights({ stats }: ConsumptionInsightsProps) {
  if (stats.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <p className="font-medium text-muted-foreground">
            No patterns yet
          </p>
          <p className="text-sm text-muted-foreground">
            Upload 2+ receipts to start seeing consumption patterns
          </p>
        </div>
      </Card>
    );
  }

  // Sort by confidence, then by staple status
  const sorted = [...stats].sort((a, b) => {
    if (a.isStaple !== b.isStaple) return a.isStaple ? -1 : 1;
    return b.confidence - a.confidence;
  });

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4">
        <h3 className="font-display text-base font-semibold">
          Consumption Patterns
        </h3>
        <p className="text-sm text-muted-foreground">
          How quickly you go through each item
        </p>
      </div>

      <div className="space-y-2">
        {sorted.map((stat) => (
          <div
            key={stat.itemId}
            className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stat.itemName}</span>
                {stat.isStaple && (
                  <Star className="h-3 w-3 fill-fuego-400 text-fuego-400" />
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {stat.preferredBrand && <span>{stat.preferredBrand}</span>}
                <span>· {stat.purchaseDates.length} purchases</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="text-sm font-semibold">
                  {Math.round(stat.avgIntervalDays)}d
                </div>
                <div className="text-[10px] text-muted-foreground">avg interval</div>
              </div>

              {/* Confidence bar */}
              <div className="w-16">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">conf.</span>
                  <span>{Math.round(stat.confidence * 100)}%</span>
                </div>
                <div className="mt-0.5 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      stat.confidence > 0.7
                        ? "bg-green-500"
                        : stat.confidence > 0.4
                          ? "bg-amber-500"
                          : "bg-red-400",
                    )}
                    style={{ width: `${stat.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
