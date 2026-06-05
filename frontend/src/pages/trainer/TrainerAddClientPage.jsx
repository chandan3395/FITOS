import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import {
  UserIcon,
  TargetIcon,
  CheckCircleIcon,
  WarningIcon,
} from "../../components/design-system/Icons";
import { ROUTES } from "../../constants/routes";
import { Toast } from "../../components/feedback/States";
import clientService from "../../services/clientService";

const STEPS = [
  { id: 1, label: "Personal Info" },
  { id: 2, label: "Body & Health" },
  { id: 3, label: "Goals & Program" },
  { id: 4, label: "Nutrition" },
  { id: 5, label: "Notes & Access" },
];

// ── Field helpers ─────────────────────────────────────────────
const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-2">
    {children} {required && <span className="text-red-400">*</span>}
  </label>
);

const Field = ({ label, required, children, span = 1 }) => (
  <div className={`col-span-${span}`}>
    <Label required={required}>{label}</Label>
    {children}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className="w-full h-10 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333] transition-colors"
  />
);

const Select = ({ children, ...props }) => (
  <select
    {...props}
    className="w-full h-10 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-[#333] transition-colors"
  >
    {children}
  </select>
);

const Textarea = (props) => (
  <textarea
    {...props}
    className="w-full min-h-[88px] p-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333] transition-colors resize-y"
  />
);

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "h-8 px-3 rounded-full text-[12px] font-medium transition-all duration-150",
      active
        ? "bg-primary/15 text-primary border border-primary/40"
        : "bg-surface-elevated border border-border text-text-secondary hover:text-text-primary hover:border-[#333]",
    ].join(" ")}
  >
    {children}
  </button>
);

const SectionHeader = ({ Icon, title, description, accent = "bg-primary/10 text-primary" }) => (
  <div className="flex items-start gap-3 mb-5">
    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
      <Icon size={18} />
    </span>
    <div>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <p className="text-sm text-text-secondary mt-0.5">{description}</p>
    </div>
  </div>
);

// ── Stepper ──────────────────────────────────────────────────
const Stepper = ({ current }) => (
  <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
    {STEPS.map((s, i) => {
      const done = current > s.id;
      const active = current === s.id;
      return (
        <div key={s.id} className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <span
              className={[
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors",
                done
                  ? "bg-emerald-500/20 text-emerald-300"
                  : active
                    ? "bg-primary text-white"
                    : "bg-surface-elevated text-text-muted border border-border",
              ].join(" ")}
            >
              {done ? "✓" : s.id}
            </span>
            <span
              className={[
                "text-[12.5px] font-medium",
                done ? "text-emerald-300" : active ? "text-text-primary" : "text-text-muted",
              ].join(" ")}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && <span className="hidden sm:inline-block w-8 h-px bg-border" />}
        </div>
      );
    })}
  </div>
);

// ── Live preview panel ────────────────────────────────────────
const LivePreview = ({ form, step }) => {
  const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ") || "New Client";
  const bmi = useMemo(() => {
    const h = parseFloat(form.height);
    const w = parseFloat(form.weight);
    if (!h || !w) return null;
    const m = h / 100;
    return (w / (m * m)).toFixed(1);
  }, [form.height, form.weight]);

  const completeness = Math.min(100, step * 18 + (form.firstName ? 5 : 0));

  const PreviewRow = ({ label, value }) => (
    <div className="flex items-center justify-between text-[12.5px] py-1.5 border-b border-border last:border-0">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary font-medium">{value || <span className="text-text-muted">—</span>}</span>
    </div>
  );

  return (
    <Card padding="md" className="sticky top-24">
      <p className="text-[10px] font-semibold tracking-[0.18em] text-text-muted uppercase mb-3">Live Preview</p>

      <div className="flex flex-col items-center text-center py-3">
        <div className="w-14 h-14 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-base font-bold mb-3">
          {form.firstName?.[0]?.toUpperCase() || "?"}
        </div>
        <p className="text-base font-semibold text-text-primary">{fullName}</p>
        <p className="text-[12px] text-text-muted mt-0.5">{form.goal || "Goal not set yet"}</p>
      </div>

      <div className="mt-4">
        <PreviewRow label="Age" value={form.age} />
        <PreviewRow label="Height" value={form.height ? `${form.height} cm` : ""} />
        <PreviewRow label="Weight" value={form.weight ? `${form.weight} kg` : ""} />
        <PreviewRow label="Target" value={form.targetWeight ? `${form.targetWeight} kg` : ""} />
        <PreviewRow label="BMI" value={bmi} />
        <PreviewRow label="Program" value={form.duration} />
        <PreviewRow label="Start" value={form.startDate} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-text-muted mb-1.5">
          <span>Profile completeness</span>
          <span className="text-text-primary font-semibold">{completeness}%</span>
        </div>
        <div className="h-1 rounded-full bg-border overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${completeness}%` }} />
        </div>
      </div>
    </Card>
  );
};

