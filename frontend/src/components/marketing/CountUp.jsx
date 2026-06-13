import { useEffect, useState } from "react";
import useInView, { prefersReducedMotion } from "./useInView";

/**
 * CountUp — animates a number from 0 → `end` the first time it scrolls into
 * view. Used for the proof-stat band. Supports prefix/suffix and decimals.
 */
const CountUp = ({ end = 0, duration = 1600, decimals = 0, prefix = "", suffix = "", className = "" }) => {
  const [ref, inView] = useInView({ once: true });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (prefersReducedMotion()) {
      setValue(end);
      return undefined;
    }

    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo for a confident, decelerating count.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(end * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration]);

  const display = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
};

export default CountUp;
