import { useMemo, useRef, useState } from "react";
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

// ═════════════════════════════════════════════════════════════
// Wizard steps
// ═════════════════════════════════════════════════════════════
const STEPS = [
  { id: 1, label: "Personal Info" },
  { id: 2, label: "Body & Health" },
  { id: 3, label: "Goals & Program" },
  { id: 4, label: "Nutrition" },
  { id: 5, label: "Notes & Access" },
];

// ═════════════════════════════════════════════════════════════
// Validators — one per step. Each returns { fieldId: errorMessage }.
// Empty object means the step is valid. The fieldId MUST match the
// `id` attribute on the corresponding input so scroll-to-error works.
// ═════════════════════════════════════════════════════════════
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /^[0-9+\s\-()]{7,20}$/;

function isFiniteInRange(v, min, max) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max;
}

const validators = {
  1: (f) => {
    const e = {};
    if (!f.firstName || f.firstName.trim().length < 2)  e.firstName = "First name must be at least 2 characters.";
    if (!f.lastName  || f.lastName.trim().length  < 1)  e.lastName  = "Last name is required.";
    if (!f.dob)                                         e.dob       = "Date of birth is required.";
    else {
      const d = new Date(f.dob);
      if (isNaN(d.getTime()) || d > new Date())         e.dob       = "Date of birth must be a valid past date.";
    }
    if (!f.gender)                                      e.gender    = "Gender is required.";
    if (!f.phone || !PHONE_RX.test(f.phone.trim()))     e.phone     = "Enter a valid phone number (digits, spaces, +, -, () allowed).";
    if (!f.email || !EMAIL_RX.test(f.email.trim()))     e.email     = "Enter a valid email address.";
    return e;
  },

  2: (f) => {
    const e = {};
    if (f.height === "" || !isFiniteInRange(f.height, 80, 250))   e.height = "Height must be a number between 80 and 250 cm.";
    if (f.weight === "" || !isFiniteInRange(f.weight, 20, 300))   e.weight = "Weight must be a number between 20 and 300 kg.";
    if (f.bodyFat !== "" && f.bodyFat != null && !isFiniteInRange(f.bodyFat, 1, 60))
      e.bodyFat = "Body fat % must be between 1 and 60 if provided.";
    return e;
  },

  3: (f) => {
    const e = {};
    if (!f.goal)                                                  e.goal           = "Pick a primary goal.";
    if (f.targetWeight === "" || !isFiniteInRange(f.targetWeight, 20, 300))
      e.targetWeight = "Target weight must be a number between 20 and 300 kg.";
    if (f.targetBodyFat === "" || !isFiniteInRange(f.targetBodyFat, 1, 60))
      e.targetBodyFat = "Target body fat % must be between 1 and 60.";
    if (!f.timeline)                                              e.timeline       = "Pick a goal timeline.";
    if (!f.goalDescription || f.goalDescription.trim().length < 20)
      e.goalDescription = "Goal description must be at least 20 characters.";
    if (!f.startDate)                                             e.startDate      = "Program start date is required.";
    if (!f.duration)                                              e.duration       = "Program duration is required.";
    if (!f.sessionFrequency)                                      e.sessionFrequency = "Session frequency is required.";
    return e;
  },

  4: (f) => {
    const e = {};
    if (!f.diet)                                                  e.diet     = "Diet type is required.";
    if (f.calories === "" || !isFiniteInRange(f.calories, 800, 6000))   e.calories = "Calories must be between 800 and 6000.";
    if (f.protein  === "" || !isFiniteInRange(f.protein,   20, 500))    e.protein  = "Protein must be between 20 and 500 g.";
    if (f.carbs    === "" || !isFiniteInRange(f.carbs,     20, 1000))   e.carbs    = "Carbs must be between 20 and 1000 g.";
    if (f.fats     === "" || !isFiniteInRange(f.fats,      10, 300))    e.fats     = "Fats must be between 10 and 300 g.";
    if (f.mealsPerDay === "" || !isFiniteInRange(f.mealsPerDay, 1, 8))  e.mealsPerDay = "Meals per day must be between 1 and 8.";
    if (f.waterTarget === "" || !isFiniteInRange(f.waterTarget, 0.5, 10))
      e.waterTarget = "Water target must be between 0.5 and 10 L/day.";
    if (f.cheatMeals === "" || !isFiniteInRange(f.cheatMeals, 0, 7))    e.cheatMeals = "Cheat meals must be between 0 and 7 per week.";
    return e;
  },

  5: (_f) => {
    // Notes optional. Email portal access already validated on Step 1.
    return {};
  },
};

