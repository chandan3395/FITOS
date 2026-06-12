import { Link } from "react-router-dom";
import AuthLayout from "../../components/layouts/AuthLayout";
import { ROUTES } from "../../constants/routes";
import { WarningIcon } from "../../components/design-system/Icons";

/**
 * AccountDisabledPage — shown when a disabled trainer attempts to sign in.
 *
 * The Google callback redirects disabled trainers here (instead of bouncing
 * them back to the login screen), so they get a clear explanation rather than
 * a confusing redirect loop. Purely informational; no session is established.
 */
const SUPPORT_EMAIL = "support@fitos.app";

const AccountDisabledPage = () => (
  <AuthLayout>
    <div className="text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center text-warning mb-5">
        <WarningIcon size={26} />
      </div>

      <h1 className="text-xl font-bold text-text-primary">Account Disabled</h1>
      <p className="text-sm text-text-secondary mt-3 leading-relaxed">
        Your trainer account has been disabled by the administrator.
      </p>
      <p className="text-sm text-text-secondary mt-2 leading-relaxed">
        If you believe this is a mistake, please contact support.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-surface-elevated/60 px-4 py-3 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Support</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-sm font-medium text-primary hover:text-primary-hover transition-colors break-all"
        >
          {SUPPORT_EMAIL}
        </a>
      </div>

      <Link
        to={ROUTES.LOGIN}
        className="inline-flex items-center justify-center mt-6 h-10 px-5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
      >
        Back to sign in
      </Link>
    </div>
  </AuthLayout>
);

export default AccountDisabledPage;
