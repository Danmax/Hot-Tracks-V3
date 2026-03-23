import {
  auditLogs,
  cars,
  eventRegistrations,
  events,
  heats,
  laneResults,
  matches,
  racerProfiles,
  tournaments,
  users,
} from "@/lib/phase1-store";
import type { Event, EventRegistration, Match } from "@/lib/types";

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

function findRegistration(registrationId: string | null) {
  return eventRegistrations.find((registration) => registration.id === registrationId) ?? null;
}

function findRacerName(registrationId: string | null) {
  const registration = findRegistration(registrationId);
  if (!registration) {
    return "TBD";
  }

  return racerProfiles.find((racer) => racer.id === registration.racerId)?.displayName ?? "Unknown racer";
}

function findCarName(registrationId: string | null) {
  const registration = findRegistration(registrationId);
  if (!registration) {
    return "TBD";
  }

  return cars.find((car) => car.id === registration.carId)?.nickname ?? "Unknown car";
}

function getMatchesForEvent(eventId: string) {
  const tournament = tournaments.find((item) => item.eventId === eventId);
  if (!tournament) {
    return [];
  }

  return matches
    .filter((match) => match.tournamentId === tournament.id)
    .sort((left, right) => {
      if (left.roundNumber === right.roundNumber) {
        return left.bracketPosition - right.bracketPosition;
      }

      return left.roundNumber - right.roundNumber;
    });
}

function getRegistrationsForEvent(eventId: string) {
  return eventRegistrations.filter((registration) => registration.eventId === eventId);
}

function getHostName(event: Event) {
  return users.find((user) => user.id === event.hostUserId)?.displayName ?? "Unknown host";
}

function matchSummary(match: Match) {
  const heat = heats.find((item) => item.matchId === match.id);
  const results = laneResults
    .filter((item) => item.heatId === heat?.id)
    .sort((left, right) => left.laneNumber - right.laneNumber);

  const detail = results
    .map((item) => {
      const racer = findRacerName(item.registrationId);
      const timing = item.elapsedMs ? `${(item.elapsedMs / 1000).toFixed(3)}s` : titleCase(item.resultStatus);
      return `Lane ${item.laneNumber}: ${racer} (${timing})`;
    })
    .join(" • ");

  return detail || match.notes || "Awaiting lane results";
}

export function getDashboardData() {
  const primaryEvent = events[0];
  const primaryRegistrations = getRegistrationsForEvent(primaryEvent.id);
  const checkedInCount = primaryRegistrations.filter((registration) => registration.checkedInAt).length;
  const readyCount = primaryRegistrations.filter((registration) => registration.readyStatus === "ready").length;

  return {
    primaryEventId: primaryEvent.id,
    stats: [
      {
        label: "Active racers",
        value: String(racerProfiles.filter((racer) => racer.status === "active").length),
        note: "Racer profiles now come from the normalized Phase 1 store.",
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
        note: "Tournament scope stays narrow while the event engine solidifies.",
      },
    ],
    milestones: [
      {
        title: "Foundation",
        summary: "App shell, typed entities, and query selectors are now aligned.",
        status: "Live",
      },
      {
        title: "Schema",
        summary: "SQLite-style Phase 1 DDL and seed data are checked into the repo.",
        status: "Live",
      },
      {
        title: "Operations",
        summary: "Next build pass should turn these selectors into mutation-backed workflows.",
        status: "Next",
      },
    ],
    nextActions: [
      {
        title: "Auth + roles",
        summary: "Map the Phase 1 matrix onto protected routes and event-scoped host access.",
      },
      {
        title: "Persistent adapter",
        summary: "Swap the in-repo store for a database-backed repository without changing the selectors.",
      },
      {
        title: "Bracket actions",
        summary: "Add mutation flows for event setup, bracket generation, and match result entry.",
      },
    ],
    latestMatches: getMatchesForEvent(primaryEvent.id)
      .filter((match) => match.status !== "pending")
      .map((match) => ({
        id: match.id,
        title: `Round ${match.roundNumber} Match ${match.bracketPosition}`,
        summary: matchSummary(match),
        result: match.winnerRegistrationId ? `${findRacerName(match.winnerRegistrationId)} won` : titleCase(match.status),
      })),
  };
}

