import { useEffect, useRef, useState } from "react";
import { compressImage } from "../../../lib/imageCompression";
import { write, upload } from "../../../services/byotProgressService";
import PrivatePhoto from "./PrivatePhoto";
export const button = "rounded-lg border border-border px-4 py-3 text-sm disabled:opacity-50";
export const primary = `${button} bg-primary text-on-primary font-semibold`;
const slots = ["front", "side", "back"];
function Selection({ file, slot }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) return;
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return file && url ? (
    <img
      src={url}
      alt={`Selected ${slot} photo, not saved`}
      className="w-full h-48 object-contain"
    />
  ) : null;
}
export default function PhotoSlots({ record, dirty, onRecord, busy: parentBusy, setPhotoBusy }) {
  const [files, setFiles] = useState({});
  const [messages, setMessages] = useState({});
  const [percent, setPercent] = useState({});
  const [active, setActive] = useState(null);
  const operations = useRef({});
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      setPhotoBusy(false);
    };
  }, [setPhotoBusy]);
  async function submit(slot, restart = false) {
    if (lock.current || !files[slot]) return;
    lock.current = true;
    setActive(slot);
    setPhotoBusy(true);
    setMessages((m) => ({ ...m, [slot]: "Preparing image…" }));
    if (restart) delete operations.current[slot];
    let op = operations.current[slot];
    if (!op) {
      op = { initKey: crypto.randomUUID(), initBody: { version: record.version } };
      operations.current[slot] = op;
    }
    try {
      if (!op.file) op.file = await compressImage(files[slot]);
      if (!alive.current) return;
      if (!op.attempt) {
        const result = await write(
          `/checkins/${record.date}/photos/${slot}/init`,
          op.initBody,
          op.initKey,
          "post"
        );
        op.attempt = result.attempt;
        op.version = result.record.version;
        if (alive.current) onRecord(result.record);
      }
      if (!op.uploaded) {
        if (!alive.current) return;
        if (alive.current) setMessages((m) => ({ ...m, [slot]: "Uploading and verifying…" }));
        await upload(op.attempt.id, op.file, (n) => {
          if (alive.current) setPercent((p) => ({ ...p, [slot]: n }));
        });
        op.uploaded = true;
      }
      if (!op.attachKey) op.attachKey = crypto.randomUUID();
      if (!alive.current) return;
      const result = await write(
        `/checkins/${record.date}/photos/${slot}/attach`,
        { version: op.version, attemptId: op.attempt.id },
        op.attachKey,
        "post"
      );
      if (alive.current) {
        onRecord(result);
        setFiles((f) => ({ ...f, [slot]: null }));
        setMessages((m) => ({ ...m, [slot]: "Photo saved and verified." }));
      }
      delete operations.current[slot];
    } catch (err) {
      if (alive.current)
        setMessages((m) => ({
          ...m,
          [slot]: `${err.response?.data?.message || "Upload failed."} Retry this attempt, or reload the saved record and start a new attempt. Your previously saved photo is unchanged.`,
        }));
    } finally {
      lock.current = false;
      if (alive.current) {
        setActive(null);
        setPhotoBusy(false);
      }
    }
  }
  async function remove(slot) {
    if (
      lock.current ||
      !window.confirm(
        "Remove this photo? A completed check-in will become incomplete and its reminder will be recalculated."
      )
    )
      return;
    lock.current = true;
    setActive(slot);
    setPhotoBusy(true);
    try {
      const value = await write(
        `/checkins/${record.date}/photos/${slot}`,
        { version: record.version },
        crypto.randomUUID(),
        "delete"
      );
      if (alive.current) {
        onRecord(value);
        setMessages((m) => ({ ...m, [slot]: "Photo removed. Provider cleanup is queued." }));
      }
    } catch (err) {
      if (alive.current)
        setMessages((m) => ({
          ...m,
          [slot]: err.response?.data?.message || "Removal failed. Reload and retry.",
        }));
    } finally {
      lock.current = false;
      if (alive.current) {
        setActive(null);
        setPhotoBusy(false);
      }
    }
  }
  return (
    <section className="space-y-4" aria-label="Check-in photos">
      <h2 className="text-xl font-semibold">Front, Side and Back photos</h2>
      <p className="text-sm text-text-secondary">
        JPEG, PNG or WebP only, up to 8 MB and 20 megapixels; 32–8192 pixels per side. HEIC and SVG
        are not supported. Images keep their proportions. Saved photos stay private; file selections
        do not survive refresh.
      </p>
      {!record.checkin.active && <p>Save a check-in draft to enable uploads.</p>}
      {dirty && <p>Save measurement edits before uploading or removing photos.</p>}
      <div className="grid lg:grid-cols-3 gap-4">
        {slots.map((slot) => (
          <section
            key={slot}
            aria-label={`${slot} photo slot`}
            className="min-w-0 border border-border rounded-xl p-4 space-y-3"
          >
            <h3 className="capitalize font-semibold">{slot}</h3>
            <PrivatePhoto date={record.date} slot={slot} photo={record.checkin.photos[slot]} />
            <label className="block text-sm">
              {record.checkin.photos[slot] ? `Replace ${slot} photo` : `Choose ${slot} photo`}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full min-w-0 text-xs mt-2 file:mr-2 file:rounded-lg file:border-0 file:px-3 file:py-3"
                disabled={Boolean(active) || parentBusy || dirty || !record.checkin.active}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  delete operations.current[slot];
                  if (
                    file &&
                    (!["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
                      file.size > 8 * 1024 * 1024)
                  ) {
                    setMessages((m) => ({ ...m, [slot]: "Choose JPEG, PNG or WebP up to 8 MB." }));
                    e.target.value = "";
                    return;
                  }
                  setFiles((f) => ({ ...f, [slot]: file }));
                  setMessages((m) => ({ ...m, [slot]: "Selected locally; upload to save." }));
                }}
              />
            </label>
            <Selection file={files[slot]} slot={slot} />
            {messages[slot] && (
              <p role="status" className="text-sm break-words">
                {messages[slot]}
                {active === slot && percent[slot] != null ? ` ${percent[slot]}% transferred` : ""}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {files[slot] && (
                <>
                  <button
                    className={primary}
                    disabled={Boolean(active) || parentBusy || dirty}
                    onClick={() => submit(slot)}
                  >
                    {operations.current[slot] ? `Retry ${slot} upload` : `Upload ${slot}`}
                  </button>
                  {operations.current[slot] && (
                    <button
                      className={button}
                      disabled={Boolean(active) || parentBusy || dirty}
                      onClick={() => submit(slot, true)}
                    >
                      Start new {slot} attempt
                    </button>
                  )}
                </>
              )}
              {record.checkin.photos[slot] && (
                <button
                  className={`${button} text-danger hover:bg-red-50`}
                  disabled={Boolean(active) || parentBusy || dirty}
                  onClick={() => remove(slot)}
                >
                  Remove {slot} photo
                </button>
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
