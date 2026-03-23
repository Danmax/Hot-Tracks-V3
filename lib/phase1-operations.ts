import "server-only";

import { updateState } from "@/lib/phase1-repository";
import type {
  EventAssignmentRole,
  EventRegistration,
  EventStatus,
  Heat,
  LaneResult,
  Match,
  Phase1State,
  RegistrationStatus,
  Tournament,
} from "@/lib/types";

function getTournamentForEvent(state: Phase1State, eventId: string) {
  return state.tournaments.find((tournament) => tournament.eventId === eventId) ?? null;
}

function eventLaneNumbers(laneCount: 2 | 4) {
  return laneCount === 4 ? [1, 4] : [1, 2];
}

function ensureTournament(state: Phase1State, eventId: string) {
  const existing = getTournamentForEvent(state, eventId);
  if (existing) {
    return existing;
  }

  const tournament: Tournament = {
    id: `t_${eventId}`,
    eventId,
    format: "single_elimination",
    status: "draft",
    generatedAt: new Date().toISOString(),
  };

  state.tournaments.push(tournament);
  return tournament;
}

function ensureHeat(state: Phase1State, match: Match, laneCount: 2 | 4) {
  const existing = state.heats.find((heat) => heat.matchId === match.id);
  if (existing) {
    return existing;
  }

  const heat: Heat = {
    id: `${match.id}_heat_1`,
    matchId: match.id,
    heatNumber: 1,
    laneCount,
    status:
      match.status === "completed"
        ? "completed"
        : match.status === "ready" || match.status === "corrected"
          ? "ready"
          : "pending",
  };

  state.heats.push(heat);
  return heat;
}

function syncLaneResults(state: Phase1State, match: Match, laneCount: 2 | 4) {
  const heat = ensureHeat(state, match, laneCount);
  const [laneA, laneB] = eventLaneNumbers(laneCount);
  const assignments = [
    { laneNumber: laneA, registrationId: match.slotARegistrationId },
    { laneNumber: laneB, registrationId: match.slotBRegistrationId },
  ];

  assignments.forEach((assignment) => {
    const existing = state.laneResults.find(
      (laneResult) => laneResult.heatId === heat.id && laneResult.laneNumber === assignment.laneNumber,
    );

    if (existing) {
      existing.registrationId = assignment.registrationId;
      existing.elapsedMs = null;
      existing.finishPosition = null;
      existing.resultStatus = "pending";
      return;
    }

    const laneResult: LaneResult = {
      id: `${heat.id}_lane_${assignment.laneNumber}`,
      heatId: heat.id,
      laneNumber: assignment.laneNumber,
      registrationId: assignment.registrationId,
      elapsedMs: null,
      finishPosition: null,
      resultStatus: "pending",
    };

    state.laneResults.push(laneResult);
  });

  if (match.status === "completed" && match.winnerRegistrationId) {
    const loserRegistrationId =
      match.winnerRegistrationId === match.slotARegistrationId ? match.slotBRegistrationId : match.slotARegistrationId;

    state.laneResults
      .filter((laneResult) => laneResult.heatId === heat.id)
      .forEach((laneResult) => {
        if (laneResult.registrationId === match.winnerRegistrationId) {
          laneResult.resultStatus = "finished";
          laneResult.finishPosition = 1;
        } else if (laneResult.registrationId === loserRegistrationId) {
          laneResult.resultStatus = "finished";
          laneResult.finishPosition = 2;
        }
      });
  }

  heat.status =
    match.status === "completed"
      ? "completed"
      : match.status === "ready" || match.status === "corrected"
        ? "ready"
        : "pending";
}

function appendAudit(
  state: Phase1State,
  actorUserId: string,
  entityType: string,
  entityId: string,
  action: string,
  metadata: Record<string, string | number | boolean | null>,
) {
  state.auditLogs.push({
    id: `audit_${Date.now()}_${state.auditLogs.length + 1}`,
    actorUserId,
    entityType,
    entityId,
    action,
    metadataJson: JSON.stringify(metadata),
    createdAt: new Date().toISOString(),
  });
}

