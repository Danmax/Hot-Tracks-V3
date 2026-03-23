import { PageShell } from "@/components/page-shell";
import { getRacerList } from "@/lib/view-models";

export default function RacersPage() {
  const racers = getRacerList();

  return (
    <PageShell
      title="Racers"
      description="Active racer profiles for the current event cycle."
    >
      <div className="stack">
        {racers.map((racer) => (
          <article className="list-card" key={racer.id}>
            <div>
              <p className="list-title">{racer.displayName}</p>
              <p className="list-meta">
                {racer.garageName} • {racer.status}
              </p>
            </div>
            <div className="chip-row">
              <span className="chip">Cars: {racer.carCount}</span>
              <span className="chip">Wins: {racer.totalWins}</span>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
