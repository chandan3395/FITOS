import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import service from "../../../services/byotNutritionService";
import NutritionSummary from "./NutritionSummary";
import { button } from "./nutritionUtils";
export default function HomeNutrition() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    let generation = 0;
    const refresh = () => {
      const request = ++generation;
      return service
        .summary()
        .then((value) => {
          if (alive && request === generation) {
            setData(value);
            setError("");
          }
        })
        .catch(() => {
          if (alive && request === generation) setError("Unable to load nutrition. Please retry.");
        });
    };
    const resume = () => {
      if (!document.hidden) refresh();
    };
    refresh();
    window.addEventListener("byot:nutrition-saved", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("byot:local-day-changed", refresh);
    document.addEventListener("visibilitychange", resume);
    return () => {
      alive = false;
      window.removeEventListener("byot:nutrition-saved", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("byot:local-day-changed", refresh);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [attempt]);
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 space-y-4 min-w-0 break-words">
      <h2 className="text-xl font-semibold">Nutrition Plan</h2>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button className={button} onClick={() => setAttempt((n) => n + 1)}>
            Retry nutrition
          </button>
        </div>
      ) : !data ? (
        <p role="status">Loading today’s nutrition…</p>
      ) : (
        <>
          <p className="text-sm text-text-secondary">Today · {data.date}</p>
          <NutritionSummary actual={data.actual} target={data.target} compact />
          <p className="text-sm text-text-secondary">
            {data.plannedMeals.length
              ? `Planned today: ${data.plannedMeals.join(", ")}`
              : "No meals planned for today."}
          </p>
        </>
      )}
      <Link to="/byot/nutrition" className={`${button} inline-flex items-center text-primary`}>
        Open nutrition
      </Link>
    </section>
  );
}
