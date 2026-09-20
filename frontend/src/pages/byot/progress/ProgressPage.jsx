import { useCallback, useEffect, useRef, useState } from "react";
import {
  getHistory,
  getRecord,
  write,
  PROGRESS_EVENT,
} from "../../../services/byotProgressService";
import useProgressSummary from "./useProgressSummary";
import { WeightSummary, format } from "./HomeProgress";
import WeightGraph from "./WeightGraph";
import PhotoSlots, { button, primary } from "./PhotoSlots";
import PrivatePhoto from "./PrivatePhoto";
const fields = [
  ["weightKg", "Weight (kg)", 20, 500],
  ["chestCm", "Chest (cm)", 20, 300],
  ["waistCm", "Waist (cm)", 20, 300],
  ["hipsCm", "Hips (cm)", 20, 300],
  ["leftArmCm", "Left upper arm (cm)", 5, 100],
  ["rightArmCm", "Right upper arm (cm)", 5, 100],
  ["leftThighCm", "Left thigh (cm)", 10, 150],
  ["rightThighCm", "Right thigh (cm)", 10, 150],
];
const input = "block mt-2 w-full min-w-0 rounded-lg border border-border bg-bg p-3";
const draftOf = (r) => ({ measurements: r.measurements, notes: r.notes });
export default function ProgressPage({ onDirty }) {
  const { data: summary, error: summaryError, reload: reloadSummary } = useProgressSummary();
  const [selected, setSelected] = useState("");
  const date = selected || summary?.today;
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [records, setRecords] = useState([]);
  const [next, setNext] = useState(null);
  const [range, setRange] = useState("84");
  const [historyError, setHistoryError] = useState("");
  const [compareDates, setCompareDates] = useState(["", ""]);
  const [orientation, setOrientation] = useState("front");
  const [compare, setCompare] = useState(false);
  const sequence = useRef(0);
  const listSequence = useRef(0);
  const operation = useRef(null);
  const lock = useRef(false);
  const dirty = draft && JSON.stringify(draft) !== saved;
  const photoActivity = useCallback(
    (value) => {
      if (value) setSelected(date);
      setPhotoBusy(value);
    },
    [date]
  );
  useEffect(() => {
    onDirty(Boolean(dirty || photoBusy));
    return () => onDirty(false);
  }, [dirty, photoBusy, onDirty]);
  const accept = useCallback((value) => {
    setRecord(value);
    const d = draftOf(value);
    setDraft(d);
    setSaved(JSON.stringify(d));
    operation.current = null;
    setConflict(false);
  }, []);
  const load = useCallback(async () => {
    if (!date) return;
    const n = ++sequence.current;
    setBusy(true);
    setError("");
    try {
      const value = await getRecord(date);
      if (n === sequence.current) accept(value);
    } catch (err) {
      if (n === sequence.current)
        setError(err.response?.data?.message || "Unable to load this date.");
    } finally {
      if (n === sequence.current) setBusy(false);
    }
  }, [date, accept]);
  useEffect(() => {
    const counter = sequence;
    setRecord(null);
    setDraft(null);
    setSaved("");
    setMessage("");
    load();
    return () => {
      ++counter.current;
    };
  }, [load]);
  const history = useCallback(
    async (cursor) => {
      if (!summary?.today) return;
      const n = ++listSequence.current;
      const from = new Date(`${summary.today}T12:00:00Z`);
      from.setUTCDate(from.getUTCDate() - Number(range));
      try {
        const data = await getHistory({
          limit: 100,
          ...(cursor ? { before: cursor } : {}),
          ...(range !== "all" ? { from: from.toISOString().slice(0, 10) } : {}),
        });
        if (n === listSequence.current) {
          setRecords((rows) => (cursor ? [...rows, ...data.items] : data.items));
          setNext(data.next);
          setHistoryError("");
        }
      } catch (err) {
        if (n === listSequence.current)
          setHistoryError(err.response?.data?.message || "Unable to load history.");
      }
    },
    [summary?.today, range]
  );
  useEffect(() => {
    const counter = listSequence;
    history();
    const refresh = () => history();
    window.addEventListener(PROGRESS_EVENT, refresh);
    return () => {
      ++counter.current;
      window.removeEventListener(PROGRESS_EVENT, refresh);
    };
  }, [history]);
  function choose(value) {
    if (
      busy ||
      photoBusy ||
      (dirty && !window.confirm("Discard unsaved progress edits and change date?"))
    )
      return;
    setSelected(value);
  }
  async function action(kind) {
    if (lock.current || busy || photoBusy || !record) return;
    if (
      (kind === "delete" || kind === "deleteCheckin") &&
      !window.confirm(
        kind === "delete"
          ? "Delete measurements for this date? A completed check-in becomes incomplete."
          : "Delete this check-in and its photos? Measurements will be kept."
      )
    )
      return;
    const body =
      kind === "save" || kind === "draft"
        ? { version: record.version, ...draft }
        : { version: record.version };
    const path =
      kind === "save" || kind === "delete"
        ? `/records/${date}`
        : kind === "complete"
          ? `/checkins/${date}/complete`
          : `/checkins/${date}`;
    const method = kind.startsWith("delete") ? "delete" : kind === "complete" ? "post" : "put";
    const signature = JSON.stringify({ body, path, method });
    if (operation.current?.signature !== signature)
      operation.current = { signature, key: crypto.randomUUID() };
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const n = ++sequence.current;
    try {
      const value = await write(path, body, operation.current.key, method);
      if (n === sequence.current) {
        accept(value);
        setMessage(kind === "complete" ? "Personal check-in completed." : "Progress saved.");
      }
    } catch (err) {
      if (n === sequence.current) {
        setError(err.response?.data?.message || "Save failed. Your edits are preserved; retry.");
        setConflict(err.response?.status === 409);
      }
    } finally {
      lock.current = false;
      if (n === sequence.current) setBusy(false);
    }
  }
  return (
    <div className="space-y-7 min-w-0">
      <h1 className="text-3xl font-bold">Progress</h1>
      {summaryError ? (
        <div role="alert">
          <p>{summaryError}</p>
          <button className={button} onClick={reloadSummary}>
            Retry summary
          </button>
        </div>
      ) : summary ? (
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <WeightSummary data={summary} />
          <p className="font-medium">{summary.reminder}</p>
          <p>Latest completed check-in: {summary.latestCompletedDate || "None yet"}</p>
        </section>
      ) : (
        <p role="status">Loading progress…</p>
      )}
      <section
        className="rounded-2xl border border-border bg-surface p-5 space-y-5"
        aria-label="Progress entry"
      >
        <h2 className="text-xl font-semibold">Measurements and personal check-in</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0">
            Progress date
            <input
              type="date"
              className={input}
              value={date || ""}
              min="1900-01-01"
              max={summary?.today}
              disabled={busy || photoBusy}
              onChange={(e) => {
                if (e.target.value) choose(e.target.value);
              }}
            />
          </label>
          <button className={button} disabled={busy || photoBusy} onClick={() => choose("")}>
            Today
          </button>
        </div>
        <p className="text-sm text-text-secondary">
          Save weight or body measurements independently, or save an incomplete check-in draft. Only
          completing a check-in with weight and all three verified photos changes your reminder.
          Historical dates keep their original calendar date.
        </p>
        {busy && <p role="status">Saving or loading…</p>}
        {error && <p role="alert">{error}</p>}
        {message && (
          <p role="status" className="text-primary">
            {message}
          </p>
        )}
        {record && draft && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action("save");
              }}
              className="space-y-4"
            >
              <fieldset disabled={busy || photoBusy} className="grid sm:grid-cols-2 gap-4 min-w-0">
                {fields.map(([key, label, min, max]) => (
                  <label key={key} className="block min-w-0 text-sm">
                    {label}
                    <input
                      className={input}
                      type="number"
                      step="0.01"
                      min={min}
                      max={max}
                      value={draft.measurements[key] ?? ""}
                      onChange={(e) => {
                        setSelected(date);
                        setDraft({
                          ...draft,
                          measurements: {
                            ...draft.measurements,
                            [key]: e.target.value === "" ? null : Number(e.target.value),
                          },
                        });
                      }}
                    />
                  </label>
                ))}
                <label className="sm:col-span-2">
                  Notes (optional)
                  <textarea
                    className={input}
                    maxLength={1000}
                    value={draft.notes}
                    onChange={(e) => {
                      setSelected(date);
                      setDraft({ ...draft, notes: e.target.value });
                    }}
                  />
                </label>
              </fieldset>
              <div className="flex flex-wrap gap-3">
                <button className={primary} disabled={busy || photoBusy || conflict}>
                  Save measurements
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={busy || photoBusy || conflict}
                  onClick={() => action("draft")}
                >
                  Save check-in draft
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={busy || photoBusy}
                  onClick={() => {
                    if (
                      !dirty ||
                      window.confirm("Discard edits and reload the latest saved progress?")
                    )
                      load();
                  }}
                >
                  Reload saved progress
                </button>
              </div>
            </form>
            {dirty && <p className="text-sm">Unsaved progress edits</p>}
            <p>
              Check-in status:{" "}
              <strong>
                {record.checkin.completed
                  ? "Completed"
                  : record.checkin.active
                    ? "Draft — incomplete"
                    : "Not started"}
              </strong>
            </p>
            <PhotoSlots
              key={date}
              record={record}
              dirty={Boolean(dirty)}
              onRecord={accept}
              busy={busy}
              setPhotoBusy={photoActivity}
            />
            {record.checkin.active && (
              <div className="flex flex-wrap gap-3">
                <button
                  className={primary}
                  disabled={
                    busy ||
                    photoBusy ||
                    dirty ||
                    conflict ||
                    record.measurements.weightKg == null ||
                    ["front", "side", "back"].some((s) => !record.checkin.photos[s]) ||
                    record.checkin.completed
                  }
                  onClick={() => action("complete")}
                >
                  Complete personal check-in
                </button>
                <button
                  className={`${button} text-danger hover:bg-red-50`}
                  disabled={busy || photoBusy || dirty}
                  onClick={() => action("deleteCheckin")}
                >
                  Delete check-in and photos
                </button>
              </div>
            )}
            {record.exists && (
              <button
                className={`${button} text-danger hover:bg-red-50`}
                disabled={busy || photoBusy || dirty}
                onClick={() => action("delete")}
              >
                Delete measurements
              </button>
            )}
          </>
        )}
        {!record && error && (
          <button className={button} onClick={load}>
            Retry date
          </button>
        )}
      </section>
      <section
        className="rounded-2xl border border-border bg-surface p-5 space-y-5"
        aria-label="Progress history"
      >
        <label>
          History range
          <select
            className={input}
            value={range}
            onChange={(e) => {
              setRecords([]);
              setRange(e.target.value);
            }}
          >
            <option value="28">4 weeks</option>
            <option value="84">12 weeks</option>
            <option value="all">All time</option>
          </select>
        </label>
        {historyError && (
          <div role="alert">
            <p>{historyError}</p>
            <button className={button} onClick={() => history()}>
              Retry history
            </button>
          </div>
        )}
        <WeightGraph records={records} />
        <h2 className="text-xl font-semibold">Dated measurements and check-ins</h2>
        {!records.length && <p>No entries in this range.</p>}
        <ul className="space-y-4">
          {records.map((row) => (
            <li key={row.date} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex flex-wrap justify-between gap-3">
                <h3 className="font-semibold">{row.date}</h3>
                <button
                  className={button}
                  disabled={busy || photoBusy}
                  onClick={() => {
                    choose(row.date);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Edit {row.date}
                </button>
              </div>
              <dl className="grid sm:grid-cols-2 gap-2">
                {fields
                  .filter(([key]) => row.measurements[key] != null)
                  .map(([key, label]) => (
                    <div key={key}>
                      <dt className="text-text-secondary text-sm">{label}</dt>
                      <dd>
                        {format(row.measurements[key])} {key === "weightKg" ? "kg" : "cm"}
                      </dd>
                    </div>
                  ))}
              </dl>
              {row.notes && <p className="break-words whitespace-pre-wrap">{row.notes}</p>}
              {row.checkin.active && (
                <>
                  <p>{row.checkin.completed ? "Completed personal check-in" : "Check-in draft"}</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {["front", "side", "back"].map((slot) => (
                      <div key={slot}>
                        <p className="capitalize text-sm mb-2">{slot}</p>
                        <PrivatePhoto
                          date={row.date}
                          slot={slot}
                          photo={row.checkin.photos[slot]}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        {next && (
          <button className={button} onClick={() => history(next)}>
            Load older entries
          </button>
        )}
        {next && (
          <p className="text-sm">
            The graph shows loaded entries. Load older entries to extend it.
          </p>
        )}
      </section>
      <section
        className="rounded-2xl border border-border bg-surface p-5 space-y-4"
        aria-label="Photo comparison"
      >
        <h2 className="text-xl font-semibold">Compare two photo dates</h2>
        <p className="text-sm text-text-secondary">
          Choose from loaded history. Both photos use the same orientation and preserve their
          proportions.
        </p>
        <label>
          Orientation
          <select
            className={input}
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
          >
            {["front", "side", "back"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <label key={i}>
              Comparison date {i + 1}
              <select
                className={input}
                value={compareDates[i]}
                onChange={(e) => {
                  setCompare(false);
                  setCompareDates((d) => d.map((v, n) => (n === i ? e.target.value : v)));
                }}
              >
                <option value="">Select date</option>
                {records
                  .filter((r) => r.checkin.photos[orientation])
                  .map((r) => (
                    <option key={r.date} value={r.date}>
                      {r.date}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
        <button
          className={button}
          disabled={!compareDates[0] || !compareDates[1] || compareDates[0] === compareDates[1]}
          onClick={() => setCompare(true)}
        >
          View comparison
        </button>
        {compare && (
          <div className="grid grid-cols-2 gap-2">
            {compareDates.map((d, i) => (
              <div key={i}>
                <p className="text-xs sm:text-sm mb-2">
                  {d} · {orientation}
                </p>
                <PrivatePhoto
                  date={d}
                  slot={orientation}
                  photo={records.find((r) => r.date === d)?.checkin.photos[orientation]}
                  full
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