// ═════════════════════════════════════════════════════════════
// Initial state
// ═════════════════════════════════════════════════════════════
const initialForm = {
  // Step 1
  firstName: "", lastName: "", dob: "", gender: "", phone: "", email: "",
  city: "", occupation: "",
  // Step 2
  height: "", weight: "", bodyFat: "",
  medicalConditions: "", medications: "", pastInjuries: "", allergies: "",
  // Step 3
  goal: "", targetWeight: "", targetBodyFat: "", timeline: "",
  goalDescription: "",
  startDate: "", duration: "", sessionFrequency: "",
  // Step 4
  diet: "", calories: "", protein: "", carbs: "", fats: "",
  mealsPerDay: "", waterTarget: "", cheatMeals: "",
  foodDislikes: "", eatingHabits: "",
  // Step 5
  notes: "",
};

// ═════════════════════════════════════════════════════════════
// Reusable bits — colocated, no design-system changes.
// ═════════════════════════════════════════════════════════════
const Label = ({ htmlFor, children, required }) => (
  <label
    htmlFor={htmlFor}
    className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-2"
  >
    {children} {required && <span className="text-red-400">*</span>}
  </label>
);

const Field = ({ id, label, required, error, children, span = 1 }) => (
  <div className={span === 2 ? "sm:col-span-2" : ""}>
    <Label htmlFor={id} required={required}>{label}</Label>
    {children}
    {error && <p id={`${id}-error`} className="mt-1.5 text-[11.5px] text-red-300">{error}</p>}
  </div>
);

const inputBase =
  "w-full h-10 px-3 rounded-lg bg-surface-elevated border text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors";
const inputOK   = "border-border focus:border-[#333]";
const inputBad  = "border-red-500/50 focus:border-red-400";

const cls = (error) => `${inputBase} ${error ? inputBad : inputOK}`;

const Input = ({ error, ...props }) => (
  <input {...props} className={`${cls(error)} ${props.className || ""}`} />
);

const NumberInput = ({ error, step = "0.1", ...props }) => (
  <input
    {...props}
    type="number"
    inputMode="decimal"
    step={step}
    className={`${cls(error)} ${props.className || ""}`}
  />
);

const Select = ({ error, children, ...props }) => (
  <select {...props} className={`${cls(error)} ${props.className || ""}`}>
    {children}
  </select>
);

const Textarea = ({ error, ...props }) => (
  <textarea
    {...props}
    className={`w-full min-h-[88px] p-3 rounded-lg bg-surface-elevated border ${error ? inputBad : inputOK} text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors resize-y ${props.className || ""}`}
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

const SectionHeader = ({ Icon, title, description, accent = "bg-primary/10 text-primary", className = "" }) => (
  <div className={`flex items-start gap-3 mb-5 ${className}`}>
    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
      <Icon size={18} />
    </span>
    <div className="pt-0.5">
      <h3 className="text-base font-semibold text-text-primary leading-tight">{title}</h3>
      <p className="text-sm text-text-secondary mt-1">{description}</p>
    </div>
  </div>
);

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
                done   ? "bg-emerald-500/20 text-emerald-300" :
                active ? "bg-primary text-white" :
                         "bg-surface-elevated text-text-muted border border-border",
              ].join(" ")}
            >
              {done ? "✓" : s.id}
            </span>
            <span className={[
              "text-[12.5px] font-medium",
              done   ? "text-emerald-300" :
              active ? "text-text-primary" :
                       "text-text-muted",
            ].join(" ")}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && <span className="hidden sm:inline-block w-8 h-px bg-border" />}
        </div>
      );
    })}
  </div>
);

