import { useEffect, useRef } from "react";
import { Chart, LineController, LineElement, PointElement, LinearScale, Tooltip } from "chart.js";
Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip);
export default function WeightGraph({ records }) {
  const canvas = useRef(null);
  const weights = records
    .filter((r) => r.measurements.weightKg != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const signature = JSON.stringify(weights.map((r) => [r.date, r.measurements.weightKg]));
  useEffect(() => {
    const rows = JSON.parse(signature);
    if (!rows.length) return;
    const values = rows.map(([, value]) => value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const margin = Math.max(2.5, (hi - lo) * 0.15);
    const firstDate = new Date(`${rows[0][0]}T12:00:00Z`).getTime();
    const lastDate = new Date(`${rows[rows.length - 1][0]}T12:00:00Z`).getTime();
    const tokens = getComputedStyle(document.documentElement);
    const color = (name) => tokens.getPropertyValue(name).trim();
    const chart = new Chart(canvas.current, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Recorded weight (kg)",
            data: rows.map(([date, value]) => ({
              x: new Date(`${date}T12:00:00Z`).getTime(),
              y: value,
            })),
            borderColor: color("--accent"),
            backgroundColor: color("--accent"),
            pointRadius: 5,
            pointHitRadius: 20,
            showLine: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          tooltip: {
            backgroundColor: color("--surface-3"),
            titleColor: color("--text-1"),
            bodyColor: color("--text-2"),
            borderColor: color("--line"),
            borderWidth: 1,
            callbacks: {
              title: (items) => new Date(items[0].parsed.x).toISOString().slice(0, 10),
              label: (item) => `${item.parsed.y} kg`,
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            grid: { color: color("--line") },
            min: firstDate - (rows.length === 1 ? 86400000 : 0),
            max: lastDate + (rows.length === 1 ? 86400000 : 0),
            title: { display: true, text: "Measurement date", color: color("--text-2") },
            ticks: {
              color: color("--text-2"),
              maxTicksLimit: 4,
              callback: (value) => new Date(value).toISOString().slice(0, 10),
            },
          },
          y: {
            min: Math.max(0, Math.floor(lo - margin)),
            max: Math.ceil(hi + margin),
            title: { display: true, text: "kg", color: color("--text-2") },
            ticks: { color: color("--text-2") },
            grid: { color: color("--line") },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [signature]);
  return (
    <section aria-label="Weight history graph" className="space-y-3">
      <h2 className="text-xl font-semibold">Weight history</h2>
      {weights.length ? (
        <>
          <div className="relative h-64 w-full">
            <canvas
              ref={canvas}
              role="img"
              aria-label="Recorded weights by measurement date. Exact values are listed below."
            />
          </div>
          <p className="text-sm text-text-secondary">
            {weights.length === 1
              ? "One recorded point. Add another date to see changes."
              : "Actual measurements only; no estimated values between dates."}{" "}
            Hover or tap a point for its exact date and weight. The onboarding baseline is shown
            separately above.
          </p>
        </>
      ) : (
        <p>No saved weights in this range. Measurement-only entries appear in the history below.</p>
      )}
    </section>
  );
}
