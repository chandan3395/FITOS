import { useCallback, useEffect, useRef, useState } from "react";
import { readDay, writeWorkout, WORKOUT_EVENT } from "../../../services/byotWorkoutService";
export default function useWorkoutDay(date) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conflict, setConflict] = useState(false);
  const sequence = useRef(0);
  const pending = useRef(null);
  const saving = useRef(false);
  const refreshAfterSave = useRef(false);
  const timezone = useRef("UTC");
  const reload = useCallback(async () => {
    if (saving.current) {
      refreshAfterSave.current = true;
      return;
    }
    const seq = ++sequence.current;
    setLoading(true);
    try {
      const value = await readDay(date);
      if (sequence.current !== seq) return;
      setData(value);
      timezone.current = value.timezone;
      pending.current = null;
      setConflict(false);
      setError("");
    } catch (err) {
      if (sequence.current === seq)
        setError(err.response?.data?.message || "Unable to load workout. Please retry.");
    } finally {
      if (sequence.current === seq) setLoading(false);
    }
  }, [date]);
  useEffect(() => {
    const requests = sequence;
    setData(null);
    pending.current = null;
    setError("");
    setConflict(false);
    reload();
    const refresh = () => {
      if (!pending.current) reload();
    };
    const day = () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone.current,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    let previous = day();
    const timer = window.setInterval(() => {
      const current = day();
      if (current !== previous) {
        previous = current;
        window.dispatchEvent(new Event("byot:local-day-changed"));
        reload();
      }
    }, 1000);
    const resume = () => {
      if (!document.hidden) reload();
    };
    window.addEventListener(WORKOUT_EVENT, refresh);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      ++requests.current;
      window.clearInterval(timer);
      window.removeEventListener(WORKOUT_EVENT, refresh);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [reload]);
  async function save(exercise, retry = false) {
    if (saving.current || !data || conflict) return;
    const request = retry
      ? pending.current
      : {
          path: exercise
            ? `/days/${data.date}/exercises/${exercise.id}`
            : `/days/${data.date}/start`,
          method: exercise ? "put" : "post",
          key: crypto.randomUUID(),
          body: {
            version: data.version,
            routineVersion: data.sourceRoutineVersion,
            ...(exercise ? { completed: !exercise.completed } : {}),
          },
        };
    if (!request) return;
    pending.current = request;
    saving.current = true;
    setBusy(true);
    setError("");
    const seq = ++sequence.current;
    try {
      const value = await writeWorkout(request.path, request.body, request.key, request.method);
      if (seq !== sequence.current) return;
      setData(value);
      pending.current = null;
    } catch (err) {
      if (seq !== sequence.current) return;
      setConflict(err.response?.status === 409);
      setError(
        err.response?.data?.message ||
          "Save failed. Your displayed completion has not changed. Retry the same request."
      );
    } finally {
      saving.current = false;
      if (seq === sequence.current) {
        setBusy(false);
        setLoading(false);
        if (refreshAfterSave.current) {
          refreshAfterSave.current = false;
          reload();
        }
      }
    }
  }
  return { data, error, busy, loading, conflict, retry: Boolean(pending.current), reload, save };
}
