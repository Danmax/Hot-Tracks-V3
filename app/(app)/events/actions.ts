"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEventAccess, requireRole } from "@/lib/auth";
import { buildFlashPath } from "@/lib/flash";
import { readState } from "@/lib/phase1-repository";
import {
  createEventRegistration,
  createEventAssignment,
  createEvent,
  deleteEvent,
  generateBracketForEvent,
  removeEventRegistration,
  removeEventAssignment,
  reopenMatchForCorrection,
  recordMatchResult,
  recordMatchTie,
  updateEventDetails,
  updateEventStatus,
  updateEventRegistrationCar,
  updateRegistrationSeed,
  updateRegistrationStatus,
} from "@/lib/phase1-operations";
import type {
  EventStatus,
  LaneResultStatus,
  RegistrationStatus,
  SeedingMode,
  StartMode,
  TiePolicy,
  TimingMode,
} from "@/lib/types";

function revalidateEventViews(eventId?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/events");
  revalidatePath("/results");
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
  }
}

export async function createEventAction(formData: FormData) {
  const user = await requireRole(["admin", "host"]);
  const name = formData.get("name");
  const eventDate = formData.get("eventDate");
  const locationName = formData.get("locationName");
  const trackId = formData.get("trackId");
  const description = formData.get("description");
  const timingMode = formData.get("timingMode");
  const startMode = formData.get("startMode");
  const tiePolicy = formData.get("tiePolicy");
  const seedingMode = formData.get("seedingMode");
  const matchRaceCount = formData.get("matchRaceCount");
  const status = formData.get("status");

  if (
    typeof name !== "string" ||
    typeof eventDate !== "string" ||
    typeof trackId !== "string" ||
    typeof timingMode !== "string" ||
    typeof startMode !== "string" ||
    typeof tiePolicy !== "string" ||
    typeof seedingMode !== "string" ||
    typeof matchRaceCount !== "string" ||
    typeof status !== "string"
  ) {
    throw new Error("Event name, date, track, race settings, and status are required");
  }

  try {
    createEvent(
      {
        name: name.trim(),
        eventDate,
        locationName: typeof locationName === "string" ? locationName.trim() : "",
        trackId,
        description: typeof description === "string" ? description.trim() : "",
        timingMode: timingMode as TimingMode,
        startMode: startMode as StartMode,
        tiePolicy: tiePolicy as TiePolicy,
        seedingMode: seedingMode as SeedingMode,
        matchRaceCount: matchRaceCount === "2" ? 2 : matchRaceCount === "3" ? 3 : 1,
        status: status as EventStatus,
      },
      user.id,
    );

    revalidateEventViews();
    redirect(buildFlashPath("/events", "success", "Event created"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create event";
    redirect(buildFlashPath("/events", "error", message));
  }
}

export async function updateEventStatusAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const status = formData.get("status");
  const returnTo = formData.get("returnTo");

  if (typeof eventId !== "string" || typeof status !== "string") {
    throw new Error("Event id and status are required");
  }

  const user = await requireEventAccess(eventId, "manage");
  const redirectPath =
    typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : `/events/${eventId}`;
  try {
    updateEventStatus(eventId, status as EventStatus, user.id);
    revalidateEventViews(eventId);
    redirect(buildFlashPath(redirectPath, "success", "Event status updated"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update event status";
    redirect(buildFlashPath(redirectPath, "error", message));
  }
}

export async function updateEventDetailsAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const name = formData.get("name");
  const eventDate = formData.get("eventDate");
  const locationName = formData.get("locationName");
  const trackId = formData.get("trackId");
  const description = formData.get("description");
  const timingMode = formData.get("timingMode");
  const startMode = formData.get("startMode");
  const tiePolicy = formData.get("tiePolicy");
  const seedingMode = formData.get("seedingMode");
  const matchRaceCount = formData.get("matchRaceCount");
  const returnTo = formData.get("returnTo");

  if (
    typeof eventId !== "string" ||
    typeof name !== "string" ||
    typeof eventDate !== "string" ||
    typeof trackId !== "string" ||
    typeof timingMode !== "string" ||
    typeof startMode !== "string" ||
    typeof tiePolicy !== "string" ||
    typeof seedingMode !== "string" ||
    typeof matchRaceCount !== "string"
  ) {
    throw new Error("Event id, name, date, track, and race settings are required");
  }

  const user = await requireEventAccess(eventId, "manage");
  const redirectPath =
    typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : `/events/${eventId}`;

  try {
    updateEventDetails(
      eventId,
      {
        name,
        eventDate,
        locationName: typeof locationName === "string" ? locationName : "",
        trackId,
        description: typeof description === "string" ? description : "",
        timingMode: timingMode as TimingMode,
        startMode: startMode as StartMode,
        tiePolicy: tiePolicy as TiePolicy,
        seedingMode: seedingMode as SeedingMode,
        matchRaceCount: matchRaceCount === "2" ? 2 : matchRaceCount === "3" ? 3 : 1,
      },
      user.id,
    );
    revalidateEventViews(eventId);
    redirect(buildFlashPath(redirectPath, "success", "Event details updated"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update event details";
    redirect(buildFlashPath(redirectPath, "error", message));
  }
}

export async function generateBracketAction(formData: FormData) {
  const eventId = formData.get("eventId");

  if (typeof eventId !== "string") {
    throw new Error("Event id is required");
  }

  const user = await requireEventAccess(eventId, "manage");
  try {
    generateBracketForEvent(eventId, user.id);
    revalidateEventViews(eventId);
    redirect(buildFlashPath(`/events/${eventId}`, "success", "Bracket generated"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate bracket";
    redirect(buildFlashPath(`/events/${eventId}`, "error", message));
  }
}

export async function deleteEventAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const returnTo = formData.get("returnTo");

  if (typeof eventId !== "string") {
    throw new Error("Event id is required");
  }

  const user = await requireEventAccess(eventId, "manage");
  const redirectPath = typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/events";

  try {
    deleteEvent(eventId, user.id);
    revalidateEventViews();
    redirect(buildFlashPath(redirectPath, "success", "Event deleted"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete event";
    redirect(buildFlashPath(redirectPath, "error", message));
  }
}

export async function updateRegistrationStatusAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const registrationId = formData.get("registrationId");
  const readyStatus = formData.get("readyStatus");

  if (
    typeof eventId !== "string" ||
    typeof registrationId !== "string" ||
    typeof readyStatus !== "string"
  ) {
    throw new Error("Event id, registration id, and status are required");
  }

  const user = await requireEventAccess(eventId, "operate");
  try {
    updateRegistrationStatus(eventId, registrationId, readyStatus as RegistrationStatus, user.id);
    revalidateEventViews(eventId);
    redirect(buildFlashPath(`/events/${eventId}`, "success", "Registration updated"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update registration";
    redirect(buildFlashPath(`/events/${eventId}`, "error", message));
  }
}

export async function createEventRegistrationAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const racerId = formData.get("racerId");
  const carId = formData.get("carId");

  if (
    typeof eventId !== "string" ||
    typeof racerId !== "string" ||
    typeof carId !== "string"
  ) {
    throw new Error("Event id, racer, and car are required");
  }

  const user = await requireEventAccess(eventId, "manage");
  try {
    createEventRegistration(eventId, racerId, carId, user.id);
    revalidateEventViews(eventId);
    redirect(buildFlashPath(`/events/${eventId}`, "success", "Registration added"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add registration";
    redirect(buildFlashPath(`/events/${eventId}`, "error", message));
  }
}

export async function updateEventRegistrationCarAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const registrationId = formData.get("registrationId");
  const carId = formData.get("carId");

  if (
    typeof eventId !== "string" ||
    typeof registrationId !== "string" ||
    typeof carId !== "string"
  ) {
    throw new Error("Event id, registration id, and car are required");
  }

  const user = await requireEventAccess(eventId, "manage");
  try {
    updateEventRegistrationCar(eventId, registrationId, carId, user.id);
    revalidateEventViews(eventId);
    redirect(buildFlashPath(`/events/${eventId}`, "success", "Registration car updated"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update registration car";
    redirect(buildFlashPath(`/events/${eventId}`, "error", message));
  }
}

export async function updateRegistrationSeedAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const registrationId = formData.get("registrationId");
  const seed = formData.get("seed");

  if (
    typeof eventId !== "string" ||
    typeof registrationId !== "string" ||
    typeof seed !== "string"
  ) {
    throw new Error("Event id, registration id, and seed are required");
  }

  const user = await requireEventAccess(eventId, "manage");
  try {
    updateRegistrationSeed(eventId, registrationId, Number(seed), user.id);
    revalidateEventViews(eventId);
    redirect(buildFlashPath(`/events/${eventId}`, "success", "Qualifier seeding updated"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update qualifier seeding";
    redirect(buildFlashPath(`/events/${eventId}`, "error", message));
  }
}

export async function removeEventRegistrationAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const registrationId = formData.get("registrationId");

  if (typeof eventId !== "string" || typeof registrationId !== "string") {
    throw new Error("Event id and registration id are required");
  }

  const user = await requireEventAccess(eventId, "manage");
  try {
    removeEventRegistration(eventId, registrationId, user.id);
    revalidateEventViews(eventId);
    redirect(buildFlashPath(`/events/${eventId}`, "success", "Registration removed"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove registration";
    redirect(buildFlashPath(`/events/${eventId}`, "error", message));
  }
}

export async function recordMatchResultAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const matchId = formData.get("matchId");
  const outcome = formData.get("outcome");
  const note = formData.get("note");
  const slotASeconds = formData.get("slotASeconds");
  const slotBSeconds = formData.get("slotBSeconds");
  const slotAStatus = formData.get("slotAStatus");
  const slotBStatus = formData.get("slotBStatus");

  if (typeof eventId !== "string" || typeof matchId !== "string") {
    throw new Error("Event and match are required");
  }

  const user = await requireEventAccess(eventId, "operate");
  const parseSeconds = (value: FormDataEntryValue | null) => {
    if (typeof value !== "string" || value.trim() === "") {
      return null;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return null;
    }

    return Math.round(parsed * 1000);
  };
  const parseLaneStatus = (value: FormDataEntryValue | null) => {
    if (value === "dnf" || value === "dq") {
      return value as Extract<LaneResultStatus, "dnf" | "dq">;
    }

    return "finished" as const;
  };

  try {
    const state = readState();
    const tournament = state.tournaments.find((item) => item.eventId === eventId);
    const match =
      tournament
        ? state.matches.find((item) => item.id === matchId && item.tournamentId === tournament.id)
        : null;

    if (!match || !match.slotARegistrationId || !match.slotBRegistrationId) {
      throw new Error("Match registrations are required");
    }

    const laneTimes = {
      slotA: parseSeconds(slotASeconds),
      slotB: parseSeconds(slotBSeconds),
    };
    const laneStatuses = {
      slotA: parseLaneStatus(slotAStatus),
      slotB: parseLaneStatus(slotBStatus),
    };
    const noteValue = typeof note === "string" ? note : "";

    if (outcome === "tie") {
      recordMatchTie(eventId, matchId, user.id, noteValue, laneTimes);
    } else {
      let calculatedWinnerRegistrationId: string | null = null;

      if (laneStatuses.slotA === "finished" && laneStatuses.slotB === "finished") {
        if (laneTimes.slotA === null || laneTimes.slotB === null) {
          throw new Error("Enter both lane times to calculate a winner");
        }

        if (laneTimes.slotA === laneTimes.slotB) {
          throw new Error("Lane times are tied. Use Record Tie instead");
        }

        calculatedWinnerRegistrationId =
          laneTimes.slotA < laneTimes.slotB ? match.slotARegistrationId : match.slotBRegistrationId;
      } else if (laneStatuses.slotA === "finished" && laneStatuses.slotB !== "finished") {
        calculatedWinnerRegistrationId = match.slotARegistrationId;
      } else if (laneStatuses.slotB === "finished" && laneStatuses.slotA !== "finished") {
        calculatedWinnerRegistrationId = match.slotBRegistrationId;
      } else {
        throw new Error("Winner cannot be calculated from the current lane statuses");
      }

      recordMatchResult(
        eventId,
        matchId,
        calculatedWinnerRegistrationId,
        user.id,
        noteValue,
        laneTimes,
        laneStatuses,
      );
    }

    revalidateEventViews(eventId);
    redirect(
      buildFlashPath(
        `/events/${eventId}`,
        "success",
        outcome === "tie" ? "Tie recorded. Match remains open for rerun." : "Match result recorded",
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record match result";
    redirect(buildFlashPath(`/events/${eventId}`, "error", message));
  }
}

export async function reopenMatchAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const matchId = formData.get("matchId");
  const correctionReason = formData.get("correctionReason");

  if (typeof eventId !== "string" || typeof matchId !== "string") {
    throw new Error("Event id and match id are required");
  }

  const user = await requireEventAccess(eventId, "manage");
  try {
    reopenMatchForCorrection(
      eventId,
      matchId,
      user.id,
      typeof correctionReason === "string" ? correctionReason : "",
    );
    revalidateEventViews(eventId);
    redirect(buildFlashPath(`/events/${eventId}`, "success", "Match reopened for correction"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reopen match";
    redirect(buildFlashPath(`/events/${eventId}`, "error", message));
  }
}

export async function createEventAssignmentAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const userId = formData.get("userId");
  const assignmentRole = formData.get("assignmentRole");

  if (
    typeof eventId !== "string" ||
    typeof userId !== "string" ||
    typeof assignmentRole !== "string"
  ) {
    throw new Error("Event id, user, and assignment role are required");
  }

  const user = await requireEventAccess(eventId, "manage");
  try {
    createEventAssignment(eventId, userId, assignmentRole as "host" | "official", user.id);
    revalidateEventViews(eventId);
    redirect(buildFlashPath(`/events/${eventId}`, "success", "Event assignment added"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add assignment";
    redirect(buildFlashPath(`/events/${eventId}`, "error", message));
  }
}

export async function removeEventAssignmentAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const assignmentId = formData.get("assignmentId");

  if (typeof eventId !== "string" || typeof assignmentId !== "string") {
    throw new Error("Event id and assignment id are required");
  }

  const user = await requireEventAccess(eventId, "manage");
  try {
    removeEventAssignment(eventId, assignmentId, user.id);
    revalidateEventViews(eventId);
    redirect(buildFlashPath(`/events/${eventId}`, "success", "Event assignment removed"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove assignment";
    redirect(buildFlashPath(`/events/${eventId}`, "error", message));
  }
}
