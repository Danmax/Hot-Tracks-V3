import { FlashBanner } from "@/components/flash-banner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PageShell } from "@/components/page-shell";
import { clearSampleDataAction } from "@/app/(app)/admin/actions";
import { requireRole } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/view-models";
import type { FlashTone } from "@/lib/flash";

export default async function AdminPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  await requireRole(["admin"]);
  const resolvedSearchParams = await searchParams;
  const { auditRows, userRows } = getAdminSnapshot();
  const flashMessage =
    typeof resolvedSearchParams.flashMessage === "string" ? resolvedSearchParams.flashMessage : null;
  const flashTone =
    resolvedSearchParams.flashTone === "error" || resolvedSearchParams.flashTone === "success"
      ? (resolvedSearchParams.flashTone as FlashTone)
      : null;

  return (
    <PageShell
      title="Admin"
      description="Phase 1 admin surface for user roles and critical event audit visibility."
    >
      {flashMessage && flashTone ? <FlashBanner message={flashMessage} tone={flashTone} /> : null}
      <section className="feature-card">
        <p className="eyebrow">Data controls</p>
        <h3>Clear Sample Data</h3>
        <div className="status-form">
          <div className="form-note">
            <p className="list-title">Seed reset option</p>
            <p className="list-meta">
              Removes seeded demo events, racers, cars, tracks, brackets, and demo users while preserving
              the currently signed-in admin and custom data that is not part of the original sample set.
            </p>
          </div>
          <form action={clearSampleDataAction}>
            <FormSubmitButton
              className="button secondary compact-button"
              confirmMessage="Clear all sample data? Seeded tournament records will be removed."
              idleLabel="Clear Sample Data"
              pendingLabel="Clearing..."
            />
          </form>
        </div>
      </section>

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
