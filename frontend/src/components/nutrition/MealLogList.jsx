import { useState } from "react";
import mealLogService from "../../services/mealLogService";

/**
 * MealLogList — today's meals from the active plan (the /today summary's
 * meals[]), each with its planned macros, current review status, and a photo
 * upload control. Uploading compresses + signs + uploads to Cloudinary
 * (reusing the progress-photo pattern via mealLogService.log) then persists
 * metadata. A freshly uploaded meal is "pending" and does NOT count toward the
 * card's consumed totals until the trainer reviews it — we just refetch.
 */

const STATUS = {
  pending:         { label: "Pending review", cls: "bg-amber-400/10 text-amber-300" },
  reviewed:        { label: "Reviewed",        cls: "bg-emerald-400/10 text-emerald-300" },
  action_required: { label: "Action required", cls: "bg-red-500/10 text-red-300" },
};

const round = (n) => Math.round(Number(n) || 0);
const macroLine = (m) => `${round(m.calories)} kcal · ${round(m.protein)}P · ${round(m.carbs)}C · ${round(m.fats)}F`;

const MealLogList = ({ meals = [], localDate, onLogged, pushToast }) => {
  const [busyKey, setBusyKey] = useState(null);

  const onFile = async (key, mealType, file) => {
    if (!file) return;
    setBusyKey(key);
    try {
      await mealLogService.log({ date: localDate, mealType, file });
      pushToast?.({ kind: "success", message: `${mealType} logged — pending your coach's review` });
      await onLogged?.();
    } catch (err) {
      pushToast?.({ kind: "error", message: err?.response?.data?.message || "Upload failed. Try again." });
    } finally {
      setBusyKey(null);
    }
  };

  if (meals.length === 0) {
    return <p className="text-sm text-text-secondary py-2">No meals scheduled for today.</p>;
  }

  return (
    <div className="space-y-3">
      {meals.map((meal, i) => {
        const key = `${meal.mealType}-${i}`;
        const busy = busyKey === key;
        const st = meal.logStatus ? STATUS[meal.logStatus] : null;
        return (
          <div key={key} className="rounded-xl border border-border bg-surface-elevated p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-text-primary">{meal.mealType}</p>
                  {st ? (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface text-text-muted">Not logged yet</span>
                  )}
                </div>

                {(meal.dishes || []).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {meal.dishes.map((d, j) => (
                      <span key={j} className="px-1.5 py-0.5 rounded bg-surface text-[11px] text-text-secondary border border-border">{d}</span>
                    ))}
                  </div>
                )}

                <p className="text-[12px] text-text-muted mt-1.5">{macroLine(meal.plannedMacros || {})}</p>

                {meal.logStatus === "action_required" && meal.note && (
                  <p className="mt-2 text-[12.5px] text-red-300">
                    <span className="text-text-muted">Coach:</span> {meal.note}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {meal.photo?.thumbnailUrl && (
                  <a href={meal.photo.url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg overflow-hidden border border-border block">
                    <img src={meal.photo.thumbnailUrl} alt={meal.mealType} className="w-full h-full object-cover" />
                  </a>
                )}
                <label className={`inline-flex items-center h-9 px-3 rounded-lg text-[12.5px] font-semibold cursor-pointer transition-colors ${busy ? "bg-surface text-text-muted cursor-wait" : "bg-primary text-black hover:bg-primary-hover"}`}>
                  {busy ? "Uploading…" : meal.photo ? "Replace photo" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={busy}
                    onChange={(e) => onFile(key, meal.mealType, e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MealLogList;
