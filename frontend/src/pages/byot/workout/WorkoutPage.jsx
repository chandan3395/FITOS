import PortalPageHeader from "../PortalPageHeader";
import { useState } from "react";
import DailyWorkout, { secondary } from "./DailyWorkout";
import RoutineEditor from "./RoutineEditor";
export default function WorkoutPage({ onDirty }) {
  const [tab, setTab] = useState("daily");
  const [date, setDate] = useState("");
  return (
    <div className="space-y-5 min-w-0">
      <PortalPageHeader title="Workout" description="Build your routine and track daily completion." action={<button className={secondary} onClick={() => setTab(tab === "daily" ? "weekly" : "daily")}>{tab === "daily" ? "Edit routine" : "View workout"}</button>} />
      <div className="byot-segments" aria-label="Workout views">
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
