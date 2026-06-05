import { useState } from "react";
import Card from "../../components/ui/Card";

const TABS = ["Today", "Week", "History"];

const MACROS = [
  { label: "Protein", value: 94,  max: 120, color: "bg-primary",       text: "text-primary" },
  { label: "Carbs",   value: 156, max: 240, color: "bg-amber-400",     text: "text-amber-300" },
  { label: "Fats",    value: 48,  max: 60,  color: "bg-violet-400",    text: "text-violet-300" },
  { label: "Water",   value: 2.7, max: 3.0, color: "bg-sky-400",       text: "text-sky-300", unit: "L" },
];

const MEALS = [
  { icon: "🍳", name: "Breakfast", time: "8:10 AM", kcal: 480, note: "Oats with banana, 2 boiled eggs, black coffee", macros: "P 28g · C 62g · F 14g", logged: true },
  { icon: "🥗", name: "Lunch",     time: "1:20 PM", kcal: 540, note: "Grilled chicken breast, brown rice, spinach salad", macros: "P 44g · C 62g · F 12g", logged: true },
  { icon: "🍎", name: "Snack",     time: "5:00 PM", kcal: 200, note: "Greek yogurt with berries", macros: "P 14g · C 22g · F 6g", logged: true },
  { icon: "🍽️", name: "Dinner",   time: "—",       kcal: 580, note: "Pending", macros: "Target: P 34g · C 50g · F 18g", logged: false },
];

const ClientNutritionPage = () => {
  const [tab, setTab] = useState("Today");

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">My Nutrition Log</h2>
          <p className="text-sm text-text-secondary mt-1">Track macros and meals against your daily targets.</p>
        </div>
        <div className="flex items-center gap-1 bg-surface-elevated border border-border rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "h-7 px-3.5 rounded-full text-[12.5px] font-medium transition-colors",
                tab === t ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text-primary",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Totals + macros */}
      <Card>
        <div className="flex items-center gap-8 flex-wrap">
          {/* Donut */}
          <div className="relative w-32 h-32 rounded-full bg-surface-elevated border border-border flex items-center justify-center shrink-0">
            <div className="absolute inset-2 rounded-full border-4 border-primary border-r-transparent rotate-45" />
            <div className="text-center">
              <p className="text-xl font-bold text-text-primary">1420</p>
              <p className="text-[10px] text-text-muted">/ 1800 kcal</p>
            </div>
          </div>

          {/* Macro bars */}
          <div className="flex-1 min-w-[260px] space-y-3">
            {MACROS.map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[12.5px] font-medium ${m.text}`}>● {m.label}</span>
                  <span className="text-[12px] text-text-muted">
                    {m.value} / {m.max} {m.unit || "g"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className={`h-full ${m.color}`} style={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Meal log */}
      <div className="space-y-3">
        {MEALS.map((m, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-lg">
                  {m.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{m.name}</p>
                  <p className="text-[12.5px] text-text-secondary truncate">{m.note}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">~{m.kcal} kcal · {m.macros}</p>
                </div>
              </div>
              <span
                className={[
                  "shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full",
                  m.logged ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300",
                ].join(" ")}
              >
                {m.logged ? `✓ Logged · ${m.time}` : "Pending"}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ClientNutritionPage;
