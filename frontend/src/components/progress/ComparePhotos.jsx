import { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";

/**
 * ComparePhotos — premium before/after transformation viewer for any two
 * existing photo weeks.
 *
 * Read-only and frontend-only: works off the already-loaded `photos` array,
 * so it adds no network calls and creates no activity. Used by both the
 * client progress page and the trainer client-detail page.
 *
 * UX: a dedicated full-height viewer. A single compact header holds the title
 * and both week selectors; the rest of the panel is the photo area (the hero),
 * which is the ONLY scroll region. Background scroll is locked while open.
 *
 * Layout: grouped BY POSE (Front / Side / Back). Each pose is a section with
 * the two weeks side by side, auto-ordered earlier→later so every row reads
 * left-to-right as a transformation (Before → After).
 *
 * Data flow (audited, unchanged): the two <select>s drive `weekA` / `weekB`
 * (week numbers as strings). Displayed photos come ONLY from
 * `byWeek.get(Number(weekX))` — a direct lookup, never a positional fallback.
 * `a`/`b` derive fresh each render; a chosen week with no record refuses to
 * render and shows an explicit "Week N photos do not exist." message.
 */

// Pose sections, top→bottom, with the document field each maps to.
const POSES = [
  ["Front View", "frontPhoto"],
  ["Side View",  "sidePhoto"],
  ["Back View",  "backPhoto"],
];

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

const ArrowRight = ({ className = "" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * One image cell. Equal-width columns + an equal, fixed responsive height with
 * `object-cover` guarantee both images share identical dimensions and clean,
 * consistent cropping (no stretching, no letterboxing). Click opens full-res.
 */
const ImageCell = ({ photo, weekNumber, role }) => (
  <div className="min-w-0">
    <div className="flex items-center justify-center gap-2 mb-2">
      <span
        className={[
          "text-[10.5px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full",
          role === "Before"
            ? "bg-surface-elevated text-text-secondary border border-border"
            : "bg-primary/15 text-primary border border-primary/30",
        ].join(" ")}
      >
        {role}
      </span>
      <span className="text-[12px] text-text-muted">
        Week {weekNumber} · {fmtDate(photo?.createdAt)}
      </span>
    </div>

    {photo?.url ? (
      <a href={photo.url} target="_blank" rel="noreferrer" className="group block">
        <div className="w-full h-[46vh] md:h-[50vh] lg:h-[54vh] rounded-xl border border-border bg-surface-elevated overflow-hidden shadow-sm">
          <img
            src={photo.url}
            alt={`${role} — Week ${weekNumber}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      </a>
    ) : (
      <div className="w-full h-[46vh] md:h-[50vh] lg:h-[54vh] rounded-xl border border-border bg-surface-elevated flex items-center justify-center text-text-muted text-[12px]">
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

  // Present the chronologically earlier week on the left (Before) and the
  // later one on the right (After), regardless of which selector holds it, so
  // the viewer always reads left→right as a transformation. Purely
  // presentational — the comparison data/logic is unchanged.
  const before = canShow ? (a.weekNumber <= b.weekNumber ? a : b) : null;
  const after  = canShow ? (a.weekNumber <= b.weekNumber ? b : a) : null;

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

  // Background scroll lock + Escape to close (parity with the shared Modal,
  // which we no longer use so the viewer can own its header/body split).
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Not enough data to compare — hide the entry point entirely.
  if (weeks.length < 2) return null;

  const openCompare = () => {
    // Sensible defaults: earliest vs latest. The user can change either.
    setWeekA(String(weeks[0]));
    setWeekB(String(weeks[weeks.length - 1]));
    setOpen(true);
  };

  const swap = () => {
    setWeekA(weekB);
    setWeekB(weekA);
  };

  const selectClass =
    "h-9 pl-3 pr-8 rounded-lg bg-surface-elevated border border-border text-[13px] font-medium text-text-primary focus:outline-none focus:border-line-hover";

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openCompare}>Compare Photos</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Compare progress photos">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" onClick={() => setOpen(false)} aria-hidden="true" />

          {/* Panel — fixed tall viewer. Flex column: compact header (fixed) +
              photo area (the single scroll region). */}
          <div className="relative w-[96vw] max-w-[1200px] h-[92vh] flex flex-col bg-surface border border-border rounded-2xl shadow-glow overflow-hidden animate-fade-in">

            {/* ── Compact header (controls are secondary) ── */}
            <div className="shrink-0 border-b border-border px-3 sm:px-5 py-2.5">
              <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
                <h2 className="text-[15px] font-semibold text-text-primary">Compare Progress Photos</h2>

                <div className="flex items-center gap-2 sm:ml-1">
                  <select aria-label="Week A" value={weekA} onChange={(e) => setWeekA(e.target.value)} className={selectClass}>
                    <option value="">Week A…</option>
                    {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
                  </select>

                  <ArrowRight className="text-text-muted shrink-0" />

                  <select aria-label="Week B" value={weekB} onChange={(e) => setWeekB(e.target.value)} className={selectClass}>
                    <option value="">Week B…</option>
                    {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
                  </select>

                  <button
                    type="button"
                    onClick={swap}
                    disabled={!bothChosen}
                    title="Swap weeks"
                    aria-label="Swap weeks"
                    className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-line-hover disabled:opacity-40 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M7 7h11l-3-3M17 17H6l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto w-8 h-8 shrink-0 flex items-center justify-center text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-elevated transition-colors"
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Photo area — the hero, the only scroll region ── */}
            <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth px-3 sm:px-6 py-4">
              {aMissing && (
                <p className="text-[13px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 max-w-xl mx-auto text-center">
                  Week {weekA} photos do not exist.
                </p>
              )}
              {bMissing && (
                <p className="text-[13px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 max-w-xl mx-auto text-center">
                  Week {weekB} photos do not exist.
                </p>
              )}
              {sameWeek && (
                <p className="text-[13px] text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 max-w-xl mx-auto text-center">
                  Please choose two different weeks.
                </p>
              )}
              {!canShow && !sameWeek && !aMissing && !bMissing && (
                <p className="text-sm text-text-muted text-center py-10">Select two different weeks to compare them.</p>
              )}

              {canShow && (
                <>
                  {/* Compact transformation summary — one line, never pushes photos down. */}
                  <div className="flex justify-center mb-5">
                    <div className="inline-flex items-center gap-2 sm:gap-3 rounded-full bg-surface-elevated/60 border border-border px-4 py-1.5 text-[12.5px]">
                      <span className="text-text-secondary">
                        Before <span className="font-semibold text-text-primary">Week {before.weekNumber}</span>
                        <span className="text-text-muted"> · {fmtDate(before.createdAt)}</span>
                      </span>
                      <ArrowRight className="text-primary shrink-0" />
                      <span className="text-text-secondary">
                        After <span className="font-semibold text-text-primary">Week {after.weekNumber}</span>
                        <span className="text-text-muted"> · {fmtDate(after.createdAt)}</span>
                      </span>
                    </div>
                  </div>

                  {/* One section per pose: divider label, then Before | After (always 2-up). */}
                  <div className="space-y-9">
                    {POSES.map(([label, field]) => (
                      <section key={field}>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="h-px flex-1 bg-border" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">{label}</span>
                          <span className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-6">
                          <ImageCell photo={before[field]} weekNumber={before.weekNumber} role="Before" />
                          <ImageCell photo={after[field]} weekNumber={after.weekNumber} role="After" />
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ComparePhotos;
