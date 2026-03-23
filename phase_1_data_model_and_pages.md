# Phase 1 Data Model and Page Map

## Minimal Data Model

### User
- id
- email
- password_hash
- role
- display_name
- created_at

### RacerProfile
- id
- user_id nullable
- first_name
- last_name
- display_name
- garage_name nullable
- status
- created_at

### Car
- id
- owner_racer_id
- nickname
- brand
- model
- series nullable
- model_year nullable
- category nullable
- class_name nullable
- notes nullable
- status
- created_at

### Event
- id
- host_user_id
- name
- description nullable
- event_date
- location_name nullable
- lane_count
- status
- created_at

### EventRegistration
- id
- event_id
- racer_id
- car_id
- checked_in_at nullable
- ready_status
- seed nullable
- created_at

### Tournament
- id
- event_id
- format
- status
- generated_at

### Match
- id
- tournament_id
- round_number
- bracket_position
- status
- winner_registration_id nullable
- next_match_id nullable
- notes nullable

### Heat
- id
- match_id
- heat_number
- lane_count
- status

### LaneResult
- id
- heat_id
- lane_number
- registration_id
- elapsed_ms nullable
- finish_position nullable
- result_status

### AuditLog
- id
- actor_user_id
- entity_type
- entity_id
- action
- metadata_json
- created_at

## Key Relationships
- `User` may own one participant-facing account and may create many events
- `RacerProfile` may be linked to one `User`
- `RacerProfile` owns many `Car` records
- `Event` has many `EventRegistration` records
- `Event` has one Phase 1 `Tournament`
- `Tournament` has many `Match` records
- `Match` has one or more `Heat` records
- `Heat` has one `LaneResult` per active lane

## Important Modeling Rules
- `EventRegistration` is the tournament entry, not the racer or car directly
- bracket advancement should move registration ids, not duplicate racer/car data
- lane count belongs to the event and heat context, not to the racer or car
- Phase 1 stores optional elapsed times but does not require timing for a valid result

## Suggested Enumerations

### User.role
- `admin`
- `host`
- `official`
- `participant`

### Event.status
- `draft`
- `registration_open`
- `checkin`
- `in_progress`
- `completed`

### Tournament.format
- `single_elimination`

### Match.status
- `pending`
- `ready`
- `in_progress`
- `completed`
- `corrected`

### LaneResult.result_status
- `pending`
- `finished`
- `dnf`
- `dq`
- `rerun`

## Page Map

### Public or auth entry
- Sign in

### Shared authenticated pages
- Dashboard
- Profile

### Participant pages
- My racer profile
- My cars
- My event registrations

### Host pages
- Events list
- Create/edit event
- Event registration and check-in
- Tournament setup
- Bracket view
- Event results

### Official pages
- Assigned event operations
- Race control page
- Match result entry page

### Admin pages
- User management
- Audit log view

## Primary Navigation
- Dashboard
- Racers
- Cars
- Events
- Results
- Admin

The `Admin` item should only render for admins. Host event actions should appear contextually within the event area rather than as a separate global section.
