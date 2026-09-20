import { useState, useRef } from "react";
import { UploadCloudIcon, XIcon, CheckCircleIcon } from "./Icons";

/**
 * UploadCard — drag-and-drop file upload zone.
 *
 * Props
 *   label       string      e.g. "Upload Progress Photos"
 *   hint        string      e.g. "JPG, PNG or HEIC up to 10 MB"
 *   accept      string      MIME types for <input>
 *   multiple    boolean     allow multiple files
 *   onFiles     fn(files[]) called when files are selected/dropped
 *   disabled    boolean
 */
const UploadCard = ({
  label = "Upload files",
  hint = "JPG, PNG or PDF — max 10 MB each",
  accept = "image/*",
  multiple = true,
  onFiles,
  disabled = false,
  className = "",
}) => {
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState([]);
  const inputRef = useRef(null);

  const handleFiles = (fileList) => {
    if (!fileList?.length) return;
    const arr = Array.from(fileList);
    setStaged((prev) => [...prev, ...arr]);
    onFiles?.(arr);
  };

  const removeFile = (idx) =>
    setStaged((prev) => prev.filter((_, i) => i !== idx));

  /* ── Drag handlers ── */
  const onDragOver  = (e) => { e.preventDefault(); !disabled && setDragging(true);  };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Drop zone */}
      <div
        role="button"
        aria-label={label}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          "relative flex flex-col items-center justify-center gap-4",
          "rounded-2xl border-2 border-dashed py-12 px-6 text-center",
          "transition-all duration-200 cursor-pointer select-none",
          dragging
            ? "border-primary bg-primary/5 scale-[0.995]"
            : "border-control hover:border-primary hover:bg-primary/5",
          disabled ? "opacity-40 cursor-not-allowed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Cloud icon */}
        <div
          className={`text-text-secondary transition-colors duration-150 ${dragging ? "text-text-secondary" : ""}`}
        >
          <UploadCloudIcon size={36} />
        </div>

        {/* Labels */}
        <div className="flex flex-col gap-1">
          <p className="text-[14px] font-medium text-text-primary">{label}</p>
          <p className="text-[13px] text-text-secondary">
            Drag and drop, or{" "}
            <span className="text-text-primary underline underline-offset-2">browse</span>
          </p>
          <p className="text-[12px] text-text-secondary mt-1">{hint}</p>
        </div>
      </div>

      {/* Staged file list */}
      {staged.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {staged.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <CheckCircleIcon size={14} className="text-success shrink-0" />
              <span className="flex-1 text-[13px] text-text-secondary truncate">{file.name}</span>
              <span className="text-[11px] text-text-secondary shrink-0">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                onClick={() => removeFile(idx)}
                className="shrink-0 text-text-secondary hover:text-text-secondary transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <XIcon size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UploadCard;
