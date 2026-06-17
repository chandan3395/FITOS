/**
 * Frontend mirror of backend/src/utils/workoutSets.js (+ a serialize helper for
 * the builder). Keeps the per-set weight summary and the publish rule identical
 * to the server so the builder never lets a publish fail server-side.
 *
 * Model: an exercise is "uniform" (flat sets/reps/weight, NO setDetails — feels
 * exactly like today) or "varied" (a non-empty setDetails array, each set with
 * its own weight/reps/restSeconds). Keep in lock-step with the backend util.
 */

export const MAX_SETS = 20;

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const hasSetDetails = (ex) => Array.isArray(ex && ex.setDetails) && ex.setDetails.length > 0;

export function exerciseSetCount(ex) {
  if (hasSetDetails(ex)) return ex.setDetails.length;
  return Number(ex && ex.sets) || 0;
}

export function exerciseWeights(ex) {
  if (hasSetDetails(ex)) return ex.setDetails.map((s) => num(s.weight));
  if (ex && ex.weight != null && ex.weight !== "") return [num(ex.weight)];
  return [];
}

/** Single value when all set weights match, min–max range when they differ, null if none. */
export function weightSummary(ex) {
  const weights = exerciseWeights(ex);
  if (weights.length === 0) return null;
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  return { min, max, varies: min !== max, display: min === max ? String(min) : `${min}–${max}` };
}

export function exerciseSummary(ex) {
  return { setCount: exerciseSetCount(ex), weight: weightSummary(ex) };
}

/**
 * Publish rule (mirrors backend): flat exercises return [] (governed by the
 * "≥1 exercise" rule); set-detailed exercises require every set weight ≥ 0 and
 * reps ≥ 1. Returns offending sets — [{ setNumber, reason }] — [] === valid.
 */
export function setDetailsPublishErrors(ex) {
  if (!hasSetDetails(ex)) return [];
  const bad = [];
  ex.setDetails.forEach((s, i) => {
    const setNumber = s && s.setNumber != null ? s.setNumber : i + 1;
    const w = Number(s && s.weight);
    const r = Number(s && s.reps);
    if (!Number.isFinite(w) || w < 0) bad.push({ setNumber, reason: "weight" });
    if (!Number.isFinite(r) || r < 1) bad.push({ setNumber, reason: "reps" });
  });
  return bad;
}

/**
 * Serialize an exercise's setDetails for the API: clean numeric rows with
 * re-derived 1-indexed setNumber, or undefined when the exercise is uniform
 * (flat) so no setDetails is sent. UI-only fields never leak.
 */
export function serializeSetDetails(ex) {
  if (!hasSetDetails(ex)) return undefined;
  return ex.setDetails.map((s, i) => ({
    setNumber: i + 1,
    weight: num(s.weight),
    reps: num(s.reps),
    restSeconds: num(s.restSeconds),
  }));
}

/** Map an API exercise's setDetails into the editor's working shape (or undefined). */
export function setDetailsToDraft(ex) {
  if (!hasSetDetails(ex)) return undefined;
  return ex.setDetails.map((s, i) => ({
    setNumber: s.setNumber ?? i + 1,
    weight: s.weight ?? "",
    reps: s.reps ?? "",
    restSeconds: s.restSeconds ?? "",
  }));
}

/**
 * One-line exercise summary for compact displays (home card, collapsed views).
 * Prefers the API-provided `summary` (setCount + weight), falling back to the
 * shared helper. Uniform/flat → "{sets} sets × {reps} reps · {weight} kg";
 * varied → "{sets} sets · {min}–{max} kg" (reps omitted since they differ).
 * Range math comes from weightSummary — never re-derived in the component.
 */
export function exerciseSummaryLine(ex) {
  const summary = (ex && ex.summary) || exerciseSummary(ex);
  const { setCount, weight } = summary;
  if (hasSetDetails(ex)) {
    return weight ? `${setCount} sets · ${weight.display} kg` : `${setCount} sets`;
  }
  const reps = ex && ex.reps;
  const w = weight ? ` · ${weight.display} kg` : "";
  return `${setCount || "—"} sets × ${reps || "—"} reps${w}`;
}

/** True when a varied exercise's sets don't all share the same rest. */
export function restVaries(ex) {
  if (!hasSetDetails(ex)) return false;
  return new Set(ex.setDetails.map((s) => num(s.restSeconds))).size > 1;
}

/** The shared rest value for a varied exercise whose rest is uniform, else null. */
export function uniformRestSeconds(ex) {
  if (!hasSetDetails(ex) || restVaries(ex)) return null;
  return num(ex.setDetails[0].restSeconds);
}

/** Build N set rows inheriting from a defaults object {weight, reps, restSeconds}. */
export function buildRows(count, defaults = {}) {
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    weight: defaults.weight ?? "",
    reps: defaults.reps ?? "",
    restSeconds: defaults.restSeconds ?? "",
  }));
}
