import { ShoppingCart, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onReset: () => void;
}

export function Header({ onReset }: HeaderProps) {
  return (
    <header className="border-b border-border/60 bg-card">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-fuego-500 text-white">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight">
              PantryPilot
            </h1>
            <p className="text-xs text-muted-foreground">
              Smart grocery management
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-muted-foreground hover:text-destructive"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>
    </header>
  );
}
