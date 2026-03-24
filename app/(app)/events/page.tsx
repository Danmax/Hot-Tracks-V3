import Link from "next/link";
import { FlashBanner } from "@/components/flash-banner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PageShell } from "@/components/page-shell";
import { getAccessibleEventIds, requireUser } from "@/lib/auth";
import {
  createEventAction,
  createEventAssignmentAction,
  deleteEventAction,
  removeEventAssignmentAction,
  updateEventDetailsAction,
  updateEventStatusAction,
} from "@/app/(app)/events/actions";
import { getEventList } from "@/lib/view-models";
import type { FlashTone } from "@/lib/flash";

export default async function EventsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const resolvedSearchParams = await searchParams;
  const user = await requireUser();
  const events = getEventList();
  const canOperateEvents = ["admin", "host", "official"].includes(user.role);
  const canManageEvents = ["admin", "host"].includes(user.role);
  const manageableEventIds = canManageEvents ? await getAccessibleEventIds("manage") : new Set<string>();
  const operableEventIds = canOperateEvents ? await getAccessibleEventIds("operate") : new Set<string>();
  const flashMessage =
    typeof resolvedSearchParams.flashMessage === "string" ? resolvedSearchParams.flashMessage : null;
  const flashTone =
    resolvedSearchParams.flashTone === "error" || resolvedSearchParams.flashTone === "success"
      ? (resolvedSearchParams.flashTone as FlashTone)
      : null;

  return (
    <PageShell
      title="Events"
      description="Host-managed event list with lane configuration and live status."
    >
      {flashMessage && flashTone ? <FlashBanner message={flashMessage} tone={flashTone} /> : null}
      {canManageEvents ? (
        <section className="feature-card">
          <p className="eyebrow">Create event</p>
          <h3>Host Setup</h3>
          <form action={createEventAction} className="event-create-form">
            <label className="form-field">
              <span>Event name</span>
              <input name="name" placeholder="Spring Track Showdown" required type="text" />
            </label>
            <label className="form-field">
              <span>Date</span>
              <input name="eventDate" required type="date" />
            </label>
            <label className="form-field">
              <span>Location</span>
              <input name="locationName" placeholder="Garage or venue" type="text" />
            </label>
            <label className="form-field">
              <span>Track</span>
              <select defaultValue="" name="trackId" required>
                <option disabled value="">
                  Select track
                </option>
                {events[0]?.trackOptions.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Timing mode</span>
              <select defaultValue="manual_entry" name="timingMode">
                <option value="manual_entry">Manual Entry</option>
                <option value="track_timer">Track Timer</option>
              </select>
            </label>
            <label className="form-field">
              <span>Start mode</span>
              <select defaultValue="manual_gate" name="startMode">
                <option value="manual_gate">Manual Gate</option>
                <option value="electronic_gate">Electronic Gate</option>
              </select>
            </label>
            <label className="form-field">
              <span>Tie policy</span>
              <select defaultValue="rerun" name="tiePolicy">
                <option value="rerun">Rerun</option>
                <option value="official_review">Official Review</option>
              </select>
            </label>
            <label className="form-field">
              <span>Seeding mode</span>
              <select defaultValue="standard_seeded" name="seedingMode">
                <option value="standard_seeded">Standard Seeded</option>
                <option value="random_draw">Random Draw</option>
                <option value="qualifier_split">Qualifier Split</option>
              </select>
            </label>
            <label className="form-field">
              <span>Match series</span>
              <select defaultValue="1" name="matchRaceCount">
                <option value="1">Single race</option>
                <option value="2">Best of 2</option>
                <option value="3">Best of 3</option>
              </select>
            </label>
            <label className="form-field form-field-span-full">
              <span>Description</span>
              <textarea
                name="description"
                placeholder="What should hosts and officials know about this event?"
                rows={3}
              />
            </label>
            <label className="form-field">
              <span>Status</span>
              <select defaultValue="draft" name="status">
                <option value="draft">Draft</option>
                <option value="registration_open">Registration Open</option>
                <option value="checkin">Check-In</option>
              </select>
            </label>
            <FormSubmitButton
              className="button primary compact-button"
              idleLabel="Create Event"
              pendingLabel="Creating..."
            />
          </form>
        </section>
      ) : null}

      <div className="stack">
        {events.map((event) => (
          <article className="feature-card" key={event.id}>
            <div className="split-row">
              <div>
                <p className="eyebrow">{event.statusLabel}</p>
                <h3>{event.name}</h3>
                <p className="muted">
                  {event.date} • {event.location} • Track: {event.trackName} • {event.trackLength} • Host: {event.hostName}
                </p>
                <p className="muted">
                  {event.timingMode} • {event.startMode} • Tie policy: {event.tiePolicy}
                </p>
                <p className="muted">
                  {event.seedingMode} • {event.matchSeriesLabel}
                </p>
                {event.descriptionValue ? <p className="muted">{event.descriptionValue}</p> : null}
              </div>
              <span className="pill">{event.laneCount}-lane</span>
            </div>
            <div className="metric-row">
              <div>
                <span>Checked In</span>
                <strong>{event.checkedInCount}</strong>
              </div>
              <div>
                <span>Bracket</span>
                <strong>{event.format}</strong>
              </div>
              <div>
                <span>Stage</span>
                <strong>{event.progress}</strong>
              </div>
            </div>
            {canManageEvents && manageableEventIds.has(event.id) ? (
              <>
                <form action={updateEventDetailsAction} className="event-create-form">
                  <input name="eventId" type="hidden" value={event.id} />
                  <input name="returnTo" type="hidden" value="/events" />
                  <label className="form-field">
                    <span>Event name</span>
                    <input defaultValue={event.name} name="name" required type="text" />
                  </label>
                  <label className="form-field">
                    <span>Date</span>
                    <input defaultValue={event.eventDateValue} name="eventDate" required type="date" />
                  </label>
                  <label className="form-field">
                    <span>Location</span>
                    <input defaultValue={event.locationValue} name="locationName" type="text" />
                  </label>
                  <label className="form-field">
                    <span>Track</span>
                    <select defaultValue={event.trackId} name="trackId" required>
                      {event.trackOptions.map((track) => (
                        <option key={track.id} value={track.id}>
                          {track.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Timing mode</span>
                    <select defaultValue={event.timingModeValue} name="timingMode">
                      <option value="manual_entry">Manual Entry</option>
                      <option value="track_timer">Track Timer</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Start mode</span>
                    <select defaultValue={event.startModeValue} name="startMode">
                      <option value="manual_gate">Manual Gate</option>
                      <option value="electronic_gate">Electronic Gate</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Tie policy</span>
                    <select defaultValue={event.tiePolicyValue} name="tiePolicy">
                      <option value="rerun">Rerun</option>
                      <option value="official_review">Official Review</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Seeding mode</span>
                    <select defaultValue={event.seedingModeValue} disabled={event.rosterLocked} name="seedingMode">
                      <option value="standard_seeded">Standard Seeded</option>
                      <option value="random_draw">Random Draw</option>
                      <option value="qualifier_split">Qualifier Split</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Match series</span>
                    <select
                      defaultValue={event.matchRaceCountValue}
                      disabled={event.rosterLocked}
                      name="matchRaceCount"
                    >
                      <option value="1">Single race</option>
                      <option value="2">Best of 2</option>
                      <option value="3">Best of 3</option>
                    </select>
                  </label>
                  <label className="form-field form-field-span-full">
                    <span>Description</span>
                    <textarea defaultValue={event.descriptionValue} name="description" rows={3} />
                  </label>
                  <div className="form-note form-field-span-full">
                    <p className="list-title">Track rule</p>
                    <p className="list-meta">
                      Track selection drives lane count and length. If bracket structure is already locked,
                      choose a track with the same lane count as the current event.
                    </p>
                    <p className="list-meta">
                      `Qualifier Split` uses ranking seeds like `1 vs 5, 2 vs 6`; `Random Draw` ignores seed order.
                    </p>
                    <p className="list-meta">
                      Seeding mode and match series lock as soon as the bracket is generated.
                    </p>
                  </div>
                  <FormSubmitButton
                    className="button secondary compact-button"
                    idleLabel="Save Details"
                    pendingLabel="Saving..."
                  />
                </form>

                <form action={updateEventStatusAction} className="status-form">
                  <input name="eventId" type="hidden" value={event.id} />
                  <input name="returnTo" type="hidden" value="/events" />
                  <label className="form-field compact-field">
                    <span>Event status</span>
                    <select defaultValue={event.statusValue} name="status">
                      <option value="draft">Draft</option>
                      <option value="registration_open">Registration Open</option>
                      <option value="checkin">Check-In</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>
                  <FormSubmitButton
                    className="button secondary compact-button"
                    idleLabel="Save Status"
                    pendingLabel="Saving..."
                  />
                </form>

                <form action={deleteEventAction} className="status-form">
                  <input name="eventId" type="hidden" value={event.id} />
                  <input name="returnTo" type="hidden" value="/events" />
                  <div className="form-note">
                    <p className="list-title">Delete event</p>
                    <p className="list-meta">{event.deleteHelpText}</p>
                  </div>
                  <FormSubmitButton
                    className="button secondary compact-button"
                    confirmMessage={`Delete ${event.name}? This removes its roster, assignments, and setup data.`}
                    disabled={!event.canDelete}
                    idleLabel="Delete Event"
                    pendingLabel="Deleting..."
                  />
                </form>

                <div className="assignment-stack">
                  <div className="stack compact">
                    {event.assignments.map((assignment) => (
                      <div className="assignment-row" key={assignment.id}>
                        <div>
                          <p className="list-title">
                            {assignment.name} • {assignment.role}
                          </p>
                          <p className="list-meta">{assignment.email}</p>
                        </div>
                        {assignment.isPrimaryHost ? (
                          <span className="chip">Primary host</span>
                        ) : (
                          <form action={removeEventAssignmentAction} className="inline-form">
                            <input name="eventId" type="hidden" value={event.id} />
                            <input name="assignmentId" type="hidden" value={assignment.id} />
                            <FormSubmitButton
                              className="button secondary compact-button"
                              confirmMessage={`Remove ${assignment.name} from this event?`}
                              idleLabel="Remove"
                              pendingLabel="Removing..."
                            />
                          </form>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="assignment-grid">
                    <form action={createEventAssignmentAction} className="result-form">
                      <input name="eventId" type="hidden" value={event.id} />
                      <input name="assignmentRole" type="hidden" value="official" />
                      <div>
                        <p className="list-title">Assign official</p>
                        <p className="list-meta">Officials can operate race flow and check-in for this event.</p>
                      </div>
                      {event.assignmentOptions.officials.length > 0 ? (
                        <>
                          <label className="form-field">
                            <span>User</span>
                            <select defaultValue="" name="userId" required>
                              <option disabled value="">
                                Select official
                              </option>
                              {event.assignmentOptions.officials.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <FormSubmitButton
                            className="button primary compact-button"
                            idleLabel="Assign Official"
                            pendingLabel="Assigning..."
                          />
                        </>
                      ) : (
                        <p className="muted">No additional official-capable users are available to assign.</p>
                      )}
                    </form>

                    <form action={createEventAssignmentAction} className="result-form">
                      <input name="eventId" type="hidden" value={event.id} />
                      <input name="assignmentRole" type="hidden" value="host" />
                      <div>
                        <p className="list-title">Assign host</p>
                        <p className="list-meta">Hosts can manage event setup, roster, and corrections.</p>
                      </div>
                      {event.assignmentOptions.hosts.length > 0 ? (
                        <>
                          <label className="form-field">
                            <span>User</span>
                            <select defaultValue="" name="userId" required>
                              <option disabled value="">
                                Select host
                              </option>
                              {event.assignmentOptions.hosts.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <FormSubmitButton
                            className="button primary compact-button"
                            idleLabel="Assign Host"
                            pendingLabel="Assigning..."
                          />
                        </>
                      ) : (
                        <p className="muted">No additional host-capable users are available to assign.</p>
                      )}
                    </form>
                  </div>
                </div>
              </>
            ) : null}
            {canOperateEvents && operableEventIds.has(event.id) ? (
              <div className="actions-row">
                <Link className="button secondary compact-button" href={`/events/${event.id}`}>
                  Open workspace
                </Link>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </PageShell>
  );
}
