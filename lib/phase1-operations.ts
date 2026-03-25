import "server-only";

import { updateState } from "@/lib/phase1-repository";
import { phase1SeedState } from "@/lib/phase1-store";
import type {
  CarStatus,
  EventAssignmentRole,
  EventRegistration,
  EventStatus,
  Heat,
  LaneResult,
  Match,
  Phase1State,
  RacerStatus,
  RegistrationStatus,
  SeedingMode,
  StartMode,
  TiePolicy,
  TimingMode,
  TrackStatus,
  Tournament,
} from "@/lib/types";

function getTournamentForEvent(state: Phase1State, eventId: string) {
  return state.tournaments.find((tournament) => tournament.eventId === eventId) ?? null;
}

function getTrackById(state: Phase1State, trackId: string | null | undefined) {
  if (!trackId) {
    return null;
  }

  return state.tracks.find((track) => track.id === trackId) ?? null;
}

function eventLaneNumbers(laneCount: 2 | 4) {
  return laneCount === 4 ? [1, 4] : [1, 2];
}

function getHeatsForMatch(state: Phase1State, matchId: string) {
  return state.heats
    .filter((heat) => heat.matchId === matchId)
    .sort((left, right) => left.heatNumber - right.heatNumber);
}

function createHeat(state: Phase1State, match: Match, laneCount: 2 | 4, heatNumber: number) {
  const heat: Heat = {
    id: `${match.id}_heat_${heatNumber}`,
    matchId: match.id,
    heatNumber,
    laneCount,
    status:
      match.status === "completed"
        ? "completed"
        : match.status === "ready" ||
            match.status === "corrected" ||
            match.status === "tied" ||
            match.status === "in_progress"
          ? "ready"
          : "pending",
  };

  state.heats.push(heat);
  return heat;
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
  const heats = getHeatsForMatch(state, match.id);
  const activeHeat = heats.findLast((heat) => heat.status !== "completed");
  if (activeHeat) {
    return activeHeat;
  }

  const nextHeatNumber = (heats.at(-1)?.heatNumber ?? 0) + 1;
  return createHeat(state, match, laneCount, nextHeatNumber);
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
      : match.status === "ready" ||
          match.status === "corrected" ||
          match.status === "tied" ||
          match.status === "in_progress"
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

function resetHeatsForMatch(state: Phase1State, matchId: string) {
  const heatIds = state.heats.filter((heat) => heat.matchId === matchId).map((heat) => heat.id);
  if (heatIds.length === 0) {
    return;
  }

  const heatIdSet = new Set(heatIds);
  state.heats = state.heats.filter((heat) => !heatIdSet.has(heat.id));
  state.laneResults = state.laneResults.filter((laneResult) => !heatIdSet.has(laneResult.heatId));
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

  resetHeatsForMatch(state, match.id);
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
  const anyStarted = eventMatches.some((match) =>
    ["in_progress", "corrected", "tied", "completed"].includes(match.status),
  );
  const anyCompleted = eventMatches.some((match) => match.status === "completed");
  const allCompleted = eventMatches.length > 0 && eventMatches.every((match) => match.status === "completed");

  if (allCompleted) {
    tournament.status = "completed";
    event.status = "completed";
    return;
  }

  if (eventMatches.length > 0) {
    tournament.status = anyCompleted || anyStarted ? "in_progress" : "generated";
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

function canDeleteEvent(state: Phase1State, eventId: string) {
  if (state.events.length <= 1) {
    return {
      allowed: false,
      reason: "At least one event must remain in the system",
    };
  }

  if (isRosterLocked(state, eventId)) {
    return {
      allowed: false,
      reason: "Events cannot be deleted after bracket generation",
    };
  }

  return {
    allowed: true,
    reason: null,
  };
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

function moveRegistrationToSeed(
  state: Phase1State,
  eventId: string,
  registrationId: string,
  requestedSeed: number,
) {
  const ordered = state.eventRegistrations
    .filter((registration) => registration.eventId === eventId)
    .sort((left, right) => {
      const leftSeed = left.seed ?? Number.MAX_SAFE_INTEGER;
      const rightSeed = right.seed ?? Number.MAX_SAFE_INTEGER;
      if (leftSeed === rightSeed) {
        return left.createdAt.localeCompare(right.createdAt);
      }

      return leftSeed - rightSeed;
    });

  const currentIndex = ordered.findIndex((registration) => registration.id === registrationId);
  if (currentIndex === -1) {
    throw new Error("Registration not found");
  }

  const [registration] = ordered.splice(currentIndex, 1);
  const targetIndex = Math.min(Math.max(requestedSeed - 1, 0), ordered.length);
  ordered.splice(targetIndex, 0, registration);

  ordered.forEach((item, index) => {
    item.seed = index + 1;
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

function shuffleRegistrations(registrations: EventRegistration[]) {
  const items = [...registrations];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

function buildFirstRoundPairings(
  registrations: EventRegistration[],
  size: number,
  seedingMode: SeedingMode,
) {
  const working =
    seedingMode === "random_draw"
      ? shuffleRegistrations(registrations)
      : [...registrations].sort(
          (left, right) => (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER),
        );
  const padded: Array<EventRegistration | null> = [...working];
  while (padded.length < size) {
    padded.push(null);
  }

  const pairs: Array<{ slotA: EventRegistration | null; slotB: EventRegistration | null }> = [];
  const halfSize = size / 2;

  if (seedingMode === "qualifier_split") {
    for (let index = 0; index < halfSize; index += 1) {
      pairs.push({
        slotA: padded[index] ?? null,
        slotB: padded[index + halfSize] ?? null,
      });
    }

    return pairs;
  }

  if (seedingMode === "random_draw") {
    for (let index = 0; index < halfSize; index += 1) {
      pairs.push({
        slotA: padded[index * 2] ?? null,
        slotB: padded[index * 2 + 1] ?? null,
      });
    }

    return pairs;
  }

  for (let index = 0; index < halfSize; index += 1) {
    pairs.push({
      slotA: padded[index] ?? null,
      slotB: padded[padded.length - 1 - index] ?? null,
    });
  }

  return pairs;
}

function getRequiredSeriesWins(matchRaceCount: 1 | 2 | 3) {
  return Math.floor(matchRaceCount / 2) + 1;
}

function getHeatWinnerRegistrationId(state: Phase1State, heatId: string) {
  return (
    state.laneResults.find(
      (laneResult) => laneResult.heatId === heatId && laneResult.finishPosition === 1,
    )?.registrationId ?? null
  );
}

function getSeriesScore(state: Phase1State, match: Match) {
  let slotAWins = 0;
  let slotBWins = 0;
  let scoredHeatCount = 0;

  getHeatsForMatch(state, match.id)
    .filter((heat) => heat.status === "completed")
    .forEach((heat) => {
      const winnerId = getHeatWinnerRegistrationId(state, heat.id);
      if (!winnerId) {
        return;
      }

      scoredHeatCount += 1;
      if (winnerId === match.slotARegistrationId) {
        slotAWins += 1;
      } else if (winnerId === match.slotBRegistrationId) {
        slotBWins += 1;
      }
    });

  return {
    slotAWins,
    slotBWins,
    scoredHeatCount,
  };
}

function canArchiveRacer(state: Phase1State, racerId: string) {
  const activeRegistrations = state.eventRegistrations.filter(
    (registration) => registration.racerId === racerId && registration.readyStatus !== "withdrawn",
  );

  if (activeRegistrations.length > 0) {
    return {
      allowed: false,
      reason: "Racer with active event registrations cannot be archived",
    };
  }

  return {
    allowed: true,
    reason: null,
  };
}

function canArchiveCar(state: Phase1State, carId: string) {
  const activeRegistrations = state.eventRegistrations.filter(
    (registration) => registration.carId === carId && registration.readyStatus !== "withdrawn",
  );

  if (activeRegistrations.length > 0) {
    return {
      allowed: false,
      reason: "Car with active event registrations cannot be archived",
    };
  }

  return {
    allowed: true,
    reason: null,
  };
}

export function createEvent(
  input: {
    name: string;
    eventDate: string;
    locationName: string;
    trackId: string;
    description?: string;
    timingMode: TimingMode;
    startMode: StartMode;
    tiePolicy: TiePolicy;
    seedingMode: SeedingMode;
    matchRaceCount: 1 | 2 | 3;
    status: EventStatus;
  },
  actorUserId: string,
) {
  let createdEventId = "";

  updateState((state) => {
    const track = getTrackById(state, input.trackId);
    if (!track || track.status === "archived") {
      throw new Error("Active track is required");
    }

    const eventId = `e_${makeSlug(input.name)}_${Date.now().toString().slice(-6)}`;
    createdEventId = eventId;

    state.events.push({
      id: eventId,
      hostUserId: actorUserId,
      name: input.name,
      description: input.description?.trim() || "Host-created Phase 1 event.",
      eventDate: input.eventDate,
      locationName: input.locationName.trim() || track.locationName || null,
      trackId: track.id,
      trackName: track.name,
      trackLengthInches: track.trackLengthInches,
      laneCount: track.laneCount,
      timingMode: input.timingMode,
      startMode: input.startMode,
      tiePolicy: input.tiePolicy,
      seedingMode: input.seedingMode,
      matchRaceCount: input.matchRaceCount,
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
      laneCount: track.laneCount,
      status: input.status,
      trackId: track.id,
      timingMode: input.timingMode,
      startMode: input.startMode,
      tiePolicy: input.tiePolicy,
      seedingMode: input.seedingMode,
      matchRaceCount: input.matchRaceCount,
    });

    return state;
  });

  return createdEventId;
}

export function createRacerProfile(
  input: {
    firstName: string;
    lastName: string;
    displayName: string;
    garageName: string;
    status: RacerStatus;
  },
  actorUserId: string,
) {
  updateState((state) => {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();

    if (!firstName || !lastName) {
      throw new Error("First and last name are required");
    }

    const displayName = input.displayName.trim() || `${firstName} ${lastName}`;
    const racerId = `r_${makeSlug(displayName)}_${Date.now().toString().slice(-6)}`;

    state.racerProfiles.push({
      id: racerId,
      userId: null,
      firstName,
      lastName,
      displayName,
      garageName: input.garageName.trim() || null,
      status:
        input.status === "inactive" || input.status === "archived" ? input.status : "active",
      createdAt: new Date().toISOString(),
    });

    appendAudit(state, actorUserId, "racer", racerId, "racer_created", {
      displayName,
      garageName: input.garageName.trim() || null,
    });

    return state;
  });
}

export function createCar(
  input: {
    ownerRacerId: string;
    nickname: string;
    brand: string;
    model: string;
    series: string;
    modelYear: number | null;
    category: string;
    className: string;
    notes: string;
    status: CarStatus;
  },
  actorUserId: string,
) {
  updateState((state) => {
    const owner = state.racerProfiles.find((item) => item.id === input.ownerRacerId);
    if (!owner) {
      throw new Error("Owner racer not found");
    }

    if (owner.status === "archived") {
      throw new Error("Archived racers cannot own active cars");
    }

    const nickname = input.nickname.trim();
    const brand = input.brand.trim();
    const model = input.model.trim();
    if (!nickname || !brand || !model) {
      throw new Error("Nickname, brand, and model are required");
    }

    const carId = `c_${makeSlug(nickname)}_${Date.now().toString().slice(-6)}`;
    state.cars.push({
      id: carId,
      ownerRacerId: input.ownerRacerId,
      nickname,
      brand,
      model,
      series: input.series.trim() || null,
      modelYear: input.modelYear,
      category: input.category.trim() || null,
      className: input.className.trim() || null,
      notes: input.notes.trim() || null,
      status: input.status,
      createdAt: new Date().toISOString(),
    });

    appendAudit(state, actorUserId, "car", carId, "car_created", {
      ownerRacerId: input.ownerRacerId,
      nickname,
      status: input.status,
    });

    return state;
  });
}

export function updateCar(
  carId: string,
  input: {
    ownerRacerId: string;
    nickname: string;
    brand: string;
    model: string;
    series: string;
    modelYear: number | null;
    category: string;
    className: string;
    notes: string;
    status: CarStatus;
  },
  actorUserId: string,
) {
  updateState((state) => {
    const car = state.cars.find((item) => item.id === carId);
    if (!car) {
      throw new Error("Car not found");
    }

    const owner = state.racerProfiles.find((item) => item.id === input.ownerRacerId);
    if (!owner) {
      throw new Error("Owner racer not found");
    }

    if (owner.status === "archived") {
      throw new Error("Archived racers cannot own active cars");
    }

    const nickname = input.nickname.trim();
    const brand = input.brand.trim();
    const model = input.model.trim();
    if (!nickname || !brand || !model) {
      throw new Error("Nickname, brand, and model are required");
    }

    if (input.status === "archived") {
      const archiveGuard = canArchiveCar(state, carId);
      if (!archiveGuard.allowed) {
        throw new Error(archiveGuard.reason ?? "Car cannot be archived");
      }
    }

    car.ownerRacerId = input.ownerRacerId;
    car.nickname = nickname;
    car.brand = brand;
    car.model = model;
    car.series = input.series.trim() || null;
    car.modelYear = input.modelYear;
    car.category = input.category.trim() || null;
    car.className = input.className.trim() || null;
    car.notes = input.notes.trim() || null;
    car.status = input.status;

    appendAudit(state, actorUserId, "car", carId, "car_updated", {
      ownerRacerId: input.ownerRacerId,
      nickname,
      status: input.status,
    });

    return state;
  });
}

export function createTrack(
  input: {
    name: string;
    locationName: string;
    trackLengthInches: number | null;
    laneCount: 2 | 4;
    surfaceType: string;
    notes: string;
    status: TrackStatus;
    defaultTimingMode: TimingMode;
    defaultStartMode: StartMode;
  },
  actorUserId: string,
) {
  updateState((state) => {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Track name is required");
    }

    const trackId = `trk_${makeSlug(name)}_${Date.now().toString().slice(-6)}`;
    state.tracks.push({
      id: trackId,
      name,
      locationName: input.locationName.trim() || null,
      trackLengthInches: input.trackLengthInches,
      laneCount: input.laneCount,
      surfaceType: input.surfaceType.trim() || null,
      notes: input.notes.trim() || null,
      status: input.status,
      defaultTimingMode: input.defaultTimingMode,
      defaultStartMode: input.defaultStartMode,
      createdAt: new Date().toISOString(),
    });

    appendAudit(state, actorUserId, "track", trackId, "track_created", {
      laneCount: input.laneCount,
      status: input.status,
      trackLengthInches: input.trackLengthInches,
      defaultTimingMode: input.defaultTimingMode,
      defaultStartMode: input.defaultStartMode,
    });

    return state;
  });
}

export function updateTrack(
  trackId: string,
  input: {
    name: string;
    locationName: string;
    trackLengthInches: number | null;
    laneCount: 2 | 4;
    surfaceType: string;
    notes: string;
    status: TrackStatus;
    defaultTimingMode: TimingMode;
    defaultStartMode: StartMode;
  },
  actorUserId: string,
) {
  updateState((state) => {
    const track = getTrackById(state, trackId);
    if (!track) {
      throw new Error("Track not found");
    }

    const name = input.name.trim();
    if (!name) {
      throw new Error("Track name is required");
    }

    const inUseEvents = state.events.filter((event) => event.trackId === trackId);
    if (inUseEvents.some((event) => isRosterLocked(state, event.id) && event.laneCount !== input.laneCount)) {
      throw new Error("Lane count cannot change for tracks used by bracket-locked events");
    }

    track.name = name;
    track.locationName = input.locationName.trim() || null;
    track.trackLengthInches = input.trackLengthInches;
    track.laneCount = input.laneCount;
    track.surfaceType = input.surfaceType.trim() || null;
    track.notes = input.notes.trim() || null;
    track.status = input.status;
    track.defaultTimingMode = input.defaultTimingMode;
    track.defaultStartMode = input.defaultStartMode;

    inUseEvents.forEach((event) => {
      event.trackName = track.name;
      event.trackLengthInches = track.trackLengthInches;
      event.locationName = event.locationName ?? track.locationName;
      if (!isRosterLocked(state, event.id)) {
        event.laneCount = track.laneCount;
      }
    });

    appendAudit(state, actorUserId, "track", trackId, "track_updated", {
      laneCount: input.laneCount,
      status: input.status,
      trackLengthInches: input.trackLengthInches,
      defaultTimingMode: input.defaultTimingMode,
      defaultStartMode: input.defaultStartMode,
    });

    return state;
  });
}

export function archiveTrack(trackId: string, actorUserId: string) {
  updateState((state) => {
    const track = getTrackById(state, trackId);
    if (!track) {
      throw new Error("Track not found");
    }

    const activeEventUsage = state.events.some(
      (event) => event.trackId === trackId && event.status !== "completed",
    );
    if (activeEventUsage) {
      throw new Error("Tracks assigned to active events cannot be archived");
    }

    track.status = "archived";

    appendAudit(state, actorUserId, "track", trackId, "track_archived", {
      name: track.name,
    });

    return state;
  });
}

export function archiveCar(carId: string, actorUserId: string) {
  updateState((state) => {
    const car = state.cars.find((item) => item.id === carId);
    if (!car) {
      throw new Error("Car not found");
    }

    const archiveGuard = canArchiveCar(state, carId);
    if (!archiveGuard.allowed) {
      throw new Error(archiveGuard.reason ?? "Car cannot be archived");
    }

    car.status = "archived";

    appendAudit(state, actorUserId, "car", carId, "car_archived", {
      nickname: car.nickname,
    });

    return state;
  });
}

export function updateRacerProfile(
  racerId: string,
  input: {
    firstName: string;
    lastName: string;
    displayName: string;
    garageName: string;
    status: "active" | "inactive" | "archived";
  },
  actorUserId: string,
) {
  updateState((state) => {
    const racer = state.racerProfiles.find((item) => item.id === racerId);
    if (!racer) {
      throw new Error("Racer not found");
    }

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName || !lastName) {
      throw new Error("First and last name are required");
    }

    if (input.status === "archived") {
      const archiveGuard = canArchiveRacer(state, racerId);
      if (!archiveGuard.allowed) {
        throw new Error(archiveGuard.reason ?? "Racer cannot be archived");
      }
    }

    racer.firstName = firstName;
    racer.lastName = lastName;
    racer.displayName = input.displayName.trim() || `${firstName} ${lastName}`;
    racer.garageName = input.garageName.trim() || null;
    racer.status = input.status;

    appendAudit(state, actorUserId, "racer", racerId, "racer_updated", {
      displayName: racer.displayName,
      garageName: racer.garageName,
      status: racer.status,
    });

    return state;
  });
}

export function archiveRacerProfile(racerId: string, actorUserId: string) {
  updateState((state) => {
    const racer = state.racerProfiles.find((item) => item.id === racerId);
    if (!racer) {
      throw new Error("Racer not found");
    }

    const archiveGuard = canArchiveRacer(state, racerId);
    if (!archiveGuard.allowed) {
      throw new Error(archiveGuard.reason ?? "Racer cannot be archived");
    }

    racer.status = "archived";

    appendAudit(state, actorUserId, "racer", racerId, "racer_archived", {
      displayName: racer.displayName,
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
    trackId: string;
    description: string;
    timingMode: TimingMode;
    startMode: StartMode;
    tiePolicy: TiePolicy;
    seedingMode: SeedingMode;
    matchRaceCount: 1 | 2 | 3;
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

    const track = getTrackById(state, input.trackId);
    if (!track || track.status === "archived") {
      throw new Error("Active track is required");
    }

    if (isRosterLocked(state, eventId) && track.laneCount !== event.laneCount) {
      throw new Error("Lane count cannot change after the bracket has been generated");
    }

    if (isRosterLocked(state, eventId) && input.seedingMode !== event.seedingMode) {
      throw new Error("Seeding mode cannot change after the bracket has been generated");
    }

    if (isRosterLocked(state, eventId) && input.matchRaceCount !== event.matchRaceCount) {
      throw new Error("Match series cannot change after the bracket has been generated");
    }

    event.name = input.name.trim();
    event.eventDate = input.eventDate;
    event.locationName = input.locationName.trim() || track.locationName || null;
    event.trackId = track.id;
    event.trackName = track.name;
    event.trackLengthInches = track.trackLengthInches;
    event.description = input.description.trim() || null;
    event.laneCount = track.laneCount;
    event.timingMode = input.timingMode;
    event.startMode = input.startMode;
    event.tiePolicy = input.tiePolicy;
    event.seedingMode = input.seedingMode;
    event.matchRaceCount = input.matchRaceCount;

    appendAudit(state, actorUserId, "event", eventId, "event_details_updated", {
      laneCount: track.laneCount,
      hasDescription: Boolean(event.description),
      hasLocation: Boolean(event.locationName),
      trackId: track.id,
      trackLengthInches: event.trackLengthInches,
      timingMode: event.timingMode,
      startMode: event.startMode,
      tiePolicy: event.tiePolicy,
      seedingMode: event.seedingMode,
      matchRaceCount: event.matchRaceCount,
    });

    return state;
  });
}

export function clearSampleData(actorUserId: string) {
  updateState((state) => {
    const seedUserIds = new Set(phase1SeedState.users.map((user) => user.id));
    const seedRacerIds = new Set(phase1SeedState.racerProfiles.map((racer) => racer.id));
    const seedCarIds = new Set(phase1SeedState.cars.map((car) => car.id));
    const seedTrackIds = new Set(phase1SeedState.tracks.map((track) => track.id));
    const seedEventIds = new Set(phase1SeedState.events.map((event) => event.id));
    const seedAssignmentIds = new Set(phase1SeedState.eventAssignments.map((assignment) => assignment.id));
    const seedRegistrationIds = new Set(
      phase1SeedState.eventRegistrations.map((registration) => registration.id),
    );
    const seedTournamentIds = new Set(phase1SeedState.tournaments.map((tournament) => tournament.id));
    const seededMatchIds = new Set(phase1SeedState.matches.map((match) => match.id));
    const seededHeatIds = new Set(phase1SeedState.heats.map((heat) => heat.id));

    const eventIdsToRemove = new Set(
      state.events.filter((event) => seedEventIds.has(event.id)).map((event) => event.id),
    );
    const tournamentIdsToRemove = new Set(
      state.tournaments
        .filter((tournament) => seedTournamentIds.has(tournament.id) || eventIdsToRemove.has(tournament.eventId))
        .map((tournament) => tournament.id),
    );
    const matchIdsToRemove = new Set(
      state.matches
        .filter((match) => seededMatchIds.has(match.id) || tournamentIdsToRemove.has(match.tournamentId))
        .map((match) => match.id),
    );
    const heatIdsToRemove = new Set(
      state.heats
        .filter((heat) => seededHeatIds.has(heat.id) || matchIdsToRemove.has(heat.matchId))
        .map((heat) => heat.id),
    );
    const assignmentIdsToRemove = new Set(
      state.eventAssignments
        .filter((assignment) => seedAssignmentIds.has(assignment.id) || eventIdsToRemove.has(assignment.eventId))
        .map((assignment) => assignment.id),
    );
    const registrationIdsToRemove = new Set(
      state.eventRegistrations
        .filter(
          (registration) =>
            seedRegistrationIds.has(registration.id) || eventIdsToRemove.has(registration.eventId),
        )
        .map((registration) => registration.id),
    );

    state.users = state.users.filter((user) => !seedUserIds.has(user.id) || user.id === actorUserId);
    state.racerProfiles = state.racerProfiles.filter((racer) => !seedRacerIds.has(racer.id));
    state.cars = state.cars.filter(
      (car) => !seedCarIds.has(car.id) && !seedRacerIds.has(car.ownerRacerId),
    );
    state.events = state.events.filter((event) => !eventIdsToRemove.has(event.id));
    state.eventAssignments = state.eventAssignments.filter(
      (assignment) => !assignmentIdsToRemove.has(assignment.id),
    );
    state.eventRegistrations = state.eventRegistrations.filter(
      (registration) => !registrationIdsToRemove.has(registration.id),
    );
    state.tournaments = state.tournaments.filter((tournament) => !tournamentIdsToRemove.has(tournament.id));
    state.matches = state.matches.filter((match) => !matchIdsToRemove.has(match.id));
    state.heats = state.heats.filter((heat) => !heatIdsToRemove.has(heat.id));
    state.laneResults = state.laneResults.filter((laneResult) => !heatIdsToRemove.has(laneResult.heatId));

    const remainingTrackIds = new Set(state.events.map((event) => event.trackId).filter(Boolean));
    state.tracks = state.tracks.filter(
      (track) => !seedTrackIds.has(track.id) || remainingTrackIds.has(track.id),
    );

    state.auditLogs = state.auditLogs.filter((log) => {
      if (seedUserIds.has(log.entityId) && log.entityId !== actorUserId) {
        return false;
      }

      return !(
        seedRacerIds.has(log.entityId) ||
        seedCarIds.has(log.entityId) ||
        eventIdsToRemove.has(log.entityId) ||
        assignmentIdsToRemove.has(log.entityId) ||
        registrationIdsToRemove.has(log.entityId) ||
        tournamentIdsToRemove.has(log.entityId) ||
        matchIdsToRemove.has(log.entityId) ||
        heatIdsToRemove.has(log.entityId) ||
        (seedTrackIds.has(log.entityId) && !remainingTrackIds.has(log.entityId))
      );
    });

    appendAudit(state, actorUserId, "system", "seed_data", "sample_data_cleared", {
      removedSeedEvents: eventIdsToRemove.size,
      removedSeedRacers: seedRacerIds.size,
      removedSeedCars: seedCarIds.size,
      removedSeedTracks: phase1SeedState.tracks.length - state.tracks.filter((track) => seedTrackIds.has(track.id)).length,
    });

    return state;
  });
}

export function deleteEvent(eventId: string, actorUserId: string) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const deletionGuard = canDeleteEvent(state, eventId);
    if (!deletionGuard.allowed) {
      throw new Error(deletionGuard.reason ?? "Event cannot be deleted");
    }

    const tournament = getTournamentForEvent(state, eventId);
    const eventAssignments = state.eventAssignments.filter((assignment) => assignment.eventId === eventId);
    const eventRegistrations = state.eventRegistrations.filter((registration) => registration.eventId === eventId);
    const registrationIds = new Set(eventRegistrations.map((registration) => registration.id));
    const assignmentIds = new Set(eventAssignments.map((assignment) => assignment.id));
    const tournamentId = tournament?.id ?? null;
    const matchIds = new Set(
      tournamentId
        ? state.matches
            .filter((match) => match.tournamentId === tournamentId)
            .map((match) => match.id)
        : [],
    );
    const heatIds = new Set(
      state.heats.filter((heat) => matchIds.has(heat.matchId)).map((heat) => heat.id),
    );

    state.events = state.events.filter((item) => item.id !== eventId);
    state.eventAssignments = state.eventAssignments.filter((assignment) => assignment.eventId !== eventId);
    state.eventRegistrations = state.eventRegistrations.filter((registration) => registration.eventId !== eventId);
    state.tournaments = state.tournaments.filter((item) => item.eventId !== eventId);
    state.matches = state.matches.filter((match) => !matchIds.has(match.id));
    state.heats = state.heats.filter((heat) => !heatIds.has(heat.id));
    state.laneResults = state.laneResults.filter((laneResult) => !heatIds.has(laneResult.heatId));
    state.auditLogs = state.auditLogs.filter((log) => {
      if (log.entityType === "event" && log.entityId === eventId) {
        return false;
      }

      if (log.entityType === "event_assignment" && assignmentIds.has(log.entityId)) {
        return false;
      }

      if (log.entityType === "registration" && registrationIds.has(log.entityId)) {
        return false;
      }

      if (log.entityType === "tournament" && tournamentId && log.entityId === tournamentId) {
        return false;
      }

      if (log.entityType === "match" && matchIds.has(log.entityId)) {
        return false;
      }

      if (log.entityType === "heat" && heatIds.has(log.entityId)) {
        return false;
      }

      return true;
    });

    appendAudit(state, actorUserId, "event", eventId, "event_deleted", {
      deletedName: event.name,
      hadRegistrations: eventRegistrations.length > 0,
      hadAssignments: eventAssignments.length > 0,
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

export function updateRegistrationSeed(
  eventId: string,
  registrationId: string,
  seed: number,
  actorUserId: string,
) {
  updateState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (isRosterLocked(state, eventId)) {
      throw new Error("Qualifier seeding is locked after bracket generation");
    }

    if (!Number.isInteger(seed) || seed <= 0) {
      throw new Error("Seed must be a positive number");
    }

    const registration = state.eventRegistrations.find(
      (item) => item.id === registrationId && item.eventId === eventId,
    );
    if (!registration) {
      throw new Error("Registration not found");
    }

    moveRegistrationToSeed(state, eventId, registrationId, seed);

    appendAudit(state, actorUserId, "registration", registrationId, "registration_seed_updated", {
      eventId,
      seed,
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
    const pairings = buildFirstRoundPairings(eligibleRegistrations, size, event.seedingMode);

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
      const pairing = pairings[index];
      match.slotARegistrationId = pairing?.slotA?.id ?? null;
      match.slotBRegistrationId = pairing?.slotB?.id ?? null;
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
      seedingMode: event.seedingMode,
      matchRaceCount: event.matchRaceCount,
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
  laneStatuses?: { slotA?: "finished" | "dnf" | "dq"; slotB?: "finished" | "dnf" | "dq" },
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

    const heat = ensureHeat(state, match, event.laneCount);
    const [laneA, laneB] = eventLaneNumbers(event.laneCount);
    const loserRegistrationId =
      winnerRegistrationId === match.slotARegistrationId ? match.slotBRegistrationId : match.slotARegistrationId;

    const laneAssignments = [
      {
        laneNumber: laneA,
        registrationId: match.slotARegistrationId,
        elapsedMs: laneTimesMs?.slotA ?? null,
        resultStatus: laneStatuses?.slotA ?? "finished",
      },
      {
        laneNumber: laneB,
        registrationId: match.slotBRegistrationId,
        elapsedMs: laneTimesMs?.slotB ?? null,
        resultStatus: laneStatuses?.slotB ?? "finished",
      },
    ];

    const winningAssignment = laneAssignments.find(
      (assignment) => assignment.registrationId === winnerRegistrationId,
    );
    if (winningAssignment && winningAssignment.resultStatus !== "finished") {
      throw new Error("Winning lane cannot be marked DNF or DQ");
    }

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
        laneResult.resultStatus = assignment.resultStatus;
        laneResult.finishPosition = assignment.resultStatus === "finished" ? 2 : null;
      }
    });

    heat.status = "completed";
    const seriesScore = getSeriesScore(state, match);
    const requiredSeriesWins = getRequiredSeriesWins(event.matchRaceCount);
    const winnerWins =
      winnerRegistrationId === match.slotARegistrationId ? seriesScore.slotAWins : seriesScore.slotBWins;
    const slotAWins = seriesScore.slotAWins;
    const slotBWins = seriesScore.slotBWins;
    const seriesIsClinched = winnerWins >= requiredSeriesWins;
    const scheduledSeriesComplete = seriesScore.scoredHeatCount >= event.matchRaceCount;
    const hasSeriesLeader = slotAWins !== slotBWins;

    if (seriesIsClinched || (scheduledSeriesComplete && hasSeriesLeader)) {
      match.winnerRegistrationId = slotAWins > slotBWins ? match.slotARegistrationId : match.slotBRegistrationId;
      match.status = "completed";
      match.notes = note || `Series complete ${slotAWins}-${slotBWins}`;
      assignWinnerToNextMatch(state, match, event.laneCount);
    } else if (scheduledSeriesComplete && !hasSeriesLeader) {
      match.winnerRegistrationId = null;
      if (event.tiePolicy === "official_review") {
        match.status = "tied";
        match.notes = note || `Series tied ${slotAWins}-${slotBWins}. Official review required.`;
      } else {
        match.status = "in_progress";
        match.notes = note || `Series tied ${slotAWins}-${slotBWins}. Tiebreaker heat queued.`;
        ensureHeat(state, match, event.laneCount);
        syncLaneResults(state, match, event.laneCount);
      }
    } else {
      match.winnerRegistrationId = null;
      match.status = "in_progress";
      match.notes = note || `Series standing ${slotAWins}-${slotBWins}. Next heat queued.`;
      ensureHeat(state, match, event.laneCount);
      syncLaneResults(state, match, event.laneCount);
    }

    refreshEventStatus(state, eventId);
    appendAudit(state, actorUserId, "match", matchId, "result_recorded", {
      heatWinnerRegistrationId: winnerRegistrationId,
      matchWinnerRegistrationId: match.winnerRegistrationId,
      note: note || null,
      slotAElapsedMs: laneTimesMs?.slotA ?? null,
      slotBElapsedMs: laneTimesMs?.slotB ?? null,
      slotAResultStatus: laneAssignments[0]?.resultStatus ?? "finished",
      slotBResultStatus: laneAssignments[1]?.resultStatus ?? "finished",
      slotAWins,
      slotBWins,
      matchRaceCount: event.matchRaceCount,
    });

    return state;
  });
}

export function recordMatchTie(
  eventId: string,
  matchId: string,
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

    if (!match.slotARegistrationId || !match.slotBRegistrationId) {
      throw new Error("Both match registrations are required to record a tie");
    }

    const heat = ensureHeat(state, match, event.laneCount);
    const [laneA, laneB] = eventLaneNumbers(event.laneCount);

    match.winnerRegistrationId = null;
    match.status = event.tiePolicy === "official_review" ? "tied" : "in_progress";
    match.notes =
      note.trim() ||
      (event.tiePolicy === "official_review"
        ? "Tie recorded. Official review required."
        : "Tie recorded. Rerun required.");

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
      laneResult.finishPosition = null;
      laneResult.resultStatus = "rerun";
    });

    heat.status = "completed";
    if (event.tiePolicy === "rerun") {
      ensureHeat(state, match, event.laneCount);
      syncLaneResults(state, match, event.laneCount);
    }
    refreshEventStatus(state, eventId);
    appendAudit(state, actorUserId, "match", matchId, "tie_recorded", {
      note: match.notes,
      slotAElapsedMs: laneTimesMs?.slotA ?? null,
      slotBElapsedMs: laneTimesMs?.slotB ?? null,
      tiePolicy: event.tiePolicy,
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

    if (!match.winnerRegistrationId && match.status !== "tied") {
      throw new Error("Only completed or tied matches can be reopened");
    }

    match.notes = correctionReason.trim() || null;

    if (match.status === "tied") {
      resetHeatsForMatch(state, match.id);
      clearLaneResultsForMatch(state, match, event.laneCount);
      refreshEventStatus(state, eventId);
      appendAudit(state, actorUserId, "match", matchId, "match_reopened", {
        reason: correctionReason || "Tie reopened for correction",
      });

      return state;
    }

    clearDescendantMatches(state, match, event.laneCount);
    refreshEventStatus(state, eventId);
    appendAudit(state, actorUserId, "match", matchId, "match_reopened", {
      reason: correctionReason || "Correction requested",
    });

    return state;
  });
}
