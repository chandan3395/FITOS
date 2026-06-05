import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { MetricCard } from "../../components/design-system";
import {
  FlameIcon,
  CheckCircleIcon,
  DumbbellIcon,
  TargetIcon,
  BoltIcon,
} from "../../components/design-system/Icons";

const TODAYS_TASKS = [
  { label: "Log breakfast",         done: true },
  { label: "Complete Leg Day A",    done: false },
  { label: "Log lunch",             done: true },
  { label: "Submit weekly check-in", done: false },
];

const MESSAGES = [
  { from: "Coach Raj", text: "How's the knee feeling today?", time: "10:30 AM" },
  { from: "Coach Raj", text: "Loved the progress photos this week — huge consistency.", time: "Yesterday" },
];

const ClientDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-300 flex items-center justify-center text-base font-bold">
              PS
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Hey Priya! 👋</h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Week 8 of 16 · Goal: Weight Loss · Coached by Coach Raj
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 text-[12px] font-medium">
              <FlameIcon size={12} /> 5-day streak
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 text-[12px] font-medium">
              <CheckCircleIcon size={12} /> On Track
            </span>
          </div>
        </div>
      </Card>

      {/* Top metrics — streak, week progress, current weight */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Current Streak"  value="5 days" delta="Keep it going!"  trend="up"      icon={<FlameIcon size={18} />} />
        <MetricCard label="Week Progress"   value="8 / 16" delta="Halfway there!"  trend="neutral" icon={<TargetIcon size={18} />} />
        <MetricCard label="Current Weight"  value="68.0 kg" delta="▼ 3.2 kg lost"  trend="up"      icon={<DumbbellIcon size={18} />} />
      </div>

      {/* Mid — Today's status panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Workout status */}
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <Card.Title>Today&apos;s Workout</Card.Title>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                Leg Day A
              </span>
            </div>
          </Card.Header>
          <Card.Body>
            <ul className="space-y-2">
              {[
                { name: "Squats", meta: "4×12 · 40kg", done: true },
                { name: "Romanian Deadlift", meta: "3×10", done: true },
                { name: "Leg Press", meta: "3×15", done: false },
                { name: "Hip Thrust", meta: "3×12", done: false },
              ].map((ex) => (
                <li
                  key={ex.name}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full border ${ex.done ? "bg-emerald-400 border-emerald-400" : "border-zinc-700"}`} />
                    <span className={`text-sm ${ex.done ? "text-text-secondary line-through" : "text-text-primary"}`}>{ex.name}</span>
                  </div>
                  <span className="text-[12px] text-text-muted">{ex.meta}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full mt-4">Complete Workout</Button>
          </Card.Body>
        </Card>

        {/* Today's tasks + Nutrition + Check-in */}
        <div className="space-y-4">
          {/* Tasks */}
          <Card>
            <Card.Header>
              <Card.Title>Today&apos;s Tasks</Card.Title>
            </Card.Header>
            <Card.Body>
              <ul className="space-y-2">
                {TODAYS_TASKS.map((t) => (
                  <li key={t.label} className="flex items-center gap-3 text-sm">
                    <span className={`w-4 h-4 rounded-full border ${t.done ? "bg-emerald-400 border-emerald-400" : "border-zinc-700"}`} />
                    <span className={t.done ? "text-text-secondary line-through" : "text-text-primary"}>{t.label}</span>
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>

          {/* Nutrition mini */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Nutrition</Card.Title>
                <span className="text-[12px] text-text-secondary">1420 / 1800 kcal</span>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="space-y-2">
                {[
                  { label: "Protein", value: 94,  max: 120, color: "bg-primary" },
                  { label: "Carbs",   value: 156, max: 240, color: "bg-amber-400" },
                  { label: "Fats",    value: 48,  max: 60,  color: "bg-violet-400" },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="text-[12px] text-text-secondary w-12">{m.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div className={`h-full ${m.color}`} style={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }} />
                    </div>
                    <span className="text-[11px] text-text-muted w-14 text-right">{m.value}/{m.max}g</span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Bottom — Coach messages */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <Card.Title>Recent Coach Messages</Card.Title>
            <BoltIcon size={16} className="text-text-muted" />
          </div>
        </Card.Header>
        <Card.Body>
          <ul className="space-y-3">
            {MESSAGES.map((m, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-elevated/40 border border-border">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                  CR
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-text-primary">{m.text}</p>
                  <p className="text-[11px] text-text-muted mt-1">{m.from} · {m.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ClientDashboard;
