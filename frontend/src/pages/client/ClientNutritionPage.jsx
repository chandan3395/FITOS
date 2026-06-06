import Card from "../../components/ui/Card";
import { EmptyState } from "../../components/feedback/States";

const ClientNutritionPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold text-text-primary">My Nutrition</h2>
      <p className="text-sm text-text-secondary mt-1">Daily macros and meal log.</p>
    </div>
    <Card>
      <Card.Body>
        <EmptyState
          title="No nutrition plan yet"
          description="Once your coach assigns macros and a meal structure, your daily targets and meal log will live here."
        />
      </Card.Body>
    </Card>
  </div>
);

export default ClientNutritionPage;
