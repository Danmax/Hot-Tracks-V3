"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { buildFlashPath } from "@/lib/flash";
import {
  archiveRacerProfile,
  createCar,
  createRacerProfile,
  updateRacerProfile,
} from "@/lib/phase1-operations";
import type { CarStatus, RacerStatus } from "@/lib/types";

function revalidateRacerViews() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/cars");
  revalidatePath("/events");
  revalidatePath("/racers");
  revalidatePath("/results");
}

function parseModelYear(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Model year must be a positive number");
  }

  return Math.round(parsed);
}

export async function createRacerAction(formData: FormData) {
  const user = await requireRole(["admin", "host"]);
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const displayName = formData.get("displayName");
  const garageName = formData.get("garageName");
  const status = formData.get("status");

  if (
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof status !== "string"
  ) {
    throw new Error("First name, last name, and status are required");
  }

  try {
    createRacerProfile(
      {
        firstName,
        lastName,
        displayName: typeof displayName === "string" ? displayName : "",
        garageName: typeof garageName === "string" ? garageName : "",
        status: status === "inactive" || status === "archived" ? (status as RacerStatus) : "active",
      },
      user.id,
    );
    revalidateRacerViews();
    redirect(buildFlashPath("/racers", "success", "Racer created"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create racer";
    redirect(buildFlashPath("/racers", "error", message));
  }
}

export async function updateRacerAction(formData: FormData) {
  const user = await requireRole(["admin", "host"]);
  const racerId = formData.get("racerId");
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const displayName = formData.get("displayName");
  const garageName = formData.get("garageName");
  const status = formData.get("status");

  if (
    typeof racerId !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof status !== "string"
  ) {
    throw new Error("Racer id, first name, last name, and status are required");
  }

  try {
    updateRacerProfile(
      racerId,
      {
        firstName,
        lastName,
        displayName: typeof displayName === "string" ? displayName : "",
        garageName: typeof garageName === "string" ? garageName : "",
        status: status === "inactive" || status === "archived" ? (status as RacerStatus) : "active",
      },
      user.id,
    );
    revalidateRacerViews();
    redirect(buildFlashPath("/racers", "success", "Racer updated"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update racer";
    redirect(buildFlashPath("/racers", "error", message));
  }
}

export async function archiveRacerAction(formData: FormData) {
  const user = await requireRole(["admin", "host"]);
  const racerId = formData.get("racerId");

  if (typeof racerId !== "string") {
    throw new Error("Racer id is required");
  }

  try {
    archiveRacerProfile(racerId, user.id);
    revalidateRacerViews();
    redirect(buildFlashPath("/racers", "success", "Racer archived"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to archive racer";
    redirect(buildFlashPath("/racers", "error", message));
  }
}

export async function createRacerCarAction(formData: FormData) {
  const user = await requireRole(["admin", "host"]);
  const ownerRacerId = formData.get("ownerRacerId");
  const nickname = formData.get("nickname");
  const brand = formData.get("brand");
  const model = formData.get("model");
  const series = formData.get("series");
  const modelYear = formData.get("modelYear");
  const category = formData.get("category");
  const className = formData.get("className");
  const notes = formData.get("notes");
  const status = formData.get("status");

  if (
    typeof ownerRacerId !== "string" ||
    typeof nickname !== "string" ||
    typeof brand !== "string" ||
    typeof model !== "string" ||
    typeof status !== "string"
  ) {
    throw new Error("Owner, nickname, brand, model, and status are required");
  }

  try {
    createCar(
      {
        ownerRacerId,
        nickname,
        brand,
        model,
        series: typeof series === "string" ? series : "",
        modelYear: parseModelYear(modelYear),
        category: typeof category === "string" ? category : "",
        className: typeof className === "string" ? className : "",
        notes: typeof notes === "string" ? notes : "",
        status:
          status === "inspection" ||
          status === "checked_in" ||
          status === "archived"
            ? (status as CarStatus)
            : "race_ready",
      },
      user.id,
    );
    revalidateRacerViews();
    redirect(buildFlashPath("/racers", "success", "Car added to racer"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add car";
    redirect(buildFlashPath("/racers", "error", message));
  }
}
