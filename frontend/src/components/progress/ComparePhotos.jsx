import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

/**
 * ComparePhotos — before/after comparison of any two existing photo weeks.
 *
 * Read-only and frontend-only: works off the already-loaded `photos` array,
 * so it adds no network calls and creates no activity. Used by both the
 * client progress page and the trainer client-detail page.
 *
 * Layout: grouped BY POSE (Front / Side / Back). Each pose is a section with
 * Week A | Week B side by side (stacked on mobile) so the eye compares the
 * same pose across weeks.
 *
 * Data flow (audited): the two <select>s drive `weekA` / `weekB` (week
 * numbers as strings). Displayed photos come ONLY from
 * `byWeek.get(Number(weekX))` — a direct lookup. No positional fallback
 * (never photos[0]/photos[1]); `a`/`b` derive fresh each render. If a chosen
 * week has no record (e.g. stale selection after a reload), we refuse to
 * render and show an explicit "Week N photos do not exist." message.
 *
 * Scrolling is owned by the shared Modal body (overflow-y-auto, capped to
 * the viewport). Images are natural-sized with object-contain — never
 * cropped, never clipped, never overflowing.
 */

// Pose sections, top→bottom, with the document field each maps to.
const POSES = [
  ["Front", "frontPhoto"],
  ["Side",  "sidePhoto"],
  ["Back",  "backPhoto"],
];

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

/**
 * One image cell. Natural sizing: `w-full h-auto object-contain` preserves
 * aspect ratio and never crops; `max-h` keeps a single tall image sane while
 * the modal body scrolls. Missing slot → a balanced fallback box.
 */
const ImageCell = ({ photo, weekNumber }) => (
  <div className="min-w-0">
    <p className="text-[12px] font-medium text-text-secondary mb-1.5 text-center">Week {weekNumber}</p>
    {photo?.url ? (
      <a href={photo.url} target="_blank" rel="noreferrer" className="block">
        <img
          src={photo.url}
          alt={`Week ${weekNumber}`}
          className="w-full h-auto max-h-[70vh] object-contain rounded-xl border border-border bg-surface-elevated"
        />
      </a>
    ) : (
      <div className="w-full min-h-[220px] rounded-xl border border-border bg-surface-elevated flex items-center justify-center text-text-muted text-[12px]">
        No image available
      </div>
    )}
  </div>
);

const ComparePhotos = ({ photos = [] }) => {
  const [open, setOpen] = useState(false);
  const [weekA, setWeekA] = useState("");
  const [weekB, setWeekB] = useState("");

  // Existing weeks only, ascending — used to populate the selectors.
  const weeks = useMemo(
    () => [...new Set(photos.map((p) => p.weekNumber))].sort((x, y) => x - y),
    [photos]
  );
  // weekNumber -> photo set. Keyed by Number so a Number() lookup matches.
  const byWeek = useMemo(() => {
    const m = new Map();
    photos.forEach((p) => m.set(Number(p.weekNumber), p));
    return m;
  }, [photos]);

  const a = weekA ? byWeek.get(Number(weekA)) : null;
  const b = weekB ? byWeek.get(Number(weekB)) : null;

  const bothChosen = Boolean(weekA && weekB);
  const aMissing   = Boolean(weekA) && !a;
  const bMissing   = Boolean(weekB) && !b;
  const sameWeek   = bothChosen && weekA === weekB;
  const canShow    = bothChosen && !sameWeek && !aMissing && !bMissing && a && b;

  // Dev-only trace so the data source is verifiable. Stripped in prod.
  useEffect(() => {
    if (import.meta.env.DEV && canShow) {
      console.log("[compare] A=week", a.weekNumber, {
        front: a.frontPhoto?.publicId, side: a.sidePhoto?.publicId, back: a.backPhoto?.publicId,
      }, "B=week", b.weekNumber, {
        front: b.frontPhoto?.publicId, side: b.sidePhoto?.publicId, back: b.backPhoto?.publicId,
      });
    }
  }, [canShow, a, b]);

  // Not enough data to compare — hide the entry point entirely.
  if (weeks.length < 2) return null;

  const openCompare = () => {
    // Sensible defaults: earliest vs latest. The user can change either.
    setWeekA(String(weeks[0]));
    setWeekB(String(weeks[weeks.length - 1]));
    setOpen(true);
  };

  const selectClass =
    "block w-full mt-1 h-9 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary";

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openCompare}>Compare Photos</Button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Compare Progress Photos"
        className="!max-w-[1600px] w-[95vw] !max-h-[90vh]"
        backdropClassName="bg-black/80 backdrop-blur-lg"
      >
        <div className="space-y-6">
          {/* Week selectors */}
          <div className="flex items-end gap-3 max-w-xl">
            <label className="flex-1 min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-text-muted">Week A</span>
              <select value={weekA} onChange={(e) => setWeekA(e.target.value)} className={selectClass}>
                <option value="">Select a week…</option>
                {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
              </select>
            </label>
            <span className="text-text-muted text-sm pb-2">vs</span>
            <label className="flex-1 min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-text-muted">Week B</span>
              <select value={weekB} onChange={(e) => setWeekB(e.target.value)} className={selectClass}>
                <option value="">Select a week…</option>
                {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
              </select>
            </label>
          </div>

          {/* Validation */}
          {aMissing && (
            <p className="text-[13px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 max-w-xl">
              Week {weekA} photos do not exist.
            </p>
          )}
          {bMissing && (
            <p className="text-[13px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 max-w-xl">
              Week {weekB} photos do not exist.
            </p>
          )}
          {sameWeek && (
            <p className="text-[13px] text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 max-w-xl">
              Please choose two different weeks.
            </p>
          )}
          {!canShow && !sameWeek && !aMissing && !bMissing && (
            <p className="text-sm text-text-muted">Select two different weeks to compare them.</p>
          )}

          {canShow && (
            <>
              {/* Header */}
              <div className="border-b border-border pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-center">
                <p className="text-sm">
                  <span className="text-text-muted">Week A:</span>{" "}
                  <span className="font-semibold text-text-primary">Week {a.weekNumber}</span>{" "}
                  <span className="text-text-muted">· {fmtDate(a.createdAt)}</span>
                </p>
                <p className="text-sm">
                  <span className="text-text-muted">Week B:</span>{" "}
                  <span className="font-semibold text-text-primary">Week {b.weekNumber}</span>{" "}
                  <span className="text-text-muted">· {fmtDate(b.createdAt)}</span>
                </p>
              </div>

              {/* One section per pose: title, then Week A | Week B */}
              <div className="space-y-8">
                {POSES.map(([label, field]) => (
                  <section key={field}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3 text-center">
                      {label}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 max-w-5xl mx-auto">
                      <ImageCell photo={a[field]} weekNumber={a.weekNumber} />
                      <ImageCell photo={b[field]} weekNumber={b.weekNumber} />
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ComparePhotos;
