import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import { CheckCircleIcon, FlameIcon, CalendarIcon } from "../../components/design-system/Icons";
import { useAuthContext } from "../../contexts/AuthContext";
import { ErrorState, SkeletonGrid, Toast } from "../../components/feedback/States";
import { ROUTES } from "../../constants/routes";
import workoutService from "../../services/workoutService";
import nutritionService from "../../services/nutritionService";
import checkinService from "../../services/checkinService";
import progressPhotoService from "../../services/progressPhotoService";
import activityService from "../../services/activityService";
import mealLogService from "../../services/mealLogService";
import NutritionCard from "../../components/nutrition/NutritionCard";
import { localToday } from "../../lib/nutritionTotals";
import { exerciseSummaryLine } from "../../lib/workoutSets";

const todayDayNumber = () => {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
};
const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";

// Compact "time ago" for the activity feed.
const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return fmtDate(iso);
};

// Map client-visible activity types → friendly title + accent dot.
const ACTIVITY_META = {
  WORKOUT_PUBLISHED:       { title: "Workout Assigned",        dot: "bg-primary" },
  NUTRITION_PUBLISHED:     { title: "Nutrition Plan Assigned", dot: "bg-amber-400" },
  CHECKIN_SUBMITTED:       { title: "Check-In Submitted",      dot: "bg-emerald-400" },
  PROGRESS_PHOTO_UPLOADED: { title: "Progress Photo Uploaded", dot: "bg-violet-400" },
  MEAL_CHECKIN_UPLOADED:   { title: "Meal Photo Uploaded",     dot: "bg-sky-400" },
  MEAL_PHOTO_UPLOADED:     { title: "Meal Photo Uploaded",     dot: "bg-sky-400" },
  WORKOUT_COMPLETED:       { title: "Workout Completed",       dot: "bg-primary" },
  EXERCISE_COMPLETED:      { title: "Exercise Completed",      dot: "bg-emerald-400" },
  ACCOUNT_LINKED:          { title: "Account Linked",          dot: "bg-primary" },
  INVITE_ACTIVATED:        { title: "Account Activated",       dot: "bg-emerald-400" },
  CLIENT_DETAILS_UPDATED:  { title: "Profile Updated",         dot: "bg-sky-400" },
};

/**
 * ClientDashboard — the client's home. Five sections per spec:
 *   1. Today's Workout (with inline completion)
 *   2. Recent Activity
 *   3. Active Nutrition Plan
 *   4. Progress Summary
 *   5. Upcoming Check-In
 * Each read is independently `.catch`-guarded so one failing endpoint never
 * blanks the whole dashboard.
 */
