import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readState } from "@/lib/phase1-repository";
import type { User, UserRole } from "@/lib/types";

export const SESSION_COOKIE = "hot_tracks_session";

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
