import { PageShell } from "@/components/page-shell";
import { getCarList } from "@/lib/view-models";

export default function CarsPage() {
  const cars = getCarList();

  return (
    <PageShell
      title="Cars"
      description="Catalog view for race-ready cars assigned to racers."
    >
      <div className="card-grid two-up">
        {cars.map((car) => (
          <article className="feature-card" key={car.id}>
            <p className="eyebrow">{car.category}</p>
            <h3>{car.nickname}</h3>
            <p className="muted">
              {car.brand} {car.model} • {car.className}
            </p>
            <div className="metric-row">
              <div>
                <span>Owner</span>
                <strong>{car.ownerName}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{car.status}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
