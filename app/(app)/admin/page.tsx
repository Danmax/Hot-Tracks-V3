import { PageShell } from "@/components/page-shell";
import { requireRole } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/view-models";

export default async function AdminPage() {
  await requireRole(["admin"]);
  const { auditRows, userRows } = getAdminSnapshot();

  return (
    <PageShell
      title="Admin"
      description="Phase 1 admin surface for user roles and critical event audit visibility."
    >
      <div className="content-grid">
        <section className="feature-card">
          <p className="eyebrow">Users</p>
          <h3>Role Assignment</h3>
          <div className="stack compact">
            {userRows.map((user) => (
              <div className="table-row" key={user.id}>
                <span>{user.name}</span>
                <span>{user.email}</span>
                <strong>{user.role}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="feature-card">
          <p className="eyebrow">Audit</p>
          <h3>Critical Changes</h3>
          <div className="stack compact">
            {auditRows.map((row) => (
              <article className="timeline-item" key={row.id}>
                <div>
                  <p className="list-title">{row.action}</p>
                  <p className="list-meta">{row.details}</p>
                </div>
                <span className="chip">{row.time}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
