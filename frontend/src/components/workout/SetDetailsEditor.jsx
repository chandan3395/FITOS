import { useState } from "react";
import { MAX_SETS, hasSetDetails, exerciseSummary, buildRows } from "../../lib/workoutSets";

/**
 * SetDetailsEditor — the shared per-set editing block used by BOTH the workout
 * plan builder and the workout template editor (one source of truth, like
 * nutrition's ScheduleEditor).
 *
 * Two modes, toggled per exercise:
 *   - UNIFORM (default): flat sets/reps/weight/rest — NO setDetails. Feels
 *     exactly like the old editor. Used for new + legacy flat exercises.
 *   - PER-SET: a setDetails array (one row per set), each with its own
 *     weight/reps/rest, shown as a compact collapsible mini-table.
 *
 * Controlled: the parent owns the exercise in its draft; every change calls
 * onPatch(partialExercise). The Sets count drives the number of set rows.
 */

const cell =
  "w-full h-8 px-2 rounded-md bg-surface border border-border text-[13px] text-text-primary focus:outline-none focus:border-[#333]";
const label = "text-[11px] uppercase tracking-wider text-text-muted";

const clampSets = (n) => Math.max(1, Math.min(MAX_SETS, Math.round(Number(n) || 1)));

// A dropped row is "edited" (worth warning about) if it differs from set 1.
const rowDiffers = (a, b) =>
  String(a.weight) !== String(b.weight) ||
  String(a.reps) !== String(b.reps) ||
  String(a.restSeconds) !== String(b.restSeconds);