const ClientDashboard = () => {
  const { user } = useAuthContext();
  const firstName = (user?.name || "there").split(" ")[0];
  const initials  = (user?.name || "?").split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  const [workouts,    setWorkouts]    = useState([]);
  const [completions, setCompletions] = useState([]);
  const [nutrition,   setNutrition]   = useState([]);
  const [checkins,    setCheckins]    = useState([]);
  const [photos,      setPhotos]      = useState([]);
  const [activities,  setActivities]  = useState([]);
  const [nutritionToday, setNutritionToday] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [busyId,      setBusyId]      = useState(null);
  const [toast,       setToast]       = useState(null);

  // Client's LOCAL day for the nutrition "today" summary (never server UTC).
  const local = useMemo(() => localToday(), []);
  const primaryPlan = workouts[0] || null;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [w, n, c, p, a, nt] = await Promise.all([
        workoutService.listMine().catch(() => []),
        nutritionService.listMine().catch(() => []),
        checkinService.listMine({ limit: 10 }).catch(() => []),
        progressPhotoService.listMine().catch(() => []),
        activityService.listMine({ limit: 8 }).catch(() => []),
        mealLogService.today(local).catch(() => null),
      ]);
      setWorkouts(w);
      setNutrition(n);
      setCheckins(c);
      setPhotos(p);
      setActivities(a);
      setNutritionToday(nt);
      const plan = w[0];
      if (plan) {
        setCompletions(await workoutService.completions(plan._id).catch(() => []));
      } else {
        setCompletions([]);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load your dashboard");
    } finally {
      setLoading(false);
    }
  }, [local]);

  useEffect(() => { load(); }, [load]);

  // Telemetry: record that the client viewed today's workout (deduped server-side).
  useEffect(() => { workoutService.logTodayViewed(); }, []);

  const markDone = async (exerciseId) => {
    if (!primaryPlan) return;
    setBusyId(exerciseId);
    try {
      await workoutService.completeExercise(primaryPlan._id, exerciseId);
      setCompletions(await workoutService.completions(primaryPlan._id));
      setToast({ kind: "success", message: "Exercise completed" });
    } catch (e) {
      setToast({ kind: "error", message: e?.response?.data?.message || "Could not mark complete" });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Hey {firstName}! 👋</h2>
          <p className="text-sm text-text-secondary mt-1">Loading your portal…</p>
        </div>
        <SkeletonGrid count={3} columns="lg:grid-cols-3 xl:grid-cols-3" />
      </div>
    );
  }
  if (error) return <ErrorState title="Couldn't load your dashboard" message={error} onRetry={load} />;

  // ── Derived data ─────────────────────────────────────────────
  const completedIds = new Set(completions.map((c) => String(c.exerciseId)));
  const currentDay = todayDayNumber();
  const todaysExercises = (primaryPlan?.exercises || [])
    .filter((ex) => Number(ex.dayNumber || 1) === currentDay)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const doneToday = todaysExercises.filter((ex) => completedIds.has(String(ex._id))).length;
  const pctToday = todaysExercises.length ? Math.round((doneToday / todaysExercises.length) * 100) : 0;

  const nutritionPlan = nutrition[0] || null;
  // Scheduled (v2) plans get the rich macro summary; flat/legacy plans keep
  // the simple plan widget so nothing is lost.
  const hasSchedule = (nutritionPlan?.schedule || []).length > 0;
  const lastCheckin   = checkins[0] || null;
  const lastPhoto     = photos[0]   || null;

  // Upcoming check-in: weekly cadence from the last check-in (or due now).
  let nextCheckinLabel = "Due now";
  let checkinSubtext = lastCheckin ? `Last: ${fmtDate(lastCheckin.createdAt)}` : "No check-ins yet";
  if (lastCheckin?.createdAt) {
    const next = new Date(lastCheckin.createdAt);
    next.setDate(next.getDate() + 7);
    const days = Math.ceil((next.getTime() - Date.now()) / 86400000);
    nextCheckinLabel = days <= 0 ? "Due now" : days === 1 ? "Tomorrow" : `In ${days} days`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-300 flex items-center justify-center text-base font-bold">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Hey {firstName}! 👋</h2>
              <p className="text-sm text-text-secondary mt-0.5">{DAY_NAMES[currentDay]} · Let&apos;s make it count.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 text-[12px] font-medium">
            <CheckCircleIcon size={12} /> Active
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1 — Today's Workout */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Card.Title>Today&apos;s Workout</Card.Title>
                <Card.Description>{DAY_NAMES[currentDay]}{primaryPlan ? ` · ${primaryPlan.planName}` : ""}</Card.Description>
              </div>
              {todaysExercises.length > 0 && (
                <span className="text-[12px] font-semibold text-primary whitespace-nowrap">{pctToday}% · {doneToday}/{todaysExercises.length}</span>
              )}
            </div>
          </Card.Header>
          <Card.Body>
            {!primaryPlan ? (
              <p className="text-sm text-text-secondary">No workout assigned yet. Your coach will publish one soon.</p>
            ) : todaysExercises.length === 0 ? (
              <p className="text-sm text-text-secondary">Rest day — nothing scheduled for {DAY_NAMES[currentDay]}. 🛌</p>
            ) : (
              <>
                <div className="h-2 rounded-full bg-surface-elevated overflow-hidden mb-4">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pctToday}%` }} />
                </div>
                <div className="space-y-2">
                  {todaysExercises.map((ex) => {
                    const completed = completedIds.has(String(ex._id));
                    return (
                      <button
                        key={ex._id}
                        type="button"
                        onClick={() => !completed && markDone(ex._id)}
                        disabled={completed || busyId === ex._id}
                        className={[
                          "w-full text-left flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors",
                          completed
                            ? "bg-primary/[0.06] border-primary/30 cursor-default"
                            : "bg-surface-elevated border-border hover:border-primary/40",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 transition-colors",
                            completed ? "bg-primary border-primary text-black" : "border-text-muted/60 text-transparent",
                          ].join(" ")}
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8.5l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-semibold truncate ${completed ? "text-text-secondary line-through" : "text-text-primary"}`}>
                            {ex.name}
                          </span>
                          <span className="block text-[12px] text-text-muted">
                            {exerciseSummaryLine(ex)}
                          </span>
                        </span>
                        <span className="text-[11px] font-medium text-text-muted shrink-0">
                          {completed ? "Done" : busyId === ex._id ? "…" : "Tap to log"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Link to={ROUTES.CLIENT_WORKOUT} className="inline-block mt-4 text-[12px] text-primary hover:text-primary-hover">
                  Open full workout →
                </Link>
              </>
            )}
          </Card.Body>
        </Card>

        {/* Side column — Nutrition + Upcoming Check-In */}
        <div className="space-y-4">
          {/* 3 — Active Nutrition. Scheduled plans show the shared macro
              summary (same data + reviewed-only rule as the full card);
              flat/legacy plans keep the simple plan widget. Both link out. */}
          {hasSchedule ? (
            <NutritionCard compact summary={nutritionToday} to={ROUTES.CLIENT_NUTRITION} />
          ) : (
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <Card.Title>Nutrition Plan</Card.Title>
                  <Link to={ROUTES.CLIENT_NUTRITION} className="text-[12px] text-primary hover:text-primary-hover">Open →</Link>
                </div>
              </Card.Header>
              <Card.Body>
                {!nutritionPlan ? (
                  <p className="text-sm text-text-secondary">No nutrition plan yet.</p>
                ) : (
                  <>
                    <p className="text-base font-semibold text-text-primary truncate">{nutritionPlan.planName}</p>
                    <p className="text-sm text-text-secondary mt-2">
                      {nutritionPlan.calories != null ? `${nutritionPlan.calories} kcal/day` : "Macros TBD"}
                      {nutritionPlan.dietType ? ` · ${nutritionPlan.dietType}` : ""}
                    </p>
                  </>
                )}
              </Card.Body>
            </Card>
          )}

          {/* 5 — Upcoming Check-In */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Upcoming Check-In</Card.Title>
                <CalendarIcon size={16} className="text-text-muted" />
              </div>
            </Card.Header>
            <Card.Body>
              <p className="text-2xl font-semibold text-text-primary">{nextCheckinLabel}</p>
              <p className="text-[12px] text-text-muted mt-1">{checkinSubtext}</p>
            </Card.Body>
          </Card>
        </div>

        {/* 2 — Recent Activity */}
        <Card className="lg:col-span-2">
          <Card.Header><Card.Title>Recent Activity</Card.Title></Card.Header>
          <Card.Body>
            {activities.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">No recent activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => {
                  const meta = ACTIVITY_META[a.type] || { title: "Update", dot: "bg-zinc-400" };
                  return (
                    <div key={a._id} className="flex items-start gap-3">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary">{meta.title}</p>
                        <p className="text-[12.5px] text-text-secondary truncate">{a.summary}</p>
                      </div>
                      <span className="text-[11px] text-text-muted whitespace-nowrap shrink-0">{timeAgo(a.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* 4 — Progress Summary */}
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <Card.Title>Progress</Card.Title>
              <Link to={ROUTES.CLIENT_PROGRESS} className="text-[12px] text-primary hover:text-primary-hover">Open →</Link>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-[12px]">Latest weight</span>
                <span className="text-text-primary font-medium">{lastCheckin?.weight != null ? `${lastCheckin.weight} kg` : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-[12px]">Last photo</span>
                <span className="text-text-primary font-medium">{lastPhoto ? `Week ${lastPhoto.weekNumber}` : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-[12px]">Last check-in</span>
                <span className="text-text-primary font-medium">{lastCheckin ? fmtDate(lastCheckin.createdAt) : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-[12px]">Active workouts</span>
                <span className="text-text-primary font-medium flex items-center gap-1.5">
                  <FlameIcon size={13} className="text-amber-300" /> {workouts.length}
                </span>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default ClientDashboard;
