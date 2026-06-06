import Card from "../../components/ui/Card";
import { EmptyState } from "../../components/feedback/States";

const ClientWorkoutPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold text-text-primary">My Workout</h2>
      <p className="text-sm text-text-secondary mt-1">Today&apos;s session and weekly plan.</p>
    </div>
    <Card>
      <Card.Body>
        <EmptyState
          title="No workout plan assigned yet"
          description="Your coach will assign a workout plan shortly. Once it's live you'll see today's exercises and weekly schedule here."
        />
      </Card.Body>
    </Card>
  </div>
);

export default ClientWorkoutPage;
