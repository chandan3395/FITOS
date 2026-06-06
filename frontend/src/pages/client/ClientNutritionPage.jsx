import { useCallback, useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import { EmptyState, ErrorState, SkeletonDetail } from "../../components/feedback/States";
import nutritionService from "../../services/nutritionService";

/**
 * ClientNutritionPage — reads the client's own ACTIVE nutrition plans
 * from `GET /api/nutrition/client/me`. When the trainer publishes a
 * plan, it appears here immediately. Until then we render the empty
 * state. No mock data.
 */
const Stat = ({ label, value, unit }) => (
  <div className="rounded-lg border border-border bg-surface-elevated p-4">
    <p className="text-[11px] uppercase tracking-wider text-text-muted">{label}</p>
    <p className="text-2xl font-semibold text-text-primary mt-1">
      {value ?? "—"}
      {value != null && unit && <span className="ml-1 text-sm text-text-muted">{unit}</span>}
    </p>
  </div>
);

const ClientNutritionPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setPlans(await nutritionService.listMine()); }
    catch (e) { setError(e?.response?.data?.message || "Failed to load nutrition plan"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SkeletonDetail />;
  if (error) return <ErrorState title="Couldn't load your nutrition plan" message={error} onRetry={load} />;

  // Most recent first; backend already filters ACTIVE.
  const plan = plans[0] || null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">My Nutrition</h2>
        <p className="text-sm text-text-secondary mt-1">Daily macros and preferences.</p>
      </div>

      {!plan ? (
        <Card>
          <Card.Body>
            <EmptyState
              title="No nutrition plan yet"
              description="Once your coach publishes a plan, your macro targets will appear here."
            />
          </Card.Body>
        </Card>
      ) : (
        <>
          <Card>
            <Card.Header>
              <Card.Title>{plan.planName}</Card.Title>
              <Card.Description>{plan.dietType ? `${plan.dietType} · ` : ""}Active plan from your coach.</Card.Description>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Calories"    value={plan.calories}    unit="kcal" />
                <Stat label="Protein"     value={plan.protein}     unit="g" />
                <Stat label="Carbs"       value={plan.carbs}       unit="g" />
                <Stat label="Fats"        value={plan.fats}        unit="g" />
                <Stat label="Water"       value={plan.waterTarget} unit="L/day" />
                <Stat label="Meals / day" value={plan.mealsPerDay} />
                <Stat label="Cheat meals" value={plan.cheatMeals}  unit="/wk" />
                <Stat label="Diet type"   value={plan.dietType} />
              </div>
            </Card.Body>
          </Card>

          {(plan.foodAvoidances || plan.eatingHabits || plan.notes) && (
            <Card>
              <Card.Header><Card.Title>Notes & Preferences</Card.Title></Card.Header>
              <Card.Body className="space-y-4">
                {plan.foodAvoidances && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-muted">Foods to avoid</p>
                    <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{plan.foodAvoidances}</p>
                  </div>
                )}
                {plan.eatingHabits && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-muted">Eating habits</p>
                    <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{plan.eatingHabits}</p>
                  </div>
                )}
                {plan.notes && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-muted">Coach notes</p>
                    <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{plan.notes}</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ClientNutritionPage;
