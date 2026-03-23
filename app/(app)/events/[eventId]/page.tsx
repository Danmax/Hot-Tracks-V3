import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashBanner } from "@/components/flash-banner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PageShell } from "@/components/page-shell";
import { requireEventAccess } from "@/lib/auth";
import {
  createEventRegistrationAction,
  createEventAssignmentAction,
  generateBracketAction,
  removeEventRegistrationAction,
  removeEventAssignmentAction,
  reopenMatchAction,
  recordMatchResultAction,
  updateEventDetailsAction,
  updateEventStatusAction,
  updateEventRegistrationCarAction,
  updateRegistrationStatusAction,
} from "@/app/(app)/events/actions";
import { getEventWorkspace } from "@/lib/view-models";
import type { FlashTone } from "@/lib/flash";

export default async function EventWorkspacePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;
  const user = await requireEventAccess(eventId, "operate");
  const event = getEventWorkspace(eventId);
  const flashMessage =
    typeof resolvedSearchParams.flashMessage === "string" ? resolvedSearchParams.flashMessage : null;
  const flashTone =
    resolvedSearchParams.flashTone === "error" || resolvedSearchParams.flashTone === "success"
      ? (resolvedSearchParams.flashTone as FlashTone)
      : null;

  if (!event) {
    notFound();
  }

  return (
    <PageShell
      title={event.name}
      description={`${event.date} • ${event.location} • ${event.trackName} • ${event.trackLength} • ${event.laneCount}-lane • ${event.status}`}
    >
      {flashMessage && flashTone ? <FlashBanner message={flashMessage} tone={flashTone} /> : null}
      <div className="hero-card">
        <div>
          <p className="eyebrow">Host workspace</p>
          <h3>{event.hostName}</h3>
          <p className="hero-copy">
            {event.location} • Track: {event.trackName} • {event.trackLength}
          </p>
          <p className="hero-copy">
            {event.timingMode} • {event.startMode} • Tie policy: {event.tiePolicy}
          </p>
          <p className="hero-copy">{event.description}</p>
        </div>
        <div className="hero-actions align-end">
          {user.role === "admin" || user.role === "host" ? (
            <form action={updateEventStatusAction} className="inline-form status-inline-form">
              <input name="eventId" type="hidden" value={event.id} />
              <input name="returnTo" type="hidden" value={`/events/${event.id}`} />
              <label className="form-field compact-field inverse-field">
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
          ) : null}
          <Link className="button secondary" href="/events">
            Back to Events
          </Link>
        </div>
      </div>

      {user.role === "admin" || user.role === "host" ? (
        <section className="feature-card">
          <p className="eyebrow">Setup</p>
          <h3>Event Details</h3>
          <form action={updateEventDetailsAction} className="event-create-form">
            <input name="eventId" type="hidden" value={event.id} />
            <input name="returnTo" type="hidden" value={`/events/${event.id}`} />
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
              <input defaultValue={event.locationValue} name="locationName" placeholder="Garage or venue" type="text" />
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
            <label className="form-field form-field-span-full">
              <span>Description</span>
              <textarea
                defaultValue={event.descriptionValue}
                name="description"
                placeholder="What should officials and hosts know about this event?"
                rows={3}
              />
            </label>
            <div className="form-note form-field-span-full">
              <p className="list-title">Track rule</p>
              <p className="list-meta">
                Track selection drives lane count and track length. If bracket structure is already locked,
                switch only to tracks with the same lane count as the current event.
              </p>
            </div>
            <FormSubmitButton
              className="button primary compact-button"
              idleLabel="Save Details"
              pendingLabel="Saving..."
            />
          </form>
        </section>
      ) : null}

      <section className="feature-card">
        <p className="eyebrow">Operations</p>
        <h3>Bracket And Results</h3>
        <div className="operation-stack">
          <div className="control-panel">
            <div>
              <p className="list-title">Tournament status</p>
              <p className="list-meta">{event.operations.tournamentStatus}</p>
            </div>
            {event.operations.canGenerateBracket ? (
              user.role === "admin" || user.role === "host" ? (
                <form action={generateBracketAction} className="inline-form">
                  <input name="eventId" type="hidden" value={event.id} />
                  <FormSubmitButton
                    className="button primary compact-button"
                    confirmMessage="Generate the bracket for this event now?"
                    idleLabel="Generate Bracket"
                    pendingLabel="Generating..."
                  />
                </form>
              ) : (
                <span className="chip">Host or admin required</span>
              )
            ) : (
              <span className="chip">{event.operations.readyMatchCount} ready matches</span>
            )}
          </div>

          {event.matchRows.filter((match) => match.canRecordResult).length > 0 ? (
            <div className="action-grid">
              {event.matchRows
                .filter((match) => match.canRecordResult)
                .map((match) => (
                  <form action={recordMatchResultAction} className="result-form" key={match.id}>
                    <input name="eventId" type="hidden" value={event.id} />
                    <input name="matchId" type="hidden" value={match.id} />
                    <div>
                      <p className="list-title">
                        {match.roundLabel}: {match.slotA} vs {match.slotB}
                      </p>
                      <p className="list-meta">
                        Manual official entry is the source of truth in Phase 1. {match.tieGuidance}
                      </p>
                    </div>
                    <label className="form-field">
                      <span>Winner</span>
                      <select defaultValue="" name="winnerRegistrationId">
                        <option disabled value="">
                          Select winner
                        </option>
                        {match.winnerOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Notes</span>
                      <textarea name="note" placeholder="Optional ruling, rerun note, or finish detail" rows={3} />
                    </label>
                    <div className="timing-grid">
                      <label className="form-field compact-field">
                        <span>{match.slotALabel} time (sec)</span>
                        <input inputMode="decimal" name="slotASeconds" placeholder="3.018" type="text" />
                      </label>
                      <label className="form-field compact-field">
                        <span>{match.slotBLabel} time (sec)</span>
                        <input inputMode="decimal" name="slotBSeconds" placeholder="3.025" type="text" />
                      </label>
                    </div>
                    <FormSubmitButton
                      className="button primary compact-button"
                      idleLabel="Record Winner"
                      pendingLabel="Recording..."
                      submitName="outcome"
                      submitValue="winner"
                    />
                    <FormSubmitButton
                      className="button secondary compact-button"
                      idleLabel="Record Tie"
                      pendingLabel="Recording..."
                      submitName="outcome"
                      submitValue="tie"
                    />
                  </form>
                ))}
            </div>
          ) : (
            <p className="muted">
              No result-entry forms are active right now. Generate a bracket or complete earlier matches first.
            </p>
          )}

          {user.role !== "official" && event.matchRows.filter((match) => match.canCorrectResult).length > 0 ? (
            <div className="correction-grid">
              {event.matchRows
                .filter((match) => match.canCorrectResult)
                .map((match) => (
                  <form action={reopenMatchAction} className="result-form correction-form" key={`${match.id}-reopen`}>
                    <input name="eventId" type="hidden" value={event.id} />
                    <input name="matchId" type="hidden" value={match.id} />
                    <div>
                      <p className="list-title">
                        Reopen {match.roundLabel}: {match.winner}
                      </p>
                      <p className="list-meta">
                        This clears the current winner or tie result and any downstream bracket path that depended on it.
                      </p>
                    </div>
                    <label className="form-field">
                      <span>Correction reason</span>
                      <textarea
                        name="correctionReason"
                        placeholder="Explain why this result needs to be corrected"
                        rows={2}
                      />
                    </label>
                    <FormSubmitButton
                      className="button secondary compact-button"
                      confirmMessage="Reopen this result and clear any downstream bracket path?"
                      idleLabel="Reopen Match"
                      pendingLabel="Reopening..."
                    />
                  </form>
                ))}
            </div>
          ) : null}
        </div>
      </section>

      {user.role !== "official" ? (
        <section className="feature-card">
          <p className="eyebrow">Roster</p>
          <h3>Add Registration</h3>
          {event.operations.canAddRegistrations ? (
            event.registrationOptions.length > 0 ? (
              <form action={createEventRegistrationAction} className="event-create-form">
                <input name="eventId" type="hidden" value={event.id} />
                <label className="form-field">
                  <span>Racer</span>
                  <select defaultValue="" name="racerId" required>
                    <option disabled value="">
                      Select racer
                    </option>
                    {event.registrationOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Car</span>
                  <select defaultValue="" name="carId" required>
                    <option disabled value="">
                      Select available car
                    </option>
                    {event.registrationOptions.flatMap((option) =>
                      option.cars.map((car) => (
                        <option key={car.id} value={car.id}>
                          {option.label} • {car.label}
                        </option>
                      )),
                    )}
                  </select>
                </label>
                <div className="form-note">
                  <p className="list-title">Constraint</p>
                  <p className="list-meta">
                    Cars already registered to this event are excluded automatically. New registrations lock once
                    bracket play begins.
                  </p>
                </div>
                <FormSubmitButton
                  className="button primary compact-button"
                  idleLabel="Add Registration"
                  pendingLabel="Adding..."
                />
              </form>
            ) : (
              <p className="muted">No unregistered racer/car combinations are available for this event.</p>
            )
          ) : (
            <p className="muted">Bracket play has started, so the roster is locked for new entries.</p>
          )}
        </section>
      ) : null}

      {user.role !== "official" ? (
        <section className="feature-card">
          <p className="eyebrow">Assignments</p>
          <h3>Event Access</h3>
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
                  <p className="list-meta">Officials can record results and update check-in status.</p>
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
                  <p className="list-meta">Hosts can manage event status, roster, and corrections.</p>
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
        </section>
      ) : null}

      <div className="content-grid">
        <section className="feature-card">
          <p className="eyebrow">Registrations</p>
          <h3>Event Roster</h3>
          {event.operations.rosterLocked ? (
            <p className="muted">
              Roster edits are locked once the bracket has been generated. Reopen the event only through manual
              corrections, not roster changes.
            </p>
          ) : null}
          <div className="stack compact">
            {event.registrations.map((registration) => (
              <div className="registration-row" key={registration.id}>
                <div className="registration-meta">
                  <span>#{registration.seed}</span>
                  <span>{registration.racerName}</span>
                  <span>{registration.carName}</span>
                  <strong>{registration.status}</strong>
                </div>
                <div className="registration-actions">
                  <form action={updateRegistrationStatusAction} className="registration-form">
                    <input name="eventId" type="hidden" value={event.id} />
                    <input name="registrationId" type="hidden" value={registration.id} />
                    <label className="form-field compact-field">
                      <span>Check-in status</span>
                      <select defaultValue={registration.statusValue} name="readyStatus">
                        <option value="registered">Registered</option>
                        <option value="checked_in">Checked In</option>
                        <option value="ready">Ready</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                    </label>
                    <FormSubmitButton
                      className="button secondary compact-button"
                      idleLabel="Update"
                      pendingLabel="Updating..."
                    />
                  </form>

                  {registration.canEdit ? (
                    <div className="registration-management-grid">
                      <form action={updateEventRegistrationCarAction} className="registration-form">
                        <input name="eventId" type="hidden" value={event.id} />
                        <input name="registrationId" type="hidden" value={registration.id} />
                        <label className="form-field compact-field">
                          <span>Assigned car</span>
                          <select defaultValue={registration.carId} name="carId">
                            {registration.carOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <FormSubmitButton
                          className="button secondary compact-button"
                          idleLabel={registration.canSwapCar ? "Swap Car" : "Save Car"}
                          pendingLabel="Saving..."
                        />
                      </form>

                      <form action={removeEventRegistrationAction} className="inline-form">
                        <input name="eventId" type="hidden" value={event.id} />
                        <input name="registrationId" type="hidden" value={registration.id} />
                        <FormSubmitButton
                          className="button secondary compact-button"
                          confirmMessage={`Remove ${registration.racerName} from this event roster?`}
                          idleLabel="Remove Entry"
                          pendingLabel="Removing..."
                        />
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="feature-card">
          <p className="eyebrow">Matches</p>
          <h3>Bracket Flow</h3>
          <div className="stack compact">
            {event.matchRows.map((match) => (
              <article className="timeline-item" key={match.id}>
                <div>
                  <p className="list-title">
                    {match.roundLabel}: {match.slotA} vs {match.slotB}
                  </p>
                  <p className="list-meta">{match.summary}</p>
                  {match.laneEntries.length > 0 ? (
                    <div className="lane-entry-row">
                      {match.laneEntries.map((laneEntry) => (
                        <span
                          className="chip"
                          key={`${match.id}-${laneEntry.heatNumber}-${laneEntry.laneNumber}`}
                        >
                          H{laneEntry.heatNumber} L{laneEntry.laneNumber} {laneEntry.label}{" "}
                          {laneEntry.elapsedDisplay}
                          {laneEntry.estimatedMph ? ` • ${laneEntry.estimatedMph}` : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="status-block">
                  <span className="chip">{match.status}</span>
                  <strong>{match.winner}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
