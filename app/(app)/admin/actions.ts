"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { buildFlashPath } from "@/lib/flash";
import { clearSampleData } from "@/lib/phase1-operations";

function revalidateAdminViews() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/cars");
  revalidatePath("/events");
  revalidatePath("/racers");
  revalidatePath("/results");
  revalidatePath("/tracks");
}

export async function clearSampleDataAction() {
  const user = await requireRole(["admin"]);

  try {
    clearSampleData(user.id);
    revalidateAdminViews();
    redirect(buildFlashPath("/admin", "success", "Sample data cleared"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to clear sample data";
    redirect(buildFlashPath("/admin", "error", message));
  }
}
