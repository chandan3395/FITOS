import { Link } from "react-router-dom";
import useProgressSummary from "./useProgressSummary";
export const format = (n) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
export function WeightSummary({ data }) {
  return (
    <div className="space-y-2">
      <p>
        {data.latestWeight ? (
          <>
            Latest weight: <strong>{format(data.latestWeight.weightKg)} kg</strong> ·{" "}
            {data.latestWeight.date}
          </>
        ) : (
          "No weight entries recorded yet."
        )}
      </p>
      <p className="text-text-secondary">
        Onboarding baseline:{" "}
        {data.baseline.weightKg == null ? "Not recorded" : `${format(data.baseline.weightKg)} kg`} ·{" "}
        {data.baseline.date}
      </p>
      {data.changeKg != null && (
        <p>
          Change from baseline: {data.changeKg > 0 ? "+" : ""}
          {format(data.changeKg)} kg
        </p>
      )}
      {data.targetWeightKg != null && <p>Your target weight: {format(data.targetWeightKg)} kg</p>}
    </div>
  );
}
export default function HomeProgress({ reminder = false }) {
  const { data, error, reload } = useProgressSummary();
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 space-y-4 min-w-0">
      <h2 className="text-xl font-semibold">{reminder ? "Upcoming Check-in" : "Progress"}</h2>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button className="border border-border rounded-lg px-4 py-3 mt-3" onClick={reload}>
            Retry progress
          </button>
        </div>
      ) : !data ? (
        <p role="status">Loading progress…</p>
      ) : reminder ? (
        <>
          <p>{data.reminder}</p>
          <p className="text-sm text-text-secondary">
            A personal check-in needs weight and Front, Side and Back photos. Drafts do not change
            the due date.
          </p>
        </>
      ) : (
        <>
          <WeightSummary data={data} />
          <p>Latest completed check-in: {data.latestCompletedDate || "None yet"}</p>
        </>
      )}
      <Link className="inline-block text-primary py-2" to="/byot/progress">
        {reminder ? "Open personal check-in" : "Open progress history"} →
      </Link>
    </section>
  );
}
