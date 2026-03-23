"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { buildFlashPath } from "@/lib/flash";
import { archiveCar, createCar, updateCar } from "@/lib/phase1-operations";
import type { CarStatus } from "@/lib/types";

function revalidateCarViews() {
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

export async function createCarAction(formData: FormData) {
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
    revalidateCarViews();
    redirect(buildFlashPath("/cars", "success", "Car created"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create car";
    redirect(buildFlashPath("/cars", "error", message));
  }
}

export async function updateCarAction(formData: FormData) {
  const user = await requireRole(["admin", "host"]);
  const carId = formData.get("carId");
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
    typeof carId !== "string" ||
    typeof ownerRacerId !== "string" ||
    typeof nickname !== "string" ||
    typeof brand !== "string" ||
    typeof model !== "string" ||
    typeof status !== "string"
  ) {
    throw new Error("Car id, owner, nickname, brand, model, and status are required");
  }

  try {
    updateCar(
      carId,
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
    revalidateCarViews();
    redirect(buildFlashPath("/cars", "success", "Car updated"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update car";
    redirect(buildFlashPath("/cars", "error", message));
  }
}

export async function archiveCarAction(formData: FormData) {
  const user = await requireRole(["admin", "host"]);
  const carId = formData.get("carId");

  if (typeof carId !== "string") {
    throw new Error("Car id is required");
  }

  try {
    archiveCar(carId, user.id);
    revalidateCarViews();
    redirect(buildFlashPath("/cars", "success", "Car archived"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to archive car";
    redirect(buildFlashPath("/cars", "error", message));
  }
}