function setReadyStatus(match: Match) {
  if (match.winnerRegistrationId) {
    match.status = "completed";
    return;
  }

  if (match.slotARegistrationId && match.slotBRegistrationId) {
    match.status = "ready";
    return;
  }

  match.status = "pending";
}

function clearLaneResultsForMatch(state: Phase1State, match: Match, laneCount: 2 | 4) {
  match.winnerRegistrationId = null;
  match.status =
    match.slotARegistrationId && match.slotBRegistrationId ? "corrected" : "pending";
  syncLaneResults(state, match, laneCount);
}

function assignWinnerToNextMatch(state: Phase1State, match: Match, laneCount: 2 | 4) {
  if (!match.nextMatchId || !match.winnerRegistrationId) {
    return;
  }

  const nextMatch = state.matches.find((item) => item.id === match.nextMatchId);
  if (!nextMatch) {
    return;
  }

  if (!nextMatch.slotARegistrationId) {
    nextMatch.slotARegistrationId = match.winnerRegistrationId;
  } else if (!nextMatch.slotBRegistrationId) {
    nextMatch.slotBRegistrationId = match.winnerRegistrationId;
  }

  setReadyStatus(nextMatch);
  syncLaneResults(state, nextMatch, laneCount);
}

function clearDescendantMatches(state: Phase1State, match: Match, laneCount: 2 | 4) {
  const priorWinnerId = match.winnerRegistrationId;

  if (priorWinnerId && match.nextMatchId) {
    const nextMatch = state.matches.find((item) => item.id === match.nextMatchId);

    if (nextMatch) {
      if (nextMatch.slotARegistrationId === priorWinnerId) {
        nextMatch.slotARegistrationId = null;
      }

      if (nextMatch.slotBRegistrationId === priorWinnerId) {
        nextMatch.slotBRegistrationId = null;
      }

      if (nextMatch.winnerRegistrationId) {
        clearDescendantMatches(state, nextMatch, laneCount);
      } else {
        setReadyStatus(nextMatch);
        syncLaneResults(state, nextMatch, laneCount);
      }
    }
  }

  clearLaneResultsForMatch(state, match, laneCount);
}

function autoAdvanceByes(state: Phase1State, tournamentId: string, laneCount: 2 | 4) {
  const eventMatches = state.matches
    .filter((match) => match.tournamentId === tournamentId)
    .sort((left, right) => {
      if (left.roundNumber === right.roundNumber) {
        return left.bracketPosition - right.bracketPosition;
      }

      return left.roundNumber - right.roundNumber;
    });

  let changed = true;
  while (changed) {
    changed = false;

    eventMatches.forEach((match) => {
      if (match.winnerRegistrationId) {
        return;
      }

      const filledSlots = [match.slotARegistrationId, match.slotBRegistrationId].filter(Boolean);
      if (filledSlots.length === 1) {
        match.winnerRegistrationId = filledSlots[0] ?? null;
        match.status = "completed";
        syncLaneResults(state, match, laneCount);
        assignWinnerToNextMatch(state, match, laneCount);
        changed = true;
      } else {
        setReadyStatus(match);
        syncLaneResults(state, match, laneCount);
      }
    });
  }
}

function refreshEventStatus(state: Phase1State, eventId: string) {
  const tournament = getTournamentForEvent(state, eventId);
  const event = state.events.find((item) => item.id === eventId);
  if (!tournament || !event) {
    return;
  }

  const eventMatches = state.matches.filter((match) => match.tournamentId === tournament.id);
  const anyCompleted = eventMatches.some((match) => match.status === "completed");
  const allCompleted = eventMatches.length > 0 && eventMatches.every((match) => match.status === "completed");

  if (allCompleted) {
    tournament.status = "completed";
    event.status = "completed";
    return;
  }

  if (eventMatches.length > 0) {
    tournament.status = anyCompleted ? "in_progress" : "generated";
    event.status = "in_progress";
  }
}

function isRosterLocked(state: Phase1State, eventId: string) {
  const tournament = getTournamentForEvent(state, eventId);
  if (!tournament) {
    return false;
  }

  return state.matches.some((match) => match.tournamentId === tournament.id);
}

