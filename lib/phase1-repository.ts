import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { phase1SeedState } from "@/lib/phase1-store";
import type { Phase1State } from "@/lib/types";

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

export function readState(): Phase1State {
  ensureStateFile();
  return JSON.parse(readFileSync(stateFile, "utf8")) as Phase1State;
}

export function writeState(state: Phase1State) {
  ensureStateFile();
  writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");
}

export function updateState(mutator: (state: Phase1State) => Phase1State) {
  const current = readState();
  const next = mutator(structuredClone(current));
  writeState(next);
  return next;
}

