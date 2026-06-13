import { useEffect, useRef, useState } from "react";

// Respect the user's motion preference — when reduced motion is on, every
// scroll-reveal renders in its final state immediately (no transitions run).
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * useInView — IntersectionObserver hook that flips `inView` true once the
 * element enters the viewport. The single primitive behind every marketing
 * scroll animation (reveals, staggers, count-ups).
 *
 * @returns [ref, inView]
 */
export default function useInView({ threshold = 0.15, rootMargin = "0px 0px -10% 0px", once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // No IO support or reduced motion → show immediately.
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) obs.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}
