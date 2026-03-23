# Phase 1 Roles and Permissions Matrix

## Roles
- `admin`
- `host`
- `official`
- `participant`

## Role Definitions
- `admin`: platform-level management and correction authority
- `host`: owns and manages events
- `official`: runs event-day race operations
- `participant`: manages own profile, cars, and registrations

## Permissions

| Capability | Admin | Host | Official | Participant |
| --- | --- | --- | --- | --- |
| Sign in | Yes | Yes | Yes | Yes |
| View dashboard | Yes | Yes | Yes | Yes |
| Manage platform users | Yes | No | No | No |
| Create event | Yes | Yes | No | No |
| Edit own event | Yes | Yes | No | No |
| View assigned event | Yes | Yes | Yes | Yes |
| Open/close registration | Yes | Yes | No | No |
| Check in racers/cars | Yes | Yes | Yes | No |
| Generate bracket | Yes | Yes | No | No |
| Run live race operations | Yes | Yes | Yes | No |
| Enter race results | Yes | Yes | Yes | No |
| Correct completed match | Yes | Yes | No | No |
| Create racer profile | Yes | Yes | No | Yes |
| Edit own racer profile | Yes | Yes | No | Yes |
| Edit any racer profile | Yes | Yes | No | No |
| Create car | Yes | Yes | No | Yes |
| Edit own car | Yes | Yes | No | Yes |
| Edit any car | Yes | Yes | No | No |
| Register self for event | Yes | Yes | No | Yes |
| Register others for event | Yes | Yes | No | No |
| View bracket/results | Yes | Yes | Yes | Yes |

## Enforcement Notes
- `host` access should be scoped to events they created or were explicitly assigned to
- `official` should not be able to change bracket structure or edit historic registrations
- `participant` can only edit entities they own
- correction of completed matches should be logged for auditability

## Deferred Roles
The following blueprint roles are deferred from Phase 1 because they do not add distinct MVP permissions:
- `guest`
- `racer`
- `garage member`
- `scorekeeper`
- `super admin`
