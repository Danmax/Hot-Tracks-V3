"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionCookieValue,
  hashPassword,
  normalizeEmail,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/auth";
import { buildFlashPath } from "@/lib/flash";
import { readState, updateState } from "@/lib/phase1-repository";

function redirectToSignInError(message: string): never {
  redirect(buildFlashPath("/sign-in", "error", message));
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function createSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionCookieValue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function signInAction(formData: FormData) {
  const userId = formData.get("userId");
  const email = formData.get("email");
  const password = formData.get("password");
  const state = readState();
  let matchedUser = null;

  if (typeof userId === "string" && userId) {
    matchedUser = state.users.find((entry) => entry.id === userId) ?? null;

    if (!matchedUser || matchedUser.passwordHash !== "demo-hash") {
      redirectToSignInError("That quick-access account is no longer available");
    }
  } else {
    if (typeof email !== "string" || typeof password !== "string") {
      redirectToSignInError("Email and password are required");
    }

    const normalizedEmail = normalizeEmail(email);
    matchedUser =
      state.users.find((entry) => normalizeEmail(entry.email) === normalizedEmail) ?? null;

    if (!matchedUser || !verifyPassword(password, matchedUser.passwordHash)) {
      redirectToSignInError("Invalid email or password");
    }
  }

  await createSession(matchedUser.id);
  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const displayName = formData.get("displayName");
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof displayName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    redirectToSignInError("Display name, email, and password are required");
  }

  const trimmedDisplayName = displayName.trim();
  const normalizedEmail = normalizeEmail(email);

  if (trimmedDisplayName.length < 2) {
    redirectToSignInError("Display name must be at least 2 characters");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    redirectToSignInError("Enter a valid email address");
  }

  if (password.length < 8) {
    redirectToSignInError("Password must be at least 8 characters");
  }

  if (password !== confirmPassword) {
    redirectToSignInError("Passwords do not match");
  }

  const createdAt = new Date().toISOString();
  const userId = `u_${makeSlug(normalizedEmail.split("@")[0] || trimmedDisplayName)}_${Date.now()
    .toString()
    .slice(-6)}`;

  try {
    updateState((state) => {
      const duplicateUser = state.users.find(
        (entry) => normalizeEmail(entry.email) === normalizedEmail,
      );

      if (duplicateUser) {
        throw new Error("An account with that email already exists");
      }

      state.users.push({
        id: userId,
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        role: "participant",
        displayName: trimmedDisplayName,
        createdAt,
      });

      state.auditLogs.push({
        id: `audit_${Date.now()}_${state.auditLogs.length + 1}`,
        actorUserId: userId,
        entityType: "user",
        entityId: userId,
        action: "user_signed_up",
        metadataJson: JSON.stringify({
          email: normalizedEmail,
          role: "participant",
          source: "self_signup",
        }),
        createdAt,
      });

      return state;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account";
    redirectToSignInError(message);
  }

  await createSession(userId);
  redirect("/");
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/sign-in");
}
