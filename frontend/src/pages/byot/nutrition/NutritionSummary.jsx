import { format, nutrients } from "./nutritionUtils";
export default function NutritionSummary({ actual, target, planned, compact = false }) {
  return (
    <div className="space-y-3" aria-label="Nutrition totals">
      <div
        className={`grid ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"} gap-3`}
      >
        {nutrients.map(([key, label, unit]) => {
          const difference =
            target?.[key] == null ? null : Math.round((target[key] - actual[key]) * 100) / 100;
          return (
            <div key={key} className="rounded-xl bg-card border border-border p-3 min-w-0">
              <h3 className="text-sm text-text-secondary">{label}</h3>
              <p className="text-lg font-semibold">
                {format(actual[key])} <span className="text-sm">{unit} logged</span>
              </p>
              {planned && (
                <p className="text-sm text-text-secondary">
                  {format(planned[key])} {unit} planned
                </p>
              )}
              {difference === null ? (
                <p className="text-sm text-text-secondary">No target</p>
              ) : (
                <>
                  <p className="text-sm text-text-secondary">
                    Target: {format(target[key])} {unit}
                  </p>
                  <p className={difference < 0 ? "text-amber-800 text-sm" : "text-primary text-sm"}>
                    {format(Math.abs(difference))} {unit}{" "}
                    {difference < 0 ? "over target" : "remaining"}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
      {!target && (
        <p className="text-sm text-text-secondary">
          No target set. You can enter your own targets; your food counts immediately either way.
        </p>
      )}
    </div>
  );
}
