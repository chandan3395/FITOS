import { Link } from "react-router-dom";
import useWorkoutDay from "./useWorkoutDay";
export const secondary = "rounded-lg border border-border px-4 py-3 text-sm disabled:opacity-50";
export const primary = `${secondary} bg-primary text-on-primary font-semibold`;
const messages = {
  no_routine: "No routine yet. Build your weekly routine to plan a workout.",
  not_recorded:
    "No workout recorded. Past workouts can only be corrected if they were started on that date.",
  unconfigured: "This day is not configured. Choose a workout or rest day in your weekly routine.",
  rest: "Rest day. There are no exercises to complete.",
  empty: "No exercises planned for this workout yet.",
  future: "Future workouts belong in your weekly routine. Completion is available from today.",
};
function details(e) {
  return [
    e.sets != null && `${e.sets} sets`,
    e.reps && `${e.reps} reps`,
    e.weightKg != null && `${e.weightKg} kg`,
    e.restSeconds != null && `${e.restSeconds}s rest`,
  ]
    .filter(Boolean)
    .join(" · ");
}
export default function DailyWorkout({ date = "", onDate, home = false }) {
  const { data, loading, busy, error, conflict, retry, reload, save } = useWorkoutDay(date);
  return (
    <section
      className="min-w-0 rounded-2xl border border-border bg-surface p-5"
      aria-label={home ? "Today's workout" : "Daily workout"}
    >
      <h2 className="text-xl font-semibold mb-3">{home ? "Today’s Workout" : "Daily Workout"}</h2>
      {onDate && (
        <div className="flex flex-wrap items-end gap-3 mb-5">
          <label className="block min-w-0 text-sm">
            Workout date
            <input
              aria-label="Workout date"
              type="date"
              min="1900-01-01"
              max={data?.today}
              value={date || data?.today || ""}
              disabled={busy}
              onChange={(e) => {
                if (e.target.value) onDate(e.target.value);
              }}
              className="block mt-2 max-w-full rounded-lg border border-border bg-bg p-3"
            />
          </label>
          <button className={secondary} disabled={busy} onClick={() => onDate("")}>
            Today
          </button>
        </div>
      )}
      {loading && <p role="status">Loading workout…</p>}
      {error && (
        <div role="alert" className="my-3 space-y-3">
          <p>{error}</p>
          {retry && !conflict && (
            <button className={primary} disabled={busy} onClick={() => save(null, true)}>
              Retry save
            </button>
          )}{" "}
          <button className={secondary} disabled={busy} onClick={reload}>
            {conflict ? "Reload latest workout" : "Reload workout"}
          </button>
        </div>
      )}
      {data && (
        <>
          <p className="text-sm text-text-secondary mb-2 capitalize">
            {data.weekday} · {data.date} · {data.timezone}
          </p>
          {(data.label || data.routineName) && (
            <h3 className="font-semibold break-words">{data.label || data.routineName}</h3>
          )}
          {data.label && (
            <p className="text-sm text-text-secondary break-words">{data.routineName}</p>
          )}
          <p className="my-3 text-sm text-text-secondary">
            {data.exists
              ? "Saved workout. Routine edits won’t change it."
              : data.date === data.today
                ? "Start or complete an exercise to save today’s workout."
                : ""}
          </p>
          {messages[data.state] && <p className="my-4">{messages[data.state]}</p>}
          {data.exercises.length > 0 && (
            <ul className={home ? "space-y-2 mt-4" : "grid gap-3 sm:grid-cols-2 mt-4"}>
              {data.exercises.map((exercise) => (
                <li key={exercise.id} className={`rounded-xl border border-border ${home ? "p-2" : "p-3"}`}>
                  <label className="flex items-start gap-3 min-h-11 cursor-pointer">
                    <input
                      type="checkbox"
                      aria-label={`Complete ${exercise.name}`}
                      checked={exercise.completed}
                      disabled={busy || loading || Boolean(error) || data.date > data.today}
                      onChange={(event) => {
                        if (event.nativeEvent.detail <= 1) save(exercise);
                      }}
                      className="mt-1 h-5 w-5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 break-words">
                      <span className="font-semibold">{exercise.name}</span>
                      <span className="block text-sm text-text-secondary mt-1">
                        {details(exercise)}
                      </span>
                      {exercise.notes && (
                        <span className="block text-sm mt-2 whitespace-pre-wrap">
                          {exercise.notes}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 font-medium" aria-live="polite">
            {data.completedCount} of {data.totalCount} completed · {data.percentage}%
          </p>
          {busy && (
            <p role="status" className="mt-2">
              Saving completion…
            </p>
          )}
          {!data.exists && ["workout", "rest", "empty"].includes(data.state) && (
            <button
              className={`${primary} mt-4`}
              disabled={busy || loading || Boolean(error)}
              onClick={() => save()}
            >
              Start today’s workout
            </button>
          )}
        </>
      )}
      {home && (
        <Link to="/byot/workout" className="inline-block text-primary mt-3 px-2 py-2">
          Open Workout →
        </Link>
      )}
    </section>
  );
}
