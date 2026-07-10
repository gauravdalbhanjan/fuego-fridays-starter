import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  ChevronLeft,
  Settings,
  Zap,
  Check,
  Plus,
  Edit3,
  Clock,
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

  // Persist
  useEffect(() => {
    localStorage.setItem("pantrypilot_items", JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    localStorage.setItem("pantrypilot_cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    saveRoutines(routines);
  }, [routines]);
  useEffect(() => {
    saveAlexaRules(alexaRules);
  }, [alexaRules]);
  useEffect(() => {
    saveAlexaConnection(alexaConn);
  }, [alexaConn]);

  // Auto-reorder logic
  useEffect(() => {
    if (!preferences.autoReorderEnabled || !preferences.autoAddCritical) return;
    const criticalItems = items.filter(
      (item) =>
        item.autoReorder &&
        item.urgency === "critical" &&
        !item.inCart &&
        !cart.find((c) => c.id === item.id),
    );
    if (criticalItems.length > 0) {
      setCart((prev) => [...prev, ...criticalItems]);
      setItems((prev) =>
        prev.map((item) =>
          criticalItems.find((c) => c.id === item.id)
            ? { ...item, inCart: true }
            : item,
        ),
      );
      setAutoAddedItems(criticalItems.map((i) => i.name));
      setShowAutoNotification(true);
      setTimeout(() => setShowAutoNotification(false), 4000);
    }
  }, [preferences.autoReorderEnabled, preferences.autoAddCritical]);

  const addToCart = useCallback((itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || cart.find((c) => c.id === itemId)) return;
    setCart((prev) => [...prev, item]);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, inCart: true } : i)),
    );
  }, [items, cart]);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== itemId));
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, inCart: false } : i)),
    );
  }, []);

  const toggleAutoReorder = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, autoReorder: !i.autoReorder } : i,
      ),
    );
  }, []);

  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      const newPrefs = { ...preferences, ...updates };
      setPreferences(newPrefs);
      savePreferences(newPrefs);
    },
    [preferences],
  );

  const updateRoutine = useCallback((id: string, updates: Partial<MealRoutine>) => {
    setRoutines((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    );
  }, []);

  const addRoutine = useCallback(() => {
    const newRoutine: MealRoutine = {
      id: "r" + Date.now(),
      mealType: "Snack",
      startTime: "3:00 PM",
      endTime: "4:00 PM",
      activeDays: [false, true, true, true, true, true, false],
      gradient: "linear-gradient(135deg, #f97316 0%, #eab308 100%)",
      emoji: "🍽",
      preferredDishes: [],
      calorieTarget: 300,
    };
    setRoutines((prev) => [...prev, newRoutine]);
  }, []);

  const toggleAlexaRule = useCallback((ruleId: string) => {
    setAlexaRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)),
    );
  }, []);

  const updateAlexaConn = useCallback((updates: Partial<AlexaConnection>) => {
    setAlexaConn((prev) => ({ ...prev, ...updates }));
  }, []);

  const triggerAlexaOrder = useCallback(() => {
    const dueItems = getItemsDueForOrder(alexaRules);
    if (dueItems.length === 0) return;
    const log = simulateAlexaOrder(dueItems, "manual");
    setAlexaConn((prev) => ({
      ...prev,
      orderHistory: [log, ...prev.orderHistory],
    }));
  }, [alexaRules]);

  const availableItemNames = items.map((i) => i.name);
  const filteredItems = items.filter((i) => i.category === activeCategory);
  const cartCount = cart.length;

  // Settings panel
  if (showSettings) {
    return (
      <SettingsPanel
        preferences={preferences}
        onUpdate={updatePreferences}
        items={items}
        onToggleAutoReorder={toggleAutoReorder}
        onBack={() => setShowSettings(false)}
      />
    );
  }

  // Cart panel
  if (showCart) {
    return (
      <CartPanel
        cart={cart}
        onRemove={removeFromCart}
        onBack={() => setShowCart(false)}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#121212] text-white">
      {/* Auto-order notification */}
      {showAutoNotification && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-black shadow-lg">
            <Zap className="h-4 w-4" />
            Auto-added: {autoAddedItems.join(", ")}
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm backdrop-blur-sm"
        >
          <Settings className="h-4 w-4" />
        </button>
        <h1 className="font-display text-lg font-bold">PantryPilot</h1>
        <button
          onClick={() => setShowCart(true)}
          className="relative rounded-full bg-white/10 p-2 backdrop-blur-sm"
          aria-label="View cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        {activeNav === "menu" && (
          <MenuPage
            items={items}
            availableItemNames={availableItemNames}
          />
        )}
        {activeNav === "inventory" && (
          <InventoryPage
            items={filteredItems}
            allItems={items}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onAddToCart={addToCart}
            onToggleAutoReorder={toggleAutoReorder}
          />
        )}
        {activeNav === "routine" && (
          <RoutinePage
            routines={routines}
            onUpdate={updateRoutine}
            onAdd={addRoutine}
          />
        )}
        {activeNav === "events" && (
          <AlexaPage
            connection={alexaConn}
            rules={alexaRules}
            onToggleRule={toggleAlexaRule}
            onUpdateConnection={updateAlexaConn}
            onTriggerOrder={triggerAlexaOrder}
          />
        )}
      </main>

      {/* Sous Chef floating chat */}
      <SousChefChat lowStockCount={items.filter((i) => i.urgency === "critical").length} />

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0a0a0a] px-4 py-2 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md justify-around">
          {([
            { id: "menu" as NavTab, icon: "⊞", label: "Menu" },
            { id: "inventory" as NavTab, icon: "🛒", label: "Inventory" },
            { id: "routine" as NavTab, icon: "📅", label: "Routine" },
            { id: "events" as NavTab, icon: "🔵", label: "Alexa AI" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveNav(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs transition-all",
                activeNav === tab.id
                  ? "bg-white/15 text-white"
                  : "text-white/50",
              )}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ─── Menu Page ─── */
function MenuPage({
  items,
  availableItemNames,
}: {
  items: GroceryItem[];
  availableItemNames: string[];
}) {
  // Calculate pantry match for each dish and sort by match
  const dishesWithMatch = DISHES.map((dish) => ({
    ...dish,
    pantryMatch: calculatePantryMatch(dish, availableItemNames),
  })).sort((a, b) => b.pantryMatch - a.pantryMatch);

  const now = new Date();
  const hours = now.getHours();
  const greeting =
    hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";

  // Mock to-do items
  const todos = [
    { text: "Meal prep for Monday", time: null },
    { text: "Defrost chicken", time: "12:20 PM", urgent: true },
    { text: "Get Grocery", time: null },
    { text: "Check pantry expiry", time: "8:00 PM", urgent: false },
  ];

  // Daily tips based on pantry
  const lowItems = items.filter((i) => i.urgency === "critical");
  const tips = [
    lowItems.length > 0
      ? `${lowItems[0].name} is running low — use it today!`
      : "Your pantry is well stocked 👌",
    "Store bananas separately to slow ripening",
    "Freeze bread if not using within 3 days",
  ];

  return (
    <div className="space-y-4">
      {/* Top widgets row */}
      <div className="grid grid-cols-3 gap-2">
        {/* Set Time / Greeting card */}
        <div
          className="col-span-1 flex flex-col justify-end rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            minHeight: "120px",
          }}
        >
          <Clock className="mb-2 h-8 w-8 text-white/80" />
          <p className="text-xs text-white/70">{greeting}</p>
          <p className="text-lg font-bold text-white">
            {now.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* To Do List */}
        <div className="col-span-1 rounded-2xl bg-amber-100 p-3 text-black">
          <p className="text-xs font-bold">To Do List:</p>
          <ul className="mt-1 space-y-0.5">
            {todos.map((todo, idx) => (
              <li key={idx} className="flex items-center gap-1 text-[10px]">
                <span>•</span>
                <span className="truncate">{todo.text}</span>
                {todo.time && (
                  <span
                    className={cn(
                      "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium",
                      todo.urgent
                        ? "bg-red-500 text-white"
                        : "bg-white/60 text-black",
                    )}
                  >
                    {todo.time}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Daily Tips */}
        <div className="col-span-1 rounded-2xl bg-amber-50 p-3 text-black">
          <p className="text-xs font-bold">Daily Tips</p>
          <ul className="mt-1 space-y-1">
            {tips.slice(0, 2).map((tip, idx) => (
              <li key={idx} className="text-[10px] leading-tight text-gray-700">
                • {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dish cards grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {dishesWithMatch.map((dish) => (
          <DishCard key={dish.id} dish={dish} />
        ))}
      </div>
    </div>
  );
}

/* ─── Dish Card ─── */
function DishCard({ dish }: { dish: Dish & { pantryMatch: number } }) {
  const matchColor =
    dish.pantryMatch >= 80
      ? "bg-green-600"
      : dish.pantryMatch >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-[#1a1a1a] transition-transform hover:scale-[1.02]">
      {/* Image area */}
      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] text-5xl sm:h-36">
        {dish.image}
      </div>

      {/* Info overlay */}
      <div className="p-2.5">
        <p className="text-sm font-semibold leading-tight">{dish.name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {/* Pantry match badge */}
          <span
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white",
              matchColor,
            )}
          >
            🧊 {dish.pantryMatch}%
          </span>
          {/* Cook time */}
          <span className="flex items-center gap-0.5 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">
            ⏱ {dish.cookTime} mins
          </span>
          {/* Calories */}
          <span className="flex items-center gap-0.5 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">
            ⚡ {dish.calories} kcal
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Inventory Page ─── */
function InventoryPage({
  items,
  allItems,
  activeCategory,
  onCategoryChange,
  onAddToCart,
  onToggleAutoReorder,
}: {
  items: GroceryItem[];
  allItems: GroceryItem[];
  activeCategory: Category;
  onCategoryChange: (cat: Category) => void;
  onAddToCart: (id: string) => void;
  onToggleAutoReorder: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <nav className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => {
            const catItems = allItems.filter((i) => i.category === cat);
            const criticalCount = catItems.filter(
              (i) => i.urgency === "critical",
            ).length;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={cn(
                  "relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  activeCategory === cat
                    ? "text-white underline underline-offset-4 decoration-2"
                    : "text-white/50 hover:text-white/70",
                )}
              >
                {cat}
                {criticalCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Items list */}
      <div className="space-y-1.5 rounded-2xl bg-[#1a2e1a]/80 p-2">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onAddToCart={onAddToCart}
            onToggleAutoReorder={onToggleAutoReorder}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Item Row ─── */
function ItemRow({
  item,
  onAddToCart,
  onToggleAutoReorder,
}: {
  item: GroceryItem;
  onAddToCart: (id: string) => void;
  onToggleAutoReorder: (id: string) => void;
}) {
  const isUrgent = item.urgency === "critical";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
        isUrgent && "bg-[#2a3d1a]",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xl">
        {item.image}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold">{item.name}</span>
        <div className="flex items-center gap-3 text-[11px] text-white/50">
          {item.dishesUsedIn > 0 && <span>🍽 {item.dishesUsedIn} Dishes</span>}
          <span className={cn(isUrgent && "text-amber-400 font-medium")}>
            ⏳ {item.daysUntilOutLabel}
          </span>
        </div>
      </div>
      <button
        onClick={() => onToggleAutoReorder(item.id)}
        className={cn(
          "rounded-full p-1.5 transition-colors",
          item.autoReorder
            ? "bg-amber-500/20 text-amber-400"
            : "text-white/30 hover:text-white/50",
        )}
        aria-label={`Toggle auto-reorder for ${item.name}`}
      >
        <Zap className="h-3 w-3" />
      </button>
      <button
        onClick={() => onAddToCart(item.id)}
        disabled={item.inCart}
        className={cn(
          "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all",
          item.inCart
            ? "bg-green-600/30 text-green-400"
            : isUrgent
              ? "bg-amber-500 text-black hover:bg-amber-400"
              : "bg-white/10 text-white/70 hover:bg-white/20",
        )}
      >
        {item.inCart ? (
          <>
            <Check className="h-3 w-3" /> In cart
          </>
        ) : (
          <>
            <ShoppingCart className="h-3 w-3" /> Add to cart
          </>
        )}
      </button>
    </div>
  );
}

/* ─── Routine Page ─── */
function RoutinePage({
  routines,
  onUpdate,
  onAdd,
}: {
  routines: MealRoutine[];
  onUpdate: (id: string, updates: Partial<MealRoutine>) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 -mx-4 px-4">
      {/* Full-screen swipeable cards */}
      <div className="space-y-4">
        {routines.map((routine) => (
          <RoutineCard key={routine.id} routine={routine} onUpdate={onUpdate} />
        ))}
      </div>

      {/* Add button */}
      <div className="flex justify-end px-0 pb-4">
        <button
          onClick={onAdd}
          className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/15"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>
  );
}

/* ─── Routine Card (Full-screen fit) ─── */
function RoutineCard({
  routine,
  onUpdate,
}: {
  routine: MealRoutine;
  onUpdate: (id: string, updates: Partial<MealRoutine>) => void;
}) {
  const [editing, setEditing] = useState(false);

  function toggleDay(dayIdx: number) {
    const newDays = [...routine.activeDays];
    newDays[dayIdx] = !newDays[dayIdx];
    onUpdate(routine.id, { activeDays: newDays });
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}
    >
      {/* Background gradient - full bleed */}
      <div
        className="absolute inset-0"
        style={{ background: routine.gradient }}
      />

      {/* Subtle overlay for readability */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Content - spread across the full height */}
      <div className="relative flex h-full flex-col justify-between p-6">
        {/* Top section */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-medium text-white/80">
              {routine.mealType}
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {routine.startTime} - {routine.endTime}
            </p>
            {routine.calorieTarget && (
              <p className="mt-2 text-sm text-white/60">
                🎯 Target: {routine.calorieTarget} kcal
              </p>
            )}
          </div>
          <span className="text-6xl">{routine.emoji}</span>
        </div>

        {/* Middle section - habits & AI learning */}
        <div className="space-y-3">
          {routine.notes && (
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium text-white/60">Your habit</p>
              <p className="mt-0.5 text-sm text-white">{routine.notes}</p>
            </div>
          )}

          {/* Alexa integration indicator */}
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <span className="text-lg">🔵</span>
            <div className="flex-1">
              <p className="text-xs font-medium text-white/60">
                Alexa Auto-Order
              </p>
              <p className="text-sm text-white">
                Ingredients ordered via Amazon Fresh
              </p>
            </div>
            <span className="rounded-full bg-green-500/30 px-2 py-0.5 text-[10px] font-bold text-green-300">
              Active
            </span>
          </div>
        </div>

        {/* Bottom section - day selector & edit */}
        <div className="space-y-4">
          {/* Day selector - larger for full screen */}
          <div className="flex justify-center gap-2">
            {DAY_LABELS.map((day, idx) => (
              <button
                key={idx}
                onClick={() => toggleDay(idx)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all",
                  routine.activeDays[idx]
                    ? "bg-white text-black shadow-lg"
                    : "bg-white/20 text-white/60 hover:bg-white/30",
                )}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Edit plan button */}
          <div className="flex justify-end">
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"
            >
              <Edit3 className="h-4 w-4" />
              Edit Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Alexa AI Page ─── */
function AlexaPage({
  connection,
  rules,
  onToggleRule,
  onUpdateConnection,
  onTriggerOrder,
}: {
  connection: AlexaConnection;
  rules: AlexaOrderRule[];
  onToggleRule: (id: string) => void;
  onUpdateConnection: (updates: Partial<AlexaConnection>) => void;
  onTriggerOrder: () => void;
}) {
  const dueItems = getItemsDueForOrder(rules);
  const enabledRules = rules.filter((r) => r.enabled);

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Mic className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">Alexa + Amazon Fresh</p>
            <p className="text-sm text-white/70">
              {connection.connected ? "Connected" : "Not connected"} ·{" "}
              {connection.accountName}
            </p>
          </div>
          <span
            className={cn(
              "h-3 w-3 rounded-full",
              connection.connected ? "bg-green-400 animate-pulse" : "bg-red-400",
            )}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/10 p-2">
            <p className="text-lg font-bold text-white">{enabledRules.length}</p>
            <p className="text-[10px] text-white/60">Auto Items</p>
          </div>
          <div className="rounded-xl bg-white/10 p-2">
            <p className="text-lg font-bold text-white">{dueItems.length}</p>
            <p className="text-[10px] text-white/60">Due Today</p>
          </div>
          <div className="rounded-xl bg-white/10 p-2">
            <p className="text-lg font-bold text-white">
              ${connection.orderHistory
                .slice(0, 4)
                .reduce((s, o) => s + o.total, 0)
                .toFixed(0)}
            </p>
            <p className="text-[10px] text-white/60">This Month</p>
          </div>
        </div>

        {/* Voice & Auto toggles */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() =>
              onUpdateConnection({
                voiceOrderingEnabled: !connection.voiceOrderingEnabled,
              })
            }
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-all",
              connection.voiceOrderingEnabled
                ? "bg-white text-blue-700"
                : "bg-white/20 text-white/70",
            )}
          >
            <Mic className="h-3.5 w-3.5" />
            Voice Order {connection.voiceOrderingEnabled ? "ON" : "OFF"}
          </button>
          <button
            onClick={() =>
              onUpdateConnection({ autoOrderEnabled: !connection.autoOrderEnabled })
            }
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-all",
              connection.autoOrderEnabled
                ? "bg-white text-blue-700"
                : "bg-white/20 text-white/70",
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Auto Order {connection.autoOrderEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Due items alert */}
      {dueItems.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-400">
                {dueItems.length} items ready to auto-order
              </p>
              <p className="text-xs text-white/50">
                {dueItems.map((i) => i.itemName).join(", ")}
              </p>
            </div>
            <button
              onClick={onTriggerOrder}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black"
            >
              Order Now
            </button>
          </div>
        </div>
      )}

      {/* Smart rules */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          AI Auto-Order Rules (Learned)
        </h3>
        <div className="space-y-1.5">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 transition-all",
                rule.enabled ? "bg-white/5" : "bg-white/[0.02] opacity-50",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{rule.itemName}</span>
                  {rule.preferredBrand && (
                    <span className="text-[10px] text-white/40">
                      {rule.preferredBrand}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/50">
                  <span>Every {rule.learnedInterval}d</span>
                  <span>·</span>
                  <span>{rule.quantity} {rule.unit}</span>
                  <span>·</span>
                  <span className="text-green-400">
                    {Math.round(rule.confidenceScore * 100)}% conf
                  </span>
                </div>
                {rule.nextOrderDate && (
                  <p className="text-[10px] text-white/30">
                    Next: {new Date(rule.nextOrderDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
              <button
                onClick={() => onToggleRule(rule.id)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  rule.enabled ? "bg-blue-500" : "bg-white/20",
                )}
                role="switch"
                aria-checked={rule.enabled}
                aria-label={`Toggle ${rule.itemName}`}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    rule.enabled ? "left-[22px]" : "left-0.5",
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Order history */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Recent Orders
        </h3>
        <div className="space-y-1.5">
          {connection.orderHistory.slice(0, 5).map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5"
            >
              <span className="text-lg">
                {order.triggeredBy === "voice" ? "🎙" : order.triggeredBy === "auto" ? "🤖" : "👆"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {order.items.join(", ")}
                </p>
                <p className="text-[10px] text-white/40">
                  {order.date} · {order.triggeredBy}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">${order.total.toFixed(2)}</p>
                <p
                  className={cn(
                    "text-[10px]",
                    order.status === "delivered"
                      ? "text-green-400"
                      : order.status === "in-transit"
                        ? "text-blue-400"
                        : "text-amber-400",
                  )}
                >
                  {order.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it learns */}
      <div className="rounded-2xl bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-blue-400" />
          <p className="text-sm font-semibold">How PantryPilot AI Learns</p>
        </div>
        <ul className="mt-2 space-y-1.5 text-xs text-white/60">
          <li>• Tracks your purchase intervals to predict when items run out</li>
          <li>• Remembers preferred brands and sizes from repeat orders</li>
          <li>• Adjusts confidence as predictions prove accurate</li>
          <li>• Syncs with Alexa for voice commands: "Alexa, restock my kitchen"</li>
          <li>• Respects your budget limit (${connection.spendingLimit}/order)</li>
        </ul>
      </div>
    </div>
  );
}

/* ─── Cart Panel ─── */
function CartPanel({
  cart,
  onRemove,
  onBack,
}: {
  cart: GroceryItem[];
  onRemove: (id: string) => void;
  onBack: () => void;
}) {
  const [ordered, setOrdered] = useState(false);

  function handleOrder() {
    const query = cart
      .map((i) => `${i.preferredBrand ? i.preferredBrand + " " : ""}${i.name}`)
      .join(", ");
    const url = `https://www.instacart.com/store/search/${encodeURIComponent(query)}`;
    window.open(url, "_blank");
    setOrdered(true);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#121212] text-white">
      <header className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Go Back
        </button>
        <h2 className="flex-1 text-center font-display text-lg font-bold">
          Cart ({cart.length})
        </h2>
        <div className="w-20" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-white/50">
            <ShoppingCart className="h-12 w-12" />
            <p className="text-sm">Your cart is empty</p>
          </div>
        ) : ordered ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <p className="font-medium">Order placed!</p>
            <p className="text-sm text-white/50">Redirected to delivery service</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3"
              >
                <span className="text-2xl">{item.image}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-white/50">
                    {item.quantity} {item.unit}
                    {item.preferredBrand && ` · ${item.preferredBrand}`}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="rounded-lg bg-red-500/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/30"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="mt-6 rounded-xl bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Items</span>
                <span>{cart.length}</span>
              </div>
              <button
                onClick={handleOrder}
                className="mt-4 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-black hover:bg-amber-400"
              >
                Place Order →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


/* ─── Settings Panel ─── */
function SettingsPanel({
  preferences,
  onUpdate,
  items,
  onToggleAutoReorder,
  onBack,
}: {
  preferences: UserPreferences;
  onUpdate: (updates: Partial<UserPreferences>) => void;
  items: GroceryItem[];
  onToggleAutoReorder: (id: string) => void;
  onBack: () => void;
}) {
  const autoReorderItems = items.filter((i) => i.autoReorder);

  return (
    <div className="flex min-h-dvh flex-col bg-[#121212] text-white">
      <header className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Go Back
        </button>
        <h2 className="flex-1 text-center font-display text-lg font-bold">
          Automation Settings
        </h2>
        <div className="w-20" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        <section className="mt-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Smart Automation
          </h3>
          <ToggleRow
            label="Auto-reorder enabled"
            description="Automatically manage items marked for auto-reorder"
            checked={preferences.autoReorderEnabled}
            onChange={(v) => onUpdate({ autoReorderEnabled: v })}
          />
          <ToggleRow
            label="Auto-add critical items"
            description="Critical items are added to cart automatically"
            checked={preferences.autoAddCritical}
            onChange={(v) => onUpdate({ autoAddCritical: v })}
          />

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Urgency threshold</p>
                <p className="text-xs text-white/50">Days before flagging</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onUpdate({
                      urgencyThresholdDays: Math.max(1, preferences.urgencyThresholdDays - 1),
                    })
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-bold">
                  {preferences.urgencyThresholdDays}
                </span>
                <button
                  onClick={() =>
                    onUpdate({ urgencyThresholdDays: preferences.urgencyThresholdDays + 1 })
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Shopping day</p>
                <p className="text-xs text-white/50">Weekly reorder day</p>
              </div>
              <select
                value={preferences.shoppingDay}
                onChange={(e) => onUpdate({ shoppingDay: Number(e.target.value) })}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm outline-none"
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                  <option key={day} value={idx} className="bg-[#121212]">
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Notifications
          </h3>
          <ToggleRow
            label="Low stock alerts"
            description="Get notified when items are running low"
            checked={preferences.notifications.lowStock}
            onChange={(v) =>
              onUpdate({ notifications: { ...preferences.notifications, lowStock: v } })
            }
          />
          <ToggleRow
            label="Auto-order confirmation"
            description="Notify when items are auto-added"
            checked={preferences.notifications.autoOrderConfirmation}
            onChange={(v) =>
              onUpdate({
                notifications: { ...preferences.notifications, autoOrderConfirmation: v },
              })
            }
          />
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Auto-Reorder Items ({autoReorderItems.length})
          </h3>
          {autoReorderItems.length === 0 ? (
            <p className="rounded-xl bg-white/5 p-4 text-center text-sm text-white/40">
              Tap ⚡ on any item to enable auto-reorder.
            </p>
          ) : (
            <div className="space-y-1.5">
              {autoReorderItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                >
                  <span className="text-xl">{item.image}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-white/50">
                      Every ~{item.avgConsumptionDays}d
                      {item.preferredBrand && ` · ${item.preferredBrand}`}
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleAutoReorder(item.id)}
                    className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


/* ─── Toggle Row ─── */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-white/50">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-amber-500" : "bg-white/20",
        )}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
