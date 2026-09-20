import { input, nutrients } from "./nutritionUtils";
export default function TargetEditor({ value, onChange, label = "Daily targets (optional)" }) {
  return (
    <fieldset className="border border-border rounded-xl p-4">
      <legend className="px-2 font-medium">{label}</legend>
      <p className="text-sm text-text-secondary mb-3">
        Leave a field blank for no target.
      </p>
      <div className="grid max-w-3xl grid-cols-2 lg:grid-cols-4 gap-3">
        {nutrients.map(([key, text, unit]) => (
          <label key={key} className="text-sm min-w-0">
            {text} target ({unit})
            <input
              className={input}
              type="number"
              min="0"
              step="0.01"
              max={key === "calories" ? 30000 : 5000}
              value={value?.[key] ?? ""}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