function resequenceEventRegistrations(state: Phase1State, eventId: string) {
  state.eventRegistrations
    .filter((registration) => registration.eventId === eventId)
    .sort((left, right) => {
      const leftSeed = left.seed ?? Number.MAX_SAFE_INTEGER;
      const rightSeed = right.seed ?? Number.MAX_SAFE_INTEGER;
      if (leftSeed === rightSeed) {
        return left.createdAt.localeCompare(right.createdAt);
      }

      return leftSeed - rightSeed;
    })
    .forEach((registration, index) => {
      registration.seed = index + 1;
    });
}

function nextPowerOfTwo(value: number) {
  let size = 1;
  while (size < value) {
    size *= 2;
  }

  return size;
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function createEvent(
  input: {
    name: string;
    eventDate: string;
    locationName: string;
    trackName: string;
    trackLengthFeet: number | null;
    description?: string;
    laneCount: 2 | 4;
    status: EventStatus;
  },
  actorUserId: string,
) {
  updateState((state) => {
    const eventId = `e_${makeSlug(input.name)}_${Date.now().toString().slice(-6)}`;

    state.events.push({
      id: eventId,
      hostUserId: actorUserId,
      name: input.name,
      description: input.description?.trim() || "Host-created Phase 1 event.",
      eventDate: input.eventDate,
      locationName: input.locationName || null,
      trackName: input.trackName.trim() || null,
      trackLengthFeet: input.trackLengthFeet,
      laneCount: input.laneCount,
      status: input.status,
      createdAt: new Date().toISOString(),
    });

    state.eventAssignments.push({
      id: `ea_${eventId}_${actorUserId}`,
      eventId,
      userId: actorUserId,
      assignmentRole: "host",
      createdAt: new Date().toISOString(),
    });

    state.tournaments.push({
      id: `t_${eventId}`,
      eventId,
      format: "single_elimination",
      status: "draft",
      generatedAt: new Date().toISOString(),
    });

    appendAudit(state, actorUserId, "event", eventId, "event_created", {
      laneCount: input.laneCount,
      status: input.status,
      hasTrackName: Boolean(input.trackName.trim()),
      trackLengthFeet: input.trackLengthFeet,
    });

    return state;
  });
}

export function updateEventDetails(
  eventId: string,
  input: {
    name: string;
    eventDate: string;
    locationName: string;
    trackName: string;
    trackLengthFeet: number | null;
    description: string;
    laneCount: 2 | 4;
  },
  actorUserId: string,
) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (!input.name.trim()) {
      throw new Error("Event name is required");
    }

    if (!input.eventDate.trim()) {
      throw new Error("Event date is required");
    }

    if (isRosterLocked(state, eventId) && input.laneCount !== event.laneCount) {
      throw new Error("Lane count cannot change after the bracket has been generated");
    }

    event.name = input.name.trim();
    event.eventDate = input.eventDate;
    event.locationName = input.locationName.trim() || null;
    event.trackName = input.trackName.trim() || null;
    event.trackLengthFeet = input.trackLengthFeet;
    event.description = input.description.trim() || null;
    event.laneCount = input.laneCount;

    appendAudit(state, actorUserId, "event", eventId, "event_details_updated", {
      laneCount: input.laneCount,
      hasDescription: Boolean(event.description),
      hasLocation: Boolean(event.locationName),
      hasTrackName: Boolean(event.trackName),
      trackLengthFeet: event.trackLengthFeet,
    });

    return state;
  });
}

export function createEventAssignment(
  eventId: string,
  userId: string,
  assignmentRole: EventAssignmentRole,
  actorUserId: string,
) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const user = state.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (assignmentRole === "host" && !["host", "admin"].includes(user.role)) {
      throw new Error("Assigned host must have a host-capable account");
    }

    if (assignmentRole === "official" && !["official", "admin"].includes(user.role)) {
      throw new Error("Assigned official must have an official-capable account");
    }

    const existing = state.eventAssignments.find(
      (assignment) =>
        assignment.eventId === eventId &&
        assignment.userId === userId &&
        assignment.assignmentRole === assignmentRole,
    );

    if (existing) {
      throw new Error("That user already has this event assignment");
    }

    const assignmentId = `ea_${eventId}_${userId}_${assignmentRole}`;
    state.eventAssignments.push({
      id: assignmentId,
      eventId,
      userId,
      assignmentRole,
      createdAt: new Date().toISOString(),
    });

    appendAudit(state, actorUserId, "event_assignment", assignmentId, "assignment_created", {
      eventId,
      userId,
      assignmentRole,
    });

    return state;
  });
}

