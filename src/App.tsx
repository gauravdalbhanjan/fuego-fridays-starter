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

type NavTab = "menu" | "inventory" | "routine" | "events" | "homepulse";

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

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (preferences.themeMode === "light") root.classList.add("light");
    else if (preferences.themeMode === "dark") root.classList.add("dark");
    else {
      // System preference
      if (window.matchMedia("(prefers-color-scheme: light)").matches) root.classList.add("light");
      else root.classList.add("dark");
    }
  }, [preferences.themeMode]);

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
    function handleTheme(e: Event) {
      const mode = (e as CustomEvent).detail as "light" | "dark" | "system";
      updatePreferences({ themeMode: mode });
    }
    window.addEventListener("robin-navigate", handleNavigate);
    window.addEventListener("robin-cart-add", handleCartAdd);
    window.addEventListener("robin-theme", handleTheme);
    return () => {
      window.removeEventListener("robin-navigate", handleNavigate);
      window.removeEventListener("robin-cart-add", handleCartAdd);
      window.removeEventListener("robin-theme", handleTheme);
    };
  }, [items, addToCart, updatePreferences]);

  if (showSettings) {
    return <SettingsPanel preferences={preferences} onUpdate={updatePreferences} items={items} onToggleAutoReorder={toggleAutoReorder} onBack={() => setShowSettings(false)} />;
  }
  if (showCart) {
    return <CartPanel cart={cart} onRemove={removeFromCart} onBack={() => setShowCart(false)} />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {showAutoNotification && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#31a8ff]/30">
            <Zap className="h-4 w-4" />
            Auto-added: {autoAddedItems.join(", ")}
          </div>
        </div>
      )}

      {/* Header — Alexa style minimal */}
      <header className="flex items-center justify-between px-5 py-4">
        <button onClick={() => setShowSettings(true)} className="rounded-full bg-card p-2.5 text-muted-foreground hover:text-white transition-colors">
          <Settings className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#31a8ff]" />
          <h1 className="font-display text-base font-semibold tracking-tight">PantryPilot</h1>
        </div>
        <button onClick={() => setShowCart(true)} className="relative rounded-full bg-card p-2.5 text-muted-foreground hover:text-white transition-colors" aria-label="Cart">
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-[0_0_6px_#31a8ff]">{cartCount}</span>
          )}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        {activeNav === "menu" && <MenuPage items={items} availableItemNames={availableItemNames} />}
        {activeNav === "inventory" && <InventoryPage items={filteredItems} allItems={items} activeCategory={activeCategory} onCategoryChange={setActiveCategory} onAddToCart={addToCart} onToggleAutoReorder={toggleAutoReorder} />}
        {activeNav === "routine" && <RoutinePage routines={routines} onUpdate={updateRoutine} onAdd={addRoutine} />}
        {activeNav === "events" && <AlexaPage connection={alexaConn} rules={alexaRules} onToggleRule={toggleAlexaRule} onUpdateConnection={updateAlexaConn} onTriggerOrder={triggerAlexaOrder} />}
        {activeNav === "homepulse" && <HomePulsePage />}
      </main>

      {/* Sous Chef */}
      <SousChefChat lowStockCount={items.filter((i) => i.urgency === "critical").length} robinSleepTimeout={preferences.robinSleepTimeout} robinVoiceEnabled={preferences.robinVoiceEnabled} voiceKey={preferences.voiceActivationKey} />

      {/* Bottom nav — Alexa device style */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 px-4 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md justify-around">
          {([
            { id: "menu" as NavTab, icon: "⊞", label: "Menu" },
            { id: "inventory" as NavTab, icon: "🛒", label: "Inventory" },
            { id: "routine" as NavTab, icon: "📅", label: "Routine" },
            { id: "events" as NavTab, icon: "🔵", label: "Alexa" },
          ]).map((tab) => (
            <button key={tab.id} onClick={() => setActiveNav(tab.id)}
              className={cn("flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs transition-all",
                activeNav === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              <span className="text-lg">{tab.icon}</span>
              <span className={cn("font-medium", activeNav === tab.id && "text-primary")}>{tab.label}</span>
              {activeNav === tab.id && <span className="absolute bottom-1 h-0.5 w-6 rounded-full bg-primary shadow-[0_0_4px_#31a8ff]" />}
            </button>
          ))}
          {/* HomePulse button */}
          <button onClick={() => setActiveNav("homepulse")} className={cn("flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs transition-all", activeNav === "homepulse" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
            <img src="/homepulse-icon.png" alt="HomePulse" className="h-6 w-6 rounded-full object-cover" />
            <span className={cn("font-medium", activeNav === "homepulse" && "text-primary")}>HomePulse</span>
          </button>
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
      <div className="relative overflow-hidden rounded-3xl bg-card p-6 border border-border">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 shadow-[0_0_12px_#31a8ff40]">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{greeting}</p>
              <p className="text-lg font-semibold">{now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
            </div>
          </div>
          {lowItems.length > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="text-primary">{lowItems.length} items</span> running low — I can help restock.
            </p>
          )}
        </div>
      </div>

      {/* Quick actions row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-card border border-border/50 p-3 text-center">
          <p className="text-lg font-bold text-primary">{dishesWithMatch.filter(d => d.pantryMatch >= 80).length}</p>
          <p className="text-[10px] text-muted-foreground">Ready to Cook</p>
        </div>
        <div className="rounded-2xl bg-card border border-border/50 p-3 text-center">
          <p className="text-lg font-bold text-[#58d1ff]">{items.length}</p>
          <p className="text-[10px] text-muted-foreground">Pantry Items</p>
        </div>
        <div className="rounded-2xl bg-card border border-border/50 p-3 text-center">
          <p className="text-lg font-bold text-[#f0883e]">{lowItems.length}</p>
          <p className="text-[10px] text-muted-foreground">Low Stock</p>
        </div>
      </div>

      {/* Dish cards */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested Dishes</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" style={{ gridAutoRows: "350px" }}>
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
  const isImagePath = dish.image.startsWith("/");

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border transition-transform hover:scale-[1.01] active:scale-[0.99] h-[350px]">
      <div className="absolute inset-0 overflow-hidden bg-muted">
        {isImagePath ? (
          <img src={dish.image} alt={dish.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">{dish.image}</div>
        )}
      </div>
      {/* Overlay info at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
        <p className="text-base font-semibold text-white">{dish.name}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", matchColor)}>{dish.pantryMatch}%</span>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs text-white">{dish.cookTime}m</span>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs text-white">{dish.calories}kcal</span>
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
                  activeCategory === cat ? "bg-primary/15 text-primary border border-primary/30" : "bg-card text-muted-foreground border border-border/50 hover:text-foreground"
                )}>
                {cat}
                {criticalCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#f0883e] shadow-[0_0_4px_#f0883e]" />}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="space-y-2 rounded-3xl bg-card/60 border border-border/30 p-3">
        {items.map((item) => <ItemRow key={item.id} item={item} onAddToCart={onAddToCart} onToggleAutoReorder={onToggleAutoReorder} />)}
      </div>
    </div>
  );
}

function ItemRow({ item, onAddToCart, onToggleAutoReorder }: { item: GroceryItem; onAddToCart: (id: string) => void; onToggleAutoReorder: (id: string) => void }) {
  const isUrgent = item.urgency === "critical";
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl px-3 py-3 transition-all", isUrgent && "bg-[#f0883e]/5 border border-[#f0883e]/20")}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted overflow-hidden text-2xl">
        {item.image.startsWith("/") ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : item.image}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{item.name}</span>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {item.dishesUsedIn > 0 && <span>🍽 {item.dishesUsedIn} Dishes</span>}
          <span className={cn(isUrgent && "text-[#f0883e] font-medium")}>⏳ {item.daysUntilOutLabel}</span>
        </div>
      </div>
      <button onClick={() => onToggleAutoReorder(item.id)}
        className={cn("rounded-full p-1.5 transition-colors", item.autoReorder ? "bg-primary/20 text-primary" : "text-[#484f58] hover:text-muted-foreground")}
        aria-label={`Toggle auto-reorder for ${item.name}`}>
        <Zap className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => onAddToCart(item.id)} disabled={item.inCart}
        className={cn("flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all",
          item.inCart ? "bg-[#3fb950]/15 text-[#3fb950]" : isUrgent ? "bg-[#f0883e] text-white hover:bg-[#f0883e]/80" : "bg-muted text-muted-foreground hover:bg-[#30363d] hover:text-white"
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
        <button onClick={onAdd} className="flex items-center gap-2 rounded-full bg-card border border-border/50 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-white hover:border-primary/30">
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
    <div className="relative overflow-hidden rounded-3xl" style={{ height: "200px" }}>
      {/* Full-bleed background image */}
      {routine.image ? (
        <img src={routine.image} alt={routine.mealType} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: routine.gradient }} />
      )}
      {/* Subtle dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content — positioned at bottom */}
      <div className="relative flex h-full flex-col justify-end p-5">
        <p className="text-sm font-medium text-white/80">{routine.mealType}</p>
        <p className="text-3xl font-bold text-white tracking-tight">{routine.startTime} - {routine.endTime}</p>

        {/* Day selector + Edit Plan */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {DAY_LABELS.map((day, idx) => (
              <button key={idx} onClick={() => toggleDay(idx)}
                className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                  routine.activeDays[idx] ? "bg-white text-black" : "bg-white/20 text-white/60"
                )}>{day}</button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/25">
            <Edit3 className="h-3 w-3" /> Edit Plan
          </button>
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
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-6">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-background border-2 border-primary shadow-[0_0_20px_#31a8ff40]">
            <Mic className="h-6 w-6 text-primary" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#3fb950] border-2 border-[#161b22]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Alexa + Amazon Fresh</p>
            <p className="text-sm text-muted-foreground">{connection.accountName} · Connected</p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-background border border-border/50 p-3 text-center">
            <p className="text-xl font-bold text-primary">{enabledRules.length}</p>
            <p className="text-[10px] text-muted-foreground">Auto Items</p>
          </div>
          <div className="rounded-2xl bg-background border border-border/50 p-3 text-center">
            <p className="text-xl font-bold text-[#f0883e]">{dueItems.length}</p>
            <p className="text-[10px] text-muted-foreground">Due Today</p>
          </div>
          <div className="rounded-2xl bg-background border border-border/50 p-3 text-center">
            <p className="text-xl font-bold text-[#3fb950]">${connection.orderHistory.slice(0, 4).reduce((s, o) => s + o.total, 0).toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">This Month</p>
          </div>
        </div>

        <div className="relative mt-4 flex gap-2">
          <button onClick={() => onUpdateConnection({ voiceOrderingEnabled: !connection.voiceOrderingEnabled })}
            className={cn("flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-xs font-medium transition-all border",
              connection.voiceOrderingEnabled ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border/50 text-muted-foreground"
            )}>
            <Mic className="h-3.5 w-3.5" /> Voice {connection.voiceOrderingEnabled ? "ON" : "OFF"}
          </button>
          <button onClick={() => onUpdateConnection({ autoOrderEnabled: !connection.autoOrderEnabled })}
            className={cn("flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-xs font-medium transition-all border",
              connection.autoOrderEnabled ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border/50 text-muted-foreground"
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
              <p className="text-xs text-muted-foreground">{dueItems.map((i) => i.itemName).join(", ")}</p>
            </div>
            <button onClick={onTriggerOrder} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-[0_0_8px_#31a8ff40]">Order Now</button>
          </div>
        </div>
      )}

      {/* Rules */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Auto-Order Rules</h3>
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
              rule.enabled ? "bg-card border-border/50" : "bg-background border-[#21262d] opacity-50"
            )}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{rule.itemName}</span>
                  {rule.preferredBrand && <span className="text-[10px] text-muted-foreground">{rule.preferredBrand}</span>}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>Every {rule.learnedInterval}d</span><span>·</span><span>{rule.quantity} {rule.unit}</span><span>·</span>
                  <span className="text-[#3fb950]">{Math.round(rule.confidenceScore * 100)}%</span>
                </div>
              </div>
              <button onClick={() => onToggleRule(rule.id)}
                className={cn("relative h-6 w-11 rounded-full transition-colors", rule.enabled ? "bg-primary" : "bg-muted")}
                role="switch" aria-checked={rule.enabled}>
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", rule.enabled ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Order history */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Orders</h3>
        <div className="space-y-2">
          {connection.orderHistory.slice(0, 5).map((order) => (
            <div key={order.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border/30 px-4 py-3">
              <span className="text-lg">{order.triggeredBy === "voice" ? "🎙" : order.triggeredBy === "auto" ? "🤖" : "👆"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{order.items.join(", ")}</p>
                <p className="text-[10px] text-muted-foreground">{order.date} · {order.triggeredBy}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">${order.total.toFixed(2)}</p>
                <p className={cn("text-[10px]", order.status === "delivered" ? "text-[#3fb950]" : "text-primary")}>{order.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wifi className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">How PantryPilot Learns</p>
        </div>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
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
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 px-5 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-full bg-card border border-border/50 px-3 py-1.5 text-sm text-muted-foreground hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="flex-1 text-center font-semibold">Cart ({cart.length})</h2>
        <div className="w-16" />
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-8">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 opacity-40" />
            <p className="text-sm">Your cart is empty</p>
          </div>
        ) : ordered ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3fb950]/15 shadow-[0_0_20px_#3fb95040]">
              <Check className="h-8 w-8 text-[#3fb950]" />
            </div>
            <p className="font-medium">Order placed!</p>
            <p className="text-sm text-muted-foreground">Redirected to delivery service</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border/30 px-4 py-3">
                <span className="text-2xl">{item.image}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}{item.preferredBrand && ` · ${item.preferredBrand}`}</p>
                </div>
                <button onClick={() => onRemove(item.id)} className="rounded-xl bg-[#f85149]/10 border border-[#f85149]/20 px-2.5 py-1 text-xs text-[#f85149]">Remove</button>
              </div>
            ))}
            <button onClick={handleOrder} className="mt-6 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-[0_0_12px_#31a8ff40] hover:bg-primary/90">
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
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 px-5 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-full bg-card border border-border/50 px-3 py-1.5 text-sm text-muted-foreground hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="flex-1 text-center font-semibold">Settings</h2>
        <div className="w-16" />
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Automation</h3>
          <ToggleRow label="Auto-reorder enabled" description="Manage items marked for auto-reorder" checked={preferences.autoReorderEnabled} onChange={(v) => onUpdate({ autoReorderEnabled: v })} />
          <ToggleRow label="Auto-add critical items" description="Critical items added to cart automatically" checked={preferences.autoAddCritical} onChange={(v) => onUpdate({ autoAddCritical: v })} />
          <div className="rounded-2xl bg-card border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Urgency threshold</p><p className="text-xs text-muted-foreground">Days before flagging</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdate({ urgencyThresholdDays: Math.max(1, preferences.urgencyThresholdDays - 1) })} className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-sm hover:bg-[#30363d]">−</button>
                <span className="w-6 text-center font-bold">{preferences.urgencyThresholdDays}</span>
                <button onClick={() => onUpdate({ urgencyThresholdDays: preferences.urgencyThresholdDays + 1 })} className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-sm hover:bg-[#30363d]">+</button>
              </div>
            </div>
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Robin Voice & Privacy</h3>
          <ToggleRow label="Voice activation" description="Hold key to talk" checked={preferences.robinVoiceEnabled} onChange={(v) => onUpdate({ robinVoiceEnabled: v })} />
          <div className="rounded-2xl bg-card border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Voice activation key</p><p className="text-xs text-muted-foreground">Key to hold for voice commands</p></div>
              <select value={preferences.voiceActivationKey} onChange={(e) => onUpdate({ voiceActivationKey: e.target.value })}
                className="rounded-lg bg-muted border border-border px-3 py-1.5 text-sm outline-none">
                <option value="Space">Spacebar</option>
                <option value="KeyR">R key</option>
                <option value="KeyV">V key</option>
                <option value="ControlLeft">Left Ctrl</option>
                <option value="ShiftLeft">Left Shift</option>
              </select>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Auto-sleep timeout</p><p className="text-xs text-muted-foreground">Seconds before Robin stops listening</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdate({ robinSleepTimeout: Math.max(1, preferences.robinSleepTimeout - 1) })} className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-sm hover:bg-[#30363d]">−</button>
                <span className="w-6 text-center font-bold">{preferences.robinSleepTimeout}s</span>
                <button onClick={() => onUpdate({ robinSleepTimeout: Math.min(30, preferences.robinSleepTimeout + 1) })} className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-sm hover:bg-[#30363d]">+</button>
              </div>
            </div>
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h3>
          <div className="rounded-2xl bg-card border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Theme</p><p className="text-xs text-muted-foreground">Alexa Echo UI style</p></div>
              <div className="flex gap-1">
                {(["system", "light", "dark"] as const).map((mode) => (
                  <button key={mode} onClick={() => onUpdate({ themeMode: mode })}
                    className={cn("rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all",
                      preferences.themeMode === mode ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-white"
                    )}>{mode}</button>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifications</h3>
          <ToggleRow label="Low stock alerts" description="Notify when items running low" checked={preferences.notifications.lowStock} onChange={(v) => onUpdate({ notifications: { ...preferences.notifications, lowStock: v } })} />
          <ToggleRow label="Auto-order confirmation" description="Notify when items auto-added" checked={preferences.notifications.autoOrderConfirmation} onChange={(v) => onUpdate({ notifications: { ...preferences.notifications, autoOrderConfirmation: v } })} />
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto-Reorder Items ({autoReorderItems.length})</h3>
          {autoReorderItems.length === 0 ? (
            <p className="rounded-2xl bg-card border border-border/30 p-4 text-center text-sm text-muted-foreground">Tap ⚡ on any item to enable.</p>
          ) : (
            <div className="space-y-2">
              {autoReorderItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3">
                  <span className="text-xl">{item.image}</span>
                  <div className="flex-1"><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">Every ~{item.avgConsumptionDays}d{item.preferredBrand && ` · ${item.preferredBrand}`}</p></div>
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
    <div className="flex items-center justify-between rounded-2xl bg-card border border-border/50 p-4">
      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>
      <button onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}
        role="switch" aria-checked={checked} aria-label={label}>
        <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}


/* ─── HomePulse Dashboard Page ─── */
function HomePulsePage() {
  const [, setDetailView] = useState<string | null>(null);

  const categories = [
    { id: "energy", name: "Energy Consumption", status: "watch", onTarget: "2/3", metrics: [{label:"Monthly Usage",value:"342 kWh",target:"300 kWh",color:"#ff9800"},{label:"Solar Generation",value:"128 kWh",target:"100 kWh",color:"#4caf50"},{label:"Cost This Month",value:"$89.40",target:"$75.00",color:"#f44336"}] },
    { id: "grocery", name: "Grocery & Food", status: "good", onTarget: "3/3", metrics: [{label:"Monthly Spend",value:"$487",target:"$550",color:"#4caf50"},{label:"Items Tracked",value:"29",target:"25",color:"#4caf50"},{label:"Waste Rate",value:"4.2%",target:"8%",color:"#4caf50"}] },
    { id: "cleaning", name: "Cleaning Supplies", status: "watch", onTarget: "1/3", metrics: [{label:"Items In Stock",value:"14",target:"20",color:"#ff9800"},{label:"Running Low",value:"3",target:"0",color:"#f44336"},{label:"Next Order",value:"5 days",target:"7 days",color:"#4caf50"}] },
    { id: "security", name: "Security Feed", status: "good", onTarget: "3/3", metrics: [{label:"Cameras Online",value:"4/4",target:"4",color:"#4caf50"},{label:"Motion Events",value:"2",target:"10",color:"#4caf50"},{label:"Storage Used",value:"67%",target:"85%",color:"#4caf50"}] },
    { id: "smart-devices", name: "Smart Devices", status: "good", onTarget: "3/3", metrics: [{label:"Connected",value:"18",target:"18",color:"#4caf50"},{label:"Firmware Updates",value:"2 pending",target:"0",color:"#ff9800"},{label:"Uptime",value:"99.9%",target:"99.5%",color:"#4caf50"}] },
  ];

  // Sort by severity
  const sorted = [...categories].sort((a, b) => {
    const p = { risk: 0, watch: 1, good: 2 };
    return (p[a.status as keyof typeof p] ?? 2) - (p[b.status as keyof typeof p] ?? 2);
  });

  const statusColors = { risk: "#f44336", watch: "#ff9800", good: "#4caf50" };
  const statusBg = { risk: "rgba(244,67,54,0.05)", watch: "rgba(255,152,0,0.05)", good: "rgba(76,175,80,0.05)" };
  const statusLabels = { risk: "AT RISK", watch: "AT RISK", good: "GOOD" };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">HomePulse Dashboard</h2>
      <p className="text-sm text-muted-foreground">Household metrics — sorted by priority</p>

      {sorted.map((cat) => (
        <div
          key={cat.id}
          className="rounded-2xl border border-border p-4 cursor-pointer hover:shadow-md transition-shadow"
          style={{ borderLeftWidth: "5px", borderLeftColor: statusColors[cat.status as keyof typeof statusColors], background: statusBg[cat.status as keyof typeof statusBg] }}
          onClick={() => setDetailView(cat.id)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{cat.name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: statusColors[cat.status as keyof typeof statusColors], color: "#fff" }}>
                {statusLabels[cat.status as keyof typeof statusLabels]}
              </span>
              <span className="text-xs text-muted-foreground">{cat.onTarget} on target</span>
            </div>
            <span className="text-xs text-primary font-medium">View Details →</span>
          </div>
          <div className="flex gap-6">
            {cat.metrics.map((m, i) => (
              <div key={i} className="text-xs">
                <span className="text-muted-foreground">{m.label}: </span>
                <span style={{ color: m.color }} className="font-semibold">{m.value}</span>
                <span className="text-muted-foreground">/{m.target}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