// ═════════════════════════════════════════════════════════════
// STEP 1 — Personal info
// ═════════════════════════════════════════════════════════════
const Step1 = ({ form, update, errors }) => (
  <>
    <SectionHeader
      Icon={UserIcon}
      title="Personal Information"
      description="Client's basic identity and contact details"
    />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Field id="firstName" label="First name" required error={errors.firstName}>
        <Input id="firstName" placeholder="Priya" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} error={errors.firstName} />
      </Field>
      <Field id="lastName" label="Last name" required error={errors.lastName}>
        <Input id="lastName" placeholder="Sharma" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} error={errors.lastName} />
      </Field>
      <Field id="dob" label="Date of birth" required error={errors.dob}>
        <Input id="dob" type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} error={errors.dob} />
      </Field>

      <Field id="gender" label="Gender" required error={errors.gender}>
        <Select id="gender" value={form.gender} onChange={(e) => update("gender", e.target.value)} error={errors.gender}>
          <option value="">Select</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </Select>
      </Field>
      <Field id="phone" label="Phone" required error={errors.phone}>
        <Input id="phone" inputMode="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => update("phone", e.target.value)} error={errors.phone} />
      </Field>
      <Field id="email" label="Email" required error={errors.email}>
        <Input id="email" type="email" placeholder="priya@email.com" value={form.email} onChange={(e) => update("email", e.target.value)} error={errors.email} />
      </Field>

      <Field id="city" label="City">
        <Input id="city" placeholder="Bengaluru" value={form.city} onChange={(e) => update("city", e.target.value)} />
      </Field>
      <Field id="occupation" label="Occupation" span={2}>
        <Input id="occupation" placeholder="Software Engineer" value={form.occupation} onChange={(e) => update("occupation", e.target.value)} />
      </Field>
    </div>
  </>
);

// ═════════════════════════════════════════════════════════════
// STEP 2 — Body & Health  (alignment fixed: spacing between sections)
// ═════════════════════════════════════════════════════════════
const Step2 = ({ form, update, errors }) => (
  <>
    <SectionHeader
      Icon={TargetIcon}
      title="Body Measurements"
      description="Baseline measurements at program start"
      accent="bg-emerald-500/10 text-emerald-300"
    />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Field id="height" label="Height (cm)" required error={errors.height}>
        <NumberInput id="height" min="80" max="250" step="0.1" placeholder="165" value={form.height} onChange={(e) => update("height", e.target.value)} error={errors.height} />
      </Field>
      <Field id="weight" label="Current weight (kg)" required error={errors.weight}>
        <NumberInput id="weight" min="20" max="300" step="0.1" placeholder="68" value={form.weight} onChange={(e) => update("weight", e.target.value)} error={errors.weight} />
      </Field>
      <Field id="bodyFat" label="Body fat %" error={errors.bodyFat}>
        <NumberInput id="bodyFat" min="1" max="60" step="0.1" placeholder="28" value={form.bodyFat} onChange={(e) => update("bodyFat", e.target.value)} error={errors.bodyFat} />
      </Field>
      <Field id="bmi" label="BMI (auto)">
        <Input id="bmi" disabled placeholder="Auto" value={
          form.height && form.weight
            ? (Number(form.weight) / ((Number(form.height) / 100) ** 2)).toFixed(1)
            : ""
        } readOnly />
      </Field>
    </div>

    <SectionHeader
      Icon={WarningIcon}
      title="Health History & Medical"
      description="Injuries, conditions, medications — critical for safe programming"
      accent="bg-red-500/10 text-red-300"
      className="mt-8"
    />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field id="medicalConditions" label="Medical conditions">
        <Input id="medicalConditions" placeholder="e.g. Diabetes, Hypertension" value={form.medicalConditions} onChange={(e) => update("medicalConditions", e.target.value)} />
      </Field>
      <Field id="medications" label="Current medications">
        <Input id="medications" placeholder="e.g. Metformin" value={form.medications} onChange={(e) => update("medications", e.target.value)} />
      </Field>
      <Field id="pastInjuries" label="Past injuries">
        <Input id="pastInjuries" placeholder="e.g. ACL tear, lower back" value={form.pastInjuries} onChange={(e) => update("pastInjuries", e.target.value)} />
      </Field>
      <Field id="allergies" label="Allergies / dietary restrictions">
        <Input id="allergies" placeholder="e.g. Lactose intolerant" value={form.allergies} onChange={(e) => update("allergies", e.target.value)} />
      </Field>
    </div>
  </>
);

