import { FlashBanner } from "@/components/flash-banner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth";
import { getTrackList } from "@/lib/view-models";
import {
  archiveTrackAction,
  createTrackAction,
  updateTrackAction,
} from "@/app/(app)/tracks/actions";
import type { FlashTone } from "@/lib/flash";

export default async function TracksPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const resolvedSearchParams = await searchParams;
  const user = await requireUser();
  const { activeTracks, archivedTracks } = getTrackList();
  const canManageTracks = ["admin", "host"].includes(user.role);
  const flashMessage =
    typeof resolvedSearchParams.flashMessage === "string" ? resolvedSearchParams.flashMessage : null;
  const flashTone =
    resolvedSearchParams.flashTone === "error" || resolvedSearchParams.flashTone === "success"
      ? (resolvedSearchParams.flashTone as FlashTone)
      : null;

  return (
    <PageShell
      title="Tracks"
      description="Track catalog and default race configuration for events."
    >
      {flashMessage && flashTone ? <FlashBanner message={flashMessage} tone={flashTone} /> : null}
      {canManageTracks ? (
        <section className="feature-card">
          <p className="eyebrow">Create track</p>
          <h3>Track Catalog Entry</h3>
          <form action={createTrackAction} className="event-create-form">
            <label className="form-field">
              <span>Name</span>
              <input name="name" required type="text" />
            </label>
            <label className="form-field">
              <span>Location</span>
              <input name="locationName" type="text" />
            </label>
            <label className="form-field">
              <span>Surface</span>
              <input name="surfaceType" type="text" />
            </label>
            <label className="form-field">
              <span>Track length (ft)</span>
              <input inputMode="numeric" name="trackLengthFeet" type="text" />
            </label>
            <label className="form-field">
              <span>Track length (in)</span>
              <input inputMode="numeric" name="trackLengthInches" type="text" />
            </label>
            <label className="form-field">
              <span>Lane count</span>
              <select defaultValue="4" name="laneCount">
                <option value="2">2 lanes</option>
                <option value="4">4 lanes</option>
              </select>
            </label>
            <label className="form-field">
              <span>Default timing mode</span>
              <select defaultValue="manual_entry" name="defaultTimingMode">
                <option value="manual_entry">Manual Entry</option>
                <option value="track_timer">Track Timer</option>
              </select>
            </label>
            <label className="form-field">
              <span>Default start mode</span>
              <select defaultValue="manual_gate" name="defaultStartMode">
                <option value="manual_gate">Manual Gate</option>
                <option value="electronic_gate">Electronic Gate</option>
              </select>
            </label>
            <label className="form-field">
              <span>Status</span>
              <select defaultValue="active" name="status">
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="form-field form-field-span-full">
              <span>Notes</span>
              <textarea name="notes" rows={3} />
            </label>
            <FormSubmitButton
              className="button primary compact-button"
              idleLabel="Create Track"
              pendingLabel="Creating..."
            />
          </form>
        </section>
      ) : null}

      <div className="stack">
        {activeTracks.map((track) => (
          <article className="feature-card" key={track.id}>
            <div className="split-row">
              <div>
                <p className="eyebrow">{track.status}</p>
                <h3>{track.name}</h3>
                <p className="list-meta">
                  {track.location} • {track.trackLength} • {track.laneCount}-lane • {track.surfaceType}
                </p>
              </div>
              <div className="chip-row wrap-row">
                <span className="chip">{track.defaultTimingMode}</span>
                <span className="chip">{track.defaultStartMode}</span>
                <span className="chip">Active events: {track.activeEventCount}</span>
              </div>
            </div>
            {canManageTracks ? (
              <div className="stack compact">
                <form action={updateTrackAction} className="event-create-form">
                  <input name="trackId" type="hidden" value={track.id} />
                  <label className="form-field">
                    <span>Name</span>
                    <input defaultValue={track.name} name="name" required type="text" />
                  </label>
                  <label className="form-field">
                    <span>Location</span>
                    <input defaultValue={track.locationValue} name="locationName" type="text" />
                  </label>
                  <label className="form-field">
                    <span>Surface</span>
                    <input defaultValue={track.surfaceTypeValue} name="surfaceType" type="text" />
                  </label>
                  <label className="form-field">
                    <span>Track length (ft)</span>
                    <input defaultValue={track.trackLengthFeetValue} inputMode="numeric" name="trackLengthFeet" type="text" />
                  </label>
                  <label className="form-field">
                    <span>Track length (in)</span>
                    <input defaultValue={track.trackLengthInchesValue} inputMode="numeric" name="trackLengthInches" type="text" />
                  </label>
                  <label className="form-field">
                    <span>Lane count</span>
                    <select defaultValue={String(track.laneCount)} name="laneCount">
                      <option value="2">2 lanes</option>
                      <option value="4">4 lanes</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Default timing mode</span>
                    <select defaultValue={track.defaultTimingModeValue} name="defaultTimingMode">
                      <option value="manual_entry">Manual Entry</option>
                      <option value="track_timer">Track Timer</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Default start mode</span>
                    <select defaultValue={track.defaultStartModeValue} name="defaultStartMode">
                      <option value="manual_gate">Manual Gate</option>
                      <option value="electronic_gate">Electronic Gate</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Status</span>
                    <select defaultValue={track.statusValue} name="status">
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label className="form-field form-field-span-full">
                    <span>Notes</span>
                    <textarea defaultValue={track.notesValue} name="notes" rows={3} />
                  </label>
                  <FormSubmitButton
                    className="button secondary compact-button"
                    idleLabel="Save Track"
                    pendingLabel="Saving..."
                  />
                </form>
                <form action={archiveTrackAction} className="status-form">
                  <input name="trackId" type="hidden" value={track.id} />
                  <div className="form-note">
                    <p className="list-title">Archive track</p>
                    <p className="list-meta">{track.archiveHelpText}</p>
                  </div>
                  <FormSubmitButton
                    className="button secondary compact-button"
                    confirmMessage={`Archive ${track.name}?`}
                    disabled={!track.canArchive}
                    idleLabel="Archive"
                    pendingLabel="Archiving..."
                  />
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {archivedTracks.length > 0 ? (
        <section className="feature-card">
          <p className="eyebrow">Archived</p>
          <h3>Archived Tracks</h3>
          <div className="stack compact">
            {archivedTracks.map((track) => (
              <article className="feature-card" key={track.id}>
                <div className="split-row">
                  <div>
                    <p className="list-title">{track.name}</p>
                    <p className="list-meta">
                      {track.location} • {track.trackLength} • {track.laneCount}-lane
                    </p>
                  </div>
                  <div className="chip-row wrap-row">
                    <span className="chip">{track.defaultTimingMode}</span>
                    <span className="chip">{track.defaultStartMode}</span>
                  </div>
                </div>
                {canManageTracks ? (
                  <form action={updateTrackAction} className="event-create-form">
                    <input name="trackId" type="hidden" value={track.id} />
                    <label className="form-field">
                      <span>Name</span>
                      <input defaultValue={track.name} name="name" required type="text" />
                    </label>
                    <label className="form-field">
                      <span>Location</span>
                      <input defaultValue={track.locationValue} name="locationName" type="text" />
                    </label>
                    <label className="form-field">
                      <span>Surface</span>
                      <input defaultValue={track.surfaceTypeValue} name="surfaceType" type="text" />
                    </label>
                    <label className="form-field">
                      <span>Track length (ft)</span>
                      <input defaultValue={track.trackLengthFeetValue} inputMode="numeric" name="trackLengthFeet" type="text" />
                    </label>
                    <label className="form-field">
                      <span>Track length (in)</span>
                      <input defaultValue={track.trackLengthInchesValue} inputMode="numeric" name="trackLengthInches" type="text" />
                    </label>
                    <label className="form-field">
                      <span>Lane count</span>
                      <select defaultValue={String(track.laneCount)} name="laneCount">
                        <option value="2">2 lanes</option>
                        <option value="4">4 lanes</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Default timing mode</span>
                      <select defaultValue={track.defaultTimingModeValue} name="defaultTimingMode">
                        <option value="manual_entry">Manual Entry</option>
                        <option value="track_timer">Track Timer</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Default start mode</span>
                      <select defaultValue={track.defaultStartModeValue} name="defaultStartMode">
                        <option value="manual_gate">Manual Gate</option>
                        <option value="electronic_gate">Electronic Gate</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Status</span>
                      <select defaultValue={track.statusValue} name="status">
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                    <label className="form-field form-field-span-full">
                      <span>Notes</span>
                      <textarea defaultValue={track.notesValue} name="notes" rows={3} />
                    </label>
                    <FormSubmitButton
                      className="button secondary compact-button"
                      idleLabel="Save Track"
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
