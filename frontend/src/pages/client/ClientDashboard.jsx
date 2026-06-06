import Card from "../../components/ui/Card";
import { CheckCircleIcon, FlameIcon } from "../../components/design-system/Icons";
import { useAuthContext } from "../../contexts/AuthContext";
import { EmptyState } from "../../components/feedback/States";

const ClientDashboard = () => {
  const { user } = useAuthContext();
  const firstName = (user?.name || "there").split(" ")[0];
  const initials  = (user?.name || "?").split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <div className="space-y-6">
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

      <Card>
        <Card.Header>
          <Card.Title>Today</Card.Title>
          <Card.Description>Workouts, nutrition and check-ins will appear here once your coach assigns them.</Card.Description>
        </Card.Header>
        <Card.Body>
          <EmptyState
            title="Nothing assigned yet"
            description="Your coach is preparing your plan. You'll see today's workout, meal targets and check-in actions here."
          />
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <Card.Title>Progress</Card.Title>
            <FlameIcon size={16} className="text-text-muted" />
          </div>
        </Card.Header>
        <Card.Body>
          <p className="text-sm text-text-secondary">
            Streaks, weight journey and check-in history populate after your first weekly check-in.
          </p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ClientDashboard;
