"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { buildFlashPath } from "@/lib/flash";
import { archiveTrack, createTrack, updateTrack } from "@/lib/phase1-operations";
import type { StartMode, TimingMode, TrackStatus } from "@/lib/types";

function revalidateTrackViews() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/events");
  revalidatePath("/results");
  revalidatePath("/tracks");
}

function parseTrackLength(feetValue: FormDataEntryValue | null, inchesValue: FormDataEntryValue | null) {
  const feet =
    typeof feetValue === "string" && feetValue.trim() !== "" ? Number(feetValue) : 0;
  const inches =
    typeof inchesValue === "string" && inchesValue.trim() !== "" ? Number(inchesValue) : 0;

  if (!Number.isFinite(feet) || feet < 0 || !Number.isFinite(inches) || inches < 0) {
    throw new Error("Track length feet and inches must be non-negative numbers");
  }

  const total = feet === 0 && inches === 0 ? null : Math.round(feet * 12 + inches);
  if (total !== null && total <= 0) {
    throw new Error("Track length must be greater than zero");
  }

  return total;
}

export async function createTrackAction(formData: FormData) {
  const user = await requireRole(["admin", "host"]);
  const name = formData.get("name");
  const locationName = formData.get("locationName");
  const trackLengthFeet = formData.get("trackLengthFeet");
  const trackLengthInches = formData.get("trackLengthInches");
  const laneCount = formData.get("laneCount");
  const surfaceType = formData.get("surfaceType");
  const notes = formData.get("notes");
  const status = formData.get("status");
  const defaultTimingMode = formData.get("defaultTimingMode");
  const defaultStartMode = formData.get("defaultStartMode");

  if (
    typeof name !== "string" ||
    typeof laneCount !== "string" ||
    typeof status !== "string" ||
    typeof defaultTimingMode !== "string" ||
    typeof defaultStartMode !== "string"
  ) {
    throw new Error("Track name, lane count, status, and default modes are required");
  }

  try {
    createTrack(
      {
        name,
        locationName: typeof locationName === "string" ? locationName : "",
        trackLengthInches: parseTrackLength(trackLengthFeet, trackLengthInches),
        laneCount: Number(laneCount) === 4 ? 4 : 2,
        surfaceType: typeof surfaceType === "string" ? surfaceType : "",
        notes: typeof notes === "string" ? notes : "",
        status: status === "archived" ? ("archived" as TrackStatus) : "active",
        defaultTimingMode:
          defaultTimingMode === "track_timer" ? ("track_timer" as TimingMode) : "manual_entry",
        defaultStartMode:
          defaultStartMode === "electronic_gate"
            ? ("electronic_gate" as StartMode)
            : "manual_gate",
      },
      user.id,
    );
    revalidateTrackViews();
    redirect(buildFlashPath("/tracks", "success", "Track created"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create track";
    redirect(buildFlashPath("/tracks", "error", message));
  }
}

export async function updateTrackAction(formData: FormData) {
  const user = await requireRole(["admin", "host"]);
  const trackId = formData.get("trackId");
  const name = formData.get("name");
  const locationName = formData.get("locationName");
  const trackLengthFeet = formData.get("trackLengthFeet");
  const trackLengthInches = formData.get("trackLengthInches");
  const laneCount = formData.get("laneCount");
  const surfaceType = formData.get("surfaceType");
  const notes = formData.get("notes");
  const status = formData.get("status");
  const defaultTimingMode = formData.get("defaultTimingMode");
  const defaultStartMode = formData.get("defaultStartMode");

  if (
    typeof trackId !== "string" ||
    typeof name !== "string" ||
    typeof laneCount !== "string" ||
    typeof status !== "string" ||
    typeof defaultTimingMode !== "string" ||
    typeof defaultStartMode !== "string"
  ) {
    throw new Error("Track id, name, lane count, status, and default modes are required");
  }

  try {
    updateTrack(
      trackId,
      {
        name,
        locationName: typeof locationName === "string" ? locationName : "",
        trackLengthInches: parseTrackLength(trackLengthFeet, trackLengthInches),
        laneCount: Number(laneCount) === 4 ? 4 : 2,
        surfaceType: typeof surfaceType === "string" ? surfaceType : "",
        notes: typeof notes === "string" ? notes : "",
        status: status === "archived" ? ("archived" as TrackStatus) : "active",
        defaultTimingMode:
          defaultTimingMode === "track_timer" ? ("track_timer" as TimingMode) : "manual_entry",
        defaultStartMode:
          defaultStartMode === "electronic_gate"
            ? ("electronic_gate" as StartMode)
            : "manual_gate",
      },
      user.id,
    );
    revalidateTrackViews();
    redirect(buildFlashPath("/tracks", "success", "Track updated"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update track";
    redirect(buildFlashPath("/tracks", "error", message));
  }
}

export async function archiveTrackAction(formData: FormData) {
  const user = await requireRole(["admin", "host"]);
  const trackId = formData.get("trackId");

  if (typeof trackId !== "string") {
    throw new Error("Track id is required");
  }

  try {
    archiveTrack(trackId, user.id);
    revalidateTrackViews();
    redirect(buildFlashPath("/tracks", "success", "Track archived"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to archive track";
    redirect(buildFlashPath("/tracks", "error", message));
  }
}