export function removeEventAssignment(eventId: string, assignmentId: string, actorUserId: string) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const assignment = state.eventAssignments.find(
      (item) => item.id === assignmentId && item.eventId === eventId,
    );
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.assignmentRole === "host" && assignment.userId === event.hostUserId) {
      throw new Error("Primary host assignment cannot be removed");
    }

    state.eventAssignments = state.eventAssignments.filter((item) => item.id !== assignmentId);

    appendAudit(state, actorUserId, "event_assignment", assignmentId, "assignment_removed", {
      eventId,
      userId: assignment.userId,
      assignmentRole: assignment.assignmentRole,
    });

    return state;
  });
}

export function updateEventStatus(eventId: string, status: EventStatus, actorUserId: string) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    event.status = status;
    const tournament = getTournamentForEvent(state, eventId);
    if (tournament) {
      if (status === "draft" || status === "registration_open" || status === "checkin") {
        tournament.status = state.matches.some((match) => match.tournamentId === tournament.id)
          ? "generated"
          : "draft";
      }
      if (status === "completed") {
        tournament.status = "completed";
      }
    }

    appendAudit(state, actorUserId, "event", eventId, "event_status_updated", { status });

    return state;
  });
}

export function updateRegistrationStatus(
  eventId: string,
  registrationId: string,
  readyStatus: RegistrationStatus,
  actorUserId: string,
) {
  updateState((state) => {
    const registration = state.eventRegistrations.find(
      (item) => item.id === registrationId && item.eventId === eventId,
    );
    if (!registration) {
      throw new Error("Registration not found");
    }

    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    registration.readyStatus = readyStatus;
    registration.checkedInAt =
      readyStatus === "registered" || readyStatus === "withdrawn" ? null : new Date().toISOString();

    if (event.status === "registration_open" && readyStatus !== "registered") {
      event.status = "checkin";
    }

    appendAudit(state, actorUserId, "registration", registrationId, "registration_status_updated", {
      readyStatus,
      eventId,
    });

    return state;
  });
}

export function createEventRegistration(
  eventId: string,
  racerId: string,
  carId: string,
  actorUserId: string,
) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const tournament = getTournamentForEvent(state, eventId);
    if (isRosterLocked(state, eventId)) {
      throw new Error("Cannot add registrations after the bracket has been generated");
    }

    const racer = state.racerProfiles.find((item) => item.id === racerId);
    if (!racer) {
      throw new Error("Racer not found");
    }

    const car = state.cars.find((item) => item.id === carId);
    if (!car || car.ownerRacerId !== racerId) {
      throw new Error("Car must belong to the selected racer");
    }

    const existingForCar = state.eventRegistrations.find(
      (registration) => registration.eventId === eventId && registration.carId === carId,
    );
    if (existingForCar) {
      throw new Error("That car is already registered for this event");
    }

    const existingForRacer = state.eventRegistrations.filter((registration) => registration.eventId === eventId);
    const nextSeed =
      existingForRacer.reduce((maxSeed, registration) => Math.max(maxSeed, registration.seed ?? 0), 0) + 1;

    const registrationId = `reg_${eventId}_${Date.now().toString().slice(-6)}`;
    state.eventRegistrations.push({
      id: registrationId,
      eventId,
      racerId,
      carId,
      checkedInAt: null,
      readyStatus: "registered",
      seed: nextSeed,
      createdAt: new Date().toISOString(),
    });

    if (event.status === "draft") {
      event.status = "registration_open";
    }

    appendAudit(state, actorUserId, "registration", registrationId, "registration_created", {
      eventId,
      racerId,
      carId,
    });

    return state;
  });
}

