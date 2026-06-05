import ClientLayout from "../../components/layouts/ClientLayout";
import Card from "../../components/ui/Card";

const ClientPage = () => {
  return (
    <ClientLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Client Dashboard</h2>
          <p className="text-sm text-text-secondary mt-1">Placeholder — coming in a later phase</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["Workouts", "Progress", "Trainer"].map((label) => (
            <Card key={label}>
              <p className="text-xs text-text-muted uppercase tracking-wider font-medium">{label}</p>
              <p className="text-2xl font-bold text-text-primary mt-2">—</p>
            </Card>
          ))}
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientPage;
