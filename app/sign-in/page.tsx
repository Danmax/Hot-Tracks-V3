import { redirect } from "next/navigation";
import { signInAction } from "@/app/auth-actions";
import { formatRoleLabel, getSessionUser } from "@/lib/auth";
import { readState } from "@/lib/phase1-repository";

export default async function SignInPage() {
  const currentUser = await getSessionUser();
  const users = readState().users;

  if (currentUser) {
    redirect("/");
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <p className="eyebrow">Phase 1 sign-in</p>
          <h1>Hot Tracks Tournament Tracker</h1>
          <p className="auth-copy">
            This MVP auth layer uses the seeded Phase 1 users so the role matrix can
            be exercised before a real identity system is added.
          </p>
        </div>

        <div className="signin-grid">
          {users.map((user) => (
            <form action={signInAction} className="user-option" key={user.id}>
              <input name="userId" type="hidden" value={user.id} />
              <div>
                <p className="list-title">{user.displayName}</p>
                <p className="list-meta">{user.email}</p>
              </div>
              <div className="auth-option-footer">
                <span className="chip">{formatRoleLabel(user.role)}</span>
                <button className="button primary compact-button" type="submit">
                  Continue
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </section>
  );
}