// ═════════════════════════════════════════════════════════════
// STEP 3 — Goals & Program  (all required)
// ═════════════════════════════════════════════════════════════
const GOAL_OPTIONS = [
  "Weight Loss", "Muscle Gain", "Fat Loss", "Body Recomposition",
  "Toning & Shaping", "Athletic Performance", "Flexibility & Mobility", "General Fitness",
];

const Step3 = ({ form, update, errors }) => (
  <>
    <SectionHeader
      Icon={TargetIcon}
      title="Fitness Goals"
      description="Primary objective and target metrics"
      accent="bg-amber-500/10 text-amber-300"
    />
    <Field id="goal" label="Primary goal" required error={errors.goal}>
      <div id="goal" className="flex flex-wrap gap-2">
        {GOAL_OPTIONS.map((g) => (
          <Chip key={g} active={form.goal === g} onClick={() => update("goal", g)}>{g}</Chip>
        ))}
      </div>
    </Field>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
      <Field id="targetWeight" label="Target weight (kg)" required error={errors.targetWeight}>
        <NumberInput id="targetWeight" min="20" max="300" step="0.1" placeholder="62.0" value={form.targetWeight} onChange={(e) => update("targetWeight", e.target.value)} error={errors.targetWeight} />
      </Field>
      <Field id="targetBodyFat" label="Target body fat %" required error={errors.targetBodyFat}>
        <NumberInput id="targetBodyFat" min="1" max="60" step="0.1" placeholder="22" value={form.targetBodyFat} onChange={(e) => update("targetBodyFat", e.target.value)} error={errors.targetBodyFat} />
      </Field>
      <Field id="timeline" label="Goal timeline" required error={errors.timeline}>
        <Select id="timeline" value={form.timeline} onChange={(e) => update("timeline", e.target.value)} error={errors.timeline}>
          <option value="">Select</option>
          <option>4 weeks</option>
          <option>8 weeks</option>
          <option>12 weeks</option>
          <option>16 weeks</option>
        </Select>
      </Field>
    </div>

    <div className="mt-5">
      <Field id="goalDescription" label="Goal description / client's own words" required error={errors.goalDescription}>
        <Textarea
          id="goalDescription"
          placeholder="e.g. I want to fit into my wedding dress by March. I'm willing to train 5 days a week. I've tried diets before but never stuck to them."
          value={form.goalDescription}
          onChange={(e) => update("goalDescription", e.target.value)}
          error={errors.goalDescription}
        />
      </Field>
    </div>

    <SectionHeader
      Icon={CheckCircleIcon}
      title="Program"
      description="Plan type, duration, and schedule"
      className="mt-8"
    />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Field id="startDate" label="Program start date" required error={errors.startDate}>
        <Input id="startDate" type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} error={errors.startDate} />
      </Field>
      <Field id="duration" label="Program duration" required error={errors.duration}>
        <Select id="duration" value={form.duration} onChange={(e) => update("duration", e.target.value)} error={errors.duration}>
          <option value="">Select</option>
          <option>4 weeks</option>
          <option>8 weeks</option>
          <option>12 weeks</option>
          <option>16 weeks</option>
        </Select>
      </Field>
      <Field id="sessionFrequency" label="Session frequency" required error={errors.sessionFrequency}>
        <Select id="sessionFrequency" value={form.sessionFrequency} onChange={(e) => update("sessionFrequency", e.target.value)} error={errors.sessionFrequency}>
          <option value="">Select</option>
          <option>3 / week</option>
          <option>4 / week</option>
          <option>5 / week</option>
          <option>6 / week</option>
        </Select>
      </Field>
    </div>
  </>
);