// ── Steps ────────────────────────────────────────────────────
const Step1 = ({ form, update }) => (
  <>
    <SectionHeader
      Icon={UserIcon}
      title="Personal Information"
      description="Client's basic identity and contact details"
    />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Field label="First name" required>
        <Input placeholder="Priya" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
      </Field>
      <Field label="Last name" required>
        <Input placeholder="Sharma" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
      </Field>
      <Field label="Date of birth" required>
        <Input type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} />
      </Field>

      <Field label="Gender" required>
        <Select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
          <option value="">Select</option>
          <option>MALE</option>
          <option>FEMALE</option>
          <option>OTHER</option>
        </Select>
      </Field>
      <Field label="Phone" required>
        <Input placeholder="+91 98765 43210" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
      </Field>
      <Field label="Email">
        <Input type="email" placeholder="priya@email.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
      </Field>

      <Field label="City">
        <Input placeholder="Bengaluru" value={form.city} onChange={(e) => update("city", e.target.value)} />
      </Field>
      <Field label="Occupation" span={2}>
        <Input placeholder="Software Engineer" value={form.occupation} onChange={(e) => update("occupation", e.target.value)} />
      </Field>
    </div>
  </>
);

const Step2 = ({ form, update }) => (
  <>
    <SectionHeader
      Icon={TargetIcon}
      title="Body Measurements"
      description="Baseline measurements at program start"
      accent="bg-emerald-500/10 text-emerald-300"
    />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Field label="Height" required>
        <Input placeholder="165 cm" value={form.height} onChange={(e) => update("height", e.target.value)} />
      </Field>
      <Field label="Current weight" required>
        <Input placeholder="68 kg" value={form.weight} onChange={(e) => update("weight", e.target.value)} />
      </Field>
      <Field label="Body fat %">
        <Input placeholder="28%" value={form.bodyFat} onChange={(e) => update("bodyFat", e.target.value)} />
      </Field>
      <Field label="BMI (auto)">
        <Input disabled placeholder="Auto" />
      </Field>
    </div>

    <SectionHeader
      Icon={WarningIcon}
      title="Health History & Medical"
      description="Injuries, conditions, medications — critical for safe programming"
      accent="bg-red-500/10 text-red-300"
    />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Medical conditions"><Input placeholder="e.g. Diabetes, Hypertension" /></Field>
      <Field label="Current medications"><Input placeholder="e.g. Metformin" /></Field>
      <Field label="Past injuries"><Input placeholder="e.g. ACL tear, lower back" /></Field>
      <Field label="Allergies / dietary restrictions"><Input placeholder="e.g. Lactose intolerant" /></Field>
    </div>
  </>
);

const GOAL_OPTIONS = [
  "Weight Loss", "Muscle Gain", "Fat Loss", "Body Recomposition",
  "Toning & Shaping", "Athletic Performance", "Flexibility & Mobility", "General Fitness",
];

const Step3 = ({ form, update }) => (
  <>
    <SectionHeader
      Icon={TargetIcon}
      title="Fitness Goals"
      description="Primary objective and target metrics"
      accent="bg-amber-500/10 text-amber-300"
    />
    <Field label="Primary goal" required>
      <div className="flex flex-wrap gap-2">
        {GOAL_OPTIONS.map((g) => (
          <Chip key={g} active={form.goal === g} onClick={() => update("goal", g)}>{g}</Chip>
        ))}
      </div>
    </Field>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
      <Field label="Target weight">
        <Input placeholder="62.0 kg" value={form.targetWeight} onChange={(e) => update("targetWeight", e.target.value)} />
      </Field>
      <Field label="Target body fat %">
        <Input placeholder="22%" />
      </Field>
      <Field label="Goal timeline">
        <Select>
          <option>Select</option>
          <option>4 weeks</option>
          <option>8 weeks</option>
          <option>12 weeks</option>
          <option>16 weeks</option>
        </Select>
      </Field>
    </div>

    <div className="mt-5">
      <Field label="Goal description / client's own words">
        <Textarea placeholder="e.g. I want to fit into my wedding dress by March." />
      </Field>
    </div>

    <SectionHeader
      Icon={CheckCircleIcon}
      title="Program"
      description="Plan type, duration, and schedule"
    />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Field label="Program start date" required>
        <Input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
      </Field>
      <Field label="Program duration" required>
        <Select value={form.duration} onChange={(e) => update("duration", e.target.value)}>
          <option value="">Select</option>
          <option>4 weeks</option>
          <option>8 weeks</option>
          <option>12 weeks</option>
          <option>16 weeks</option>
        </Select>
      </Field>
      <Field label="Session frequency">
        <Select>
          <option>Select</option>
          <option>3 / week</option>
          <option>4 / week</option>
          <option>5 / week</option>
        </Select>
      </Field>
    </div>
  </>
);

