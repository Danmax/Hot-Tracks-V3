import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { phase1SeedState } from "@/lib/phase1-store";
import type { Phase1State, Track } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const stateFile = path.join(dataDir, "phase1-state.json");

function ensureStateFile() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (!existsSync(stateFile)) {
    writeFileSync(stateFile, JSON.stringify(phase1SeedState, null, 2), "utf8");
  }
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeState(state: Phase1State): Phase1State {
  const tracks = Array.isArray(state.tracks) ? structuredClone(state.tracks) : [];
  const trackMap = new Map(tracks.map((track) => [track.id, track]));

  for (const event of state.events) {
    if (
      !event.trackId &&
      (event.trackName || event.trackLengthInches || event.laneCount)
    ) {
      const fallbackName = event.trackName ?? `${event.name} Track`;
      const trackId = `trk_${makeSlug(fallbackName)}_${event.laneCount}`;

      if (!trackMap.has(trackId)) {
        const synthesizedTrack: Track = {
          id: trackId,
          name: fallbackName,
          locationName: event.locationName ?? null,
          trackLengthInches: event.trackLengthInches ?? null,
          laneCount: event.laneCount,
          surfaceType: null,
          notes: "Migrated from event snapshot data.",
          status: "active",
          defaultTimingMode: event.timingMode ?? "manual_entry",
          defaultStartMode: event.startMode ?? "manual_gate",
          createdAt: event.createdAt,
        };

        tracks.push(synthesizedTrack);
        trackMap.set(trackId, synthesizedTrack);
      }

      event.trackId = trackId;
    }

    event.trackId = event.trackId ?? null;
    event.timingMode = event.timingMode ?? "manual_entry";
    event.startMode = event.startMode ?? "manual_gate";
    event.tiePolicy = event.tiePolicy ?? "rerun";
  }

  return {
    ...state,
    tracks,
  };
}

export function readState(): Phase1State {
  ensureStateFile();
  return normalizeState(JSON.parse(readFileSync(stateFile, "utf8")) as Phase1State);
}

export function writeState(state: Phase1State) {
  ensureStateFile();
  writeFileSync(stateFile, JSON.stringify(normalizeState(state), null, 2), "utf8");
}

export function updateState(mutator: (state: Phase1State) => Phase1State) {
  const current = readState();
  const next = mutator(structuredClone(current));
  writeState(next);
  return next;
}
