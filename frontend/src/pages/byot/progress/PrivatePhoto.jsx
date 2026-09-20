import { useEffect, useRef, useState } from "react";
import { imageBlob } from "../../../services/byotProgressService";
export default function PrivatePhoto({ date, slot, photo, full = false }) {
  const host = useRef(null);
  const [visible, setVisible] = useState(full);
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (full) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, [full]);
  useEffect(() => {
    setUrl("");
    if (!visible || !photo) return;
    let alive = true;
    let objectUrl;
    const controller = new AbortController();
    setUrl("");
    setError(false);
    imageBlob(date, slot, full ? "original" : "thumbnail", controller.signal)
      .then((blob) => {
        if (alive) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch((err) => {
        if (alive && err.code !== "ERR_CANCELED") setError(true);
      });
    return () => {
      alive = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [visible, date, slot, photo, full, retry]);
  return (
    <div ref={host} className="min-w-0 rounded-lg bg-bg p-2">
      {url ? (
        <img
          src={url}
          alt={`${slot} progress photo on ${date}`}
          referrerPolicy="no-referrer"
          className={`w-full object-contain ${full ? "max-h-[65vh]" : "h-48"}`}
        />
      ) : error ? (
        <button className="min-h-12 text-sm" onClick={() => setRetry((n) => n + 1)}>
          Retry {slot} photo
        </button>
      ) : (
        <p className="text-sm py-8">{photo ? "Loading protected photo…" : `No ${slot} photo`}</p>
      )}
    </div>
  );
}
