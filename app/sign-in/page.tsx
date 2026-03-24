import { redirect } from "next/navigation";
import { FlashBanner } from "@/components/flash-banner";
import { signInAction, signUpAction } from "@/app/auth-actions";
import { DEMO_PASSWORD, formatRoleLabel, getSessionUser } from "@/lib/auth";
import type { FlashTone } from "@/lib/flash";
import { readState } from "@/lib/phase1-repository";

export default async function SignInPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const resolvedSearchParams = await searchParams;
  const currentUser = await getSessionUser();
  const users = readState().users;
  const demoUsers = users.filter((user) => user.passwordHash === "demo-hash");
  const flashMessage =
    typeof resolvedSearchParams.flashMessage === "string" ? resolvedSearchParams.flashMessage : null;
  const flashTone =
    resolvedSearchParams.flashTone === "error" || resolvedSearchParams.flashTone === "success"
      ? (resolvedSearchParams.flashTone as FlashTone)
      : null;

  if (currentUser) {
    redirect("/");
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <p className="eyebrow">Account access</p>
          <h1>Hot Tracks Tournament Tracker</h1>
          <p className="auth-copy">
            Sign in with an email and password or create a new participant account. Seeded
            demo users still exist for role-based Phase 1 testing.
          </p>
        </div>

        {flashMessage && flashTone ? <FlashBanner message={flashMessage} tone={flashTone} /> : null}

        <div className="auth-workbench">
          <section className="result-form auth-form-card">
            <div>
              <p className="list-title">Sign In</p>
              <p className="list-meta">
                New accounts and seeded demo users can use email/password sign-in.
              </p>
            </div>
            <form action={signInAction} className="auth-form">
              <label className="form-field">
                <span>Email</span>
                <input autoComplete="email" name="email" placeholder="you@example.com" required type="email" />
              </label>
              <label className="form-field">
                <span>Password</span>
                <input
                  autoComplete="current-password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  type="password"
                />
              </label>
              <div>
                <p className="list-meta">Seeded demo accounts use password `{DEMO_PASSWORD}`.</p>
              </div>
              <button className="button primary full-width" type="submit">
                Sign In
              </button>
            </form>
          </section>

          <section className="result-form auth-form-card">
            <div>
              <p className="list-title">Create Account</p>
              <p className="list-meta">
                Signup creates a new `participant` account and signs you in immediately.
              </p>
            </div>
            <form action={signUpAction} className="auth-form">
              <label className="form-field">
                <span>Display name</span>
                <input name="displayName" placeholder="Jordan Velocity" required type="text" />
              </label>
              <label className="form-field">
                <span>Email</span>
                <input autoComplete="email" name="email" placeholder="you@example.com" required type="email" />
              </label>
              <label className="form-field">
                <span>Password</span>
                <input
                  autoComplete="new-password"
                  minLength={8}
                  name="password"
                  placeholder="At least 8 characters"
                  required
                  type="password"
                />
              </label>
              <label className="form-field">
                <span>Confirm password</span>
                <input
                  autoComplete="new-password"
                  minLength={8}
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  required
                  type="password"
                />
              </label>
              <button className="button primary full-width" type="submit">
                Create Account
              </button>
            </form>
          </section>
        </div>

        <div className="auth-demo-section">
          <div className="auth-demo-header">
            <div>
              <p className="list-title">Seeded Demo Access</p>
              <p className="list-meta">
                Quick-access buttons remain available for built-in Phase 1 roles.
              </p>
            </div>
          </div>

          <div className="signin-grid">
            {demoUsers.map((user) => (
              <form action={signInAction} className="user-option" key={user.id}>
                <input name="userId" type="hidden" value={user.id} />
                <div>
                  <p className="list-title">{user.displayName}</p>
                  <p className="list-meta">{user.email}</p>
                </div>
                <div className="auth-option-footer">
                  <span className="chip">{formatRoleLabel(user.role)}</span>
                  <button className="button secondary compact-button" type="submit">
                    Use Demo Account
                  </button>
                </div>
              </form>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
