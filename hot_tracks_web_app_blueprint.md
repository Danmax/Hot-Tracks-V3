# Hot Tracks Tournament Tracker web app blueprint

## Product vision
Hot Tracks Tournament Tracker is an all-in-one Hot Wheels racing platform that combines car cataloging, racer registration, event management, live race control, statistics, community features, and hardware integration into a single web app.

The platform should support casual home races, organized garage-hosted events, recurring league play, live tournaments, speed trials, and historical performance tracking.

## Core goals
- Register racers and catalog their cars
- Run events such as tournaments, speed trials, pop-up races, and community meetups
- Support garages, hosts, admins, and participants with different views and permissions
- Manage live race operations across 2-lane and 4-lane tracks
- Integrate with hardware such as Arduino race systems, finish line readers, servo gates, lane displays, and LCD/OLED messages
- Provide leaderboards, season standings, car stats, racer history, and prize tracking
- Deliver a fun racing experience for both in-person and online audiences

## Main product areas

### 1. Participant and garage management
- Participant profiles
- Racer accounts
- Family/team/crew associations
- Garage profiles
- Garage locations
- Host permissions
- Admin permissions
- Membership roles
- Racer history and participation logs

### 2. Car catalog system
- Car registration
- Car profile pages
- Photos and gallery
- Make / model / series / year / brand
- Category and class assignment
- Weight / wheel type / modifications / notes
- QR code or barcode for quick check-in
- Ownership history
- Eligibility rules for event categories
- Car performance history

### 3. Event management
- Create events
- Host public or private events
- Event schedule and registration windows
- Event location and garage host
- Event format selection
- Tournament setup wizard
- Speed trial setup
- Pop-up tournament mode
- Check-in and race-ready status
- Event announcements and updates
- Prize and award configuration

### 4. Race operations
- 2-lane mode
- 4-lane mode
- Lane assignment logic
- Heat generation
- Ready queue
- Start sequence controls
- Finish capture
- Race timer input
- Disqualification / rerun / false start handling
- Manual override tools
- Live control dashboard for race officials
- On-screen race presentation mode

### 5. Tournament and competition formats
- Single elimination
- Double elimination
- Round robin
- Knockout
- King of the Hill
- Ladder format
- Best-of race sets
- Time-based qualifying
- Seeded brackets
- Randomized brackets
- Advancement rules
- Consolation rounds
- Finals and championship tracking

### 6. Stats and history
- Racer win/loss history
- Car win rate
- Best elapsed times
- Lane performance trends
- Tournament finishes
- Titles and awards
- Season points
- Garage rankings
- Category leaderboards
- Personal bests
- Historical event archive

### 7. Community and discovery
- Public garage pages
- Event discovery by location
- Community feed
- Featured cars and racers
- Track locations map
- Rankings and leaderboards
- Online gallery
- Highlights and clips
- Upcoming races and pop-up events

### 8. Display and media integration
- Live race board view
- Stream overlay mode
- Public display screens
- Matchup cards
- Countdown and status messages
- Winner announcements
- Bracket display screen
- Photo and video attachments for races and events

### 9. Hardware integration
- Arduino communication layer
- Track start trigger
- Servo gate control
- Finish line reader integration
- Lane timing input
- LCD / OLED / LED matrix status messaging
- Mobile device companion view for control and monitoring
- API or websocket events for real-time updates

## User roles
- Guest
- Participant
- Racer
- Garage member
- Host
- Event official
- Scorekeeper
- Admin
- Super admin

## Experience modes

### Simple mode
Built for quick setup and family race nights.
- Fast registration
- Minimal fields
- Quick bracket creation
- Auto lane assignment
- Simple live view

### Detailed mode
Built for competitive leagues and advanced hosts.
- Full car inspection profile
- Category restrictions
- Race official tools
- Hardware controls
- Advanced tournament rules
- Season standings
- Detailed reporting

### Racing experience mode
Built for audience engagement.
- Large-screen display
- Live leaderboard
- Countdown animations
- Racer intros
- Match cards
- Winner callouts
- Stream-friendly layouts

## Recommended modules

