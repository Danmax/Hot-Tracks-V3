export type UserRole = "admin" | "host" | "official" | "participant";
export type RacerStatus = "active" | "inactive" | "archived";
export type CarStatus = "inspection" | "checked_in" | "race_ready" | "archived";
export type TrackStatus = "active" | "archived";
export type EventStatus =
  | "draft"
  | "registration_open"
  | "checkin"
  | "in_progress"
  | "completed";
export type RegistrationStatus = "registered" | "checked_in" | "ready" | "withdrawn";
export type TournamentStatus = "draft" | "generated" | "in_progress" | "completed";
export type MatchStatus = "pending" | "ready" | "in_progress" | "completed" | "corrected" | "tied";
export type HeatStatus = "pending" | "ready" | "in_progress" | "completed";
export type LaneResultStatus = "pending" | "finished" | "dnf" | "dq" | "rerun";
export type EventAssignmentRole = "host" | "official";
export type TimingMode = "manual_entry" | "track_timer";
export type StartMode = "manual_gate" | "electronic_gate";
export type TiePolicy = "rerun" | "official_review";
export type SeedingMode = "standard_seeded" | "random_draw" | "qualifier_split";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  createdAt: string;
}

export interface RacerProfile {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  garageName: string | null;
  status: RacerStatus;
  createdAt: string;
}

export interface Car {
  id: string;
  ownerRacerId: string;
  nickname: string;
  brand: string;
  model: string;
  series: string | null;
  modelYear: number | null;
  category: string | null;
  className: string | null;
  notes: string | null;
  status: CarStatus;
  createdAt: string;
}

export interface Track {
  id: string;
  name: string;
  locationName: string | null;
  trackLengthInches: number | null;
  laneCount: 2 | 4;
  surfaceType: string | null;
  notes: string | null;
  status: TrackStatus;
  defaultTimingMode: TimingMode;
  defaultStartMode: StartMode;
  createdAt: string;
}

export interface Event {
  id: string;
  hostUserId: string;
  name: string;
  description: string | null;
  eventDate: string;
  locationName: string | null;
  trackId: string | null;
  trackName: string | null;
  trackLengthInches: number | null;
  laneCount: 2 | 4;
  timingMode: TimingMode;
  startMode: StartMode;
  tiePolicy: TiePolicy;
  seedingMode: SeedingMode;
  matchRaceCount: 1 | 2 | 3;
  status: EventStatus;
  createdAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  racerId: string;
  carId: string;
  checkedInAt: string | null;
  readyStatus: RegistrationStatus;
  seed: number | null;
  createdAt: string;
}

export interface EventAssignment {
  id: string;
  eventId: string;
  userId: string;
  assignmentRole: EventAssignmentRole;
  createdAt: string;
}

export interface Tournament {
  id: string;
  eventId: string;
  format: "single_elimination";
  status: TournamentStatus;
  generatedAt: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  roundNumber: number;
  bracketPosition: number;
  status: MatchStatus;
  slotARegistrationId: string | null;
  slotBRegistrationId: string | null;
  winnerRegistrationId: string | null;
  nextMatchId: string | null;
  notes: string | null;
}

export interface Heat {
  id: string;
  matchId: string;
  heatNumber: number;
  laneCount: 2 | 4;
  status: HeatStatus;
}

export interface LaneResult {
  id: string;
  heatId: string;
  laneNumber: number;
  registrationId: string | null;
  elapsedMs: number | null;
  finishPosition: number | null;
  resultStatus: LaneResultStatus;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  metadataJson: string;
  createdAt: string;
}

export interface Phase1State {
  users: User[];
  racerProfiles: RacerProfile[];
  cars: Car[];
  tracks: Track[];
  events: Event[];
  eventAssignments: EventAssignment[];
  eventRegistrations: EventRegistration[];
  tournaments: Tournament[];
  matches: Match[];
  heats: Heat[];
  laneResults: LaneResult[];
  auditLogs: AuditLog[];
}
