import { readState } from "@/lib/phase1-repository";
import type { Event, EventRegistration, Match, Phase1State } from "@/lib/types";

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

function formatTrackLengthFeet(value: number | null | undefined) {
  if (!value) {
    return "TBD";
  }

  return Number.isInteger(value) ? `${value} ft` : `${value.toFixed(1)} ft`;
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

function matchSummary(state: Phase1State, match: Match) {
  const heat = state.heats.find((item) => item.matchId === match.id);
  const results = state.laneResults
    .filter((item) => item.heatId === heat?.id)
    .sort((left, right) => left.laneNumber - right.laneNumber);

  const detail = results
    .map((item) => {
      const racer = findRacerName(state, item.registrationId);
      const timing = item.elapsedMs ? `${(item.elapsedMs / 1000).toFixed(3)}s` : titleCase(item.resultStatus);
      return `Lane ${item.laneNumber}: ${racer} (${timing})`;
    })
    .join(" • ");

  return detail || match.notes || "Awaiting lane results";
}

function getLaneEntries(state: Phase1State, match: Match) {
  const heat = state.heats.find((item) => item.matchId === match.id);

  return state.laneResults
    .filter((item) => item.heatId === heat?.id)
    .sort((left, right) => left.laneNumber - right.laneNumber)
    .map((item) => ({
      laneNumber: item.laneNumber,
      label: findRacerName(state, item.registrationId),
      elapsedDisplay: item.elapsedMs ? `${(item.elapsedMs / 1000).toFixed(3)}s` : "No time",
      resultStatus: titleCase(item.resultStatus),
    }));
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
  return state.racerProfiles.map((racer) => {
    const ownedCars = state.cars.filter((car) => car.ownerRacerId === racer.id);
    const wins = state.matches.filter((match) => {
      const winner = findRegistration(state, match.winnerRegistrationId);
      return winner?.racerId === racer.id;
    }).length;
    const liveRegistration = state.eventRegistrations.find((registration) => registration.racerId === racer.id);

    return {
      id: racer.id,
      displayName: racer.displayName,
      garageName: racer.garageName ?? "Independent",
      status: liveRegistration?.readyStatus ?? racer.status,
      carCount: ownedCars.length,
      totalWins: wins,
    };
  });
}

export function getCarList() {
  const state = readState();
  return state.cars.map((car) => ({
    id: car.id,
    nickname: car.nickname,
    brand: car.brand,
    model: car.model,
    category: car.category ?? "Unassigned",
    className: car.className ?? "Open",
    ownerName: state.racerProfiles.find((racer) => racer.id === car.ownerRacerId)?.displayName ?? "Unknown owner",
    status: titleCase(car.status),
  }));
}

export function getEventList() {
  const state = readState();
  return state.events.map((event) => {
    const registrations = getRegistrationsForEvent(state, event.id);
    const tournament = state.tournaments.find((item) => item.eventId === event.id);
    const eventMatches = getMatchesForEvent(state, event.id);
    const eventAssignments = state.eventAssignments.filter((assignment) => assignment.eventId === event.id);
    const completedMatches = eventMatches.filter((match) => match.status === "completed").length;
    const rosterLocked = eventMatches.length > 0;
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
      trackName: event.trackName ?? "TBD",
      trackNameValue: event.trackName ?? "",
      trackLength: formatTrackLengthFeet(event.trackLengthFeet),
      trackLengthValue: event.trackLengthFeet ? String(event.trackLengthFeet) : "",
      laneCount: event.laneCount,
      canEditLaneCount: !rosterLocked,
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
      const racerCars = state.cars
        .filter((car) => car.ownerRacerId === racer.id && !registrationsByCar.has(car.id))
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
    .filter((racer) => racer.cars.length > 0);
  const registrations = getRegistrationsForEvent(state, event.id)
    .map((registration) => {
      const racer = state.racerProfiles.find((item) => item.id === registration.racerId);
      const car = state.cars.find((item) => item.id === registration.carId);
      const carOptions = state.cars
        .filter(
          (item) =>
            item.ownerRacerId === registration.racerId &&
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
    trackName: event.trackName ?? "TBD",
    trackNameValue: event.trackName ?? "",
    trackLength: formatTrackLengthFeet(event.trackLengthFeet),
    trackLengthValue: event.trackLengthFeet ? String(event.trackLengthFeet) : "",
    hostName: getHostName(state, event),
    laneCount: event.laneCount,
    status: titleCase(event.status),
    description: event.description ?? "No description",
    descriptionValue: event.description ?? "",
    registrations,
    operations: {
      tournamentStatus: tournament ? titleCase(tournament.status) : "Draft",
      canGenerateBracket: matches.length === 0,
      canAddRegistrations: matches.length === 0,
      rosterLocked,
      canEditLaneCount: !rosterLocked,
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
      winner: findRacerName(state, match.winnerRegistrationId),
      summary: matchSummary(state, match),
      laneEntries: getLaneEntries(state, match),
      canRecordResult:
        !match.winnerRegistrationId &&
        Boolean(match.slotARegistrationId) &&
        Boolean(match.slotBRegistrationId),
      canCorrectResult: Boolean(match.winnerRegistrationId),
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

export function getResultsSnapshot() {
  const state = readState();
  const primaryEvent = state.events[0];
  const leaderboard = getMatchesForEvent(state, primaryEvent.id)
    .filter((match) => match.winnerRegistrationId)
    .reduce<Record<string, { wins: number; registration: EventRegistration }>>((accumulator, match) => {
      const winner = findRegistration(state, match.winnerRegistrationId);
      if (!winner) {
        return accumulator;
      }

      const existing = accumulator[winner.id];
      accumulator[winner.id] = {
        registration: winner,
        wins: existing ? existing.wins + 1 : 1,
      };
      return accumulator;
    }, {});

  const leaderboardRows = Object.values(leaderboard)
    .sort((left, right) => right.wins - left.wins)
    .map((entry, index) => ({
      position: index + 1,
      racer: findRacerName(state, entry.registration.id),
      car: findCarName(state, entry.registration.id),
      record: `${entry.wins}-${Math.max(0, 2 - entry.wins)}`,
    }));

  const latestMatches = getMatchesForEvent(state, primaryEvent.id).map((match) => ({
    id: match.id,
    title: `Round ${match.roundNumber} Match ${match.bracketPosition}`,
    summary: matchSummary(state, match),
    result: match.winnerRegistrationId ? `${findRacerName(state, match.winnerRegistrationId)} won` : titleCase(match.status),
  }));

  return {
    eventName: primaryEvent.name,
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
