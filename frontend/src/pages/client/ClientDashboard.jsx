import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import { CheckCircleIcon, FlameIcon } from "../../components/design-system/Icons";
import { useAuthContext } from "../../contexts/AuthContext";
import { ErrorState, SkeletonGrid } from "../../components/feedback/States";
import { ROUTES } from "../../constants/routes";
import workoutService from "../../services/workoutService";
import nutritionService from "../../services/nutritionService";
import checkinService from "../../services/checkinService";
import progressPhotoService from "../../services/progressPhotoService";
import ChangePasswordCard from "../../components/account/ChangePasswordCard";

const todayDayNumber = () => {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
};

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";

/**
 * ClientDashboard — replaces the previous static placeholders with four
 * parallel reads from the client-facing endpoints. Each card surfaces
 * what the spec asked for: active workout count + next workout day,
 * active nutrition plan, latest weight + last photo week + latest
 * check-in. All `.catch(() => [])` so a single endpoint failure doesn't
 * blank the whole dashboard.
 */
const ClientDashboard = () => {
  const { user } = useAuthContext();
  const firstName = (user?.name || "there").split(" ")[0];
  const initials  = (user?.name || "?").split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  const [workouts,  setWorkouts]  = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [checkins,  setCheckins]  = useState([]);
  const [photos,    setPhotos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [w, n, c, p] = await Promise.all([
        workoutService.listMine().catch(() => []),
        nutritionService.listMine().catch(() => []),
        checkinService.listMine({ limit: 10 }).catch(() => []),
        progressPhotoService.listMine().catch(() => []),
      ]);
      setWorkouts(w);
      setNutrition(n);
      setCheckins(c);
      setPhotos(p);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load your dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  // Derive: next workout day = smallest dayNumber ≥ today in the first
  // active plan, falling back to the lowest day of the plan if today
  // and later have nothing.
  const primaryPlan = workouts[0] || null;
  let nextDay = null;
  if (primaryPlan?.exercises?.length) {
    const days = [...new Set(primaryPlan.exercises.map((ex) => Number(ex.dayNumber || 1)))].sort((a, b) => a - b);
    const t = todayDayNumber();
    nextDay = days.find((d) => d >= t) ?? days[0];
  }
  const nutritionPlan = nutrition[0] || null;
  const lastCheckin   = checkins[0] || null;
  const lastPhoto     = photos[0]   || null;

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
              <p className="text-sm text-text-secondary mt-0.5">Welcome to your FITOS portal.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 text-[12px] font-medium">
              <CheckCircleIcon size={12} /> Active
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Workout */}
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <Card.Title>Workout</Card.Title>
              <Link to={ROUTES.CLIENT_WORKOUT} className="text-[12px] text-primary hover:text-primary-hover">Open →</Link>
            </div>
          </Card.Header>
          <Card.Body>
            {!primaryPlan ? (
              <p className="text-sm text-text-secondary">No workout assigned yet.</p>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-wider text-text-muted">Active plans</p>
                <p className="text-2xl font-semibold text-text-primary mt-1">{workouts.length}</p>
                <p className="text-sm text-text-secondary mt-3">
                  Next session: <span className="text-text-primary font-medium">Day {nextDay ?? "—"}</span>
                </p>
                <p className="text-[12px] text-text-muted mt-1 truncate">{primaryPlan.planName}</p>
              </>
            )}
          </Card.Body>
        </Card>

        {/* Nutrition */}
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <Card.Title>Nutrition</Card.Title>
              <Link to={ROUTES.CLIENT_NUTRITION} className="text-[12px] text-primary hover:text-primary-hover">Open →</Link>
            </div>
          </Card.Header>
          <Card.Body>
            {!nutritionPlan ? (
              <p className="text-sm text-text-secondary">No nutrition plan yet.</p>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-wider text-text-muted">Active plan</p>
                <p className="text-base font-semibold text-text-primary mt-1 truncate">{nutritionPlan.planName}</p>
                <p className="text-sm text-text-secondary mt-3">
                  {nutritionPlan.calories != null ? `${nutritionPlan.calories} kcal/day` : "Macros TBD"}
                  {nutritionPlan.dietType ? ` · ${nutritionPlan.dietType}` : ""}
                </p>
              </>
            )}
          </Card.Body>
        </Card>

        {/* Progress */}
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
                <span className="text-text-primary font-medium">
                  {lastCheckin?.weight != null ? `${lastCheckin.weight} kg` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-[12px]">Last photo</span>
                <span className="text-text-primary font-medium">
                  {lastPhoto ? `Week ${lastPhoto.weekNumber}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-[12px]">Last check-in</span>
                <span className="text-text-primary font-medium">
                  {lastCheckin ? fmtDate(lastCheckin.createdAt) : "—"}
                </span>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Today preview */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <Card.Title>Today</Card.Title>
            <FlameIcon size={16} className="text-text-muted" />
          </div>
        </Card.Header>
        <Card.Body>
          {!primaryPlan ? (
            <p className="text-sm text-text-secondary">
              Once your coach publishes a workout plan it will land here.
            </p>
          ) : (
            <p className="text-sm text-text-secondary">
              Open the <Link to={ROUTES.CLIENT_WORKOUT} className="text-primary hover:text-primary-hover">workout page</Link> to see Day {nextDay} exercises and mark them done.
            </p>
          )}
        </Card.Body>
      </Card>

      <ChangePasswordCard />
    </div>
  );
};

export default ClientDashboard;
