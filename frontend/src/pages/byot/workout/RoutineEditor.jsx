import { useCallback, useEffect, useRef, useState } from "react";
import { readRoutine, writeWorkout } from "../../../services/byotWorkoutService";
import { primary, secondary } from "./DailyWorkout";
const input = "block mt-2 w-full min-w-0 rounded-lg border border-border bg-bg p-3";
const id = () => `draft:${crypto.randomUUID()}`;
const clean = ({ version, name, days }) => ({ version, name, days });
const fields = [
  ["name", "Exercise name", "text", 120],
  ["sets", "Planned sets (optional)", "number", 100],
  ["reps", "Reps description (optional)", "text", 80],
  ["weightKg", "Planned weight (kg, optional)", "number", 1500],
  ["restSeconds", "Rest (seconds, optional)", "number", 3600],
  ["notes", "Notes (optional)", "text", 500],
];
export default function RoutineEditor({ onDirty }) {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState("");
  const [selected, setSelected] = useState("monday");
  const [destination, setDestination] = useState("tuesday");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [conflict, setConflict] = useState(false);
  const pending = useRef(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const dirty = draft && JSON.stringify(draft) !== saved;
  useEffect(() => {
    onDirty(Boolean(dirty));
    return () => onDirty(false);
  }, [dirty, onDirty]);
  function accept(value) {
    const next = clean(value);
    setDraft(next);
    setSaved(JSON.stringify(next));
    pending.current = null;
    setConflict(false);
    setError("");
  }
  const load = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const value = await readRoutine();
      if (alive.current) accept(value);
    } catch (err) {
      if (alive.current) setError(err.response?.data?.message || "Unable to load routine.");
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]); // Initial fetch only; never overwrite an active draft.
  function edit(next) {
    setDraft(next);
    pending.current = null;
    setSuccess("");
  }
  function dayEdit(next) {
    edit({ ...draft, days: draft.days.map((d) => (d.day === selected ? next : d)) });
  }
  async function save(event) {
    event.preventDefault();
    if (lock.current || conflict) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    const serialized = JSON.stringify(draft);
    if (pending.current?.serialized !== serialized)
      pending.current = { serialized, key: crypto.randomUUID() };
    try {
      const value = await writeWorkout("/routine", draft, pending.current.key);
      if (alive.current) {
        accept(value);
        setSuccess("Weekly routine saved.");
      }
    } catch (err) {
      if (alive.current) {
        setConflict(err.response?.status === 409);
        setError(
          err.response?.data?.message ||
            "Save failed. Your routine edits are preserved. Try saving again."
        );
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  if (!draft)
    return (
      <section className="space-y-3">
        {busy ? (
          <p role="status">Loading routine…</p>
        ) : (
          <>
            <p role="alert">{error}</p>
            <button className={secondary} onClick={load}>
              Retry routine
            </button>
          </>
        )}
      </section>
    );
  const day = draft.days.find((d) => d.day === selected);
  function changeKind(kind) {
    if (
      kind !== "workout" &&
      day.exercises.length &&
      !window.confirm("Remove this day's planned exercises? Saved workouts will stay unchanged.")
    )
      return;
    dayEdit({ ...day, kind, exercises: kind === "workout" ? day.exercises : [] });
  }
  function copy() {
    if (selected === destination) return;
    if (
      !window.confirm(
        `Replace ${destination}'s routine with a copy of ${selected}? Saved workouts will stay unchanged.`
      )
    )
      return;
    edit({
      ...draft,
      days: draft.days.map((d) =>
        d.day === destination
          ? { ...day, day: destination, exercises: day.exercises.map((e) => ({ ...e, id: id() })) }
          : d
      ),
    });
    setSuccess(`Copied to ${destination}. Save your weekly routine to keep this change.`);
  }
  return (
    <form onSubmit={save} className="space-y-5" aria-label="Weekly routine editor">
      <p className="text-text-secondary">
        Routine changes apply to workouts not yet started.
      </p>
      <fieldset disabled={busy} className="space-y-5 min-w-0">
        <label className="block max-w-md">
          Routine name
          <input
            className={input}
            required
            maxLength={100}
            value={draft.name}
            onChange={(e) => edit({ ...draft, name: e.target.value })}
          />
        </label>
        <label className="block max-w-md">
          Editing weekday
          <select
            className={`${input} capitalize`}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {draft.days.map((d) => (
              <option key={d.day} value={d.day}>
                {d.day}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
          <h2 className="text-xl font-semibold capitalize">{selected}</h2>
          <label className="block max-w-md">
            Day label (optional)
            <input
              className={input}
              maxLength={80}
              value={day.label}
              onChange={(e) => dayEdit({ ...day, label: e.target.value })}
            />
          </label>
          <label className="block max-w-md">
            Day type
            <select className={input} value={day.kind} onChange={(e) => changeKind(e.target.value)}>
              <option value="unconfigured">Not configured</option>
              <option value="workout">Workout</option>
              <option value="rest">Rest day</option>
            </select>
          </label>
          {day.kind === "rest" && <p>Rest day — no planned exercises.</p>}
          {day.kind === "unconfigured" && (
            <p>Choose Workout to add exercises, or explicitly select a rest day.</p>
          )}
          {day.exercises.map((exercise, index) => (
            <fieldset
              key={exercise.id}
              className="border border-border rounded-xl p-4 min-w-0"
              aria-label={`Exercise ${index + 1}`}
            >
              <legend className="px-2 font-medium">Exercise {index + 1}</legend>
              <div className="grid sm:grid-cols-2 gap-4">
                {fields.map(([key, label, type, max]) => (
                  <label key={key} className="block min-w-0 text-sm">
                    {label}
                    <input
                      className={input}
                      type={type}
                      required={key === "name"}
                      maxLength={type === "text" ? max : undefined}
                      min={type === "number" ? (key === "sets" ? 1 : 0) : undefined}
                      max={type === "number" ? max : undefined}
                      step={key === "weightKg" ? "0.01" : type === "number" ? 1 : undefined}
                      value={exercise[key] ?? ""}
                      onChange={(e) =>
                        dayEdit({
                          ...day,
                          exercises: day.exercises.map((item) =>
                            item.id === exercise.id
                              ? {
                                  ...item,
                                  [key]:
                                    type === "number"
                                      ? e.target.value === ""
                                        ? null
                                        : Number(e.target.value)
                                      : e.target.value,
                                }
                              : item
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {[-1, 1].map((offset) => (
                  <button
                    key={offset}
                    type="button"
                    className={secondary}
                    disabled={index + offset < 0 || index + offset >= day.exercises.length}
                    onClick={() => {
                      const items = [...day.exercises];
                      [items[index], items[index + offset]] = [items[index + offset], items[index]];
                      dayEdit({ ...day, exercises: items });
                    }}
                  >
                    {offset === -1 ? "Move up" : "Move down"}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${secondary} text-danger hover:bg-danger/10`}
                  onClick={() => {
                    if (
                      window.confirm("Remove this planned exercise? Saved workouts stay unchanged.")
                    )
                      dayEdit({
                        ...day,
                        exercises: day.exercises.filter((item) => item.id !== exercise.id),
                      });
                  }}
                >
                  Remove exercise
                </button>
              </div>
            </fieldset>
          ))}
          {day.kind === "workout" && (
            <button
              type="button"
              className={secondary}
              disabled={
                day.exercises.length >= 30 ||
                draft.days.reduce((n, d) => n + d.exercises.length, 0) >= 120
              }
              onClick={() =>
                dayEdit({
                  ...day,
                  exercises: [
                    ...day.exercises,
                    {
                      id: id(),
                      name: "",
                      sets: null,
                      reps: "",
                      weightKg: null,
                      restSeconds: null,
                      notes: "",
                    },
                  ],
                })
              }
            >
              Add exercise
            </button>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0">
              Copy day to
              <select
                className={`${input} capitalize`}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {draft.days.map((d) => (
                  <option key={d.day} value={d.day}>
                    {d.day}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={secondary}
              disabled={selected === destination}
              onClick={copy}
            >
              Copy day
            </button>
          </div>
        </div>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {success && (
        <p role="status" className="text-primary">
          {success}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button className={primary} disabled={busy || !dirty || conflict}>
          {busy ? "Saving…" : "Save weekly routine"}
        </button>
        <button
          type="button"
          className={secondary}
          disabled={busy}
          onClick={() => {
            if (
              !dirty ||
              window.confirm("Discard unsaved routine edits and reload the latest saved routine?")
            )
              load();
          }}
        >
          {conflict ? "Reload latest routine" : "Reload saved routine"}
        </button>
      </div>
      {dirty && <p className="text-sm text-text-secondary">Unsaved routine edits</p>}
    </form>
  );
}
