import { FlashBanner } from "@/components/flash-banner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth";
import { getRacerList } from "@/lib/view-models";
import {
  archiveRacerAction,
  createRacerCarAction,
  createRacerAction,
  updateRacerAction,
} from "@/app/(app)/racers/actions";
import type { FlashTone } from "@/lib/flash";

export default async function RacersPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const resolvedSearchParams = await searchParams;
  const user = await requireUser();
  const { activeRacers, archivedRacers } = getRacerList();
  const canManageRacers = ["admin", "host"].includes(user.role);
  const flashMessage =
    typeof resolvedSearchParams.flashMessage === "string" ? resolvedSearchParams.flashMessage : null;
  const flashTone =
    resolvedSearchParams.flashTone === "error" || resolvedSearchParams.flashTone === "success"
      ? (resolvedSearchParams.flashTone as FlashTone)
      : null;

  return (
    <PageShell
      title="Racers"
      description="Active racer profiles for the current event cycle."
    >
      {flashMessage && flashTone ? <FlashBanner message={flashMessage} tone={flashTone} /> : null}
      {canManageRacers ? (
        <section className="feature-card">
          <p className="eyebrow">Create racer</p>
          <h3>Roster Entry</h3>
          <form action={createRacerAction} className="event-create-form">
            <label className="form-field">
              <span>First name</span>
              <input name="firstName" required type="text" />
            </label>
            <label className="form-field">
              <span>Last name</span>
              <input name="lastName" required type="text" />
            </label>
            <label className="form-field">
              <span>Display name</span>
              <input name="displayName" placeholder="Optional override" type="text" />
            </label>
            <label className="form-field">
              <span>Garage</span>
              <input name="garageName" placeholder="Independent" type="text" />
            </label>
            <label className="form-field">
              <span>Status</span>
              <select defaultValue="active" name="status">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <FormSubmitButton
              className="button primary compact-button"
              idleLabel="Create Racer"
              pendingLabel="Creating..."
            />
          </form>
        </section>
      ) : null}

      <div className="stack">
        {activeRacers.map((racer) => (
          <article className="feature-card" key={racer.id}>
            <div className="split-row">
              <div>
                <p className="list-title">{racer.displayName}</p>
                <p className="list-meta">
                  {racer.garageName} • {racer.status}
                </p>
              </div>
              <div className="chip-row">
                <span className="chip">Cars: {racer.carCount}</span>
                <span className="chip">Wins: {racer.totalWins}</span>
                <span className="chip">Active regs: {racer.activeRegistrationCount}</span>
              </div>
            </div>
            {canManageRacers ? (
              <div className="stack compact">
                <form action={updateRacerAction} className="event-create-form">
                  <input name="racerId" type="hidden" value={racer.id} />
                  <label className="form-field">
                    <span>First name</span>
                    <input defaultValue={racer.firstName} name="firstName" required type="text" />
                  </label>
                  <label className="form-field">
                    <span>Last name</span>
                    <input defaultValue={racer.lastName} name="lastName" required type="text" />
                  </label>
                  <label className="form-field">
                    <span>Display name</span>
                    <input defaultValue={racer.displayName} name="displayName" type="text" />
                  </label>
                  <label className="form-field">
                    <span>Garage</span>
                    <input defaultValue={racer.garageNameValue} name="garageName" type="text" />
                  </label>
                  <label className="form-field">
                    <span>Status</span>
                    <select defaultValue={racer.statusValue} name="status">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <FormSubmitButton
                    className="button secondary compact-button"
                    idleLabel="Save Racer"
                    pendingLabel="Saving..."
                  />
                </form>
                <div className="stack compact">
                  <div>
                    <p className="list-title">Owned cars</p>
                    <p className="list-meta">
                      Manage the racer profile and add cars from the same screen.
                    </p>
                  </div>
                  {racer.cars.length > 0 ? (
                    <div className="card-grid three-up">
                      {racer.cars.map((car) => (
                        <article className="mini-card" key={car.id}>
                          <p className="eyebrow">{car.category}</p>
                          <h4>{car.nickname}</h4>
                          <p>
                            {car.brand} {car.model}
                          </p>
                          <div className="chip-row wrap-row">
                            <span className="chip">{car.className}</span>
                            <span className="chip">{car.status}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="list-meta">No cars added for this racer yet.</p>
                  )}
                  {racer.canAddCars ? (
                    <form action={createRacerCarAction} className="event-create-form">
                      <input name="ownerRacerId" type="hidden" value={racer.id} />
                      <label className="form-field">
                        <span>Nickname</span>
                        <input name="nickname" required type="text" />
                      </label>
                      <label className="form-field">
                        <span>Brand</span>
                        <input name="brand" required type="text" />
                      </label>
                      <label className="form-field">
                        <span>Model</span>
                        <input name="model" required type="text" />
                      </label>
                      <label className="form-field">
                        <span>Series</span>
                        <input name="series" type="text" />
                      </label>
                      <label className="form-field">
                        <span>Model year</span>
                        <input inputMode="numeric" name="modelYear" type="text" />
                      </label>
                      <label className="form-field">
                        <span>Status</span>
                        <select defaultValue="race_ready" name="status">
                          <option value="inspection">Inspection</option>
                          <option value="checked_in">Checked In</option>
                          <option value="race_ready">Race Ready</option>
                        </select>
                      </label>
                      <label className="form-field">
                        <span>Category</span>
                        <input name="category" type="text" />
                      </label>
                      <label className="form-field">
                        <span>Class</span>
                        <input name="className" type="text" />
                      </label>
                      <label className="form-field form-field-span-full">
                        <span>Notes</span>
                        <textarea name="notes" rows={2} />
                      </label>
                      <FormSubmitButton
                        className="button secondary compact-button"
                        idleLabel="Add Car"
                        pendingLabel="Adding..."
                      />
                    </form>
                  ) : null}
                </div>
                <form action={archiveRacerAction} className="status-form">
                  <input name="racerId" type="hidden" value={racer.id} />
                  <div className="form-note">
                    <p className="list-title">Archive racer</p>
                    <p className="list-meta">{racer.archiveHelpText}</p>
                  </div>
                  <FormSubmitButton
                    className="button secondary compact-button"
                    confirmMessage={`Archive ${racer.displayName}?`}
                    disabled={!racer.canArchive}
                    idleLabel="Archive"
                    pendingLabel="Archiving..."
                  />
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {archivedRacers.length > 0 ? (
        <section className="feature-card">
          <p className="eyebrow">Archived</p>
          <h3>Archived Racers</h3>
          <div className="stack compact">
            {archivedRacers.map((racer) => (
              <article className="feature-card" key={racer.id}>
                <div className="split-row">
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
                </div>
                {racer.cars.length > 0 ? (
                  <div className="card-grid three-up">
                    {racer.cars.map((car) => (
                      <article className="mini-card" key={car.id}>
                        <p className="eyebrow">{car.category}</p>
                        <h4>{car.nickname}</h4>
                        <p>
                          {car.brand} {car.model}
                        </p>
                        <div className="chip-row wrap-row">
                          <span className="chip">{car.className}</span>
                          <span className="chip">{car.status}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="list-meta">No cars on record.</p>
                )}
                {canManageRacers ? (
                  <form action={updateRacerAction} className="event-create-form">
                    <input name="racerId" type="hidden" value={racer.id} />
                    <label className="form-field">
                      <span>First name</span>
                      <input defaultValue={racer.firstName} name="firstName" required type="text" />
                    </label>
                    <label className="form-field">
                      <span>Last name</span>
                      <input defaultValue={racer.lastName} name="lastName" required type="text" />
                    </label>
                    <label className="form-field">
                      <span>Display name</span>
                      <input defaultValue={racer.displayName} name="displayName" type="text" />
                    </label>
                    <label className="form-field">
                      <span>Garage</span>
                      <input defaultValue={racer.garageNameValue} name="garageName" type="text" />
                    </label>
                    <label className="form-field">
                      <span>Status</span>
                      <select defaultValue={racer.statusValue} name="status">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                    <FormSubmitButton
                      className="button secondary compact-button"
                      idleLabel="Save Racer"
                      pendingLabel="Saving..."
                    />
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
