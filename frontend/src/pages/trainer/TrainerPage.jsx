import TrainerLayout from "../../components/layouts/TrainerLayout";
import Card from "../../components/ui/Card";

const TrainerPage = () => {
  return (
    <TrainerLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Trainer Dashboard</h2>
          <p className="text-sm text-text-secondary mt-1">Placeholder — coming in a later phase</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["Clients", "Sessions", "Plans"].map((label) => (
            <Card key={label}>
              <p className="text-xs text-text-muted uppercase tracking-wider font-medium">{label}</p>
              <p className="text-2xl font-bold text-text-primary mt-2">—</p>
            </Card>
          ))}
        </div>
      </div>
    </TrainerLayout>
  );
};

export default TrainerPage;
