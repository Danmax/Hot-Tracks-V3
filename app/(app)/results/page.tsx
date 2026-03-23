import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { getResultsSnapshot } from "@/lib/view-models";

export default async function ResultsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const resolvedSearchParams = await searchParams;
  const selectedEventId =
    typeof resolvedSearchParams.eventId === "string" ? resolvedSearchParams.eventId : undefined;
  const {
    eventOptions,
    selectedEventId: activeEventId,
    eventName,
    eventDate,
    eventLocation,
    trackName,
    trackLength,
    laneCountLabel,
    statusLabel,
    registeredCount,
    completedMatchCount,
    totalMatchCount,
    leaderboardRows,
    latestMatches,
  } = getResultsSnapshot(selectedEventId);

  return (
    <PageShell
      title="Results"
      description="Event standings and recent match outcomes for a selected tournament."
    >
      <section className="feature-card">
        <p className="eyebrow">Event results</p>
        <h3>{eventName}</h3>
        <p className="list-meta">
          {eventDate ? `${eventDate} • ` : ""}
          {eventLocation} • {trackName} • {trackLength}
        </p>
        {eventOptions.length > 0 ? (
          <div className="chip-row wrap-row">
            {eventOptions.map((event) => (
              <Link
                className={`button compact-button ${
                  event.id === activeEventId ? "primary" : "secondary"
                }`}
                href={`/results?eventId=${event.id}`}
                key={event.id}
              >
                {event.name}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="metric-row">
          <div>
            <span>Status</span>
            <strong>{statusLabel}</strong>
          </div>
          <div>
            <span>Registered</span>
            <strong>{registeredCount}</strong>
          </div>
          <div>
            <span>Matches</span>
            <strong>
              {completedMatchCount}/{totalMatchCount}
            </strong>
          </div>
          <div>
            <span>Track setup</span>
            <strong>{laneCountLabel}</strong>
          </div>
        </div>
      </section>

      <div className="content-grid">
        <section className="feature-card">
          <p className="eyebrow">Leaderboard</p>
          <h3>{eventName}</h3>
          <div className="stack compact">
            {leaderboardRows.length > 0 ? (
              leaderboardRows.map((row) => (
                <div className="table-row" key={row.position}>
                  <div>
                    <p className="list-title">
                      #{row.position} {row.racer}
                    </p>
                    <p className="list-meta">{row.car}</p>
                  </div>
                  <div className="chip-row wrap-row">
                    <span className="chip">Record {row.record}</span>
                    <span className="chip">Best {row.bestTime}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="list-meta">No standings yet. Complete matches to populate this board.</p>
            )}
          </div>
        </section>

        <section className="feature-card">
          <p className="eyebrow">Recent Matches</p>
          <h3>Bracket Progression</h3>
          <div className="stack compact">
            {latestMatches.length > 0 ? (
              latestMatches.map((match) => (
                <article className="timeline-item" key={match.id}>
                  <div>
                    <p className="list-title">{match.title}</p>
                    <p className="list-meta">{match.summary}</p>
                  </div>
                  <span className="chip">{match.result}</span>
                </article>
              ))
            ) : (
              <p className="list-meta">No bracket activity yet for this event.</p>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