const DIET_OPTIONS = ["Omnivore", "Vegetarian", "Vegan", "Eggetarian", "Keto", "Intermittent Fasting"];

const Step4 = ({ form, update }) => (
  <>
    <SectionHeader
      Icon={TargetIcon}
      title="Nutrition Profile"
      description="Dietary preferences, calorie targets and meal structure"
    />
    <Field label="Diet type">
      <div className="flex flex-wrap gap-2">
        {DIET_OPTIONS.map((d) => (
          <Chip key={d} active={form.diet === d} onClick={() => update("diet", d)}>{d}</Chip>
        ))}
      </div>
    </Field>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
      <Field label="Daily calorie target"><Input placeholder="1800 kcal" /></Field>
      <Field label="Protein target"><Input placeholder="120 g" /></Field>
      <Field label="Carbs target"><Input placeholder="200 g" /></Field>
      <Field label="Fats target"><Input placeholder="60 g" /></Field>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
      <Field label="Meals per day">
        <Select>
          <option>Select</option><option>3</option><option>4</option><option>5</option><option>6</option>
        </Select>
      </Field>
      <Field label="Water intake target"><Input placeholder="3.0 L/day" /></Field>
      <Field label="Cheat meals allowed">
        <Select><option>Select</option><option>None</option><option>1/week</option><option>2/week</option></Select>
      </Field>
    </div>

    <div className="mt-5">
      <Field label="Food dislikes / things to avoid"><Input placeholder="e.g. Broccoli, Tofu" /></Field>
    </div>
    <div className="mt-4">
      <Field label="Current eating habits / notes">
        <Textarea placeholder="Describe the client's current diet, meal timings, relationship with food..." />
      </Field>
    </div>
  </>
);

const Step5 = ({ form, update }) => (
  <>
    <SectionHeader
      Icon={CheckCircleIcon}
      title="Trainer Notes"
      description="Private notes — only visible to you"
      accent="bg-violet-500/10 text-violet-300"
    />
    <Field label="Private notes">
      <Textarea
        placeholder="Internal notes about the client — motivations, sensitivities, anything to remember…"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
      />
    </Field>

    <SectionHeader
      Icon={CheckCircleIcon}
      title="Client Portal Access"
      description="Send an invitation so the client can log in"
    />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Send invite to" span={2}>
        <Input placeholder="priya@email.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
      </Field>
    </div>
    <p className="text-[12.5px] text-text-secondary mt-3">
      The client will receive a one-time invite link valid for 72 hours.
    </p>
  </>
);

// ── Page ─────────────────────────────────────────────────────
const initialForm = {
  firstName: "", lastName: "", dob: "", gender: "", phone: "", email: "",
  city: "", occupation: "",
  height: "", weight: "", bodyFat: "",
  goal: "", targetWeight: "",
  startDate: "", duration: "",
  diet: "",
  notes: "",
};

/**
 * Map the wizard form → the payload shape expected by POST /api/clients.
 * The backend stores `name` as a single string, age in years, and uses
 * separate startingWeight / targetWeight fields.
 */
function toApiPayload(form) {
  const name = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  const age = form.dob ? Math.max(0, Math.floor((Date.now() - new Date(form.dob).getTime()) / 31557600000)) : undefined;
  const num = (v) => (v === "" || v == null ? undefined : Number(v));
  return {
    name,
    phone:         form.phone || undefined,
    gender:        form.gender || undefined,
    age,
    city:          form.city || undefined,
    height:        num(form.height),
    startingWeight: num(form.weight),
    targetWeight:  num(form.targetWeight),
    goal:          form.goal || undefined,
  };
}

