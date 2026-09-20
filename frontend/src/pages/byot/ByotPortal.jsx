import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import FitosWordmark from "../../components/branding/FitosWordmark";
import { useAuthContext } from "../../contexts/AuthContext";
import api, { API_BASE_URL } from "../../lib/api";

import ByotLayout from "../../components/layouts/ByotLayout";
import PortalPageHeader from "./PortalPageHeader";
import ProgressPage from "./progress/ProgressPage";
import HomeProgress from "./progress/HomeProgress";
import WorkoutPage from "./workout/WorkoutPage";
import DailyWorkout from "./workout/DailyWorkout";
import NutritionPage from "./nutrition/NutritionPage";
import HomeNutrition from "./nutrition/HomeNutrition";
import useUnsavedNutrition from "./nutrition/useUnsavedNutrition";

const button =
  "inline-flex justify-center rounded-xl bg-primary text-on-primary font-semibold px-5 py-3 disabled:opacity-50";
const card = "rounded-2xl border border-border bg-surface p-6";

const errors = {
  account_conflict:
    "This Google account already belongs to an existing FITOS role. Its role and data have been preserved. Use another Google account for BYOT.",
  invalid_state:
    "This sign-in attempt expired or could not be verified. Please start again in this browser.",
  google_disabled: "Google sign-in is currently disabled. Please try again when it is available.",
  google_failed: "Google sign-in did not complete. Please try again.",
};
function Onboarding({ onSave }) {
  const [values, setValues] = useState({
    startingWeightKg: "",
    heightCm: "",
    goal: "",
    targetWeightKg: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...values,
        startingWeightKg: Number(values.startingWeightKg),
        heightCm: Number(values.heightCm),
      };
      if (values.targetWeightKg === "") delete payload.targetWeightKg;
      else payload.targetWeightKg = Number(values.targetWeightKg);
      const res = await api.post("/byot/onboarding", payload);
      onSave(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`${card} max-w-xl mx-auto`}>
      <p className="text-primary text-sm mb-2">YOUR STARTING POINT</p>
      <h1 className="text-3xl font-bold mb-3">Make it your own</h1>
      <p className="text-text-secondary mb-6">
        Choose your own goal. Your first personal check-in is due seven local calendar days after
        setup.
      </p>
      <form onSubmit={submit} className="space-y-5">
        {[
          ["startingWeightKg", "Starting weight (kg)", 20, 500],
          ["heightCm", "Height (cm)", 80, 250],
          ["targetWeightKg", "Target weight (kg, optional)", 20, 500],
        ].map(([key, label, min, max]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              className="mt-2 w-full rounded-lg border border-border bg-bg p-3"
              type="number"
              step="0.1"
              min={min}
              max={max}
              required={key !== "targetWeightKg"}
              value={values[key]}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            />
          </label>
        ))}
        <label className="block text-sm">
          Your goal
          <input
            className="mt-2 w-full rounded-lg border border-border bg-bg p-3"
            required
            maxLength={200}
            placeholder="For example, build strength consistently"
            value={values.goal}
            onChange={(e) => setValues({ ...values, goal: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Timezone
          <input
            className="mt-2 w-full rounded-lg border border-border bg-bg p-3"
            required
            maxLength={100}
            value={values.timezone}
            onChange={(e) => setValues({ ...values, timezone: e.target.value })}
          />
          <span className="block text-text-secondary mt-2">
            Detected from your browser. Correct it if needed, for example Asia/Kolkata or
            America/New_York.
          </span>
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <button className={button} disabled={busy}>
          {busy ? "Saving…" : "Save and enter BYOT"}
        </button>
      </form>
    </section>
  );
}
export default function ByotPortal() {
  const {
    user,
    isReady,
    isAuthenticated,
    logout,
    error: sessionError,
    retrySession,
    sessionRecoverable,
  } = useAuthContext();
  const location = useLocation();
  const [nutritionDirty, setNutritionDirty] = useState(false);
  const [workoutDirty, setWorkoutDirty] = useState(false);
  const [progressDirty, setProgressDirty] = useState(false);
  useUnsavedNutrition(nutritionDirty || workoutDirty || progressDirty);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    if (user?.role === "BYOT") {
      setError("");
      api
        .get("/byot/profile")
        .then((res) => {
          if (alive) setProfile(res.data.data);
        })
        .catch((err) => {
          if (alive) setError(err.response?.data?.message || "Unable to load your profile.");
        });
    } else setProfile(null);
    return () => {
      alive = false;
    };
  }, [user?._id, user?.role, attempt]);
  const signInError = errors[new URLSearchParams(location.search).get("error")];
  const googleEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH !== "false";
  const signOut = async () => {
    if ((nutritionDirty || workoutDirty || progressDirty) && !window.confirm("Discard unsaved edits and sign out?")) return;
    setProfile(null);
    await logout();
  };
  if (!isReady)
    return (
      <div className="min-h-screen bg-bg text-text-primary p-10" role="status">
        Loading your session…
      </div>
    );
  if (sessionRecoverable)
    return (
      <main className="min-h-screen bg-bg text-text-primary px-5 py-16">
        <div className="mx-auto max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
          <h1 className="text-xl font-semibold">Session temporarily unavailable</h1>
          <p className="mt-2 text-sm text-text-secondary">{sessionError}</p>
          <button type="button" className={`${button} mt-5`} onClick={retrySession}>
            Try again
          </button>
        </div>
      </main>
    );
  if (!isAuthenticated || user?.role !== "BYOT")
    return (
      <main className="min-h-screen bg-bg text-text-primary px-5 py-16">
        <div className="max-w-2xl mx-auto">
          <Link to="/" aria-label="FITOS home">
            <FitosWordmark byot className="text-3xl text-primary" />
          </Link>
          <p className="text-primary mt-16 mb-3">FREE · SELF-MANAGED FITNESS</p>
          <h1 className="text-4xl sm:text-5xl font-bold">Be Your Own Trainer</h1>
          <p className="mt-6 text-lg text-text-secondary">
            Your independent space for personal fitness tracking. Set your starting point and choose
            your own goal.
          </p>
          <p className="mt-4 text-text-secondary">
            Track nutrition, workouts, weight, measurements and private progress photos,
            with weekly personal check-ins. Everything is manually managed by you.
          </p>
          <p className="mt-4 text-sm text-text-secondary">Body photos are available only through your signed-in account. Admins manage account access, not fitness data. Storage operators with infrastructure credentials can access stored data. <Link to="/privacy" className="underline text-primary">Privacy details</Link></p>
          {sessionError && <p role="alert" className="mt-4">{sessionError}</p>}
          {(signInError || isAuthenticated) && (
            <p role="alert" className="mt-6 p-4 rounded-xl border border-border">
              {isAuthenticated
                ? `You are signed in to an existing ${user.role.toLowerCase()} account. BYOT needs a separate Google account. Your existing role and data will stay unchanged.`
                : signInError}
            </p>
          )}
          <div className="mt-8">
            {isAuthenticated ? (
              <button className={button} onClick={signOut}>
                Sign out to use another account
              </button>
            ) : googleEnabled ? (
              <a className={button} href={`${API_BASE_URL}/auth/google?intent=byot`}>
                {signInError
                  ? "Continue with Google / use another account"
                  : "Continue with Google"}
              </a>
            ) : (
              <p role="status">
                Google sign-in is currently disabled. Please try again when it is available.
              </p>
            )}
          </div>
        </div>
      </main>
    );
  const module = location.pathname.split("/")[2];
  let content;
  if (error)
    content = (
      <div role="alert" className={card}>
        <p>{error}</p>
        <button className={`${button} mt-4`} onClick={() => setAttempt((n) => n + 1)}>
          Retry
        </button>
      </div>
    );
  else if (!profile) content = <p role="status">Loading your profile…</p>;
  else if (!profile.onboardingCompletedAt)
    content =
      module !== "onboarding" ? (
        <Navigate to="/byot/onboarding" replace />
      ) : (
        <Onboarding onSave={setProfile} />
      );
  else if (!module || module === "onboarding") content = <Navigate to="/byot/dashboard" replace />;
  else if (module === "dashboard")
    content = (
      <>
        <PortalPageHeader title="Home" description={`Welcome, ${user.name}. Here’s your day at a glance.`} action={<Link to="/byot/nutrition" className={button}>Log food</Link>} />
        <div className="mt-6 grid lg:grid-cols-2 items-start gap-4">
          <div className="space-y-4 min-w-0"><DailyWorkout home /><HomeNutrition /></div>
          <div className="space-y-4 min-w-0"><HomeProgress /><HomeProgress reminder /></div>
        </div>
      </>
    );
  else if (module === "progress") content = <ProgressPage onDirty={setProgressDirty} />;
  else if (module === "workout") content = <WorkoutPage onDirty={setWorkoutDirty} />;
  else if (module === "nutrition") content = <NutritionPage onDirty={setNutritionDirty} />;
  else content = <Navigate to="/byot/dashboard" replace />;
  return <ByotLayout user={user} onSignOut={signOut}>{content}</ByotLayout>;
}
