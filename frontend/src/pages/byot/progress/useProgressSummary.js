import { useCallback, useEffect, useRef, useState } from "react";
import { getSummary, PROGRESS_EVENT } from "../../../services/byotProgressService";
export default function useProgressSummary() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const timezone = useRef("UTC");
  const reload = useCallback(async () => {
    const n = ++generation.current;
    try {
      const value = await getSummary();
      if (n === generation.current) {
        setData(value);
        timezone.current = value.timezone;
        setError("");
      }
    } catch (err) {
      if (n === generation.current)
        setError(err.response?.data?.message || "Unable to load progress. Please retry.");
    }
  }, []);
  useEffect(() => {
    const counter = generation;
    reload();
    const day = () =>
      new Intl.DateTimeFormat("en-CA", { timeZone: timezone.current }).format(new Date());
    let previous = day();
    const timer = setInterval(() => {
      const current = day();
      if (current !== previous) {
        previous = current;
        reload();
      }
    }, 1000);
    const resume = () => {
      if (!document.hidden) reload();
    };
    window.addEventListener(PROGRESS_EVENT, reload);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      ++counter.current;
      clearInterval(timer);
      window.removeEventListener(PROGRESS_EVENT, reload);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [reload]);
  return { data, error, reload };
}
