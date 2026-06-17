import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * NutritionCard — the client's daily macro summary, rendered from the GET
 * /meal-logs/today payload. consumed = REVIEWED meals only (backend-enforced),
 * so the ring + bars fill only as the trainer approves meals.
 *
 * One component, two layouts via `compact`:
 *   - full (default): the nutrition-tab card (ring + bars + water/meals pills).
 *   - compact: a small home-dashboard summary; pass `to` to make it a link.
 * Both share the same data + math + fill animation so they never drift.
 */

const LIME = "#A6CE39";
const BLUE = "#3b82f6";
const AMBER = "#f59e0b";
const TRACK = "#2A2A2A"; // theme border — unfilled ring/bar track

const pct = (val, target) => (target > 0 ? Math.min(val / target, 1) : 0);
const round = (n) => Math.round(Number(n) || 0);

const LeafIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M5 21c0-7 4-13 14-15 0 10-5 15-14 15Z" stroke={LIME} strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M5 21C8 15 12 12 16 10" stroke={LIME} strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const DropIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 3s6 6.5 6 11a6 6 0 11-12 0c0-4.5 6-11 6-11Z" stroke={BLUE} strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

const ActivePill = () => (
  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 text-[11px] font-semibold">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
  </span>
);

/** Calorie ring. `valueCal` is the animated fill value; center content is passed as children. */
const Ring = ({ px, r, stroke, valueCal, targetCal, children }) => {
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct(valueCal, targetCal));
  return (
    <div className="relative shrink-0" style={{ width: px, height: px }}>
      <svg viewBox={`0 0 ${px} ${px}`} className="w-full h-full -rotate-90">
        <circle cx={px / 2} cy={px / 2} r={r} fill="none" stroke={TRACK} strokeWidth={stroke} />
        <circle
          cx={px / 2} cy={px / 2} r={r} fill="none" stroke={LIME} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
};

/** One macro bar. Label shows the real consumed value; the bar width animates from `animated`. */
const MacroRow = ({ label, color, consumed, target, animated, slim }) => {
  const width = pct(animated ?? consumed, target) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className={`${slim ? "text-[11.5px]" : "text-[12.5px]"} font-medium text-text-secondary`}>{label}</span>
        <span className={`${slim ? "text-[11px]" : "text-[12.5px]"} text-text-muted`}>
          <span className="font-bold text-text-primary">{round(consumed)}g</span> / {round(target)}g
        </span>
      </div>
      <div className={`${slim ? "h-1.5" : "h-2"} rounded-full overflow-hidden`} style={{ backgroundColor: TRACK }}>
        <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

const NutritionCard = ({ summary, compact = false, to }) => {
  const target = summary?.target || { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const consumed = summary?.consumed || { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const meals = summary?.meals || [];
  const { calories: cCal, protein: cPro, carbs: cCarb, fats: cFat } = consumed;
  const hasMeals = meals.length > 0;

  // Animate fills from 0 on mount and on every data change (e.g. a review bumps
  // consumed). Depend on primitives — `consumed` is recreated each render.
  const [shown, setShown] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown({ calories: cCal, protein: cPro, carbs: cCarb, fats: cFat }));
    return () => cancelAnimationFrame(id);
  }, [cCal, cPro, cCarb, cFat]);

  // ── Compact (home dashboard) ──────────────────────────────────
  if (compact) {
    const body = (
      <>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <LeafIcon size={15} />
            <span className="text-sm font-semibold text-text-primary">Nutrition</span>
          </div>
          {to && <span className="text-[12px] text-primary">Open →</span>}
        </div>

        {!hasMeals ? (
          <p className="text-[13px] text-text-secondary py-3">
            {summary?.planId ? `No meals scheduled for ${summary?.weekday || "today"}.` : "No nutrition plan yet."}
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <Ring px={72} r={30} stroke={8} valueCal={shown.calories} targetCal={target.calories}>
              <span className="text-[15px] font-extrabold text-text-primary leading-none">{round(consumed.calories)}</span>
              <span className="text-[9.5px] text-text-muted mt-0.5">/ {round(target.calories)}</span>
            </Ring>
            <div className="flex-1 min-w-0 space-y-2">
              <MacroRow slim label="Protein" color={LIME}  consumed={consumed.protein} animated={shown.protein} target={target.protein} />
              <MacroRow slim label="Carbs"   color={BLUE}  consumed={consumed.carbs}   animated={shown.carbs}   target={target.carbs} />
              <MacroRow slim label="Fats"    color={AMBER} consumed={consumed.fats}    animated={shown.fats}    target={target.fats} />
            </div>
          </div>
        )}
      </>
    );

    const cls = "block rounded-2xl border border-border bg-card p-5 transition-colors";
    return to ? (
      <Link to={to} className={`${cls} hover:border-line-hover`} aria-label="Open nutrition plan">{body}</Link>
    ) : (
      <div className={cls}>{body}</div>
    );
  }

  // ── Full (nutrition tab) ──────────────────────────────────────
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <LeafIcon />
        <h3 className="text-[15px] font-semibold text-text-primary">Nutrition Plan</h3>
        <span className="ml-1"><ActivePill /></span>
      </div>

      {!hasMeals ? (
        <div className="py-8 text-center">
          <p className="text-sm font-semibold text-text-primary">No meals scheduled for {summary?.weekday || "today"}</p>
          <p className="text-[13px] text-text-secondary mt-1">Enjoy your rest day — check back tomorrow.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div className="flex justify-center">
            <Ring px={160} r={52} stroke={10} valueCal={shown.calories} targetCal={target.calories}>
              <span className="text-3xl font-extrabold text-text-primary leading-none">{round(consumed.calories)}</span>
              <span className="text-[11px] text-text-muted mt-1">/ {round(target.calories)} kcal</span>
            </Ring>
          </div>
          <div className="space-y-4">
            <MacroRow label="Protein" color={LIME}  consumed={consumed.protein} animated={shown.protein} target={target.protein} />
            <MacroRow label="Carbs"   color={BLUE}  consumed={consumed.carbs}   animated={shown.carbs}   target={target.carbs} />
            <MacroRow label="Fats"    color={AMBER} consumed={consumed.fats}    animated={shown.fats}    target={target.fats} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-6 flex-wrap">
        {summary?.waterTarget != null && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-300 text-[12px] font-medium">
            <DropIcon /> {summary.waterTarget} L water
          </span>
        )}
        {summary?.mealsPerDay != null && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/10 text-amber-300 text-[12px] font-medium">
            {summary.mealsPerDay} meals / day
          </span>
        )}
      </div>
    </div>
  );
};

export default NutritionCard;
