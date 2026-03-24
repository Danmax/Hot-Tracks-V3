# Phase 1 Backlog

## Purpose
This backlog now reflects the current implementation state in the repo, not the original pre-build planning draft.

Status labels:
- `done`: implemented in the current app
- `partial`: implemented, but still missing Phase 1 depth or hardening
- `next`: not implemented and should stay in the active queue
- `later`: useful, but not on the immediate critical path

## Current Snapshot

### Done
- Next.js app shell and protected route structure
- Cookie-backed sign-in flow and middleware protection
- Global role model: `admin`, `host`, `official`, `participant`
- Event-scoped access for hosts and officials
- Event creation and event detail editing
- Event setup fields: location, track, track length, lane count, status
- Event assignment management for hosts and officials
- Event registration creation
- Registration status updates
- Registration car swaps and registration removal before bracket generation
- Single-elimination bracket generation
- Match result entry with optional lane times and notes
- Match reopen/correction flow with downstream bracket clearing
- Basic results page and basic admin audit visibility
- File-backed mutable state plus SQL reference schema docs

### Partial
- Racer management is implemented, but still dense on mobile and lacks participant self-service
- Car management is implemented, but photo identification and media handling still need hardening
- Admin user management is visibility-only, not editable
- Results now support event selection, placement-based standings, and championship points, but still need awards publishing
- Dashboard/system-map copy has moved forward, but the backlog needs a real Phase 2 track
- Persistence is real enough for local development, but still JSON-backed

### Missing
- Event archive/delete rules
- Racer create/edit/archive flows
- Car create/edit/archive flows
- Real database adapter
- End-to-end tests

## Epic 1: Foundation And Access
Status: `done`

### Delivered
- app shell, navigation, and protected route group
- sign-in and sign-out flow
- middleware-based auth enforcement
- route and action guards for role and event scope
- local seed-backed mutable state

### Hardening
- tighten session handling beyond demo cookie behavior
- add automated auth and permission tests

## Epic 2: Racer And Car Management
Status: `partial`

### Delivered
- racer list screen
- car catalog screen
- owner linkage and event-derived summary data

### Remaining
- participant-facing racer ownership and profile management
- media/photo persistence for cars beyond transient identification
- better mobile action density for racer and car maintenance

### Done When
- hosts can create and edit racers without file edits
- hosts can create and edit cars without file edits
- archived racers and cars drop out of default active views

## Epic 3: Event Setup And Staffing
Status: `done`

### Delivered
- event creation from `/events`
- event detail editing from `/events`
- event detail editing from `/events/[eventId]`
- setup fields for event name, date, location, track, track length, description, lane count
- event status updates
- host and official assignment management from both event list and workspace
- lane count lock after bracket generation

### Hardening
- add archive/delete path with strict safeguards
- add clearer event lifecycle messaging around destructive actions

## Epic 4: Roster And Check-In
Status: `done`

### Delivered
- add event registrations
- update registration readiness/check-in state
- remove registrations before bracket generation
- swap registered car before bracket generation
- seed resequencing after roster removal
- roster lock after bracket generation

### Hardening
- consider explicit check-in timestamps in more UI surfaces
- add better duplicate and validation messaging tests

## Epic 5: Tournament Generation
Status: `done`

### Delivered
- single-elimination bracket generation
- bye handling for non-power-of-two entry counts
- persisted tournament, match, heat, and lane-result structures
- automatic advancement after result entry

### Hardening
- verify larger brackets with seed data beyond the current sample set
- add automated progression tests for 4, 8, 16, and odd entry counts

## Epic 6: Live Race Operations
Status: `done`

### Delivered
- ready match display in workspace
- result entry with winner, notes, and optional lane times
- correction flow for completed matches
- downstream bracket rollback during corrections
- audit logging for critical operational changes

### Remaining
- expose clearer rerun and DQ workflows directly in the UI
- add stronger operator feedback around current/next race flow

## Epic 7: Results And Admin
Status: `partial`

### Delivered
- results page with event placements, championship standings, and recent matches
- admin page with user list and audit history
- role-protected admin route

### Remaining
- admin user management should support actual edits
- awards and podium publishing workflow

## Epic 8: Persistence And Reliability
Status: `next`

### Stories
- replace JSON repository with a real database adapter
- add migration path from current JSON seed/state
- add test coverage for event operations and bracket logic
- add safer recovery behavior for concurrent writes

### Done When
- event mutations persist through a database layer
- schema and runtime model stay aligned
- critical Phase 1 flows have automated coverage

## Immediate Priority Order
1. Add guarded event archive/delete rules
2. Replace JSON-backed state with a real database adapter
3. Add automated tests for auth, roster rules, bracket generation, and corrections
4. Build editable admin user management
5. Add awards and podium publishing workflow
6. Harden media/photo flows for car records

## Phase 2 Direction

### Candidate Focus
- championship standings across multiple events
- awards and podium publishing
- sponsor and team metadata
- participant self-service for drivers and garages
- persistent car photos and richer item records

### Recommended First Slice
- build awards and podium publishing from placement/championship data
- add sponsor and team metadata into event and season views
- expose participant self-service for drivers and garages

## Milestones

### Milestone A: Operational MVP
Status: `done`
- auth and protected routes
- event setup
- staffing
- roster management
- bracket generation
- live result entry

### Milestone B: Phase 1 Completeness
Status: `partial`
- racer CRUD
- car CRUD
- stronger results logic
- admin edits

### Milestone C: Persistence Hardening
Status: `next`
- real database
- migration path
- automated tests

## QA Checklist
- create an event with location, track, and track length
- update event details from both `/events` and `/events/[eventId]`
- verify lane count cannot change after bracket generation
- add and remove registrations before bracket generation
- verify registrations lock after bracket generation
- generate a bracket with a non-power-of-two entry count and verify byes
- record winner, lane times, and notes for a match
- reopen a completed match and verify downstream bracket state clears
- verify official cannot access host-only management actions
- verify primary host assignment cannot be removed
- verify results page still renders after event updates
