import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/view-models";

export async function DashboardPage() {
  const user = await requireUser();
  const { latestMatches, milestones, nextActions, primaryEventId, stats } = getDashboardData();
  const canOperateEvents = ["admin", "host", "official"].includes(user.role);

  return (
    <PageShell
      title="Tournament Tracker"
      description="Build-ready Phase 1 shell aligned to the MVP plan: local event management, bracket flow, manual result capture, and admin visibility."
    >
      <div className="hero-card">
        <div>
          <p className="eyebrow">Current Focus</p>
          <h3>Saturday Garage Clash</h3>
          <p className="hero-copy">
            The dashboard is framed around the exact MVP boundary from the PRD:
            single elimination, 2-lane or 4-lane events, host tools, and manual
            result authority.
          </p>
        </div>
        <div className="hero-actions">
          {canOperateEvents ? (
            <Link className="button primary" href={`/events/${primaryEventId}`}>
              Open Event Workspace
            </Link>
          ) : (
            <Link className="button primary" href="/events">
              View Event Status
            </Link>
          )}
          <Link className="button secondary" href="/results">
            Review Standings
          </Link>
        </div>
      </div>

      <div className="card-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <p>{stat.note}</p>
          </article>
        ))}
      </div>

      <div className="content-grid">
        <section className="feature-card">
          <p className="eyebrow">Delivery Track</p>
          <h3>Phase 1 Milestones</h3>
          <div className="stack compact">
            {milestones.map((card) => (
              <article className="timeline-item" key={card.title}>
                <div>
                  <p className="list-title">{card.title}</p>
                  <p className="list-meta">{card.summary}</p>
                </div>
                <span className="pill">{card.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="feature-card">
          <p className="eyebrow">Operations</p>
          <h3>Recent Match Flow</h3>
          <div className="stack compact">
            {latestMatches.map((match) => (
              <article className="timeline-item" key={match.id}>
                <div>
                  <p className="list-title">{match.title}</p>
                  <p className="list-meta">{match.summary}</p>
                </div>
                <span className="chip">{match.result}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="feature-card">
        <p className="eyebrow">Next Build Steps</p>
        <h3>Immediate Implementation Targets</h3>
        <div className="card-grid three-up">
          {nextActions.map((action) => (
            <article className="mini-card" key={action.title}>
              <h4>{action.title}</h4>
              <p>{action.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
