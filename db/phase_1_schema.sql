CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'host', 'official', 'participant')),
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE racer_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  garage_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TEXT NOT NULL
);

CREATE TABLE cars (
  id TEXT PRIMARY KEY,
  owner_racer_id TEXT NOT NULL REFERENCES racer_profiles(id),
  nickname TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  series TEXT,
  model_year INTEGER,
  category TEXT,
  class_name TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('inspection', 'checked_in', 'race_ready', 'archived')),
  created_at TEXT NOT NULL
);

CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location_name TEXT,
  track_length_inches INTEGER,
  lane_count INTEGER NOT NULL CHECK (lane_count IN (2, 4)),
  surface_type TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
  default_timing_mode TEXT NOT NULL CHECK (default_timing_mode IN ('manual_entry', 'track_timer')),
  default_start_mode TEXT NOT NULL CHECK (default_start_mode IN ('manual_gate', 'electronic_gate')),
  created_at TEXT NOT NULL
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  host_user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  location_name TEXT,
  track_id TEXT REFERENCES tracks(id),
  track_name TEXT,
  track_length_inches INTEGER,
  lane_count INTEGER NOT NULL CHECK (lane_count IN (2, 4)),
  timing_mode TEXT NOT NULL CHECK (timing_mode IN ('manual_entry', 'track_timer')),
  start_mode TEXT NOT NULL CHECK (start_mode IN ('manual_gate', 'electronic_gate')),
  tie_policy TEXT NOT NULL CHECK (tie_policy IN ('rerun', 'official_review')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'registration_open', 'checkin', 'in_progress', 'completed')),
  created_at TEXT NOT NULL
);

CREATE TABLE event_assignments (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  assignment_role TEXT NOT NULL CHECK (assignment_role IN ('host', 'official')),
  created_at TEXT NOT NULL
);

CREATE TABLE event_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  racer_id TEXT NOT NULL REFERENCES racer_profiles(id),
  car_id TEXT NOT NULL REFERENCES cars(id),
  checked_in_at TEXT,
  ready_status TEXT NOT NULL CHECK (ready_status IN ('registered', 'checked_in', 'ready', 'withdrawn')),
  seed INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(event_id, car_id)
);

CREATE TABLE tournaments (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE REFERENCES events(id),
  format TEXT NOT NULL CHECK (format = 'single_elimination'),
  status TEXT NOT NULL CHECK (status IN ('draft', 'generated', 'in_progress', 'completed')),
  generated_at TEXT NOT NULL
);

CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  round_number INTEGER NOT NULL,
  bracket_position INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'in_progress', 'completed', 'corrected', 'tied')),
  slot_a_registration_id TEXT REFERENCES event_registrations(id),
  slot_b_registration_id TEXT REFERENCES event_registrations(id),
  winner_registration_id TEXT REFERENCES event_registrations(id),
  next_match_id TEXT REFERENCES matches(id),
  notes TEXT
);

CREATE TABLE heats (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id),
  heat_number INTEGER NOT NULL,
  lane_count INTEGER NOT NULL CHECK (lane_count IN (2, 4)),
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'in_progress', 'completed'))
);

CREATE TABLE lane_results (
  id TEXT PRIMARY KEY,
  heat_id TEXT NOT NULL REFERENCES heats(id),
  lane_number INTEGER NOT NULL,
  registration_id TEXT REFERENCES event_registrations(id),
  elapsed_ms INTEGER,
  finish_position INTEGER,
  result_status TEXT NOT NULL CHECK (result_status IN ('pending', 'finished', 'dnf', 'dq', 'rerun'))
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX idx_tracks_status ON tracks(status);
CREATE INDEX idx_event_assignments_event_id ON event_assignments(event_id);
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_heats_match_id ON heats(match_id);
CREATE INDEX idx_lane_results_heat_id ON lane_results(heat_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
