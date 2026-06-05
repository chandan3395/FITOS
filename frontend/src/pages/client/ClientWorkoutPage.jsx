import { useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const EXERCISES_INIT = [
  { name: "Squats",            meta: "4 sets · 12 reps · 40 kg", done: true },
  { name: "Romanian Deadlift", meta: "3 sets · 10 reps",         done: true },
  { name: "Leg Press",         meta: "3 sets · 15 reps",         done: false },
  { name: "Hip Thrust",        meta: "3 sets · 12 reps",         done: false },
];

const WEEK = [
  { day: "Mon", session: "Push Day",  detail: "Chest, Shoulders, Triceps", done: true },
  { day: "Tue", session: "Pull Day",  detail: "Back, Biceps",              done: true },
  { day: "Wed", session: "Leg Day A", detail: "Quads, Hamstrings",         today: true },
  { day: "Thu", session: "Rest",      detail: "Active recovery",           done: false },
  { day: "Fri", session: "Upper",     detail: "Compound focus",            done: false },
  { day: "Sat", session: "Leg Day B", detail: "Glutes, Posterior chain",   done: false },
  { day: "Sun", session: "Rest",      detail: "Off",                       done: false },
];

const ClientWorkoutPage = () => {
  const [exercises, setExercises] = useState(EXERCISES_INIT);
  const toggle = (i) => setExercises((e) => e.map((x, idx) => idx === i ? { ...x, done: !x.done } : x));
  const completed = exercises.filter((e) => e.done).length;
  const pct = Math.round((completed / exercises.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">My Workout</h2>
        <p className="text-sm text-text-secondary mt-1">Stay on track — log each set as you go.</p>
      </div>

      {/* Today */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Today · Leg Day A</p>
            <p className="text-[12px] text-text-muted">Week 8, Day 3 of 4</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-medium">
            In Progress
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-border overflow-hidden mb-1">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-text-muted mb-4">{completed} / {exercises.length} done</p>

        <ul className="divide-y divide-border">
          {exercises.map((ex, i) => (
            <li key={ex.name} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(i)}
                  className={[
                    "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                    ex.done ? "bg-emerald-400 border-emerald-400 text-black" : "border-zinc-700 hover:border-zinc-500",
                  ].join(" ")}
                >
                  {ex.done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5L8.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <div>
                  <p className={`text-sm font-medium ${ex.done ? "text-text-secondary line-through" : "text-text-primary"}`}>
                    {ex.name}
                  </p>
                  <p className="text-[12px] text-text-muted">{ex.meta}</p>
                </div>
              </div>
              {!ex.done && (
                <button
                  onClick={() => toggle(i)}
                  className="text-[11.5px] font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                  Mark Done
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-2">
          <Button variant="secondary" size="md">📝 Add Note</Button>
          <Button size="md" className="flex-1">Complete Workout</Button>
        </div>
      </Card>

      {/* Week plan */}
      <Card>
        <Card.Header><Card.Title>This Week&apos;s Plan</Card.Title></Card.Header>
        <Card.Body>
          <ul className="space-y-2">
            {WEEK.map((w) => (
              <li key={w.day} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated/40 border border-border">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] uppercase tracking-wider text-text-muted w-10">{w.day}</span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{w.session}</p>
                    <p className="text-[12px] text-text-muted">{w.detail}</p>
                  </div>
                </div>
                {w.today
                  ? <span className="text-[11px] text-primary font-semibold">Today</span>
                  : w.done
                    ? <span className="text-emerald-400 text-[11px] font-medium">✓ Done</span>
                    : <span className="text-text-muted text-[11px]">—</span>}
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ClientWorkoutPage;
