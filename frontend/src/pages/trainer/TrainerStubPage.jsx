import Card from "../../components/ui/Card";

const TrainerStubPage = ({ title, description }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      <p className="text-sm text-text-secondary mt-1">{description}</p>
    </div>
    <Card>
      <Card.Body>
        <p className="text-sm text-text-secondary">Stub — implementation coming in a later pass.</p>
      </Card.Body>
    </Card>
  </div>
);

export default TrainerStubPage;