// ═════════════════════════════════════════════════════════════
// STEP 4 — Nutrition  (meals + cheat meals are now numeric inputs)
// ═════════════════════════════════════════════════════════════
const DIET_OPTIONS = ["Omnivore", "Vegetarian", "Vegan", "Eggetarian", "Keto", "Intermittent Fasting"];

const Step4 = ({ form, update, errors }) => (
  <>
    <SectionHeader
      Icon={TargetIcon}
      title="Nutrition Profile"
      description="Dietary preferences, calorie targets and meal structure"
    />
    <Field id="diet" label="Diet type" required error={errors.diet}>
      <div id="diet" className="flex flex-wrap gap-2">
        {DIET_OPTIONS.map((d) => (
          <Chip key={d} active={form.diet === d} onClick={() => update("diet", d)}>{d}</Chip>
        ))}
      </div>
    </Field>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
      <Field id="calories" label="Daily calories (kcal)" required error={errors.calories}>
        <NumberInput id="calories" min="800" max="6000" step="10" placeholder="1800" value={form.calories} onChange={(e) => update("calories", e.target.value)} error={errors.calories} />
      </Field>
      <Field id="protein" label="Protein (g)" required error={errors.protein}>
        <NumberInput id="protein" min="20" max="500" step="1" placeholder="120" value={form.protein} onChange={(e) => update("protein", e.target.value)} error={errors.protein} />
      </Field>
      <Field id="carbs" label="Carbs (g)" required error={errors.carbs}>
        <NumberInput id="carbs" min="20" max="1000" step="1" placeholder="200" value={form.carbs} onChange={(e) => update("carbs", e.target.value)} error={errors.carbs} />
      </Field>
      <Field id="fats" label="Fats (g)" required error={errors.fats}>
        <NumberInput id="fats" min="10" max="300" step="1" placeholder="60" value={form.fats} onChange={(e) => update("fats", e.target.value)} error={errors.fats} />
      </Field>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
      <Field id="mealsPerDay" label="Meals per day" required error={errors.mealsPerDay}>
        <NumberInput id="mealsPerDay" min="1" max="8" step="1" placeholder="4" value={form.mealsPerDay} onChange={(e) => update("mealsPerDay", e.target.value)} error={errors.mealsPerDay} />
      </Field>
      <Field id="waterTarget" label="Water target (L/day)" required error={errors.waterTarget}>
        <NumberInput id="waterTarget" min="0.5" max="10" step="0.1" placeholder="3.0" value={form.waterTarget} onChange={(e) => update("waterTarget", e.target.value)} error={errors.waterTarget} />
      </Field>
      <Field id="cheatMeals" label="Cheat meals per week" required error={errors.cheatMeals}>
        <NumberInput id="cheatMeals" min="0" max="7" step="1" placeholder="1" value={form.cheatMeals} onChange={(e) => update("cheatMeals", e.target.value)} error={errors.cheatMeals} />
      </Field>
    </div>

    <div className="mt-5">
      <Field id="foodDislikes" label="Food dislikes / things to avoid">
        <Input id="foodDislikes" placeholder="e.g. Broccoli, Tofu, Bitter gourd" value={form.foodDislikes} onChange={(e) => update("foodDislikes", e.target.value)} />
      </Field>
    </div>
    <div className="mt-4">
      <Field id="eatingHabits" label="Current eating habits / notes">
        <Textarea
          id="eatingHabits"
          placeholder="Describe the client's current diet, meal timings, relationship with food…"
          value={form.eatingHabits}
          onChange={(e) => update("eatingHabits", e.target.value)}
        />
      </Field>
    </div>
  </>
);