export function updateEventRegistrationCar(
  eventId: string,
  registrationId: string,
  carId: string,
  actorUserId: string,
) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (isRosterLocked(state, eventId)) {
      throw new Error("Registrations are locked after bracket generation");
    }

    const registration = state.eventRegistrations.find(
      (item) => item.id === registrationId && item.eventId === eventId,
    );
    if (!registration) {
      throw new Error("Registration not found");
    }

    const car = state.cars.find((item) => item.id === carId);
    if (!car || car.ownerRacerId !== registration.racerId) {
      throw new Error("Replacement car must belong to the registered racer");
    }

    const existingForCar = state.eventRegistrations.find(
      (item) => item.eventId === eventId && item.carId === carId && item.id !== registrationId,
    );
    if (existingForCar) {
      throw new Error("That car is already registered for this event");
    }

    const priorCarId = registration.carId;
    registration.carId = carId;

    appendAudit(state, actorUserId, "registration", registrationId, "registration_car_updated", {
      eventId,
      priorCarId,
      carId,
    });

    return state;
  });
}

export function removeEventRegistration(eventId: string, registrationId: string, actorUserId: string) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (isRosterLocked(state, eventId)) {
      throw new Error("Registrations are locked after bracket generation");
    }

    const registration = state.eventRegistrations.find(
      (item) => item.id === registrationId && item.eventId === eventId,
    );
    if (!registration) {
      throw new Error("Registration not found");
    }

    state.eventRegistrations = state.eventRegistrations.filter((item) => item.id !== registrationId);
    resequenceEventRegistrations(state, eventId);

    appendAudit(state, actorUserId, "registration", registrationId, "registration_removed", {
      eventId,
      racerId: registration.racerId,
      carId: registration.carId,
    });

    return state;
  });
}

export function generateBracketForEvent(eventId: string, actorUserId: string) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const tournament = ensureTournament(state, eventId);
    const existingMatches = state.matches.filter((match) => match.tournamentId === tournament.id);
    if (existingMatches.some((match) => match.status === "completed" || match.winnerRegistrationId)) {
      throw new Error("Bracket already started and cannot be regenerated");
    }

    const eligibleRegistrations = state.eventRegistrations
      .filter(
        (registration) =>
          registration.eventId === eventId &&
          (registration.readyStatus === "checked_in" || registration.readyStatus === "ready"),
      )
      .sort((left, right) => (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER));

    if (eligibleRegistrations.length < 2) {
      throw new Error("At least two checked-in racers are required to generate a bracket");
    }

    state.matches = state.matches.filter((match) => match.tournamentId !== tournament.id);
    const removedMatchIds = existingMatches.map((match) => match.id);
    const removedHeatIds = state.heats
      .filter((heat) => removedMatchIds.includes(heat.matchId))
      .map((heat) => heat.id);
    state.heats = state.heats.filter((heat) => !removedMatchIds.includes(heat.matchId));
    state.laneResults = state.laneResults.filter((laneResult) => !removedHeatIds.includes(laneResult.heatId));

    const size = nextPowerOfTwo(eligibleRegistrations.length);
    const padded: Array<EventRegistration | null> = [...eligibleRegistrations];
    while (padded.length < size) {
      padded.push(null);
    }

    const totalRounds = Math.log2(size);
    const newMatches: Match[] = [];

    for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
      const matchesInRound = size / 2 ** roundNumber;
      for (let bracketPosition = 1; bracketPosition <= matchesInRound; bracketPosition += 1) {
        const nextMatchId =
          roundNumber < totalRounds
            ? `${tournament.id}_r${roundNumber + 1}_m${Math.ceil(bracketPosition / 2)}`
            : null;

        newMatches.push({
          id: `${tournament.id}_r${roundNumber}_m${bracketPosition}`,
          tournamentId: tournament.id,
          roundNumber,
          bracketPosition,
          status: "pending",
          slotARegistrationId: null,
          slotBRegistrationId: null,
          winnerRegistrationId: null,
          nextMatchId,
          notes: roundNumber === totalRounds ? "Championship match queued" : "Bracket match generated",
        });
      }
    }

    const firstRoundMatches = newMatches.filter((match) => match.roundNumber === 1);
    firstRoundMatches.forEach((match, index) => {
      match.slotARegistrationId = padded[index]?.id ?? null;
      match.slotBRegistrationId = padded[padded.length - 1 - index]?.id ?? null;
      setReadyStatus(match);
    });

    state.matches.push(...newMatches);
    newMatches.forEach((match) => syncLaneResults(state, match, event.laneCount));

    autoAdvanceByes(state, tournament.id, event.laneCount);
    tournament.generatedAt = new Date().toISOString();
    refreshEventStatus(state, eventId);
    appendAudit(state, actorUserId, "event", eventId, "bracket_generated", {
      registrationCount: eligibleRegistrations.length,
      tournamentId: tournament.id,
    });

    return state;
  });
}

