# Hot Tracks Tournament Tracker Phase 1 PRD

## Overview
Phase 1 delivers the first usable race-operations MVP for Hot Wheels events. The release is focused on running local events end to end with manual result entry and without hardware dependency.

The product outcome for Phase 1 is simple: a host can create an event, register racers and cars, generate a bracket, run heats in 2-lane or 4-lane mode, record outcomes, and publish final standings.

## Goals
- Allow hosts to create and manage events without admin intervention
- Allow racers and cars to be registered and assigned to an event
- Support a complete single-elimination tournament flow
- Support manual race result entry for 2-lane and 4-lane events
- Show live bracket progression and final standings
- Enforce basic role-based access to host and admin tools

## Non-Goals
- Arduino or finish-line hardware integration
- Community feed, public garage pages, or event discovery
- Stream overlays and media features
- QR or barcode scanning
- Offline-first operation
- Season points, advanced rankings, or prize workflows
- Multiple advanced tournament formats

## Phase 1 Success Criteria
Phase 1 is successful when:
- a host can sign in and create a new event
- racers and cars can be created and attached to that event
- event check-in can be completed before bracket generation
- a single-elimination bracket is generated automatically
- officials can run the event using manual winner and result entry
- bracket advancement happens automatically after each completed match
- final placements and event results are viewable after the event closes

## Target Users
- Admin: manages users and platform-level settings
- Host: creates and manages events
- Official: runs races and records outcomes
- Participant: views own profile, cars, registrations, and event status

## MVP Scope

### In Scope
- Authentication
- Role-aware navigation and route protection
- Racer profile management
- Car catalog management
- Event creation and editing
- Event registration and check-in
- Track configuration selection: 2-lane or 4-lane
- Single-elimination tournament generation
- Match and heat tracking
- Manual winner entry
- Optional time and notes entry per lane
- Event leaderboard and final results
- Basic admin user management

### Out of Scope
- Double elimination
- Round robin
- Ladder or King of the Hill
- Time-trial ranking engine
- Garage social features
- Device communication services
- Live public display mode beyond a basic bracket/results page

## Product Decisions

### Tournament Format
Phase 1 supports only single elimination. This is the safest way to validate event flow, progression logic, and result capture before supporting more complex formats.

### Race Result Authority
Manual official entry is the source of truth in Phase 1. Hardware integration may later submit draft timing data, but it will not be required for the MVP.

### Track Support
Events can be configured for either 2-lane or 4-lane tracks. Lane count affects heat layout and result entry, but does not introduce different tournament rules.

### Car Ownership
Each car has one current owner in Phase 1. Ownership history is deferred.

### Garage Model
Garage is optional metadata in Phase 1. It does not introduce community or team features yet.

## Core User Flows

### 1. Host event setup
1. Host signs in
2. Host creates an event
3. Host selects event date, location, and track type
4. Host opens registration

### 2. Racer and car registration
1. Host or participant creates racer profile
2. Cars are added to the catalog
3. Cars are assigned to a racer
4. Racers and cars are added to an event

### 3. Check-in
1. Host views event registrations
2. Racers and cars are marked checked in
3. Host confirms the event roster
4. Host generates the tournament bracket

### 4. Live race operations
1. Official opens the next match
2. System shows assigned lanes
3. Official enters winner, optional lane times, and notes
4. Match is marked complete
5. Bracket advances automatically

### 5. Event completion
1. Final match completes
2. Final placements are calculated
3. Event standings and history remain viewable

## Functional Requirements

### Authentication and Access
- Users can sign in and sign out
- Protected routes require authentication
- Role-restricted screens are blocked for unauthorized users

### Racers
- Create, view, edit, and archive racer profiles
- Show basic racer details and linked cars

### Cars
- Create, view, edit, and archive cars
- Store name, brand, model, class/category, notes, and owner

### Events
- Create, edit, publish, and close events
- Store event name, host, date, location, status, and lane count
- Support statuses: draft, registration_open, checkin, in_progress, completed

### Registrations
- Add racers and cars to an event
- Track event-ready and checked-in status
- Prevent bracket generation when no eligible registrations exist

### Tournament Engine
- Generate a single-elimination bracket from checked-in entries
- Handle byes when entry count is not a power of two
- Advance winners automatically
- Prevent editing completed earlier matches without an explicit admin/host correction flow

### Race Result Entry
- Officials can record match winner
- Officials can record lane assignment
- Officials can optionally record per-lane elapsed time and notes
- Officials can mark rerun or disqualification outcomes

### Results and Standings
- Display bracket progression
- Display event placements
- Display racer and car results for the event

## Non-Functional Requirements
- Responsive UI for desktop, tablet, and phone
- Tablet-friendly race operations page
- Reasonable performance for local events up to at least 64 entries
- Basic auditability for critical actions such as bracket generation and match correction

## Assumptions
- Hosts are comfortable entering results manually
- Most Phase 1 events are local and managed by a small group
- Hardware integration will not block the MVP launch

## Risks
- Scope creep into community and media features
- Overengineering the role system before the workflows are stable
- Trying to support multiple bracket types too early
- Weak correction rules causing inconsistent bracket history

## Acceptance Criteria
- Host can create an event from start to finish without developer/admin support
- At least 8 racers and 8 cars can be checked into one event
- Bracket generation produces a valid single-elimination structure
- Officials can complete all matches with manual result entry
- Final standings are correct after tournament completion
- Participants cannot access host-only or admin-only tools
