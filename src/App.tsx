import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  ChevronLeft,
  Settings,
  Zap,
  Check,
  Plus,
  Edit3,
  Mic,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GROCERY_ITEMS,
  CATEGORIES,
  type GroceryItem,
  type Category,
} from "@/data/groceryItems";
import {
  loadPreferences,
  savePreferences,
  type UserPreferences,
} from "@/data/userPreferences";
import { DISHES, calculatePantryMatch, type Dish } from "@/data/dishes";
import {
  loadRoutines,
  saveRoutines,
  DAY_LABELS,
  type MealRoutine,
} from "@/data/routines";
import {
  loadAlexaConnection,
  loadAlexaRules,
  saveAlexaRules,
  saveAlexaConnection,
  simulateAlexaOrder,
  getItemsDueForOrder,
  type AlexaConnection,
  type AlexaOrderRule,
} from "@/services/alexa";
import { SousChefChat } from "@/components/SousChefChat";

type NavTab = "menu" | "inventory" | "routine" | "events";

export default function App() {
  const [activeNav, setActiveNav] = useState<NavTab>("menu");
  const [activeCategory, setActiveCategory] = useState<Category>("Veggies");
  const [items, setItems] = useState<GroceryItem[]>(() => {
    const saved = localStorage.getItem("pantrypilot_items");
    return saved ? JSON.parse(saved) : GROCERY_ITEMS;
  });
  const [cart, setCart] = useState<GroceryItem[]>(() => {
    const saved = localStorage.getItem("pantrypilot_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);
  const [routines, setRoutines] = useState<MealRoutine[]>(loadRoutines);
  const [alexaConn, setAlexaConn] = useState<AlexaConnection>(loadAlexaConnection);
  const [alexaRules, setAlexaRules] = useState<AlexaOrderRule[]>(loadAlexaRules);
  const [showCart, setShowCart] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAutoNotification, setShowAutoNotification] = useState(false);
  const [autoAddedItems, setAutoAddedItems] = useState<string[]>([]);

  useEffect(() => { localStorage.setItem("pantrypilot_items", JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem("pantrypilot_cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { saveRoutines(routines); }, [routines]);
  useEffect(() => { saveAlexaRules(alexaRules); }, [alexaRules]);
  useEffect(() => { saveAlexaConnection(alexaConn); }, [alexaConn]);

  // Auto-reorder
  useEffect(() => {
    if (!preferences.autoReorderEnabled || !preferences.autoAddCritical) return;
    const criticalItems = items.filter(
      (item) => item.autoReorder && item.urgency === "critical" && !item.inCart && !cart.find((c) => c.id === item.id),
    );
    if (criticalItems.length > 0) {
      setCart((prev) => [...prev, ...criticalItems]);
      setItems((prev) => prev.map((item) => criticalItems.find((c) => c.id === item.id) ? { ...item, inCart: true } : item));
      setAutoAddedItems(criticalItems.map((i) => i.name));
      setShowAutoNotification(true);
      setTimeout(() => setShowAutoNotification(false), 4000);
    }
  }, [preferences.autoReorderEnabled, preferences.autoAddCritical]);

  const addToCart = useCallback((itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || cart.find((c) => c.id === itemId)) return;
    setCart((prev) => [...prev, item]);
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, inCart: true } : i)));
  }, [items, cart]);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== itemId));
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, inCart: false } : i)));
  }, []);

  const toggleAutoReorder = useCallback((itemId: string) => {
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, autoReorder: !i.autoReorder } : i));
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  }, [preferences]);

  const updateRoutine = useCallback((id: string, updates: Partial<MealRoutine>) => {
    setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const addRoutine = useCallback(() => {
    setRoutines((prev) => [...prev, {
      id: "r" + Date.now(), mealType: "Snack", startTime: "3:00 PM", endTime: "4:00 PM",
      activeDays: [false, true, true, true, true, true, false],
      gradient: "linear-gradient(135deg, #31a8ff 0%, #0095ff 100%)",
      emoji: "🍽", preferredDishes: [], calorieTarget: 300,
    }]);
  }, []);

  const toggleAlexaRule = useCallback((ruleId: string) => {
    setAlexaRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)));
  }, []);

  const updateAlexaConn = useCallback((updates: Partial<AlexaConnection>) => {
    setAlexaConn((prev) => ({ ...prev, ...updates }));
  }, []);

  const triggerAlexaOrder = useCallback(() => {
    const dueItems = getItemsDueForOrder(alexaRules);
    if (dueItems.length === 0) return;
    const log = simulateAlexaOrder(dueItems, "manual");
    setAlexaConn((prev) => ({ ...prev, orderHistory: [log, ...prev.orderHistory] }));
  }, [alexaRules]);

  const availableItemNames = items.map((i) => i.name);
  const filteredItems = items.filter((i) => i.category === activeCategory);
  const cartCount = cart.length;

  // Listen for Robin voice navigation commands
  useEffect(() => {
    function handleNavigate(e: Event) {
      const target = (e as CustomEvent).detail as string;
      if (target === "settings") {
        setShowSettings(true);
      } else if (target === "cart") {
        setShowCart(true);
      } else {
        setActiveNav(target as NavTab);
      }
    }
    function handleCartAdd(e: Event) {
      const itemName = ((e as CustomEvent).detail as string).toLowerCase();
      const match = items.find((i) => i.name.toLowerCase().includes(itemName));
      if (match && !match.inCart) addToCart(match.id);
    }
    window.addEventListener("robin-navigate", handleNavigate);
    window.addEventListener("robin-cart-add", handleCartAdd);
    return () => {
      window.removeEventListener("robin-navigate", handleNavigate);
      window.removeEventListener("robin-cart-add", handleCartAdd);
    };
  }, [items, addToCart]);

  if (showSettings) {
    return <SettingsPanel preferences={preferences} onUpdate={updatePreferences} items={items} onToggleAutoReorder={toggleAutoReorder} onBack={() => setShowSettings(false)} />;
  }
  if (showCart) {
    return <CartPanel cart={cart} onRemove={removeFromCart} onBack={() => setShowCart(false)} />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#0d1117] text-[#e6edf3]">
      {showAutoNotification && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-[#31a8ff] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#31a8ff]/30">
            <Zap className="h-4 w-4" />
            Auto-added: {autoAddedItems.join(", ")}
          </div>
        </div>
      )}

      {/* Header — Alexa style minimal */}
      <header className="flex items-center justify-between px-5 py-4">
        <button onClick={() => setShowSettings(true)} className="rounded-full bg-[#161b22] p-2.5 text-[#8b949e] hover:text-white transition-colors">
          <Settings className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#31a8ff] animate-pulse shadow-[0_0_8px_#31a8ff]" />
          <h1 className="font-display text-base font-semibold tracking-tight">PantryPilot</h1>
        </div>
        <button onClick={() => setShowCart(true)} className="relative rounded-full bg-[#161b22] p-2.5 text-[#8b949e] hover:text-white transition-colors" aria-label="Cart">
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#31a8ff] text-[10px] font-bold text-white shadow-[0_0_6px_#31a8ff]">{cartCount}</span>
          )}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        {activeNav === "menu" && <MenuPage items={items} availableItemNames={availableItemNames} />}
        {activeNav === "inventory" && <InventoryPage items={filteredItems} allItems={items} activeCategory={activeCategory} onCategoryChange={setActiveCategory} onAddToCart={addToCart} onToggleAutoReorder={toggleAutoReorder} />}
        {activeNav === "routine" && <RoutinePage routines={routines} onUpdate={updateRoutine} onAdd={addRoutine} />}
        {activeNav === "events" && <AlexaPage connection={alexaConn} rules={alexaRules} onToggleRule={toggleAlexaRule} onUpdateConnection={updateAlexaConn} onTriggerOrder={triggerAlexaOrder} />}
      </main>

      {/* Sous Chef */}
      <SousChefChat lowStockCount={items.filter((i) => i.urgency === "critical").length} robinSleepTimeout={preferences.robinSleepTimeout} robinVoiceEnabled={preferences.robinVoiceEnabled} />

      {/* Bottom nav — Alexa device style */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#30363d]/50 bg-[#0d1117]/95 px-4 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md justify-around">
          {([
            { id: "menu" as NavTab, icon: "⊞", label: "Menu" },
            { id: "inventory" as NavTab, icon: "🛒", label: "Inventory" },
            { id: "routine" as NavTab, icon: "📅", label: "Routine" },
            { id: "events" as NavTab, icon: "🔵", label: "Alexa" },
          ]).map((tab) => (
            <button key={tab.id} onClick={() => setActiveNav(tab.id)}
              className={cn("flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs transition-all",
                activeNav === tab.id ? "bg-[#31a8ff]/10 text-[#31a8ff]" : "text-[#8b949e] hover:text-[#e6edf3]"
              )}>
              <span className="text-lg">{tab.icon}</span>
              <span className={cn("font-medium", activeNav === tab.id && "text-[#31a8ff]")}>{tab.label}</span>
              {activeNav === tab.id && <span className="absolute bottom-1 h-0.5 w-6 rounded-full bg-[#31a8ff] shadow-[0_0_4px_#31a8ff]" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ─── Menu Page (Alexa Style) ─── */
function MenuPage({ items, availableItemNames }: { items: GroceryItem[]; availableItemNames: string[] }) {
  const dishesWithMatch = DISHES.map((dish) => ({
    ...dish,
    pantryMatch: calculatePantryMatch(dish, availableItemNames),
  })).sort((a, b) => b.pantryMatch - a.pantryMatch);

  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";
  const lowItems = items.filter((i) => i.urgency === "critical");

  return (
    <div className="space-y-5">
      {/* Alexa-style greeting with glow */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161b22] to-[#0d1117] p-6 border border-[#30363d]/50">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#31a8ff]/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#31a8ff]/20 shadow-[0_0_12px_#31a8ff40]">
              <Mic className="h-5 w-5 text-[#31a8ff]" />
            </div>
            <div>
              <p className="text-xs text-[#8b949e]">{greeting}</p>
              <p className="text-lg font-semibold">{now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
            </div>
          </div>
          {lowItems.length > 0 && (
            <p className="text-sm text-[#8b949e]">
              <span className="text-[#31a8ff]">{lowItems.length} items</span> running low — I can help restock.
            </p>
          )}
        </div>
      </div>

      {/* Quick actions row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-[#161b22] border border-[#30363d]/50 p-3 text-center">
          <p className="text-lg font-bold text-[#31a8ff]">{dishesWithMatch.filter(d => d.pantryMatch >= 80).length}</p>
          <p className="text-[10px] text-[#8b949e]">Ready to Cook</p>
        </div>
        <div className="rounded-2xl bg-[#161b22] border border-[#30363d]/50 p-3 text-center">
          <p className="text-lg font-bold text-[#58d1ff]">{items.length}</p>
          <p className="text-[10px] text-[#8b949e]">Pantry Items</p>
        </div>
        <div className="rounded-2xl bg-[#161b22] border border-[#30363d]/50 p-3 text-center">
          <p className="text-lg font-bold text-[#f0883e]">{lowItems.length}</p>
          <p className="text-[10px] text-[#8b949e]">Low Stock</p>
        </div>
      </div>

      {/* Dish cards */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Suggested Dishes</h3>
        <div className="grid grid-cols-2 gap-3">
          {dishesWithMatch.slice(0, 8).map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DishCard({ dish }: { dish: Dish & { pantryMatch: number } }) {
  const matchColor = dish.pantryMatch >= 80 ? "text-[#3fb950] bg-[#3fb950]/10" : dish.pantryMatch >= 50 ? "text-[#f0883e] bg-[#f0883e]/10" : "text-[#f85149] bg-[#f85149]/10";

  return (
    <div className="overflow-hidden rounded-2xl bg-[#161b22] border border-[#30363d]/50 transition-transform hover:scale-[1.02] active:scale-[0.98]">
      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-[#21262d] to-[#161b22] text-4xl">
        {dish.image}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium leading-tight">{dish.name}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", matchColor)}>
            {dish.pantryMatch}%
          </span>
          <span className="rounded-full bg-[#21262d] px-2 py-0.5 text-[10px] text-[#8b949e]">
            {dish.cookTime}m
          </span>
          <span className="rounded-full bg-[#21262d] px-2 py-0.5 text-[10px] text-[#8b949e]">
            {dish.calories}kcal
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Inventory Page (Alexa Style) ─── */
function InventoryPage({ items, allItems, activeCategory, onCategoryChange, onAddToCart, onToggleAutoReorder }: {
  items: GroceryItem[]; allItems: GroceryItem[]; activeCategory: Category;
  onCategoryChange: (cat: Category) => void; onAddToCart: (id: string) => void; onToggleAutoReorder: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <nav className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1.5">
          {CATEGORIES.map((cat) => {
            const criticalCount = allItems.filter((i) => i.category === cat && i.urgency === "critical").length;
            return (
              <button key={cat} onClick={() => onCategoryChange(cat)}
                className={cn("relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all",
                  activeCategory === cat ? "bg-[#31a8ff]/15 text-[#31a8ff] border border-[#31a8ff]/30" : "bg-[#161b22] text-[#8b949e] border border-[#30363d]/50 hover:text-[#e6edf3]"
                )}>
                {cat}
                {criticalCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#f0883e] shadow-[0_0_4px_#f0883e]" />}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="space-y-2 rounded-3xl bg-[#161b22]/60 border border-[#30363d]/30 p-3">
        {items.map((item) => <ItemRow key={item.id} item={item} onAddToCart={onAddToCart} onToggleAutoReorder={onToggleAutoReorder} />)}
      </div>
    </div>
  );
}

function ItemRow({ item, onAddToCart, onToggleAutoReorder }: { item: GroceryItem; onAddToCart: (id: string) => void; onToggleAutoReorder: (id: string) => void }) {
  const isUrgent = item.urgency === "critical";
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl px-3 py-3 transition-all", isUrgent && "bg-[#f0883e]/5 border border-[#f0883e]/20")}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#21262d] text-2xl">{item.image}</div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{item.name}</span>
        <div className="flex items-center gap-3 text-[11px] text-[#8b949e]">
          {item.dishesUsedIn > 0 && <span>🍽 {item.dishesUsedIn} Dishes</span>}
          <span className={cn(isUrgent && "text-[#f0883e] font-medium")}>⏳ {item.daysUntilOutLabel}</span>
        </div>
      </div>
      <button onClick={() => onToggleAutoReorder(item.id)}
        className={cn("rounded-full p-1.5 transition-colors", item.autoReorder ? "bg-[#31a8ff]/20 text-[#31a8ff]" : "text-[#484f58] hover:text-[#8b949e]")}
        aria-label={`Toggle auto-reorder for ${item.name}`}>
        <Zap className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => onAddToCart(item.id)} disabled={item.inCart}
        className={cn("flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all",
          item.inCart ? "bg-[#3fb950]/15 text-[#3fb950]" : isUrgent ? "bg-[#f0883e] text-white hover:bg-[#f0883e]/80" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-white"
        )}>
        {item.inCart ? <><Check className="h-3 w-3" /> Added</> : <><ShoppingCart className="h-3 w-3" /> Add</>}
      </button>
    </div>
  );
}

/* ─── Routine Page (Alexa Style, full-height tiles) ─── */
function RoutinePage({ routines, onUpdate, onAdd }: { routines: MealRoutine[]; onUpdate: (id: string, updates: Partial<MealRoutine>) => void; onAdd: () => void }) {
  return (
    <div className="space-y-4">
      {routines.map((routine) => <RoutineCard key={routine.id} routine={routine} onUpdate={onUpdate} />)}
      <div className="flex justify-end">
        <button onClick={onAdd} className="flex items-center gap-2 rounded-full bg-[#161b22] border border-[#30363d]/50 px-4 py-2.5 text-sm font-medium text-[#8b949e] hover:text-white hover:border-[#31a8ff]/30">
          <Plus className="h-4 w-4" /> Add Meal
        </button>
      </div>
    </div>
  );
}

function RoutineCard({ routine, onUpdate }: { routine: MealRoutine; onUpdate: (id: string, updates: Partial<MealRoutine>) => void }) {
  function toggleDay(dayIdx: number) {
    const newDays = [...routine.activeDays];
    newDays[dayIdx] = !newDays[dayIdx];
    onUpdate(routine.id, { activeDays: newDays });
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#30363d]/50" style={{ height: "calc(100vh - 220px)", minHeight: "360px" }}>
      {/* Alexa-style gradient bg with blue glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#161b22] to-[#0d1117]" />
      <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#31a8ff]/8 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#31a8ff]/5 blur-2xl" />

      <div className="relative flex h-full flex-col justify-between p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-[#31a8ff]">{routine.mealType}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{routine.startTime} - {routine.endTime}</p>
            {routine.calorieTarget && <p className="mt-2 text-sm text-[#8b949e]">🎯 {routine.calorieTarget} kcal target</p>}
          </div>
          <span className="text-5xl">{routine.emoji}</span>
        </div>

        <div className="space-y-3">
          {routine.notes && (
            <div className="rounded-2xl bg-[#21262d]/80 border border-[#30363d]/50 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs text-[#8b949e]">Your habit</p>
              <p className="mt-0.5 text-sm">{routine.notes}</p>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl bg-[#31a8ff]/5 border border-[#31a8ff]/20 px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-[#31a8ff] shadow-[0_0_6px_#31a8ff] animate-pulse" />
            <p className="text-xs text-[#8b949e]">Alexa auto-orders ingredients for this meal</p>
            <span className="ml-auto text-[10px] font-medium text-[#3fb950]">Active</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {DAY_LABELS.map((day, idx) => (
              <button key={idx} onClick={() => toggleDay(idx)}
                className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all",
                  routine.activeDays[idx] ? "bg-[#31a8ff] text-white shadow-[0_0_10px_#31a8ff50]" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]"
                )}>{day}</button>
            ))}
          </div>
          <div className="flex justify-end">
            <button className="flex items-center gap-2 rounded-full bg-[#21262d] border border-[#30363d]/50 px-4 py-2 text-sm font-medium text-[#8b949e] hover:text-white hover:border-[#31a8ff]/30">
              <Edit3 className="h-3.5 w-3.5" /> Edit Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Alexa Page ─── */
function AlexaPage({ connection, rules, onToggleRule, onUpdateConnection, onTriggerOrder }: {
  connection: AlexaConnection; rules: AlexaOrderRule[]; onToggleRule: (id: string) => void;
  onUpdateConnection: (updates: Partial<AlexaConnection>) => void; onTriggerOrder: () => void;
}) {
  const dueItems = getItemsDueForOrder(rules);
  const enabledRules = rules.filter((r) => r.enabled);

  return (
    <div className="space-y-4">
      {/* Connection card with Alexa ring glow */}
      <div className="relative overflow-hidden rounded-3xl bg-[#161b22] border border-[#30363d]/50 p-6">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-[#31a8ff]/15 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#0d1117] border-2 border-[#31a8ff] shadow-[0_0_20px_#31a8ff40]">
            <Mic className="h-6 w-6 text-[#31a8ff]" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#3fb950] border-2 border-[#161b22]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Alexa + Amazon Fresh</p>
            <p className="text-sm text-[#8b949e]">{connection.accountName} · Connected</p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-[#0d1117] border border-[#30363d]/50 p-3 text-center">
            <p className="text-xl font-bold text-[#31a8ff]">{enabledRules.length}</p>
            <p className="text-[10px] text-[#8b949e]">Auto Items</p>
          </div>
          <div className="rounded-2xl bg-[#0d1117] border border-[#30363d]/50 p-3 text-center">
            <p className="text-xl font-bold text-[#f0883e]">{dueItems.length}</p>
            <p className="text-[10px] text-[#8b949e]">Due Today</p>
          </div>
          <div className="rounded-2xl bg-[#0d1117] border border-[#30363d]/50 p-3 text-center">
            <p className="text-xl font-bold text-[#3fb950]">${connection.orderHistory.slice(0, 4).reduce((s, o) => s + o.total, 0).toFixed(0)}</p>
            <p className="text-[10px] text-[#8b949e]">This Month</p>
          </div>
        </div>

        <div className="relative mt-4 flex gap-2">
          <button onClick={() => onUpdateConnection({ voiceOrderingEnabled: !connection.voiceOrderingEnabled })}
            className={cn("flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-xs font-medium transition-all border",
              connection.voiceOrderingEnabled ? "bg-[#31a8ff]/10 border-[#31a8ff]/30 text-[#31a8ff]" : "bg-[#21262d] border-[#30363d]/50 text-[#8b949e]"
            )}>
            <Mic className="h-3.5 w-3.5" /> Voice {connection.voiceOrderingEnabled ? "ON" : "OFF"}
          </button>
          <button onClick={() => onUpdateConnection({ autoOrderEnabled: !connection.autoOrderEnabled })}
            className={cn("flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-xs font-medium transition-all border",
              connection.autoOrderEnabled ? "bg-[#31a8ff]/10 border-[#31a8ff]/30 text-[#31a8ff]" : "bg-[#21262d] border-[#30363d]/50 text-[#8b949e]"
            )}>
            <Zap className="h-3.5 w-3.5" /> Auto {connection.autoOrderEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {dueItems.length > 0 && (
        <div className="rounded-2xl border border-[#f0883e]/30 bg-[#f0883e]/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#f0883e]">{dueItems.length} items ready</p>
              <p className="text-xs text-[#8b949e]">{dueItems.map((i) => i.itemName).join(", ")}</p>
            </div>
            <button onClick={onTriggerOrder} className="rounded-xl bg-[#31a8ff] px-4 py-2 text-xs font-bold text-white shadow-[0_0_8px_#31a8ff40]">Order Now</button>
          </div>
        </div>
      )}

      {/* Rules */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">AI Auto-Order Rules</h3>
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
              rule.enabled ? "bg-[#161b22] border-[#30363d]/50" : "bg-[#0d1117] border-[#21262d] opacity-50"
            )}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{rule.itemName}</span>
                  {rule.preferredBrand && <span className="text-[10px] text-[#8b949e]">{rule.preferredBrand}</span>}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#8b949e]">
                  <span>Every {rule.learnedInterval}d</span><span>·</span><span>{rule.quantity} {rule.unit}</span><span>·</span>
                  <span className="text-[#3fb950]">{Math.round(rule.confidenceScore * 100)}%</span>
                </div>
              </div>
              <button onClick={() => onToggleRule(rule.id)}
                className={cn("relative h-6 w-11 rounded-full transition-colors", rule.enabled ? "bg-[#31a8ff]" : "bg-[#21262d]")}
                role="switch" aria-checked={rule.enabled}>
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", rule.enabled ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Order history */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Recent Orders</h3>
        <div className="space-y-2">
          {connection.orderHistory.slice(0, 5).map((order) => (
            <div key={order.id} className="flex items-center gap-3 rounded-2xl bg-[#161b22] border border-[#30363d]/30 px-4 py-3">
              <span className="text-lg">{order.triggeredBy === "voice" ? "🎙" : order.triggeredBy === "auto" ? "🤖" : "👆"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{order.items.join(", ")}</p>
                <p className="text-[10px] text-[#8b949e]">{order.date} · {order.triggeredBy}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">${order.total.toFixed(2)}</p>
                <p className={cn("text-[10px]", order.status === "delivered" ? "text-[#3fb950]" : "text-[#31a8ff]")}>{order.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-[#161b22] border border-[#30363d]/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wifi className="h-4 w-4 text-[#31a8ff]" />
          <p className="text-sm font-semibold">How PantryPilot Learns</p>
        </div>
        <ul className="space-y-1.5 text-xs text-[#8b949e]">
          <li>• Tracks purchase intervals to predict restock dates</li>
          <li>• Remembers preferred brands from repeat orders</li>
          <li>• Syncs with Alexa: "Alexa, restock my kitchen"</li>
          <li>• Budget limit: ${connection.spendingLimit}/order</li>
        </ul>
      </div>
    </div>
  );
}

/* ─── Cart Panel (Alexa Style) ─── */
function CartPanel({ cart, onRemove, onBack }: { cart: GroceryItem[]; onRemove: (id: string) => void; onBack: () => void }) {
  const [ordered, setOrdered] = useState(false);
  function handleOrder() {
    const query = cart.map((i) => `${i.preferredBrand ? i.preferredBrand + " " : ""}${i.name}`).join(", ");
    window.open(`https://www.instacart.com/store/search/${encodeURIComponent(query)}`, "_blank");
    setOrdered(true);
  }
  return (
    <div className="flex min-h-dvh flex-col bg-[#0d1117] text-[#e6edf3]">
      <header className="flex items-center gap-3 px-5 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-full bg-[#161b22] border border-[#30363d]/50 px-3 py-1.5 text-sm text-[#8b949e] hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="flex-1 text-center font-semibold">Cart ({cart.length})</h2>
        <div className="w-16" />
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-8">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-[#8b949e]">
            <ShoppingCart className="h-12 w-12 opacity-40" />
            <p className="text-sm">Your cart is empty</p>
          </div>
        ) : ordered ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3fb950]/15 shadow-[0_0_20px_#3fb95040]">
              <Check className="h-8 w-8 text-[#3fb950]" />
            </div>
            <p className="font-medium">Order placed!</p>
            <p className="text-sm text-[#8b949e]">Redirected to delivery service</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#161b22] border border-[#30363d]/30 px-4 py-3">
                <span className="text-2xl">{item.image}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-[#8b949e]">{item.quantity} {item.unit}{item.preferredBrand && ` · ${item.preferredBrand}`}</p>
                </div>
                <button onClick={() => onRemove(item.id)} className="rounded-xl bg-[#f85149]/10 border border-[#f85149]/20 px-2.5 py-1 text-xs text-[#f85149]">Remove</button>
              </div>
            ))}
            <button onClick={handleOrder} className="mt-6 w-full rounded-2xl bg-[#31a8ff] py-3.5 text-sm font-bold text-white shadow-[0_0_12px_#31a8ff40] hover:bg-[#31a8ff]/90">
              Place Order via Amazon Fresh →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Settings Panel (Alexa Style) ─── */
function SettingsPanel({ preferences, onUpdate, items, onToggleAutoReorder, onBack }: {
  preferences: UserPreferences; onUpdate: (updates: Partial<UserPreferences>) => void;
  items: GroceryItem[]; onToggleAutoReorder: (id: string) => void; onBack: () => void;
}) {
  const autoReorderItems = items.filter((i) => i.autoReorder);
  return (
    <div className="flex min-h-dvh flex-col bg-[#0d1117] text-[#e6edf3]">
      <header className="flex items-center gap-3 px-5 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-full bg-[#161b22] border border-[#30363d]/50 px-3 py-1.5 text-sm text-[#8b949e] hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="flex-1 text-center font-semibold">Settings</h2>
        <div className="w-16" />
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Automation</h3>
          <ToggleRow label="Auto-reorder enabled" description="Manage items marked for auto-reorder" checked={preferences.autoReorderEnabled} onChange={(v) => onUpdate({ autoReorderEnabled: v })} />
          <ToggleRow label="Auto-add critical items" description="Critical items added to cart automatically" checked={preferences.autoAddCritical} onChange={(v) => onUpdate({ autoAddCritical: v })} />
          <div className="rounded-2xl bg-[#161b22] border border-[#30363d]/50 p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Urgency threshold</p><p className="text-xs text-[#8b949e]">Days before flagging</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdate({ urgencyThresholdDays: Math.max(1, preferences.urgencyThresholdDays - 1) })} className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#21262d] text-sm hover:bg-[#30363d]">−</button>
                <span className="w-6 text-center font-bold">{preferences.urgencyThresholdDays}</span>
                <button onClick={() => onUpdate({ urgencyThresholdDays: preferences.urgencyThresholdDays + 1 })} className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#21262d] text-sm hover:bg-[#30363d]">+</button>
              </div>
            </div>
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Robin Voice & Privacy</h3>
          <ToggleRow label="Voice activation" description="Say 'Hey Robin' to wake up" checked={preferences.robinVoiceEnabled} onChange={(v) => onUpdate({ robinVoiceEnabled: v })} />
          <div className="rounded-2xl bg-[#161b22] border border-[#30363d]/50 p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Auto-sleep timeout</p><p className="text-xs text-[#8b949e]">Seconds before Robin stops listening (privacy)</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdate({ robinSleepTimeout: Math.max(1, preferences.robinSleepTimeout - 1) })} className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#21262d] text-sm hover:bg-[#30363d]">−</button>
                <span className="w-6 text-center font-bold">{preferences.robinSleepTimeout}s</span>
                <button onClick={() => onUpdate({ robinSleepTimeout: Math.min(30, preferences.robinSleepTimeout + 1) })} className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#21262d] text-sm hover:bg-[#30363d]">+</button>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-[#161b22] border border-[#30363d]/30 p-3">
            <p className="text-xs text-[#8b949e]">🔒 Robin auto-sleeps after {preferences.robinSleepTimeout}s of silence. Voice data is never stored or sent externally — all processing happens in your browser.</p>
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Notifications</h3>
          <ToggleRow label="Low stock alerts" description="Notify when items running low" checked={preferences.notifications.lowStock} onChange={(v) => onUpdate({ notifications: { ...preferences.notifications, lowStock: v } })} />
          <ToggleRow label="Auto-order confirmation" description="Notify when items auto-added" checked={preferences.notifications.autoOrderConfirmation} onChange={(v) => onUpdate({ notifications: { ...preferences.notifications, autoOrderConfirmation: v } })} />
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Auto-Reorder Items ({autoReorderItems.length})</h3>
          {autoReorderItems.length === 0 ? (
            <p className="rounded-2xl bg-[#161b22] border border-[#30363d]/30 p-4 text-center text-sm text-[#8b949e]">Tap ⚡ on any item to enable.</p>
          ) : (
            <div className="space-y-2">
              {autoReorderItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#31a8ff]/5 border border-[#31a8ff]/20 px-4 py-3">
                  <span className="text-xl">{item.image}</span>
                  <div className="flex-1"><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-[#8b949e]">Every ~{item.avgConsumptionDays}d{item.preferredBrand && ` · ${item.preferredBrand}`}</p></div>
                  <button onClick={() => onToggleAutoReorder(item.id)} className="rounded-xl bg-[#f85149]/10 border border-[#f85149]/20 px-2 py-1 text-xs text-[#f85149]">Remove</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ─── Toggle Row (Alexa Style) ─── */
function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#161b22] border border-[#30363d]/50 p-4">
      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-[#8b949e]">{description}</p></div>
      <button onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 rounded-full transition-colors", checked ? "bg-[#31a8ff]" : "bg-[#21262d]")}
        role="switch" aria-checked={checked} aria-label={label}>
        <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}