export function getRacerList() {
  return racerProfiles.map((racer) => {
    const ownedCars = cars.filter((car) => car.ownerRacerId === racer.id);
    const wins = matches.filter((match) => {
      const winner = findRegistration(match.winnerRegistrationId);
      return winner?.racerId === racer.id;
    }).length;
    const liveRegistration = eventRegistrations.find((registration) => registration.racerId === racer.id);

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
  return cars.map((car) => ({
    id: car.id,
    nickname: car.nickname,
    brand: car.brand,
    model: car.model,
    category: car.category ?? "Unassigned",
    className: car.className ?? "Open",
    ownerName: racerProfiles.find((racer) => racer.id === car.ownerRacerId)?.displayName ?? "Unknown owner",
    status: titleCase(car.status),
  }));
}

export function getEventList() {
  return events.map((event) => {
    const registrations = getRegistrationsForEvent(event.id);
    const tournament = tournaments.find((item) => item.eventId === event.id);
    const eventMatches = getMatchesForEvent(event.id);
    const completedMatches = eventMatches.filter((match) => match.status === "completed").length;

    return {
      id: event.id,
      name: event.name,
      date: formatDate(event.eventDate),
      location: event.locationName ?? "TBD",
      laneCount: event.laneCount,
      checkedInCount: registrations.filter((registration) => registration.checkedInAt).length,
      format: tournament ? titleCase(tournament.format) : "Not generated",
      progress:
        event.status === "in_progress"
          ? `${completedMatches}/${eventMatches.length} matches complete`
          : titleCase(event.status),
      statusLabel: titleCase(event.status),
      hostName: getHostName(event),
    };
  });
}

export function getEventWorkspace(eventId: string) {
  const event = events.find((item) => item.id === eventId);
  if (!event) {
    return null;
  }

  const registrations = getRegistrationsForEvent(event.id)
    .map((registration) => {
      const racer = racerProfiles.find((item) => item.id === registration.racerId);
      const car = cars.find((item) => item.id === registration.carId);

      return {
        id: registration.id,
        racerName: racer?.displayName ?? "Unknown racer",
        carName: car?.nickname ?? "Unknown car",
        seed: registration.seed ?? "-",
        status: titleCase(registration.readyStatus),
      };
    })
    .sort((left, right) => Number(left.seed) - Number(right.seed));

  const matchRows = getMatchesForEvent(event.id).map((match) => ({
    id: match.id,
    roundLabel: `Round ${match.roundNumber}`,
    slotA: `${findRacerName(match.slotARegistrationId)} • ${findCarName(match.slotARegistrationId)}`,
    slotB: `${findRacerName(match.slotBRegistrationId)} • ${findCarName(match.slotBRegistrationId)}`,
    status: titleCase(match.status),
    winner: findRacerName(match.winnerRegistrationId),
    summary: matchSummary(match),
  }));

  return {
    id: event.id,
    name: event.name,
    date: formatDate(event.eventDate),
    location: event.locationName ?? "TBD",
    hostName: getHostName(event),
    laneCount: event.laneCount,
    status: titleCase(event.status),
    description: event.description ?? "No description",
    registrations,
    matchRows,
  };
}

export function getResultsSnapshot() {
  const primaryEvent = events[0];
  const leaderboard = getMatchesForEvent(primaryEvent.id)
    .filter((match) => match.winnerRegistrationId)
    .reduce<Record<string, { wins: number; registration: EventRegistration }>>((accumulator, match) => {
      const winner = findRegistration(match.winnerRegistrationId);
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
      racer: findRacerName(entry.registration.id),
      car: findCarName(entry.registration.id),
      record: `${entry.wins}-${Math.max(0, 2 - entry.wins)}`,
    }));

  const latestMatches = getMatchesForEvent(primaryEvent.id).map((match) => ({
    id: match.id,
    title: `Round ${match.roundNumber} Match ${match.bracketPosition}`,
    summary: matchSummary(match),
    result: match.winnerRegistrationId ? `${findRacerName(match.winnerRegistrationId)} won` : titleCase(match.status),
  }));

  return {
    eventName: primaryEvent.name,
    leaderboardRows,
    latestMatches,
  };
}

export function getAdminSnapshot() {
  return {
    userRows: users.map((user) => ({
      id: user.id,
      name: user.displayName,
      email: user.email,
      role: titleCase(user.role),
    })),
    auditRows: auditLogs
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

