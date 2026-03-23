"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";
import { readState } from "@/lib/phase1-repository";

export async function signInAction(formData: FormData) {
  const userId = formData.get("userId");

  if (typeof userId !== "string") {
    redirect("/sign-in");
  }

  const user = readState().users.find((entry) => entry.id === userId);

  if (!user) {
    redirect("/sign-in");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/");
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/sign-in");
}
