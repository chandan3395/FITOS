import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const RouteScrollManager = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return undefined;

    if (location.hash) {
      const frame = requestAnimationFrame(() => {
        let id = location.hash.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {
          return;
        }
        document.getElementById(id)?.scrollIntoView();
      });
      return () => cancelAnimationFrame(frame);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    return undefined;
  }, [location.key, location.hash, navigationType]);

  return null;
};

export default RouteScrollManager;
