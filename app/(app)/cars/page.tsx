import { CarCreationForm } from "@/components/car-creation-form";
import { FlashBanner } from "@/components/flash-banner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth";
import { getCarList } from "@/lib/view-models";
import {
  archiveCarAction,
  createCarAction,
  updateCarAction,
} from "@/app/(app)/cars/actions";
import type { FlashTone } from "@/lib/flash";

export default async function CarsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const resolvedSearchParams = await searchParams;
  const user = await requireUser();
  const { activeCars, archivedCars, ownerOptions } = getCarList();
  const canManageCars = ["admin", "host"].includes(user.role);
  const aiIdentifyEnabled = Boolean(process.env.OPENAI_API_KEY);
  const flashMessage =
    typeof resolvedSearchParams.flashMessage === "string" ? resolvedSearchParams.flashMessage : null;
  const flashTone =
    resolvedSearchParams.flashTone === "error" || resolvedSearchParams.flashTone === "success"
      ? (resolvedSearchParams.flashTone as FlashTone)
      : null;

  return (
    <PageShell
      title="Cars"
      description="Catalog view for race-ready cars assigned to racers."
    >
      {flashMessage && flashTone ? <FlashBanner message={flashMessage} tone={flashTone} /> : null}
      {canManageCars ? (
        <section className="feature-card">
          <p className="eyebrow">Create car</p>
          <h3>Catalog Entry</h3>
          <CarCreationForm
            action={createCarAction}
            aiIdentifyEnabled={aiIdentifyEnabled}
            ownerOptions={ownerOptions}
            pendingLabel="Creating..."
            submitLabel="Create Car"
          />
        </section>
      ) : null}

      <div className="card-grid two-up">
        {activeCars.map((car) => (
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
              <div>
                <span>Active regs</span>
                <strong>{car.activeRegistrationCount}</strong>
              </div>
            </div>
            {canManageCars ? (
              <div className="stack compact">
                <form action={updateCarAction} className="event-create-form">
                  <input name="carId" type="hidden" value={car.id} />
                  <label className="form-field">
                    <span>Owner</span>
                    <select defaultValue={car.ownerRacerId} name="ownerRacerId" required>
                      {ownerOptions.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Nickname</span>
                    <input defaultValue={car.nickname} name="nickname" required type="text" />
                  </label>
                  <label className="form-field">
                    <span>Brand</span>
                    <input defaultValue={car.brand} name="brand" required type="text" />
                  </label>
                  <label className="form-field">
                    <span>Model</span>
                    <input defaultValue={car.model} name="model" required type="text" />
                  </label>
                  <label className="form-field">
                    <span>Series</span>
                    <input defaultValue={car.seriesValue} name="series" type="text" />
                  </label>
                  <label className="form-field">
                    <span>Model year</span>
                    <input defaultValue={car.modelYearValue} inputMode="numeric" name="modelYear" type="text" />
                  </label>
                  <label className="form-field">
                    <span>Category</span>
                    <input defaultValue={car.categoryValue} name="category" type="text" />
                  </label>
                  <label className="form-field">
                    <span>Class</span>
                    <input defaultValue={car.classNameValue} name="className" type="text" />
                  </label>
                  <label className="form-field">
                    <span>Status</span>
                    <select defaultValue={car.statusValue} name="status">
                      <option value="inspection">Inspection</option>
                      <option value="checked_in">Checked In</option>
                      <option value="race_ready">Race Ready</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label className="form-field form-field-span-full">
                    <span>Notes</span>
                    <textarea defaultValue={car.notesValue} name="notes" rows={3} />
                  </label>
                  <FormSubmitButton
                    className="button secondary compact-button"
                    idleLabel="Save Car"
                    pendingLabel="Saving..."
                  />
                </form>
                <form action={archiveCarAction} className="status-form">
                  <input name="carId" type="hidden" value={car.id} />
                  <div className="form-note">
                    <p className="list-title">Archive car</p>
                    <p className="list-meta">{car.archiveHelpText}</p>
                  </div>
                  <FormSubmitButton
                    className="button secondary compact-button"
                    confirmMessage={`Archive ${car.nickname}?`}
                    disabled={!car.canArchive}
                    idleLabel="Archive"
                    pendingLabel="Archiving..."
                  />
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {archivedCars.length > 0 ? (
        <section className="feature-card">
          <p className="eyebrow">Archived</p>
          <h3>Archived Cars</h3>
          <div className="card-grid two-up">
            {archivedCars.map((car) => (
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
                {canManageCars ? (
                  <form action={updateCarAction} className="event-create-form">
                    <input name="carId" type="hidden" value={car.id} />
                    <label className="form-field">
                      <span>Owner</span>
                      <select defaultValue={car.ownerRacerId} name="ownerRacerId" required>
                        {ownerOptions.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Nickname</span>
                      <input defaultValue={car.nickname} name="nickname" required type="text" />
                    </label>
                    <label className="form-field">
                      <span>Brand</span>
                      <input defaultValue={car.brand} name="brand" required type="text" />
                    </label>
                    <label className="form-field">
                      <span>Model</span>
                      <input defaultValue={car.model} name="model" required type="text" />
                    </label>
                    <label className="form-field">
                      <span>Series</span>
                      <input defaultValue={car.seriesValue} name="series" type="text" />
                    </label>
                    <label className="form-field">
                      <span>Model year</span>
                      <input defaultValue={car.modelYearValue} inputMode="numeric" name="modelYear" type="text" />
                    </label>
                    <label className="form-field">
                      <span>Category</span>
                      <input defaultValue={car.categoryValue} name="category" type="text" />
                    </label>
                    <label className="form-field">
                      <span>Class</span>
                      <input defaultValue={car.classNameValue} name="className" type="text" />
                    </label>
                    <label className="form-field">
                      <span>Status</span>
                      <select defaultValue={car.statusValue} name="status">
                        <option value="inspection">Inspection</option>
                        <option value="checked_in">Checked In</option>
                        <option value="race_ready">Race Ready</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                    <label className="form-field form-field-span-full">
                      <span>Notes</span>
                      <textarea defaultValue={car.notesValue} name="notes" rows={3} />
                    </label>
                    <FormSubmitButton
                      className="button secondary compact-button"
                      idleLabel="Save Car"
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
