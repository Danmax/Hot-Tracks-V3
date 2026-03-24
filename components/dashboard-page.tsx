import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/view-models";

export async function DashboardPage() {
  const user = await requireUser();
  const { latestMatches, milestones, nextActions, primaryEventId, stats } = getDashboardData();
  const canOperateEvents = ["admin", "host", "official"].includes(user.role);
  const designPillars = [
    { title: "Garage Participant Setup", summary: "Profiles, driver onboarding, teams, and assigned race inventory.", status: "Live" },
    { title: "Track Builder", summary: "Lane count, start mode, timing defaults, and track configuration.", status: "Live" },
    { title: "Cars", summary: "Cars, classes, and item-level setup tied to each garage.", status: "Live" },
    { title: "Drivers", summary: "Driver identity, garage affiliation, and event-readiness tracking.", status: "Live" },
    { title: "Tournaments", summary: "Bracket generation, event operations, and match correction workflow.", status: "Live" },
    { title: "Events", summary: "Host-run event setup with seeding, series rules, and roster control.", status: "Live" },
    { title: "Matches", summary: "Head-to-head race cards with mobile-friendly official entry.", status: "Live" },
    { title: "Race", summary: "Heat-by-heat progression, lane status, tie policy, and results flow.", status: "Live" },
    { title: "Awards", summary: "Leaderboard and standings surface for event outcomes and placements.", status: "Live" },
    { title: "Championships", summary: "Season view and multi-event titles planned on top of current results.", status: "Planned" },
    { title: "Team", summary: "Shared garage organization and staff roles beyond host and official.", status: "Planned" },
    { title: "Sponsors", summary: "Branding, partner slots, and sponsor inventory for race weekends.", status: "Planned" },
    { title: "Item", summary: "Accessory, kit, and gear catalog tied to cars and race operations.", status: "Planned" },
  ];

  return (
    <PageShell
      title="Garage Control"
      description="A mobile-first operations shell for garages, drivers, cars, tracks, tournaments, events, matches, race flow, awards, and the next championship layer."
    >
      <div className="hero-card dashboard-hero">
        <div>
          <p className="eyebrow">Current focus</p>
          <h3>Race Weekend Control Room</h3>
          <p className="hero-copy">
            The shell now reads like a race system instead of a generic admin tool:
            garage setup, track building, tournament control, match operations, and
            standings are grouped for quick mobile scanning.
          </p>
          <div className="chip-row wrap-row">
            <span className="pill">Garage</span>
            <span className="pill">Track Builder</span>
            <span className="pill">Tournaments</span>
            <span className="pill">Matches</span>
            <span className="pill">Awards</span>
          </div>
        </div>
        <div className="hero-actions">
          {canOperateEvents ? (
            <Link className="button primary" href={`/events/${primaryEventId}`}>
              Open Race Workspace
            </Link>
          ) : (
            <Link className="button primary" href="/events">
              View Event Schedule
            </Link>
          )}
          <Link className="button secondary" href="/results">
            Review Awards Board
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

      <section className="feature-card">
        <p className="eyebrow">System map</p>
        <h3>Garage To Championship</h3>
        <div className="card-grid three-up">
          {designPillars.map((pillar) => (
            <article className="mini-card atlas-card" key={pillar.title}>
              <div className="atlas-card-head">
                <h4>{pillar.title}</h4>
                <span className={pillar.status === "Live" ? "chip" : "pill"}>{pillar.status}</span>
              </div>
              <p>{pillar.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="content-grid">
        <section className="feature-card">
          <p className="eyebrow">Delivery track</p>
          <h3>Build milestones</h3>
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
          <h3>Recent match flow</h3>
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
        <p className="eyebrow">Next build steps</p>
        <h3>Immediate implementation targets</h3>
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
