import { useEffect, useRef, useState } from "react";
import { PencilIcon, CheckIcon, XIcon, SpinnerIcon } from "../design-system/Icons";

/**
 * A single profile field that flips between a read-only display and an
 * inline editor — the CRM-style "click the pencil, edit just this field"
 * interaction. Only the field that's clicked enters edit mode; the rest of
 * the profile stays put.
 *
 * Props:
 *   label       UPPERCASE field label
 *   value       raw stored value (string | number | ISO date string)
 *   display     optional formatted read-mode value (e.g. "175 cm")
 *   type        text | email | tel | date | number | select | textarea
 *   options     [{ value, label }]  (select only)
 *   placeholder editor placeholder
 *   validate    (trimmedValue) => string | null   inline validation message
 *   editable    when false, renders a plain read-only row (no pencil)
 *   onSave      async (value) => void ; should throw to surface an error
 */
const INPUT_CLS =
  "w-full h-9 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary " +
  "placeholder:text-text-muted outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25";

const InlineEditField = ({
  label,
  value,
  display,
  type = "text",
  options = [],
  placeholder = "",
  validate,
  editable = true,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  // Raw value → editable draft. Dates must be yyyy-mm-dd for <input type=date>.
  const toDraft = (v) => {
    if (v == null) return "";
    if (type === "date") {
      const d = new Date(v);
      return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
    }
    return String(v);
  };

  const begin = () => { setDraft(toDraft(value)); setErr(null); setEditing(true); };
  const cancel = () => { setEditing(false); setErr(null); };

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      if (typeof ref.current.select === "function") ref.current.select();
    }
  }, [editing]);

  const commit = async () => {
    const trimmed = typeof draft === "string" ? draft.trim() : draft;
    if (validate) {
      const msg = validate(trimmed);
      if (msg) { setErr(msg); return; }
    }
    setSaving(true);
    setErr(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && type !== "textarea") { e.preventDefault(); commit(); }
    else if (e.key === "Escape") { e.preventDefault(); cancel(); }
  };

  const Label = () => (
    <p className="text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase">{label}</p>
  );

  const ReadValue = () => (
    <p className="text-base font-semibold mt-1 text-text-primary break-words">
      {display || (value != null && value !== "" ? value : <span className="text-text-muted">—</span>)}
    </p>
  );

  if (!editable) {
    return <div><Label /><ReadValue /></div>;
  }

  if (!editing) {
    return (
      <div className="group">
        <div className="flex items-center justify-between gap-2">
          <Label />
          <button
            type="button"
            onClick={begin}
            aria-label={`Edit ${label}`}
            className="text-text-muted hover:text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            <PencilIcon size={13} />
          </button>
        </div>
        <ReadValue />
      </div>
    );
  }

  return (
    <div>
      <Label />
      <div className="mt-1.5 space-y-2">
        {type === "select" ? (
          <select
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            className={INPUT_CLS}
          >
            <option value="">—</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            ref={ref}
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className={`${INPUT_CLS.replace("h-9", "min-h-[92px] py-2")} resize-y leading-relaxed`}
          />
        ) : (
          <input
            ref={ref}
            type={type === "tel" ? "tel" : type === "email" ? "email" : type === "date" ? "date" : type === "number" ? "number" : "text"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className={INPUT_CLS}
          />
        )}

        {err && <p className="text-[12px] text-red-400">{err}</p>}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={commit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-black text-[13px] font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving ? <SpinnerIcon size={13} /> : <CheckIcon size={13} />} Save
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-text-secondary text-[13px] font-medium hover:text-text-primary hover:bg-surface-elevated disabled:opacity-60 transition-colors"
          >
            <XIcon size={12} /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InlineEditField;
