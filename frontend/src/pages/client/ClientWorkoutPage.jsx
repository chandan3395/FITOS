import { useCallback, useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { CheckCircleIcon } from "../../components/design-system/Icons";
import { EmptyState, ErrorState, SkeletonDetail, Toast } from "../../components/feedback/States";
import workoutService from "../../services/workoutService";

const todayDayNumber = () => {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
};

const fmtDateTime = (iso) => iso
  ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  : "-";

const exerciseLine = (exercise) => {
  const weight = exercise.weight != null ? ` · ${exercise.weight} kg` : "";
  const rest = exercise.restSeconds != null ? ` · ${exercise.restSeconds}s rest` : "";
  return `${exercise.sets || "-"} sets × ${exercise.reps || "-"} reps${weight}${rest}`;
};

const ClientWorkoutPage = () => {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextPlans = await workoutService.listMine();
      setPlans(nextPlans);
      const nextSelectedId = selectedPlanId || nextPlans[0]?._id || null;
      setSelectedPlanId(nextSelectedId);
      if (nextSelectedId) {
        setCompletions(await workoutService.completions(nextSelectedId));
      } else {
        setCompletions([]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load workout plan");
    } finally {
      setLoading(false);
    }
  }, [selectedPlanId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectPlan = async (planId) => {
    setSelectedPlanId(planId);
    setCompletions(await workoutService.completions(planId).catch(() => []));
  };

  const markCompleted = async (exerciseId) => {
    if (!selectedPlanId) return;
    setActionBusy(exerciseId);
    try {
      await workoutService.completeExercise(selectedPlanId, exerciseId);
      setCompletions(await workoutService.completions(selectedPlanId));
      setToast({ kind: "success", message: "Exercise completed" });
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Could not mark exercise completed" });
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) return <SkeletonDetail />;
  if (error) return <ErrorState title="Couldn't load your workout" message={error} onRetry={load} />;

  const plan = plans.find((item) => item._id === selectedPlanId) || plans[0] || null;
  const completionMap = new Map(completions.map((completion) => [String(completion.exerciseId), completion]));
  const exercises = plan?.exercises || [];
  const currentDay = todayDayNumber();
  const todaysExercises = exercises
    .filter((exercise) => Number(exercise.dayNumber || 1) === currentDay)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const completedCount = exercises.filter((exercise) => completionMap.has(String(exercise._id))).length;
  const progress = exercises.length ? Math.round((completedCount / exercises.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">My Workout</h2>
        <p className="text-sm text-text-secondary mt-1">Today&apos;s session and weekly plan.</p>
      </div>

      {!plan ? (
        <EmptyState
          title="No workout plan assigned yet"
          description="Your coach will assign a workout plan shortly. Once it is published, it will appear here."
        />
      ) : (
        <>
          <Card>
            <Card.Header>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <Card.Title>{plan.planName}</Card.Title>
                  <Card.Description>{plan.goal || "Workout plan"}</Card.Description>
                </div>
                {plans.length > 1 && (
                  <select value={plan._id} onChange={(e) => selectPlan(e.target.value)} className="h-9 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary">
                    {plans.map((item) => <option key={item._id} value={item._id}>{item.planName}</option>)}
                  </select>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-muted">Progress</p>
                  <p className="text-2xl font-semibold text-text-primary mt-1">{progress}%</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-muted">Completed</p>
                  <p className="text-2xl font-semibold text-text-primary mt-1">{completedCount}/{exercises.length}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-muted">Duration</p>
                  <p className="text-2xl font-semibold text-text-primary mt-1">{plan.durationWeeks || "-"} wk</p>
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-surface-elevated overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Day {currentDay} Workout</Card.Title>
              <Card.Description>{todaysExercises.length} exercises scheduled today.</Card.Description>
            </Card.Header>
            <Card.Body>
              {todaysExercises.length === 0 ? (
                <p className="text-sm text-text-muted py-4">No exercises scheduled for today.</p>
              ) : (
                <div className="space-y-3">
                  {todaysExercises.map((exercise) => {
                    const completed = completionMap.has(String(exercise._id));
                    return (
                      <div key={exercise._id} className="rounded-lg border border-border bg-surface-elevated p-4 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {completed && <CheckCircleIcon size={16} className="text-emerald-300" />}
                            <p className="text-sm font-semibold text-text-primary">{exercise.name}</p>
                          </div>
                          <p className="text-[12px] text-text-secondary mt-1">{exerciseLine(exercise)}</p>
                          {exercise.notes && <p className="text-[12px] text-text-muted mt-2">{exercise.notes}</p>}
                        </div>
                        <Button
                          size="sm"
                          variant={completed ? "secondary" : "primary"}
                          disabled={completed}
                          loading={actionBusy === exercise._id}
                          onClick={() => markCompleted(exercise._id)}
                        >
                          {completed ? "Completed" : "Mark Done"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Workout History</Card.Title>
              <Card.Description>Completed exercise log for this plan.</Card.Description>
            </Card.Header>
            <Card.Body>
              {completions.length === 0 ? (
                <p className="text-sm text-text-muted py-4">No exercise completions yet.</p>
              ) : (
                <div className="space-y-2">
                  {completions.map((completion) => {
                    const exercise = exercises.find((item) => String(item._id) === String(completion.exerciseId));
                    return (
                      <div key={completion._id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-elevated border border-border px-3 py-2">
                        <p className="text-sm text-text-primary">{exercise?.name || "Exercise"}</p>
                        <p className="text-[12px] text-text-muted">{fmtDateTime(completion.completedAt)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default ClientWorkoutPage;
