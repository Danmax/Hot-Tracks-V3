import { Navigation } from "@/components/navigation";
import { SignOutForm } from "@/components/sign-out-form";
import { formatRoleLabel, requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Phase 1 MVP</p>
          <h1>Hot Tracks</h1>
          <p className="brand-copy">
            Race operations, bracket control, and event visibility for local Hot
            Wheels tournaments.
          </p>
        </div>
        <Navigation userRole={user.role} />
        <div className="user-panel">
          <p className="eyebrow">Signed in</p>
          <p className="user-name">{user.displayName}</p>
          <p className="user-meta">
            {formatRoleLabel(user.role)} • {user.email}
          </p>
          <SignOutForm />
        </div>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}

