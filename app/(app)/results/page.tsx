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
    completedSeasonEventCount,
    championshipRows,
    championshipPodiumRows,
    eventAwardRows,
    seasonAwardRows,
    podiumRows,
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
          <p className="eyebrow">Season race</p>
          <h3>Championship Standings</h3>
          <p className="list-meta">
            {completedSeasonEventCount > 0
              ? `${completedSeasonEventCount} completed event${
                  completedSeasonEventCount === 1 ? "" : "s"
                } are now contributing points.`
              : "No events are marked completed yet, so season points have not started accumulating."}
          </p>
          {championshipPodiumRows.length > 0 ? (
            <div className="card-grid three-up">
              {championshipPodiumRows.map((row) => (
                <article className="mini-card" key={`${row.positionLabel}-${row.racer}`}>
                  <p className="eyebrow">{row.positionLabel}</p>
                  <h4>{row.racer}</h4>
                  <div className="chip-row wrap-row">
                    <span className="chip">{row.points} pts</span>
                    <span className="chip">{row.events} events</span>
                    <span className="chip">{row.podiums} podiums</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          <div className="stack compact">
            {championshipRows.length > 0 ? (
              championshipRows.map((row) => (
                <div className="table-row" key={`${row.positionLabel}-${row.racer}-season`}>
                  <div>
                    <p className="list-title">
                      {row.positionLabel} {row.racer}
                    </p>
                    <p className="list-meta">
                      {row.titles} titles • {row.podiums} podiums • Best finish {row.bestFinish}
                    </p>
                  </div>
                  <div className="chip-row wrap-row">
                    <span className="chip">{row.points} pts</span>
                    <span className="chip">{row.events} events</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="list-meta">
                Mark an event completed after the bracket finishes to start the season leaderboard.
              </p>
            )}
          </div>
        </section>

        <section className="feature-card">
          <p className="eyebrow">Season awards</p>
          <h3>Championship Honors</h3>
          {seasonAwardRows.length > 0 ? (
            <div className="card-grid three-up">
              {seasonAwardRows.map((award) => (
                <article className="mini-card" key={`${award.title}-${award.winner}`}>
                  <p className="eyebrow">{award.title}</p>
                  <h4>{award.winner}</h4>
                  <p>{award.detail}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="list-meta">Season honors will appear after completed events start generating points.</p>
          )}
        </section>

        <section className="feature-card">
          <p className="eyebrow">Placements</p>
          <h3>Final Standings</h3>
          {podiumRows.length > 0 ? (
            <div className="card-grid three-up">
              {podiumRows.map((row) => (
                <article className="mini-card" key={`${row.positionLabel}-${row.racer}`}>
                  <p className="eyebrow">{row.placementLabel}</p>
                  <h4>
                    {row.positionLabel} • {row.racer}
                  </h4>
                  <p>{row.car}</p>
                  <div className="chip-row wrap-row">
                    <span className="chip">Record {row.record}</span>
                    <span className="chip">Best {row.bestTime}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="list-meta">No completed placements yet. Finish the bracket to publish podium results.</p>
          )}
        </section>

        <section className="feature-card">
          <p className="eyebrow">Event awards</p>
          <h3>{eventName}</h3>
          {eventAwardRows.length > 0 ? (
            <div className="card-grid three-up">
              {eventAwardRows.map((award) => (
                <article className="mini-card" key={`${award.title}-${award.winner}-event`}>
                  <p className="eyebrow">{award.title}</p>
                  <h4>{award.winner}</h4>
                  <p>{award.detail}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="list-meta">Finish the bracket and record lane times to generate event awards.</p>
          )}
        </section>

        <section className="feature-card">
          <p className="eyebrow">Leaderboard</p>
          <h3>{eventName}</h3>
          <div className="stack compact">
            {leaderboardRows.length > 0 ? (
              leaderboardRows.map((row) => (
                <div className="table-row" key={`${row.positionLabel}-${row.racer}`}>
                  <div>
                    <p className="list-title">
                      {row.positionLabel} {row.racer}
                    </p>
                    <p className="list-meta">
                      {row.car} • {row.placementLabel} • {row.eliminatedRoundLabel}
                    </p>
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