### Phase 1: foundation MVP
- Authentication and roles
- Racer profiles
- Car catalog
- Event creation
- Basic tournaments
- 2-lane and 4-lane race entry
- Match and heat tracking
- Basic leaderboards
- Admin dashboard

### Phase 2: live race operations
- Real-time race control dashboard
- Queue management
- Public display screen
- Mobile registration and check-in
- Bracket display
- Manual race official tools
- API integration with Arduino timing system

### Phase 3: community and growth
- Garage profiles
- Location management
- Event discovery
- Online gallery
- Community pages
- Season points
- Awards and prizes
- Historical insights

### Phase 4: advanced integration
- Servo and gate control integration
- Finish line reader telemetry
- Live streaming overlays
- Notifications
- QR scanning flows
- Offline-ready event operation mode

## Suggested core data model

### Accounts
- User
- Role
- Permission
- GarageMembership

### People and garages
- Participant
- RacerProfile
- Garage
- GarageLocation
- Team

### Cars
- Car
- CarCategory
- CarClass
- CarPhoto
- CarModification
- CarOwnership
- CarInspection

### Events and competition
- Event
- EventSession
- EventRegistration
- Division
- Tournament
- Bracket
- Round
- Match
- Heat
- Race
- LaneResult
- Prize
- Award

### Stats and rankings
- RacerSeasonStat
- CarSeasonStat
- Leaderboard
- RankingSnapshot
- PersonalRecord
- GarageStat

### Hardware and live control
- TrackDevice
- TrackConfig
- LaneAssignment
- RaceQueue
- StartSignal
- FinishSignal
- DisplayMessage
- DeviceLog

### Media and community
- GalleryItem
- HighlightClip
- Announcement
- Comment
- HostPage

## Key workflows

### Racer onboarding
1. Create account
2. Join or create garage
3. Register participant profile
4. Add cars to catalog
5. Assign cars to event categories

### Event setup
1. Host creates event
2. Select location and track config
3. Choose event style
4. Open registration
5. Check in racers and cars
6. Generate brackets or qualifying runs

### Live race workflow
1. Official loads next race
2. System assigns lanes
3. Display updates matchup
4. Start gate arms
5. Track starts race
6. Finish line reports times
7. Results saved
8. Winner advances and stats update

### Speed trial workflow
1. Register car and racer
2. Assign time trial session
3. Run one or more attempts
4. Save best time
5. Rank on time leaderboard

## Admin and host tools
- Event setup wizard
- Bulk registration tools
- Manual lane override
- Rerun and penalty management
- Category lock rules
- Race history corrections
- Device diagnostics
- Display control center
- Audit logs

## Live views
- Host control dashboard
- Official timing dashboard
- Racer mobile check-in view
- Public event board
- Bracket board
- Garage profile page
- Leaderboard page
- Car gallery page

## Suggested web app architecture

### Front end
- Responsive web app
- Mobile-first participant and check-in flows
- Tablet-friendly race official dashboard
- Large-screen display mode

### Back end
- REST API or realtime backend
- Event engine for bracket logic
- Stats engine for rankings and season history
- Device integration service for Arduino and lane hardware

### Realtime layer
- WebSockets or realtime subscriptions for:
  - live race queue
  - display updates
  - bracket progression
  - timing results
  - device status

## Feature priorities

### Must-have
- Racer accounts
- Car catalog
- Event creation
- Tournament setup
- Race result capture
- Basic 2-lane and 4-lane support
- Leaderboards
- Host/admin roles

### Should-have
- Garage profiles
- Mobile registration
- Public event pages
- Speed trials
- Live display mode
- Season standings
- Prize tracking

### Nice-to-have
- Stream overlays
- Community feed
- Highlight reels
- map-based event discovery
- advanced telemetry
- sponsorship pages

## Product positioning
This app is not just a bracket tool. It is a race operations system, community platform, car registry, and live event experience layer for Hot Wheels racing.

## Recommended next deliverables
1. Product requirements document
2. Full data model / ERD
3. User roles and permissions matrix
4. Page map and app navigation
5. MVP feature backlog
6. API and hardware integration plan
7. UI wireframes for racer, host, and live display views

