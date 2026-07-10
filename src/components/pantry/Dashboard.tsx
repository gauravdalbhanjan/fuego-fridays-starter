import {
  Package,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  Receipt,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PantryItem, ConsumptionStat } from "@/types";
import { getStockStatus } from "@/services/predictions";

interface DashboardProps {
  pantryItems: PantryItem[];
  receiptsCount: number;
  consumptionStats: ConsumptionStat[];
}

export function Dashboard({
  pantryItems,
  receiptsCount,
}: DashboardProps) {
  const inStock = pantryItems.filter((i) => getStockStatus(i) === "in-stock").length;
  const runningLow = pantryItems.filter(
    (i) => getStockStatus(i) === "running-low",
  ).length;
  const outOfStock = pantryItems.filter(
    (i) => getStockStatus(i) === "out-of-stock",
  ).length;
  const staples = pantryItems.filter((i) => i.isStaple).length;

  const stats = [
    {
      label: "Total Items",
      value: pantryItems.length,
      icon: <Package className="h-4 w-4" />,
      color: "text-foreground",
    },
    {
      label: "In Stock",
      value: inStock,
      icon: <ShoppingBag className="h-4 w-4" />,
      color: "text-green-600",
    },
    {
      label: "Running Low",
      value: runningLow,
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-amber-600",
    },
    {
      label: "Out of Stock",
      value: outOfStock,
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "text-red-600",
    },
    {
      label: "Receipts",
      value: receiptsCount,
      icon: <Receipt className="h-4 w-4" />,
      color: "text-foreground",
    },
    {
      label: "Staples",
      value: staples,
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-fuego-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="flex flex-col gap-1 p-3"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {stat.icon}
            <span className="text-[11px] font-medium uppercase tracking-wide">
              {stat.label}
            </span>
          </div>
          <span className={`text-2xl font-bold ${stat.color}`}>
            {stat.value}
          </span>
        </Card>
      ))}
    </div>
  );
}
