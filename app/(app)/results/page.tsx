import { PageShell } from "@/components/page-shell";
import { getResultsSnapshot } from "@/lib/view-models";

export default function ResultsPage() {
  const { eventName, leaderboardRows, latestMatches } = getResultsSnapshot();

  return (
    <PageShell
      title="Results"
      description="Event standings and recent match outcomes for the current tournament."
    >
      <div className="content-grid">
        <section className="feature-card">
          <p className="eyebrow">Leaderboard</p>
          <h3>{eventName}</h3>
          <div className="stack compact">
            {leaderboardRows.map((row) => (
              <div className="table-row" key={row.position}>
                <strong>#{row.position}</strong>
                <span>{row.racer}</span>
                <span>{row.car}</span>
                <span>{row.record}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="feature-card">
          <p className="eyebrow">Recent Matches</p>
          <h3>Bracket Progression</h3>
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
    </PageShell>
  );
}
