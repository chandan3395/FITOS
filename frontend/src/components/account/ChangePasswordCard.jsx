import { useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { Toast } from "../feedback/States";
import authService from "../../services/authService";
import { useAuthContext } from "../../contexts/AuthContext";

/**
 * ChangePasswordCard — lets a TRAINER or CLIENT set or change their password.
 *
 * Accounts created via Google have no password initially: the backend only
 * requires the current password when one already exists, so the "current
 * password" field is optional here and labelled accordingly.
 */
const ChangePasswordCard = () => {
  const { user } = useAuthContext();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      return setToast({ kind: "error", message: "New password must be at least 8 characters" });
    }
    if (newPassword !== confirm) {
      return setToast({ kind: "error", message: "Passwords do not match" });
    }
    setBusy(true);
    try {
      await authService.setPassword({ currentPassword: currentPassword || undefined, newPassword });
      setCurrent(""); setNew(""); setConfirm("");
      setToast({ kind: "success", message: "Password updated" });
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Could not update password" });
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full h-10 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333] transition-colors";

  return (
    <Card>
      <Card.Header>
        <Card.Title>Password</Card.Title>
        <Card.Description>
          {user?.googleLinked
            ? "Signed up with Google — set a password to also log in with email."
            : "Change the password you use to sign in."}
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <form onSubmit={submit} className="space-y-3 max-w-sm">
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password (leave blank if none)"
            className={inputClass}
          />
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
            placeholder="New password (min 8 characters)"
            className={inputClass}
          />
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className={inputClass}
          />
          <Button type="submit" loading={busy} size="sm">Update password</Button>
        </form>
      </Card.Body>
      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </Card>
  );
};

export default ChangePasswordCard;
