import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

/**
 * ComparePhotos — before/after style comparison of any two photo weeks.
 *
 * Read-only and frontend-only: it works off the already-loaded `photos`
 * array, so it adds no network calls and creates no activity. Used by both
 * the client progress page and the trainer client-detail page.
 *
 * Layout: grouped BY POSE. Each pose (Front / Back / Side) is its own
 * section with Week A | Week B side by side — so the eye compares the same
 * pose across weeks, like a coach reviewing a transformation. Each week's
 * image reads only that week's document field, so a cell can never show
 * another week's or another slot's image.
 *
 * Data flow (audited): the two <select>s drive `weekA` / `weekB` (week
 * numbers as strings). Displayed photos come only from
 * `byWeek.get(Number(weekX))` — a direct lookup of the chosen week. No
 * positional fallback (no photos[0]/photos[1]); `a`/`b` derive fresh each
 * render, so no stale state.
 */

// Pose sections, top→bottom. Right-hand value is the document field each
// pose maps to — fixed so a pose can never read another slot's image.
const POSES = [
  ["Front", "frontPhoto"],
  ["Back",  "backPhoto"],
  ["Side",  "sidePhoto"],
];

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

/**
 * One image panel — identical fixed aspect box for every cell so all images
 * share the same width/height/aspect. object-contain keeps the entire body
 * visible (no cropping). Missing slot → fallback, never a broken <img>.
 */
const ImagePanel = ({ photo, weekNumber }) => (
  <div>
    <p className="text-[12px] font-medium text-text-secondary mb-1.5">Week {weekNumber}</p>
    <div className="aspect-[3/4] rounded-xl bg-surface-elevated border border-border overflow-hidden flex items-center justify-center text-text-muted text-[12px] text-center px-3">
      {photo?.url
        ? <a href={photo.url} target="_blank" rel="noreferrer" className="block w-full h-full">
            <img src={photo.url} alt={`Week ${weekNumber}`} className="w-full h-full object-contain" />
          </a>
        : <span>No image available</span>
      }
    </div>
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
  const sameWeek   = bothChosen && weekA === weekB;
  const canShow    = bothChosen && !sameWeek && a && b;

  // Dev-only trace so the data source is verifiable. Stripped in prod.
  useEffect(() => {
    if (import.meta.env.DEV && canShow) {
      console.log("[compare] A=week", a.weekNumber, {
        front: a.frontPhoto?.publicId, back: a.backPhoto?.publicId, side: a.sidePhoto?.publicId,
      }, "B=week", b.weekNumber, {
        front: b.frontPhoto?.publicId, back: b.backPhoto?.publicId, side: b.sidePhoto?.publicId,
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
        className="!max-w-[95vw] w-[95vw] h-[90vh]"
        backdropClassName="bg-black/80 backdrop-blur-lg"
      >
        {/* Single scroll region for the whole body — no nested scrollbars.
            Height fills the 90vh panel minus the fixed header. */}
        <div className="h-[calc(90vh-80px)] overflow-y-auto pr-1 space-y-6">
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
          {sameWeek && (
            <p className="text-[13px] text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 max-w-xl">
              Please choose two different weeks.
            </p>
          )}
          {!canShow && !sameWeek && (
            <p className="text-sm text-text-muted">Select two different weeks to compare them.</p>
          )}

          {canShow && (
            <>
              {/* Comparison header */}
              <div className="text-center border-b border-border pb-4">
                <p className="text-lg font-semibold text-text-primary">
                  Week {a.weekNumber} <span className="text-text-muted font-normal">vs</span> Week {b.weekNumber}
                </p>
                <p className="text-[13px] text-text-muted mt-1">
                  {fmtDate(a.createdAt)} <span className="px-1">→</span> {fmtDate(b.createdAt)}
                </p>
              </div>

              {/* One section per pose: label, then Week A | Week B */}
              <div className="space-y-8">
                {POSES.map(([label, field]) => (
                  <section key={field}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
                      {label}
                    </h3>
                    {/* Desktop: two columns. Mobile: stacked (Week A then Week B). */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 max-w-4xl mx-auto">
                      <ImagePanel photo={a[field]} weekNumber={a.weekNumber} />
                      <ImagePanel photo={b[field]} weekNumber={b.weekNumber} />
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
