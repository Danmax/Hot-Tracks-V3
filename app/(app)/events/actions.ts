"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEventAccess, requireRole } from "@/lib/auth";
import { buildFlashPath } from "@/lib/flash";
import {
  createEventRegistration,
  createEventAssignment,
  createEvent,
  generateBracketForEvent,
  removeEventRegistration,
  removeEventAssignment,
  reopenMatchForCorrection,
  recordMatchResult,
  updateEventDetails,
  updateEventStatus,
  updateEventRegistrationCar,
  updateRegistrationStatus,
} from "@/lib/phase1-operations";
import type { EventStatus, RegistrationStatus } from "@/lib/types";

function revalidateEventViews(eventId?: string) {
  revalidatePath("/");
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
  const trackName = formData.get("trackName");
  const trackLengthFeet = formData.get("trackLengthFeet");
  const description = formData.get("description");
  const laneCount = formData.get("laneCount");
  const status = formData.get("status");

  if (
    typeof name !== "string" ||
    typeof eventDate !== "string" ||
    typeof laneCount !== "string" ||
    typeof status !== "string"
  ) {
    throw new Error("Event name, date, lane count, and status are required");
  }

  try {
    const parsedTrackLength =
      typeof trackLengthFeet === "string" && trackLengthFeet.trim() !== ""
        ? Number(trackLengthFeet)
        : null;

    if (parsedTrackLength !== null && (!Number.isFinite(parsedTrackLength) || parsedTrackLength <= 0)) {
      throw new Error("Track length must be a positive number");
    }

    createEvent(
      {
        name: name.trim(),
        eventDate,
        locationName: typeof locationName === "string" ? locationName.trim() : "",
        trackName: typeof trackName === "string" ? trackName.trim() : "",
        trackLengthFeet: parsedTrackLength,
        description: typeof description === "string" ? description.trim() : "",
        laneCount: Number(laneCount) === 4 ? 4 : 2,
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
  const trackName = formData.get("trackName");
  const trackLengthFeet = formData.get("trackLengthFeet");
  const description = formData.get("description");
  const laneCount = formData.get("laneCount");
  const returnTo = formData.get("returnTo");

  if (
    typeof eventId !== "string" ||
    typeof name !== "string" ||
    typeof eventDate !== "string" ||
    typeof laneCount !== "string"
  ) {
    throw new Error("Event id, name, date, and lane count are required");
  }

  const user = await requireEventAccess(eventId, "manage");
  const redirectPath =
    typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : `/events/${eventId}`;

  try {
    const parsedTrackLength =
      typeof trackLengthFeet === "string" && trackLengthFeet.trim() !== ""
        ? Number(trackLengthFeet)
        : null;

    if (parsedTrackLength !== null && (!Number.isFinite(parsedTrackLength) || parsedTrackLength <= 0)) {
      throw new Error("Track length must be a positive number");
    }

    updateEventDetails(
      eventId,
      {
        name,
        eventDate,
        locationName: typeof locationName === "string" ? locationName : "",
        trackName: typeof trackName === "string" ? trackName : "",
        trackLengthFeet: parsedTrackLength,
        description: typeof description === "string" ? description : "",
        laneCount: Number(laneCount) === 4 ? 4 : 2,
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
  const winnerRegistrationId = formData.get("winnerRegistrationId");
  const note = formData.get("note");
  const slotASeconds = formData.get("slotASeconds");
  const slotBSeconds = formData.get("slotBSeconds");

  if (
    typeof eventId !== "string" ||
    typeof matchId !== "string" ||
    typeof winnerRegistrationId !== "string"
  ) {
    throw new Error("Event, match, and winner are required");
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

  try {
    recordMatchResult(
      eventId,
      matchId,
      winnerRegistrationId,
      user.id,
      typeof note === "string" ? note : "",
      {
        slotA: parseSeconds(slotASeconds),
        slotB: parseSeconds(slotBSeconds),
      },
    );
    revalidateEventViews(eventId);
    redirect(buildFlashPath(`/events/${eventId}`, "success", "Match result recorded"));
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