const Chevron = ({ open }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SetDetailsEditor = ({ exercise, onPatch }) => {
  const varied = hasSetDetails(exercise);
  const rows = varied ? exercise.setDetails : [];
  const setCount = varied ? rows.length : clampSets(exercise.sets || 1);
  const [open, setOpen] = useState(false);

  const { weight: weightSummary } = exerciseSummary(exercise);
  const summaryLine = `${setCount} set${setCount === 1 ? "" : "s"}${weightSummary ? ` · ${weightSummary.display} kg` : ""}`;

  // ── mode toggle ──────────────────────────────────────────────
  const enablePerSet = () => {
    const defaults = { weight: exercise.weight ?? "", reps: exercise.reps ?? "", restSeconds: exercise.restSeconds ?? "" };
    onPatch({ setDetails: buildRows(setCount, defaults) });
    setOpen(true);
  };
  const disablePerSet = () => {
    const differ = rows.some((r) => rowDiffers(r, rows[0] || {}));
    if (differ && !window.confirm("Switch to one weight for all sets? Every set will be set to set 1's values.")) return;
    const first = rows[0] || {};
    onPatch({
      sets: setCount,
      weight: first.weight ?? exercise.weight ?? "",
      reps: first.reps ?? exercise.reps ?? "",
      restSeconds: first.restSeconds ?? exercise.restSeconds ?? "",
      setDetails: undefined,
    });
  };

  // ── sets count ───────────────────────────────────────────────
  const changeSets = (raw) => {
    const next = clampSets(raw);
    if (!varied) {
      onPatch({ sets: next });
      return;
    }
    if (next < rows.length) {
      const dropped = rows.slice(next);
      const editedDrop = dropped.some((r) => rowDiffers(r, rows[0] || {}));
      if (editedDrop && !window.confirm(`Reduce to ${next} sets? This removes ${rows.length - next} edited set row(s).`)) return;
      onPatch({ sets: next, setDetails: rows.slice(0, next).map((r, i) => ({ ...r, setNumber: i + 1 })) });
    } else if (next > rows.length) {
      const last = rows[rows.length - 1] || {};
      const extra = buildRows(next - rows.length, { weight: last.weight ?? "", reps: last.reps ?? "", restSeconds: last.restSeconds ?? "" });
      const merged = [...rows, ...extra].map((r, i) => ({ ...r, setNumber: i + 1 }));
      onPatch({ sets: next, setDetails: merged });
    }
  };

  const updateRow = (i, field, value) =>
    onPatch({ setDetails: rows.map((r, j) => (j === i ? { ...r, [field]: value } : r)) });

  const fillDown = () => {
    if (rows.length === 0) return;
    const w = rows[0].weight;
    onPatch({ setDetails: rows.map((r) => ({ ...r, weight: w })) });
  };

  const limitReached = setCount >= MAX_SETS;

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3">
      {/* Control bar — Sets stepper + mode toggle (always visible) */}
      <div className="flex items-end gap-3 flex-wrap">
        <label className="w-20">
          <span className={label}>Sets</span>
          <input
            type="number" min="1" max={MAX_SETS} value={setCount}
            onChange={(e) => changeSets(e.target.value)}
            className={`${cell} mt-1`}
          />
        </label>

        {!varied ? (
          <>
            <label className="w-24">
              <span className={label}>Reps</span>
              <input type="number" min="1" max="100" value={exercise.reps ?? ""} onChange={(e) => onPatch({ reps: e.target.value })} className={`${cell} mt-1`} />
            </label>
            <label className="w-24">
              <span className={label}>Weight (kg)</span>
              <input type="number" min="0" step="0.5" value={exercise.weight ?? ""} onChange={(e) => onPatch({ weight: e.target.value })} className={`${cell} mt-1`} />
            </label>
            <label className="w-24">
              <span className={label}>Rest (s)</span>
              <input type="number" min="0" max="600" value={exercise.restSeconds ?? ""} onChange={(e) => onPatch({ restSeconds: e.target.value })} className={`${cell} mt-1`} />
            </label>
            <button type="button" onClick={enablePerSet} className="h-8 px-3 rounded-md border border-border text-[12px] font-medium text-text-secondary hover:text-text-primary hover:border-line-hover transition-colors">
              Vary per set
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={fillDown} title="Copy set 1's weight to every set" className="h-8 px-3 rounded-md border border-border text-[12px] font-medium text-text-secondary hover:text-text-primary hover:border-line-hover transition-colors">
              Fill down
            </button>
            <button type="button" onClick={disablePerSet} className="h-8 px-3 rounded-md border border-border text-[12px] font-medium text-text-secondary hover:text-text-primary hover:border-line-hover transition-colors">
              Same for all
            </button>
          </div>
        )}
      </div>

      {/* Per-set grid (varied only) — collapsible compact mini-table */}
      {varied && (
        <div className="mt-3">
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-[12.5px] text-text-secondary hover:text-text-primary" aria-expanded={open}>
            <Chevron open={open} />
            <span>{open ? "Hide sets" : summaryLine}</span>
          </button>

          {open && (
            <div className="mt-2">
              {/* aligned headers once */}
              <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr] gap-2 px-1 pb-1">
                <span className={label}>Set</span>
                <span className={label}>Weight</span>
                <span className={label}>Reps</span>
                <span className={label}>Rest</span>
              </div>
              <div className="space-y-1.5">
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[2.5rem_1fr_1fr_1fr] gap-2 items-center">
                    <span className="text-[12px] text-text-muted">{i + 1}</span>
                    <input type="number" min="0" step="0.5" value={r.weight ?? ""} onChange={(e) => updateRow(i, "weight", e.target.value)} className={cell} placeholder="kg" />
                    <input type="number" min="1" max="100" value={r.reps ?? ""} onChange={(e) => updateRow(i, "reps", e.target.value)} className={cell} placeholder="reps" />
                    <input type="number" min="0" max="600" value={r.restSeconds ?? ""} onChange={(e) => updateRow(i, "restSeconds", e.target.value)} className={cell} placeholder="sec" />
                  </div>
                ))}
              </div>
              {limitReached && <p className="text-[11px] text-text-muted mt-2">Maximum of {MAX_SETS} sets reached.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SetDetailsEditor;
