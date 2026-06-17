"use strict";

/**
 * Pure, framework-agnostic helpers for Workout Plan v2 per-set details.
 *
 * An exercise is either "set-detailed" (has a non-empty `setDetails` array,
 * each set carrying its own weight/reps/restSeconds) or "flat" (legacy
 * sets/reps/weight fields). These helpers read whichever is present so the API
 * can expose a clean per-exercise summary and the publish gate can validate
 * set-detailed exercises — without the UI re-deriving anything.
 *
 * No Mongoose / Express here so this can be unit-tested directly.
 */

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hasSetDetails(ex) {
  return Array.isArray(ex && ex.setDetails) && ex.setDetails.length > 0;
}

/** Number of sets — from setDetails length, else the flat `sets` field. */
function exerciseSetCount(ex) {
  if (hasSetDetails(ex)) return ex.setDetails.length;
  return Number(ex && ex.sets) || 0;
}

/** Every set's weight — from setDetails, else the single flat weight (or []). */
function exerciseWeights(ex) {
  if (hasSetDetails(ex)) return ex.setDetails.map((s) => num(s.weight));
  if (ex && ex.weight != null && ex.weight !== "") return [num(ex.weight)];
  return [];
}

/**
 * Weight summary for one exercise: a single value when all sets share a weight,
 * a min–max range when they differ. Returns null when there is no weight info.
 *   { min, max, varies, display }
 */
function weightSummary(ex) {
  const weights = exerciseWeights(ex);
  if (weights.length === 0) return null;
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  return { min, max, varies: min !== max, display: min === max ? String(min) : `${min}–${max}` };
}

/** Per-exercise display summary: { setCount, weight }. */
function exerciseSummary(ex) {
  return { setCount: exerciseSetCount(ex), weight: weightSummary(ex) };
}

/**
 * Publish validation for ONE exercise's setDetails (pure). Flat exercises
 * (no setDetails) return [] — the legacy "plan needs >= 1 exercise" rule still
 * governs them at the service layer. For set-detailed exercises, every set must
 * have weight >= 0 and reps >= 1. Returns offending sets ([] === valid):
 *   [{ setNumber, reason: "weight" | "reps" }]
 */
function setDetailsPublishErrors(ex) {
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
 * Snapshot one exercise's setDetails BY VALUE (stripping subdoc _ids) for the
 * template→plan assign / reassign / duplicate clone paths. Returns undefined
 * when the exercise is flat, so no empty array is persisted.
 */
function cloneSetDetails(ex) {
  if (!hasSetDetails(ex)) return undefined;
  return ex.setDetails.map((s) => ({
    setNumber: s.setNumber,
    weight: s.weight,
    reps: s.reps,
    restSeconds: s.restSeconds,
  }));
}

module.exports = {
  num,
  hasSetDetails,
  exerciseSetCount,
  exerciseWeights,
  weightSummary,
  exerciseSummary,
  setDetailsPublishErrors,
  cloneSetDetails,
};
