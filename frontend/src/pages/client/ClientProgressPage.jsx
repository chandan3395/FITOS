import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const MEASUREMENTS = [
  { label: "Waist",   value: 74, unit: "cm", delta: "▼ 4cm", color: "bg-primary" },
  { label: "Hips",    value: 95, unit: "cm", delta: "▼ 3cm", color: "bg-violet-400" },
  { label: "Body Fat", value: 26, unit: "%",  delta: "▼ 2%",  color: "bg-amber-400" },
];

const ClientProgressPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold text-text-primary">My Progress</h2>
      <p className="text-sm text-text-secondary mt-1">Weight journey, measurements and weekly photos.</p>
    </div>

    {/* Weight journey + Measurements */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-text-muted uppercase mb-3">My Weight Journey</p>
        <div className="flex items-end gap-3 mb-4">
          <p className="text-3xl font-bold text-text-primary">68.0</p>
          <p className="text-sm text-text-muted mb-1">kg now</p>
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 text-[11px] font-medium">
            ▼ 3.2 kg
          </span>
        </div>

        {/* Tiny chart placeholder */}
        <div className="h-24 flex items-end gap-1.5">
          {[71.2, 70.8, 70.4, 69.9, 69.5, 69.0, 68.6, 68.0].map((v, i) => {
            const min = 67, max = 72;
            const h = ((v - min) / (max - min)) * 100;
            return (
              <div key={i} className="flex-1 rounded-t bg-emerald-400/30 hover:bg-emerald-400/50 transition-colors" style={{ height: `${h}%` }} />
            );
          })}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-text-muted mb-1.5">
            <span>Goal: 62 kg</span>
            <span>6 kg to go</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: "35%" }} />
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-text-muted uppercase mb-4">Measurements</p>
        <div className="space-y-3">
          {MEASUREMENTS.map((m) => (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12.5px] text-text-primary">{m.label}</span>
                <span className="text-[12.5px] text-text-secondary">
                  {m.value} {m.unit} <span className="text-emerald-300 ml-1">{m.delta}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div className={`h-full ${m.color}`} style={{ width: `${Math.min(100, m.value)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>

    {/* Progress photos */}
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Card.Title>Progress Photos</Card.Title>
          <Card.Description>Week 8 — Latest</Card.Description>
        </div>
        <Button size="sm">+ Upload Week 9</Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {["Front", "Side", "Back"].map((v) => (
          <div key={v} className="aspect-[3/4] rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-muted text-[12px]">
            {v}
          </div>
        ))}
      </div>
    </Card>
  </div>
);

export default ClientProgressPage;
