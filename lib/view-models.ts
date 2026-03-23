import { readState } from "@/lib/phase1-repository";
import type { Event, Match, Phase1State } from "@/lib/types";

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00Z`));
}

function formatTimeStamp(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/New_York",
  }).format(new Date(dateValue));
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTrackLength(value: number | null | undefined) {
  if (!value) {
    return "TBD";
  }

  const feet = Math.floor(value / 12);
  const inches = value % 12;

  if (feet === 0) {
    return `${inches} in`;
  }

  if (inches === 0) {
    return `${feet} ft`;
  }

  return `${feet} ft ${inches} in`;
}

function splitTrackLength(value: number | null | undefined) {
  if (!value) {
    return {
      feetValue: "",
      inchesValue: "",
    };
  }

  return {
    feetValue: String(Math.floor(value / 12)),
    inchesValue: String(value % 12),
  };
}

function estimateScaleMph(trackLengthInches: number | null | undefined, elapsedMs: number | null | undefined) {
  if (!trackLengthInches || !elapsedMs || elapsedMs <= 0) {
    return null;
  }

  const actualFeet = trackLengthInches / 12;
  const scaleFeet = actualFeet * 64;
  const miles = scaleFeet / 5280;
  const hours = elapsedMs / 3_600_000;
  const mph = miles / hours;

  return `${mph.toFixed(1)} mph`;
}

function getTrackLengthInchesForMatch(state: Phase1State, match: Match) {
  const tournament = state.tournaments.find((item) => item.id === match.tournamentId);
  if (!tournament) {
    return null;
  }

  return state.events.find((item) => item.id === tournament.eventId)?.trackLengthInches ?? null;
}

function getHostName(state: Phase1State, event: Event) {
  return state.users.find((user) => user.id === event.hostUserId)?.displayName ?? "Unknown host";
}

function getRegistrationsForEvent(state: Phase1State, eventId: string) {
  return state.eventRegistrations.filter((registration) => registration.eventId === eventId);
}

function findRegistration(state: Phase1State, registrationId: string | null) {
  return state.eventRegistrations.find((registration) => registration.id === registrationId) ?? null;
}

function findRacerName(state: Phase1State, registrationId: string | null) {
  const registration = findRegistration(state, registrationId);
  if (!registration) {
    return "TBD";
  }

  return state.racerProfiles.find((racer) => racer.id === registration.racerId)?.displayName ?? "Unknown racer";
}

function findCarName(state: Phase1State, registrationId: string | null) {
  const registration = findRegistration(state, registrationId);
  if (!registration) {
    return "TBD";
  }

  return state.cars.find((car) => car.id === registration.carId)?.nickname ?? "Unknown car";
}

function getMatchesForEvent(state: Phase1State, eventId: string) {
  const tournament = state.tournaments.find((item) => item.eventId === eventId);
  if (!tournament) {
    return [];
  }

  return state.matches
    .filter((match) => match.tournamentId === tournament.id)
    .sort((left, right) => {
      if (left.roundNumber === right.roundNumber) {
        return left.bracketPosition - right.bracketPosition;
      }

      return left.roundNumber - right.roundNumber;
    });
}

function getHeatsForMatch(state: Phase1State, match: Match) {
  return state.heats
    .filter((heat) => heat.matchId === match.id)
    .sort((left, right) => left.heatNumber - right.heatNumber);
}

function getDisplayHeat(state: Phase1State, match: Match) {
  const heats = getHeatsForMatch(state, match);

  const latestRecordedHeat = heats.findLast((heat) =>
    state.laneResults.some(
      (laneResult) =>
        laneResult.heatId === heat.id &&
        (laneResult.elapsedMs !== null || laneResult.resultStatus !== "pending"),
    ),
  );

  return latestRecordedHeat ?? heats.at(-1) ?? null;
}

function matchSummary(state: Phase1State, match: Match) {
  const heat = getDisplayHeat(state, match);
  const trackLengthInches = getTrackLengthInchesForMatch(state, match);
  const results = state.laneResults
    .filter((item) => item.heatId === heat?.id)
    .sort((left, right) => left.laneNumber - right.laneNumber);

  const detail = results
    .map((item) => {
      const racer = findRacerName(state, item.registrationId);
      const timing = item.elapsedMs
        ? `${(item.elapsedMs / 1000).toFixed(3)}s${
            estimateScaleMph(trackLengthInches, item.elapsedMs)
              ? ` • ${estimateScaleMph(trackLengthInches, item.elapsedMs)}`
              : ""
          }`
        : titleCase(item.resultStatus);
      return `Lane ${item.laneNumber}: ${racer} (${timing})`;
    })
    .join(" • ");

  if (!detail) {
    return match.notes || "Awaiting lane results";
  }

  const prefix = heat ? `Heat ${heat.heatNumber}: ` : "";
  if (match.status === "tied") {
    return `${prefix}${detail} • ${match.notes ?? "Tie recorded"}`;
  }

  return `${prefix}${detail}`;
}

function getLaneEntries(state: Phase1State, match: Match) {
  const trackLengthInches = getTrackLengthInchesForMatch(state, match);
  const heats = getHeatsForMatch(state, match);

  return heats.flatMap((heat) =>
    state.laneResults
      .filter((item) => item.heatId === heat.id)
      .filter((item) => item.elapsedMs !== null || item.resultStatus !== "pending")
      .sort((left, right) => left.laneNumber - right.laneNumber)
      .map((item) => ({
        heatNumber: heat.heatNumber,
        laneNumber: item.laneNumber,
        label: findRacerName(state, item.registrationId),
        elapsedDisplay: item.elapsedMs ? `${(item.elapsedMs / 1000).toFixed(3)}s` : "No time",
        estimatedMph: estimateScaleMph(trackLengthInches, item.elapsedMs),
        resultStatus: titleCase(item.resultStatus),
      })),
  );
}

function getMatchWinnerLabel(state: Phase1State, match: Match) {
  if (match.winnerRegistrationId) {
    return findRacerName(state, match.winnerRegistrationId);
  }

  if (match.status === "tied") {
    return match.notes?.includes("Official review") ? "Tie - review needed" : "Tie - rerun needed";
  }

  return "TBD";
}

export function getDashboardData() {
  const state = readState();
  const primaryEvent = state.events[0];
  const primaryRegistrations = getRegistrationsForEvent(state, primaryEvent.id);
  const checkedInCount = primaryRegistrations.filter((registration) => registration.checkedInAt).length;
  const readyCount = primaryRegistrations.filter((registration) => registration.readyStatus === "ready").length;

  return {
    primaryEventId: primaryEvent.id,
    stats: [
      {
        label: "Active racers",
        value: String(state.racerProfiles.filter((racer) => racer.status === "active").length),
        note: "Racer counts now come from the mutable Phase 1 state file.",
      },
      {
        label: "Checked-in cars",
        value: String(checkedInCount),
        note: `${readyCount} registrations are fully ready for bracket progression.`,
      },
      {
        label: "Track mode",
        value: `${primaryEvent.laneCount} lanes`,
        note: "Lane count is stored at the event and heat level.",
      },
      {
        label: "Bracket format",
        value: "Single elim",
        note: "Tournament scope stays narrow while operations harden.",
      },
    ],
    milestones: [
      {
        title: "Foundation",
        summary: "App shell, auth, and role-aware routes are active.",
        status: "Live",
      },
      {
        title: "Persistence",
        summary: "Event state now lives in a local JSON repository instead of page-only mocks.",
        status: "Live",
      },
      {
        title: "Operations",
        summary: "Bracket generation and result recording are available from the event workspace.",
        status: "Live",
      },
    ],
    nextActions: [
      {
        title: "Event CRUD",
        summary: "Add creation and editing flows for events, registrations, and check-in status.",
      },
      {
        title: "Scoping",
        summary: "Restrict host and official access to assigned events instead of global role access.",
      },
      {
        title: "Timing input",
        summary: "Add optional elapsed time entry and manual correction flow on match result forms.",
      },
    ],
    latestMatches: getMatchesForEvent(state, primaryEvent.id)
      .filter((match) => match.status !== "pending")
      .map((match) => ({
        id: match.id,
        title: `Round ${match.roundNumber} Match ${match.bracketPosition}`,
        summary: matchSummary(state, match),
        result: match.winnerRegistrationId ? `${findRacerName(state, match.winnerRegistrationId)} won` : titleCase(match.status),
      })),
  };
}

export function getRacerList() {
  const state = readState();
  const rows = state.racerProfiles.map((racer) => {
    const ownedCars = state.cars
      .filter((car) => car.ownerRacerId === racer.id)
      .sort((left, right) => left.nickname.localeCompare(right.nickname));
    const wins = state.matches.filter((match) => {
      const winner = findRegistration(state, match.winnerRegistrationId);
      return winner?.racerId === racer.id;
    }).length;
    const activeRegistrationCount = state.eventRegistrations.filter(
      (registration) => registration.racerId === racer.id && registration.readyStatus !== "withdrawn",
    ).length;

    return {
      id: racer.id,
      firstName: racer.firstName,
      lastName: racer.lastName,
      displayName: racer.displayName,
      garageName: racer.garageName ?? "Independent",
      garageNameValue: racer.garageName ?? "",
      status: titleCase(racer.status),
      statusValue: racer.status,
      activeRegistrationCount,
      canArchive: activeRegistrationCount === 0 && racer.status !== "archived",
      archiveHelpText:
        activeRegistrationCount === 0
          ? "This racer can be archived."
          : "Racers with active event registrations cannot be archived.",
      carCount: ownedCars.length,
      cars: ownedCars.map((car) => ({
        id: car.id,
        nickname: car.nickname,
        brand: car.brand,
        model: car.model,
        className: car.className ?? "Open",
        category: car.category ?? "Unassigned",
        status: titleCase(car.status),
      })),
      canAddCars: racer.status !== "archived",
      totalWins: wins,
    };
  });

  return {
    activeRacers: rows.filter((racer) => racer.statusValue !== "archived"),
    archivedRacers: rows.filter((racer) => racer.statusValue === "archived"),
  };
}

export function getCarList() {
  const state = readState();
  const ownerOptions = state.racerProfiles
    .filter((racer) => racer.status !== "archived")
    .map((racer) => ({
      id: racer.id,
      label: `${racer.displayName} • ${racer.garageName ?? "Independent"}`,
    }));

  const rows = state.cars.map((car) => {
    const activeRegistrationCount = state.eventRegistrations.filter(
      (registration) => registration.carId === car.id && registration.readyStatus !== "withdrawn",
    ).length;

    return {
      id: car.id,
      ownerRacerId: car.ownerRacerId,
      nickname: car.nickname,
      brand: car.brand,
      model: car.model,
      seriesValue: car.series ?? "",
      modelYearValue: car.modelYear ? String(car.modelYear) : "",
      category: car.category ?? "Unassigned",
      categoryValue: car.category ?? "",
      className: car.className ?? "Open",
      classNameValue: car.className ?? "",
      notesValue: car.notes ?? "",
      ownerName:
        state.racerProfiles.find((racer) => racer.id === car.ownerRacerId)?.displayName ?? "Unknown owner",
      status: titleCase(car.status),
      statusValue: car.status,
      activeRegistrationCount,
      canArchive: activeRegistrationCount === 0 && car.status !== "archived",
      archiveHelpText:
        activeRegistrationCount === 0
          ? "This car can be archived."
          : "Cars with active event registrations cannot be archived.",
    };
  });

  return {
    activeCars: rows.filter((car) => car.statusValue !== "archived"),
    archivedCars: rows.filter((car) => car.statusValue === "archived"),
    ownerOptions,
  };
}

export function getTrackList() {
  const state = readState();
  const rows = state.tracks.map((track) => {
    const activeEventCount = state.events.filter(
      (event) => event.trackId === track.id && event.status !== "completed",
    ).length;

    return {
      id: track.id,
      name: track.name,
      location: track.locationName ?? "TBD",
      locationValue: track.locationName ?? "",
      trackLength: formatTrackLength(track.trackLengthInches),
      trackLengthFeetValue: splitTrackLength(track.trackLengthInches).feetValue,
      trackLengthInchesValue: splitTrackLength(track.trackLengthInches).inchesValue,
      laneCount: track.laneCount,
      surfaceType: track.surfaceType ?? "Unspecified",
      surfaceTypeValue: track.surfaceType ?? "",
      notesValue: track.notes ?? "",
      status: titleCase(track.status),
      statusValue: track.status,
      defaultTimingMode: titleCase(track.defaultTimingMode),
      defaultTimingModeValue: track.defaultTimingMode,
      defaultStartMode: titleCase(track.defaultStartMode),
      defaultStartModeValue: track.defaultStartMode,
      activeEventCount,
      canArchive: activeEventCount === 0 && track.status !== "archived",
      archiveHelpText:
        activeEventCount === 0
          ? "This track can be archived."
          : "Tracks used by active events cannot be archived.",
    };
  });

  return {
    activeTracks: rows.filter((track) => track.statusValue !== "archived"),
    archivedTracks: rows.filter((track) => track.statusValue === "archived"),
  };
}

export function getEventList() {
  const state = readState();
  const trackOptions = state.tracks
    .filter((track) => track.status === "active")
    .map((track) => ({
      id: track.id,
      label: `${track.name} • ${formatTrackLength(track.trackLengthInches)} • ${track.laneCount}-lane`,
    }));
  return state.events.map((event) => {
    const registrations = getRegistrationsForEvent(state, event.id);
    const tournament = state.tournaments.find((item) => item.eventId === event.id);
    const eventMatches = getMatchesForEvent(state, event.id);
    const eventAssignments = state.eventAssignments.filter((assignment) => assignment.eventId === event.id);
    const completedMatches = eventMatches.filter((match) => match.status === "completed").length;
    const rosterLocked = eventMatches.length > 0;
    const canDelete = state.events.length > 1 && !rosterLocked;
    const assignedKeys = new Set(
      eventAssignments.map((assignment) => `${assignment.userId}:${assignment.assignmentRole}`),
    );
    const hostAssignmentOptions = state.users
      .filter((user) => ["host", "admin"].includes(user.role))
      .filter((user) => !assignedKeys.has(`${user.id}:host`))
      .map((user) => ({ id: user.id, label: `${user.displayName} • ${titleCase(user.role)}` }));
    const officialAssignmentOptions = state.users
      .filter((user) => ["official", "admin"].includes(user.role))
      .filter((user) => !assignedKeys.has(`${user.id}:official`))
      .map((user) => ({ id: user.id, label: `${user.displayName} • ${titleCase(user.role)}` }));

    return {
      id: event.id,
      name: event.name,
      descriptionValue: event.description ?? "",
      statusValue: event.status,
      date: formatDate(event.eventDate),
      eventDateValue: event.eventDate,
      location: event.locationName ?? "TBD",
      locationValue: event.locationName ?? "",
      trackId: event.trackId ?? "",
      trackName: event.trackName ?? "TBD",
      trackLength: formatTrackLength(event.trackLengthInches),
      laneCount: event.laneCount,
      timingMode: titleCase(event.timingMode),
      timingModeValue: event.timingMode,
      startMode: titleCase(event.startMode),
      startModeValue: event.startMode,
      tiePolicy: titleCase(event.tiePolicy),
      tiePolicyValue: event.tiePolicy,
      trackOptions,
      canDelete,
      deleteHelpText: canDelete
        ? "This event can be deleted because bracket generation has not started."
        : state.events.length <= 1
          ? "At least one event must remain in the system."
          : "This event cannot be deleted after bracket generation.",
      checkedInCount: registrations.filter((registration) => registration.checkedInAt).length,
      format: tournament ? titleCase(tournament.format) : "Not generated",
      progress:
        event.status === "in_progress"
          ? `${completedMatches}/${eventMatches.length} matches complete`
          : titleCase(event.status),
      statusLabel: titleCase(event.status),
      hostName: getHostName(state, event),
      assignments: eventAssignments.map((assignment) => {
        const assignedUser = state.users.find((user) => user.id === assignment.userId);
        return {
          id: assignment.id,
          name: assignedUser?.displayName ?? "Unknown user",
          email: assignedUser?.email ?? "Unknown email",
          role: titleCase(assignment.assignmentRole),
          isPrimaryHost:
            assignment.assignmentRole === "host" && assignment.userId === event.hostUserId,
        };
      }),
      assignmentOptions: {
        hosts: hostAssignmentOptions,
        officials: officialAssignmentOptions,
      },
    };
  });
}

export function getEventWorkspace(eventId: string) {
  const state = readState();
  const event = state.events.find((item) => item.id === eventId);
  if (!event) {
    return null;
  }
  const trackOptions = state.tracks
    .filter((track) => track.status === "active" || track.id === event.trackId)
    .map((track) => ({
      id: track.id,
      label: `${track.name} • ${formatTrackLength(track.trackLengthInches)} • ${track.laneCount}-lane`,
    }));

  const tournament = state.tournaments.find((item) => item.eventId === eventId) ?? null;
  const eventAssignments = state.eventAssignments.filter((assignment) => assignment.eventId === eventId);
  const matches = getMatchesForEvent(state, event.id);
  const rosterLocked = matches.length > 0;
  const readyMatches = matches.filter(
    (match) =>
      !match.winnerRegistrationId &&
      Boolean(match.slotARegistrationId) &&
      Boolean(match.slotBRegistrationId),
  );
  const registrationsByCar = new Set(
    state.eventRegistrations
      .filter((registration) => registration.eventId === event.id)
      .map((registration) => registration.carId),
  );
  const registrationOptions = state.racerProfiles
    .map((racer) => {
      if (racer.status !== "active") {
        return null;
      }

      const racerCars = state.cars
        .filter(
          (car) =>
            car.ownerRacerId === racer.id &&
            car.status !== "archived" &&
            !registrationsByCar.has(car.id),
        )
        .map((car) => ({
          id: car.id,
          label: `${car.nickname} • ${car.brand} ${car.model}`,
        }));

      return {
        id: racer.id,
        label: racer.displayName,
        cars: racerCars,
      };
    })
    .filter((racer): racer is { id: string; label: string; cars: Array<{ id: string; label: string }> } =>
      Boolean(racer && racer.cars.length > 0),
    );
  const registrations = getRegistrationsForEvent(state, event.id)
    .map((registration) => {
      const racer = state.racerProfiles.find((item) => item.id === registration.racerId);
      const car = state.cars.find((item) => item.id === registration.carId);
      const carOptions = state.cars
        .filter(
          (item) =>
            item.ownerRacerId === registration.racerId &&
            item.status !== "archived" &&
            (!registrationsByCar.has(item.id) || item.id === registration.carId),
        )
        .map((item) => ({
          id: item.id,
          label: `${item.nickname} • ${item.brand} ${item.model}`,
        }));

      return {
        id: registration.id,
        racerId: registration.racerId,
        racerName: racer?.displayName ?? "Unknown racer",
        carId: registration.carId,
        carName: car?.nickname ?? "Unknown car",
        seed: registration.seed ?? "-",
        statusValue: registration.readyStatus,
        status: titleCase(registration.readyStatus),
        canEdit: !rosterLocked,
        canSwapCar: !rosterLocked && carOptions.length > 1,
        carOptions,
      };
    })
    .sort((left, right) => Number(left.seed) - Number(right.seed));
  const assignedKeys = new Set(
    eventAssignments.map((assignment) => `${assignment.userId}:${assignment.assignmentRole}`),
  );
  const hostAssignmentOptions = state.users
    .filter((user) => ["host", "admin"].includes(user.role))
    .filter((user) => !assignedKeys.has(`${user.id}:host`))
    .map((user) => ({ id: user.id, label: `${user.displayName} • ${titleCase(user.role)}` }));
  const officialAssignmentOptions = state.users
    .filter((user) => ["official", "admin"].includes(user.role))
    .filter((user) => !assignedKeys.has(`${user.id}:official`))
    .map((user) => ({ id: user.id, label: `${user.displayName} • ${titleCase(user.role)}` }));

  return {
    id: event.id,
    name: event.name,
    date: formatDate(event.eventDate),
    eventDateValue: event.eventDate,
    statusValue: event.status,
    location: event.locationName ?? "TBD",
    locationValue: event.locationName ?? "",
    trackId: event.trackId ?? "",
    trackName: event.trackName ?? "TBD",
    trackLength: formatTrackLength(event.trackLengthInches),
    hostName: getHostName(state, event),
    laneCount: event.laneCount,
    timingMode: titleCase(event.timingMode),
    timingModeValue: event.timingMode,
    startMode: titleCase(event.startMode),
    startModeValue: event.startMode,
    tiePolicy: titleCase(event.tiePolicy),
    tiePolicyValue: event.tiePolicy,
    status: titleCase(event.status),
    description: event.description ?? "No description",
    descriptionValue: event.description ?? "",
    registrations,
    operations: {
      tournamentStatus: tournament ? titleCase(tournament.status) : "Draft",
      canGenerateBracket: matches.length === 0,
      canAddRegistrations: matches.length === 0,
      rosterLocked,
      readyMatchCount: readyMatches.length,
    },
    assignments: eventAssignments.map((assignment) => {
      const assignedUser = state.users.find((user) => user.id === assignment.userId);
      return {
        id: assignment.id,
        userId: assignment.userId,
        name: assignedUser?.displayName ?? "Unknown user",
        email: assignedUser?.email ?? "Unknown email",
        role: titleCase(assignment.assignmentRole),
        isPrimaryHost:
          assignment.assignmentRole === "host" && assignment.userId === event.hostUserId,
      };
    }),
    assignmentOptions: {
      hosts: hostAssignmentOptions,
      officials: officialAssignmentOptions,
    },
    trackOptions,
    registrationOptions,
    matchRows: matches.map((match) => ({
      id: match.id,
      roundLabel: `Round ${match.roundNumber}`,
      slotARegistrationId: match.slotARegistrationId,
      slotALabel: findRacerName(state, match.slotARegistrationId),
      slotA: `${findRacerName(state, match.slotARegistrationId)} • ${findCarName(state, match.slotARegistrationId)}`,
      slotBRegistrationId: match.slotBRegistrationId,
      slotBLabel: findRacerName(state, match.slotBRegistrationId),
      slotB: `${findRacerName(state, match.slotBRegistrationId)} • ${findCarName(state, match.slotBRegistrationId)}`,
      status: titleCase(match.status),
      winner: getMatchWinnerLabel(state, match),
      summary: matchSummary(state, match),
      laneEntries: getLaneEntries(state, match),
      tieGuidance:
        event.tiePolicy === "official_review"
          ? "Tie policy is official review. Record the tie, then resolve it with a ruling."
          : "Tie policy is rerun. Recording a tie opens the next heat automatically.",
      canRecordResult:
        !match.winnerRegistrationId &&
        Boolean(match.slotARegistrationId) &&
        Boolean(match.slotBRegistrationId),
      canCorrectResult: Boolean(match.winnerRegistrationId) || match.status === "tied",
      winnerOptions: [
        {
          id: match.slotARegistrationId,
          label: findRacerName(state, match.slotARegistrationId),
        },
        {
          id: match.slotBRegistrationId,
          label: findRacerName(state, match.slotBRegistrationId),
        },
      ].filter((option): option is { id: string; label: string } => Boolean(option.id)),
    })),
  };
}

export function getResultsSnapshot(selectedEventId?: string) {
  const state = readState();
  const eventOptions = state.events.map((event) => ({
    id: event.id,
    name: event.name,
  }));
  const selectedEvent =
    state.events.find((event) => event.id === selectedEventId) ?? state.events[0] ?? null;

  if (!selectedEvent) {
    return {
      eventOptions,
      selectedEventId: null,
      eventName: "No events available",
      eventDate: null,
      eventLocation: "TBD",
      trackName: "TBD",
      trackLength: "TBD",
      laneCountLabel: "TBD",
      statusLabel: "Draft",
      registeredCount: 0,
      completedMatchCount: 0,
      totalMatchCount: 0,
      leaderboardRows: [],
      latestMatches: [],
    };
  }

  const registrations = getRegistrationsForEvent(state, selectedEvent.id);
  const registrationStats = new Map(
    registrations.map((registration) => [
      registration.id,
      {
        registration,
        wins: 0,
        losses: 0,
        bestElapsedMs: null as number | null,
      },
    ]),
  );
  const matches = getMatchesForEvent(state, selectedEvent.id);
  const matchIds = new Set(matches.map((match) => match.id));
  const heatIds = new Set(
    state.heats.filter((heat) => matchIds.has(heat.matchId)).map((heat) => heat.id),
  );

  for (const laneResult of state.laneResults.filter((item) => heatIds.has(item.heatId))) {
    if (!laneResult.registrationId || !laneResult.elapsedMs) {
      continue;
    }

    const existing = registrationStats.get(laneResult.registrationId);
    if (!existing) {
      continue;
    }

    if (existing.bestElapsedMs === null || laneResult.elapsedMs < existing.bestElapsedMs) {
      existing.bestElapsedMs = laneResult.elapsedMs;
    }
  }

  for (const match of matches.filter((item) => item.status === "completed")) {
    const participants = [match.slotARegistrationId, match.slotBRegistrationId].filter(
      (item): item is string => Boolean(item),
    );

    for (const participantId of participants) {
      if (!registrationStats.has(participantId)) {
        const registration = findRegistration(state, participantId);
        if (registration) {
          registrationStats.set(participantId, {
            registration,
            wins: 0,
            losses: 0,
            bestElapsedMs: null,
          });
        }
      }
    }

    if (!match.winnerRegistrationId) {
      continue;
    }

    const winner = registrationStats.get(match.winnerRegistrationId);
    if (winner) {
      winner.wins += 1;
    }

    for (const participantId of participants) {
      if (participantId === match.winnerRegistrationId) {
        continue;
      }

      const loser = registrationStats.get(participantId);
      if (loser) {
        loser.losses += 1;
      }
    }
  }

  const leaderboardRows = Array.from(registrationStats.values())
    .sort((left, right) => {
      if (right.wins !== left.wins) {
        return right.wins - left.wins;
      }

      if (left.losses !== right.losses) {
        return left.losses - right.losses;
      }

      if (left.bestElapsedMs !== null && right.bestElapsedMs !== null) {
        return left.bestElapsedMs - right.bestElapsedMs;
      }

      if (left.bestElapsedMs !== null) {
        return -1;
      }

      if (right.bestElapsedMs !== null) {
        return 1;
      }

      return findRacerName(state, left.registration.id).localeCompare(
        findRacerName(state, right.registration.id),
      );
    })
    .map((entry, index) => ({
      position: index + 1,
      racer: findRacerName(state, entry.registration.id),
      car: findCarName(state, entry.registration.id),
      record: `${entry.wins}-${entry.losses}`,
      wins: entry.wins,
      losses: entry.losses,
      bestTime:
        entry.bestElapsedMs !== null ? `${(entry.bestElapsedMs / 1000).toFixed(3)}s` : "No time",
    }));

  const latestMatches = matches
    .slice()
    .sort((left, right) => {
      if (left.roundNumber === right.roundNumber) {
        return right.bracketPosition - left.bracketPosition;
      }

      return right.roundNumber - left.roundNumber;
    })
    .map((match) => ({
      id: match.id,
      title: `Round ${match.roundNumber} Match ${match.bracketPosition}`,
      summary: matchSummary(state, match),
      result: match.winnerRegistrationId
        ? `${findRacerName(state, match.winnerRegistrationId)} won`
        : titleCase(match.status),
    }));

  return {
    eventOptions,
    selectedEventId: selectedEvent.id,
    eventName: selectedEvent.name,
    eventDate: formatDate(selectedEvent.eventDate),
    eventLocation: selectedEvent.locationName ?? "TBD",
    trackName: selectedEvent.trackName ?? "TBD",
    trackLength: formatTrackLength(selectedEvent.trackLengthInches),
    laneCountLabel: `${selectedEvent.laneCount} lanes`,
    statusLabel: titleCase(selectedEvent.status),
    registeredCount: registrations.length,
    completedMatchCount: matches.filter((match) => match.status === "completed").length,
    totalMatchCount: matches.length,
    leaderboardRows,
    latestMatches,
  };
}

export function getAdminSnapshot() {
  const state = readState();
  return {
    userRows: state.users.map((user) => ({
      id: user.id,
      name: user.displayName,
      email: user.email,
      role: titleCase(user.role),
    })),
    auditRows: state.auditLogs
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((log) => ({
        id: log.id,
        action: titleCase(log.action),
        details: `${log.entityType} ${log.entityId}`,
        time: formatTimeStamp(log.createdAt),
      })),
  };
}