export function recordMatchResult(
  eventId: string,
  matchId: string,
  winnerRegistrationId: string,
  actorUserId: string,
  note: string,
  laneTimesMs?: { slotA?: number | null; slotB?: number | null },
) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const tournament = getTournamentForEvent(state, eventId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const match = state.matches.find((item) => item.id === matchId && item.tournamentId === tournament.id);
    if (!match) {
      throw new Error("Match not found");
    }

    const validWinner =
      winnerRegistrationId === match.slotARegistrationId || winnerRegistrationId === match.slotBRegistrationId;
    if (!validWinner) {
      throw new Error("Winner must be one of the match registrations");
    }

    match.winnerRegistrationId = winnerRegistrationId;
    match.status = "completed";
    match.notes = note || match.notes;

    const heat = ensureHeat(state, match, event.laneCount);
    const [laneA, laneB] = eventLaneNumbers(event.laneCount);
    const loserRegistrationId =
      winnerRegistrationId === match.slotARegistrationId ? match.slotBRegistrationId : match.slotARegistrationId;

    const laneAssignments = [
      {
        laneNumber: laneA,
        registrationId: match.slotARegistrationId,
        elapsedMs: laneTimesMs?.slotA ?? null,
      },
      {
        laneNumber: laneB,
        registrationId: match.slotBRegistrationId,
        elapsedMs: laneTimesMs?.slotB ?? null,
      },
    ];

    laneAssignments.forEach((assignment) => {
      const laneResult = state.laneResults.find(
        (item) => item.heatId === heat.id && item.laneNumber === assignment.laneNumber,
      );
      if (!laneResult) {
        return;
      }

      laneResult.registrationId = assignment.registrationId;
      laneResult.elapsedMs = assignment.elapsedMs;
      if (assignment.registrationId === winnerRegistrationId) {
        laneResult.resultStatus = "finished";
        laneResult.finishPosition = 1;
      } else if (assignment.registrationId === loserRegistrationId) {
        laneResult.resultStatus = "finished";
        laneResult.finishPosition = 2;
      }
    });

    heat.status = "completed";
    assignWinnerToNextMatch(state, match, event.laneCount);
    refreshEventStatus(state, eventId);
    appendAudit(state, actorUserId, "match", matchId, "result_recorded", {
      winnerRegistrationId,
      note: note || null,
      slotAElapsedMs: laneTimesMs?.slotA ?? null,
      slotBElapsedMs: laneTimesMs?.slotB ?? null,
    });

    return state;
  });
}

export function reopenMatchForCorrection(
  eventId: string,
  matchId: string,
  actorUserId: string,
  correctionReason: string,
) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const tournament = getTournamentForEvent(state, eventId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const match = state.matches.find((item) => item.id === matchId && item.tournamentId === tournament.id);
    if (!match) {
      throw new Error("Match not found");
    }

    if (!match.winnerRegistrationId) {
      throw new Error("Only completed matches can be reopened");
    }

    clearDescendantMatches(state, match, event.laneCount);
    refreshEventStatus(state, eventId);
    appendAudit(state, actorUserId, "match", matchId, "match_reopened", {
      reason: correctionReason || "Correction requested",
    });

    return state;
  });
}