// ═════════════════════════════════════════════════════════════
// STEP 5 — Notes & Access
// ═════════════════════════════════════════════════════════════
const Step5 = ({ form, update }) => (
  <>
    <SectionHeader
      Icon={CheckCircleIcon}
      title="Trainer Notes"
      description="Private notes — only visible to you (optional)"
      accent="bg-violet-500/10 text-violet-300"
    />
    <Field id="notes" label="Private notes">
      <Textarea
        id="notes"
        placeholder="Internal notes about the client — motivations, sensitivities, anything to remember…"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
      />
    </Field>

    <SectionHeader
      Icon={CheckCircleIcon}
      title="Client Portal Access"
      description="The portal invite is sent to the phone & email captured on Step 1"
      className="mt-8"
    />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field id="portalPhone" label="Onboarding phone (primary)">
        <Input id="portalPhone" value={form.phone} readOnly className="opacity-80" />
      </Field>
      <Field id="portalEmail" label="Portal email">
        <Input id="portalEmail" value={form.email} readOnly className="opacity-80" />
      </Field>
    </div>
    <p className="text-[12px] text-text-muted mt-3">
      After you create the client we&apos;ll generate a 72-hour activation link
      you can copy or paste into a WhatsApp message.
    </p>
  </>
);

// ═════════════════════════════════════════════════════════════
// Live preview panel
// ═════════════════════════════════════════════════════════════
const LivePreview = ({ form, step }) => {
  const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ") || "New Client";
  const age = useMemo(() => {
    if (!form.dob) return null;
    const d = new Date(form.dob);
    if (isNaN(d.getTime())) return null;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / 31557600000));
  }, [form.dob]);
  const bmi = useMemo(() => {
    const h = parseFloat(form.height);
    const w = parseFloat(form.weight);
    if (!h || !w) return null;
    const m = h / 100;
    return (w / (m * m)).toFixed(1);
  }, [form.height, form.weight]);
  const completeness = Math.min(100, step * 18 + (form.firstName ? 5 : 0));

  const Row = ({ label, value }) => (
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
        <Row label="Age"     value={age} />
        <Row label="Height"  value={form.height ? `${form.height} cm` : ""} />
        <Row label="Weight"  value={form.weight ? `${form.weight} kg` : ""} />
        <Row label="Target"  value={form.targetWeight ? `${form.targetWeight} kg` : ""} />
        <Row label="BMI"     value={bmi} />
        <Row label="Program" value={form.duration} />
        <Row label="Start"   value={form.startDate} />
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

// ═════════════════════════════════════════════════════════════
// Payload mapper — wizard form → POST /api/clients body
//
// Every wizard field is forwarded; the backend validator decides what's
// accepted. We deliberately do NOT drop fields here, because dropping
// at the wizard layer is exactly the silent-data-loss bug this audit
// fixes. The only transformations are composition (name) and naming
// (form.weight → startingWeight, form.notes → privateNotes).
// ═════════════════════════════════════════════════════════════
function toApiPayload(form) {
  const name = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  const num = (v) => (v === "" || v == null ? undefined : Number(v));
  const str = (v) => (v === "" || v == null ? undefined : String(v));
  return {
    // Identity
    name,
    phone:    str(form.phone),
    email:    str(form.email),
    gender:   str(form.gender),
    dob:      str(form.dob),          // backend derives age from dob
    city:     str(form.city),
    occupation: str(form.occupation),

    // Body
    height:         num(form.height),
    startingWeight: num(form.weight),
    bodyFat:        num(form.bodyFat),

    // Health
    medicalConditions: str(form.medicalConditions),
    medications:       str(form.medications),
    pastInjuries:      str(form.pastInjuries),
    allergies:         str(form.allergies),

    // Goal & program
    goal:            str(form.goal),
    targetWeight:    num(form.targetWeight),
    targetBodyFat:   num(form.targetBodyFat),
    timeline:        str(form.timeline),
    goalDescription: str(form.goalDescription),
    startDate:       str(form.startDate),
    duration:        str(form.duration),
    sessionFrequency: str(form.sessionFrequency),

    // Nutrition
    diet:        str(form.diet),
    calories:    num(form.calories),
    protein:     num(form.protein),
    carbs:       num(form.carbs),
    fats:        num(form.fats),
    mealsPerDay: num(form.mealsPerDay),
    waterTarget: num(form.waterTarget),
    cheatMeals:  num(form.cheatMeals),
    foodDislikes: str(form.foodDislikes),
    eatingHabits: str(form.eatingHabits),

    // Trainer notes (wizard names it `notes` for UX; persisted as privateNotes)
    privateNotes: str(form.notes),
  };
}

// ═════════════════════════════════════════════════════════════
// Page
// ═════════════════════════════════════════════════════════════
const TrainerAddClientPage = () => {
  const navigate = useNavigate();
  const [step, setStep]             = useState(1);
  const [form, setForm]             = useState(initialForm);
  const [errorsByStep, setErrorsBy] = useState({ 1: {}, 2: {}, 3: {}, 4: {}, 5: {} });
  const [submitting, setSubmit]     = useState(false);
  const [submitError, setSubmitErr] = useState(null);
  const [activation, setActivation] = useState(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [toast, setToast]           = useState(null);

  const cardRef = useRef(null);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    // Clear the error for THIS field on THIS step the moment the user
    // edits it — so the error disappears without making them blur the
    // field. Errors on other fields stay until they're re-validated.
    setErrorsBy((prev) => {
      const stepErrors = prev[step] || {};
      if (!stepErrors[k]) return prev;
      const rest = { ...stepErrors };
      delete rest[k];
      return { ...prev, [step]: rest };
    });
  };

  const StepComponent = { 1: Step1, 2: Step2, 3: Step3, 4: Step4, 5: Step5 }[step];

  // Always scope the error object passed to the step component to ONLY
  // the current step. This is the fix for cross-step error leakage.
  const currentErrors = errorsByStep[step] || {};

  function scrollToFirstError(errs) {
    const firstKey = Object.keys(errs)[0];
    if (!firstKey) return;
    // Defer until DOM has rendered the error helper.
    requestAnimationFrame(() => {
      const el = document.getElementById(firstKey);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus?.({ preventScroll: true });
    });
  }

  const next = () => {
    const errs = validators[step](form);
    setErrorsBy((prev) => ({ ...prev, [step]: errs }));
    if (Object.keys(errs).length > 0) {
      scrollToFirstError(errs);
      return;
    }
    setStep((s) => Math.min(5, s + 1));
    // Reset scroll to top of card on advance.
    requestAnimationFrame(() => cardRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };

  const back = () => {
    // Going back must never validate or clear data — just navigate.
    setStep((s) => Math.max(1, s - 1));
    requestAnimationFrame(() => cardRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };

  const cancel = () => {
    if (Object.values(form).some((v) => v !== "" && v != null)) {
      if (!confirm("Discard this client? Any entered data will be lost.")) return;
    }
    navigate(ROUTES.TRAINER_CLIENTS);
  };

  const submit = async () => {
    setSubmitErr(null);

    // Validate every step before submit — but only re-display Step 5's
    // errors here. If an earlier step is invalid, jump back there.
    for (let i = 1; i <= 5; i++) {
      const e = validators[i](form);
      if (Object.keys(e).length > 0) {
        setErrorsBy((prev) => ({ ...prev, [i]: e }));
        setStep(i);
        setSubmitErr(`Please fix the highlighted fields on Step ${i}.`);
        scrollToFirstError(e);
        return;
      }
    }

    setSubmit(true);
    try {
      const result = await clientService.create(toApiPayload(form));
      setActivation({
        id:         result?.client?._id,
        clientName: result?.client?.name || "Client",
        firstName:  form.firstName,
        url:        result?.invite?.activationUrl,
        expiresAt:  result?.invite?.expiresAt,
        hasPhone:   Boolean(form.phone),
      });
      setToast({ kind: "success", message: "Client created — share the activation link" });
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || "Failed to create client";
      if (status === 401) setSubmitErr("Your session expired. Please sign in again.");
      else if (status === 403) setSubmitErr("You don't have permission to create clients.");
      else setSubmitErr(msg);
    } finally {
      setSubmit(false);
    }
  };

  const sendWhatsAppInvite = async () => {
    if (!activation?.id) return;
    setInviteBusy(true);
    try {
      await clientService.sendInvite(activation.id);
      setToast({ kind: "success", message: "WhatsApp invite sent" });
    } catch (e) {
      setToast({ kind: "error", message: e?.response?.data?.message || "Couldn't send invite" });
    } finally {
      setInviteBusy(false);
    }
  };

  // Build the WhatsApp message text for Step 5 / activation panel.
  const whatsappMessage = activation?.url
    ? `Hi ${activation.firstName || activation.clientName}, your FITOS account is ready.\n\nActivate your account here:\n${activation.url}\n\nThis link expires in 72 hours.`
    : "";

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

      {/* Activation panel (after successful submit) */}
      {activation && (
        <Card>
          <Card.Header>
            <Card.Title>Activation link for {activation.clientName}</Card.Title>
            <Card.Description>
              Share this link with your client. It expires{activation.expiresAt ? ` on ${new Date(activation.expiresAt).toLocaleDateString()}` : " in 72 hours"}.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <div className="space-y-4">
              {/* Link row */}
              <div>
                <Label>Activation link</Label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={activation.url || ""}
                    onClick={(e) => e.target.select()}
                    className="flex-1 h-10 px-3 rounded-lg bg-surface-elevated border border-border text-[12.5px] font-mono text-text-primary"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard?.writeText(activation.url || "");
                      setToast({ kind: "success", message: "Link copied" });
                    }}
                  >
                    Copy link
                  </Button>
                </div>
              </div>

              {/* WhatsApp message row */}
              <div>
                <Label>WhatsApp message</Label>
                <textarea
                  readOnly
                  value={whatsappMessage}
                  className="w-full h-28 p-3 rounded-lg bg-surface-elevated border border-border text-[12.5px] text-text-primary font-mono resize-none"
                />
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    loading={inviteBusy}
                    onClick={sendWhatsAppInvite}
                    disabled={!activation.hasPhone}
                    title={activation.hasPhone ? "" : "Add a phone number to send via WhatsApp"}
                  >
                    Send WhatsApp Invite
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard?.writeText(whatsappMessage);
                      setToast({ kind: "success", message: "Message copied" });
                    }}
                  >
                    Copy WhatsApp message
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.TRAINER_CLIENTS)}>Done</Button>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Form + Preview */}
      <div ref={cardRef} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card>
          <Card.Body>
            <StepComponent form={form} update={update} errors={currentErrors} />

            {/* Show submit-level errors only on the active step where they were caused. */}
            {submitError && step === 5 && (
              <div className="mt-5 text-[12.5px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {submitError}
              </div>
            )}

            {/* Step-scoped summary if there are field errors on THIS step. */}
            {Object.keys(currentErrors).length > 0 && (
              <p className="mt-4 text-[11.5px] text-red-300">
                Please fix {Object.keys(currentErrors).length} field
                {Object.keys(currentErrors).length === 1 ? "" : "s"} above before continuing.
              </p>
            )}
          </Card.Body>
          <div className="border-t border-border pt-4 mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={cancel} disabled={submitting}>Cancel</Button>
            <div className="flex items-center gap-2">
              {step > 1 && <Button variant="secondary" onClick={back} disabled={submitting}>Back</Button>}
              {step < 5
                ? <Button onClick={next} disabled={submitting}>Continue →</Button>
                : <Button onClick={submit} loading={submitting} disabled={!!activation}>
                    {activation ? "Created ✓" : (submitting ? "Creating…" : "Create Client")}
                  </Button>
              }
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
