import { useState } from "react";
import DailyWorkout, { secondary } from "./DailyWorkout";
import RoutineEditor from "./RoutineEditor";
export default function WorkoutPage({ onDirty }) {
  const [tab, setTab] = useState("daily");
  const [date, setDate] = useState("");
  return (
    <div className="space-y-6 min-w-0">
      <header>
        <h1 className="text-3xl font-bold">Workout</h1>
        <p className="text-text-secondary mt-2">
          Your weekly plan. Your daily progress. No performance logging required.
        </p>
      </header>
      <div className="flex flex-wrap gap-3" aria-label="Workout views">
        {[
          ["daily", "Daily Workout"],
          ["weekly", "Weekly Routine"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`${secondary} ${tab === value ? "bg-primary/10 text-primary" : ""}`}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div hidden={tab !== "daily"}>
        <DailyWorkout date={date} onDate={setDate} />
      </div>
      <div hidden={tab !== "weekly"}>
        <RoutineEditor onDirty={onDirty} />
      </div>
    </div>
  );
}
