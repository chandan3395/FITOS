import Card from "../../components/ui/Card";
import { EmptyState } from "../../components/feedback/States";

const ClientProgressPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold text-text-primary">My Progress</h2>
      <p className="text-sm text-text-secondary mt-1">Weight journey, measurements and weekly photos.</p>
    </div>
    <Card>
      <Card.Body>
        <EmptyState
          title="No progress data yet"
          description="Submit your first weekly check-in and upload photos to start building your progress timeline."
        />
      </Card.Body>
    </Card>
  </div>
);

export default ClientProgressPage;