/** Local validation matching the backend's required fields. */
function validate(form) {
  const errors = {};
  const name = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  if (!name)                       errors.name  = "First and last name are required.";
  if (!form.phone?.trim())         errors.phone = "Phone is required.";
  if (!form.goal?.trim())          errors.goal  = "Pick a primary goal.";
  return errors;
}

const TrainerAddClientPage = () => {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1);
  const [form, setForm]         = useState(initialForm);
  const [submitting, setSubmit]   = useState(false);
  const [errors, setErrors]       = useState({});
  const [topError, setTopError]   = useState(null);
  const [toast, setToast]         = useState(null);
  const [activation, setActivation] = useState(null); // { token, url, expiresAt, clientName }

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const StepComponent = { 1: Step1, 2: Step2, 3: Step3, 4: Step4, 5: Step5 }[step];

  const next   = () => setStep((s) => Math.min(5, s + 1));
  const back   = () => setStep((s) => Math.max(1, s - 1));
  const cancel = () => navigate(ROUTES.TRAINER_CLIENTS);

  const submit = async () => {
    setTopError(null);
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      // Jump to the earliest step containing a missing field.
      if (v.name)  setStep(1);
      else if (v.phone) setStep(1);
      else if (v.goal)  setStep(3);
      setTopError(Object.values(v)[0]);
      return;
    }

    setSubmit(true);
    try {
      // Include email so the backend can attach it to the auto-generated invite.
      const payload = { ...toApiPayload(form), email: form.email || undefined };
      const result = await clientService.create(payload);
      setActivation({
        clientName: result?.client?.name || "Client",
        url:        result?.invite?.activationUrl,
        expiresAt:  result?.invite?.expiresAt,
      });
      setToast({ kind: "success", message: "Client created — share the activation link" });
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || "Failed to create client";
      if (status === 401) setTopError("Your session expired. Please sign in again.");
      else if (status === 403) setTopError("You don't have permission to create clients.");
      else setTopError(msg);
    } finally {
      setSubmit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Crumbs + step counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={cancel} className="text-text-muted hover:text-text-primary transition-colors">← Back</button>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">Clients</span>
          <span className="text-text-muted">›</span>
          <span className="text-text-primary font-medium">Add New Client</span>
        </div>
        <p className="text-[12px] text-text-muted">
          Step <span className="text-text-primary font-semibold">{step}</span> of {STEPS.length}
        </p>
      </div>

      {/* Stepper */}
      <Card padding="md">
        <Stepper current={step} />
      </Card>

      {activation && (
        <Card>
          <Card.Header>
            <Card.Title>Activation link for {activation.clientName}</Card.Title>
            <Card.Description>
              Share this link with your client. It expires{activation.expiresAt ? ` on ${new Date(activation.expiresAt).toLocaleDateString()}` : " in 72 hours"}.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={activation.url || ""}
                className="flex-1 h-10 px-3 rounded-lg bg-surface-elevated border border-border text-[12.5px] font-mono text-text-primary"
                onClick={(e) => e.target.select()}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(activation.url || "");
                  setToast({ kind: "success", message: "Copied to clipboard" });
                }}
              >
                Copy
              </Button>
              <Button size="sm" onClick={() => navigate(ROUTES.TRAINER_CLIENTS)}>Done</Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Form + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card>
          <Card.Body>
            <StepComponent form={form} update={update} />
            {topError && (
              <div className="mt-5 text-[12.5px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {topError}
              </div>
            )}
            {!topError && errors && Object.keys(errors).length > 0 && (
              <ul className="mt-5 text-[12.5px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 space-y-1">
                {Object.values(errors).map((m, i) => <li key={i}>• {m}</li>)}
              </ul>
            )}
          </Card.Body>
          <div className="border-t border-border pt-4 mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={cancel} disabled={submitting}>Cancel</Button>
            <div className="flex items-center gap-2">
              {step > 1 && <Button variant="secondary" onClick={back} disabled={submitting}>Back</Button>}
              {step < 5 ? (
                <Button onClick={next} disabled={submitting}>Continue →</Button>
              ) : (
                <Button onClick={submit} loading={submitting}>
                  {submitting ? "Creating…" : "Create Client"}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <LivePreview form={form} step={step} />
      </div>

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default TrainerAddClientPage;
