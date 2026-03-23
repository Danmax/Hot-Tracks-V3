# Phase 1 Backlog

## Epic 1: Project Foundation

### Stories
- Set up app shell, auth flow, and protected routes
- Define base roles and route guards
- Add seed data support for local development

### Done When
- authenticated users can access the app
- unauthorized users are blocked from protected screens
- developers can load sample data for an event scenario

## Epic 2: Racer and Car Management

### Stories
- Create racer profile form and detail page
- Create car form and detail page
- Link cars to racers
- Support edit and archive actions

### Done When
- hosts and participants can create racers and cars
- racer detail pages show assigned cars
- archived records no longer appear in default active lists

## Epic 3: Event Management

### Stories
- Create event form
- Edit event metadata and status
- Support event roster management
- Support event check-in workflow

### Done When
- host can create an event with lane count and date
- registrations can be added and marked checked in
- event status transitions are enforced correctly

## Epic 4: Tournament Generation

### Stories
- Generate single-elimination bracket from checked-in entries
- Handle odd entry counts with byes
- Store round and match structure

### Done When
- bracket generation works for 4, 8, 16, 32, and non-power-of-two entry counts
- every entry has a valid path through the bracket
- byes advance correctly

## Epic 5: Race Operations

### Stories
- Show next ready match
- Display lane assignments for 2-lane or 4-lane events
- Enter winner, optional lane times, and notes
- Support rerun and disqualification markers

### Done When
- official can complete a match without direct database edits
- match completion advances the winner automatically
- corrected outcomes are audit logged

## Epic 6: Results and Reporting

### Stories
- Render bracket progression
- Render event standings
- Show racer and car performance for the event

### Done When
- bracket page updates after result entry
- final placements display after tournament completion
- event results remain viewable after event close

## Epic 7: Admin Controls

### Stories
- Basic user list and role management
- Access to audit logs
- Manual correction flow for locked matches

### Done When
- admins can assign supported roles
- admins can review critical event changes
- match correction does not silently rewrite history

## Milestones

### Milestone 1: Scope and foundations
- finalize PRD
- finalize role matrix
- finalize schema draft
- scaffold auth and route guards

### Milestone 2: Management workflows
- racer CRUD
- car CRUD
- event CRUD
- registration and check-in

### Milestone 3: Competition engine
- bracket generation
- match persistence
- advancement logic

### Milestone 4: Live operations
- race control page
- result entry
- bracket updates
- standings

### Milestone 5: Hardening
- seed data
- permission review
- audit logging
- end-to-end validation

## QA Checklist
- create an event with 8 entries and complete it end to end
- create an event with a non-power-of-two entry count and verify byes
- verify participant cannot access host tools
- verify official cannot regenerate bracket
- verify corrected match leaves an audit trail
- verify 2-lane and 4-lane flows both render properly
