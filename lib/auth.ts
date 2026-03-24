import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readState } from "@/lib/phase1-repository";
import type { User, UserRole } from "@/lib/types";

export const SESSION_COOKIE = "hot_tracks_session";
export const DEMO_PASSWORD = "demo123";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  if (passwordHash === "demo-hash") {
    return password === DEMO_PASSWORD;
  }

  const [algorithm, salt, derivedKey] = passwordHash.split(":");
  if (algorithm !== "scrypt" || !salt || !derivedKey) {
    return false;
  }

  const expected = Buffer.from(derivedKey, "hex");
  const actual = scryptSync(password, salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  return readState().users.find((user) => user.id === userId) ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    redirect("/");
  }

  return user;
}

type EventAccessLevel = "operate" | "manage";

function getEventAccess(user: User, eventId: string, level: EventAccessLevel) {
  const state = readState();
  const event = state.events.find((item) => item.id === eventId);

  if (!event) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  const assignments = state.eventAssignments.filter(
    (assignment) => assignment.eventId === eventId && assignment.userId === user.id,
  );

  if (level === "manage") {
    return (
      user.role === "host" &&
      (event.hostUserId === user.id ||
        assignments.some((assignment) => assignment.assignmentRole === "host"))
    );
  }

  if (user.role === "host") {
    return (
      event.hostUserId === user.id ||
      assignments.some((assignment) => assignment.assignmentRole === "host")
    );
  }

  if (user.role === "official") {
    return assignments.some((assignment) => assignment.assignmentRole === "official");
  }

  return false;
}

export async function requireEventAccess(eventId: string, level: EventAccessLevel) {
  const user = await requireUser();

  if (!getEventAccess(user, eventId, level)) {
    redirect("/events");
  }

  return user;
}

export async function getAccessibleEventIds(level: EventAccessLevel) {
  const user = await requireUser();
  const state = readState();

  if (user.role === "admin") {
    return new Set(state.events.map((event) => event.id));
  }

  return new Set(
    state.events
      .filter((event) => getEventAccess(user, event.id, level))
      .map((event) => event.id),
  );
}

export function formatRoleLabel(role: UserRole) {
  return role.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
