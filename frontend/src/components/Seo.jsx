import { useEffect } from "react";

/**
 * Seo — lightweight document <title> + meta description manager for our
 * client-rendered SPA (no SSR / no helmet dependency). Sets the title and
 * description on mount and restores the previous values on unmount so each
 * route leaves the head clean for the next one.
 *
 * Brand suffix: " · FITOS" is appended automatically unless the provided
 * title already contains "FITOS" (so "About FITOS" stays as-is while
 * "Privacy Policy" becomes "Privacy Policy · FITOS").
 */
const BRAND = "FITOS";

const Seo = ({ title, description }) => {
  useEffect(() => {
    const composed = !title
      ? BRAND
      : title.includes(BRAND)
        ? title
        : `${title} · ${BRAND}`;

    const prevTitle = document.title;
    document.title = composed;

    let metaEl = null;
    let prevDesc = null;
    if (description) {
      metaEl = document.querySelector('meta[name="description"]');
      if (!metaEl) {
        metaEl = document.createElement("meta");
        metaEl.setAttribute("name", "description");
        document.head.appendChild(metaEl);
      }
      prevDesc = metaEl.getAttribute("content");
      metaEl.setAttribute("content", description);
    }

    return () => {
      document.title = prevTitle;
      if (metaEl && prevDesc !== null) metaEl.setAttribute("content", prevDesc);
    };
  }, [title, description]);

  return null;
};

export default Seo;
