# taliott — Product Spec

## Vision

Automate the logistics of finding the best time and location for a group gathering. No accounts for participants. Minimal steps.

**Design Pillars (priority order)**
1. Frictionless UI — no accounts for participants, fewest possible steps
2. Geographical Optimization — calculate a fair center from home addresses
3. Timeframe Matching — visual availability overlap
4. Venue Discovery — smart recommendations near the group center

---

## Personas

| ID | Name | Role | Core Need |
|----|------|------|-----------|
| P-ORG | Alex | Organizer — initiates the event | Dashboard to track responses; one-click finalization |
| P-PAR | Jamie | Participant — receives invite link | Mobile-friendly link to submit availability; no account |

> Note: The Organizer is also a Participant in their own event.

---

## Domain Model

```
Event
  id              UUID PK
  name            string                 # human-readable title shown in emails and UI
  slug            string unique          # human-readable short id
  organizer_email string
  admin_token     UUID unique            # secret link for organizer
  date_range_start date
  date_range_end   date
  part_of_day     enum(morning|afternoon|evening|all)
  venue_type      string                 # e.g. "bar", "restaurant"
  deadline        datetime
  status          enum(open|locked|finalized)
  final_slot_id   FK → Slot?
  final_venue_id  FK → Venue?
  created_at      datetime

Participant
  id              UUID PK                # also used as participation token
  event_id        FK → Event
  email           string
  name            string?
  latitude        float?
  longitude       float?
  address_label   string?
  responded_at    datetime?

Slot                                     # generated from Event date range
  id              UUID PK
  event_id        FK → Event
  starts_at       datetime
  ends_at         datetime

Availability
  id              UUID PK
  participant_id  FK → Participant
  slot_id         FK → Slot
  state           enum(yes|maybe|no|neutral)
  updated_at      datetime

Venue                                    # fetched from external API, cached
  id              UUID PK
  event_id        FK → Event
  external_id     string
  name            string
  latitude        float
  longitude       float
  rating          float?
  distance_m      int?
```

---

## API Surface (planned)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/events | none | Create event; returns admin_token + participant tokens |
| GET | /api/events/:adminToken | admin token | Organizer dashboard data |
| POST | /api/events/:adminToken/finalize | admin token | Lock event, trigger notifications |
| GET | /api/participate/:participantId | participant token | Load participant view |
| PATCH | /api/participate/:participantId/location | participant token | Save geocoded location |
| PATCH | /api/participate/:participantId/availability | participant token | Batch-save availability states |
| GET | /api/events/:adminToken/venues | admin token | Fetch venue recommendations |
| GET | /api/geocode?q= | none | Proxy geocoding search |

---

## Epics & User Stories

---

### Epic 1 — Initiation & Distribution

---

#### US 1.1 — Multi-Day Timeframe Definition

**Story**
As an Organizer I want to define a date range and part-of-day filter so that only relevant time slots are presented to participants.

**Acceptance Criteria**
- [ ] Organizer must provide an event name at creation (required field)
- [ ] Event name is persisted and returned in the API response
- [ ] Event name is displayed in the confirmation screen after creation
- [ ] Event name will be shown to participants in emails and on the participation UI (wired in US 1.3 / US 2.x)
- [ ] Selecting a date range of N days generates exactly N day columns in the availability grid
- [ ] Part-of-day filter (morning / afternoon / evening / all) bounds the hour rows shown
- [ ] Edge case: 1-day range renders a single column
- [ ] Edge case: range crossing a month boundary renders correctly

**Entities touched:** `Event` (name, date_range_start, date_range_end, part_of_day), `Slot`

**API:** `POST /api/events` — body includes name, date_range_start, date_range_end, part_of_day; response includes name and generated slots

**UI components:** `DateRangePicker`, `PartOfDaySelector`, `EventSetupForm`

**Test cases**
- Unit: slot generation function produces correct count for N-day range
- Unit: part-of-day filter maps to correct hour boundaries
- Integration: POST /api/events includes name in request and response
- Integration: POST /api/events without name returns 400
- Integration: POST /api/events with 3-day range creates 3×N slots
- Integration: POST /api/events with month-crossing range succeeds
- E2E: organizer fills name → confirmation screen displays it
- E2E: organizer selects date range → grid shows correct columns

---

#### US 1.2 — Hard Voting Deadline

**Story**
As an Organizer I want the event to lock automatically at the deadline so that late changes don't affect the final result.

**Acceptance Criteria**
- [ ] Participation link transitions to "Results Only" state at deadline datetime
- [ ] Availability grid becomes read-only after deadline
- [ ] Organizer receives an automated email when the deadline expires
- [ ] Admin link still allows finalizing after deadline

**Entities touched:** `Event` (deadline, status → locked)

**API:** Background worker checks `Event.deadline`; `GET /api/participate/:participantId` returns `locked: true` after deadline

**UI components:** `DeadlineBadge`, `ReadOnlyGrid` (locked state of availability grid)

**Test cases**
- Unit: isEventLocked(event) returns true when deadline < now
- Integration: GET /api/participate/:id with past deadline returns locked:true
- Integration: PATCH availability on locked event returns 403
- Integration: deadline expiry triggers email notification job
- E2E: participant visits link after deadline → grid is read-only

---

#### US 1.3 — Tokenized Email Distribution

**Story**
As an Organizer I want each invitee to receive a unique, passwordless access link so that entry is secure without requiring accounts.

**Acceptance Criteria**
- [ ] Each participant receives a distinct UUID-based participation link
- [ ] Participation UUIDs are non-sequential (v4)
- [ ] Organizer receives a separate admin link with a distinct admin_token
- [ ] No two participants share the same token

**Entities touched:** `Event` (admin_token), `Participant` (id used as token)

**API:** `POST /api/events` — accepts organizer email + participant email list; creates one Participant row per email; sends emails

**UI components:** `InviteForm` (email list input), `ConfirmationScreen` (shows admin link to organizer)

**Test cases**
- Unit: token generation produces v4 UUIDs
- Integration: POST /api/events with 3 participant emails creates 3 Participant rows with distinct UUIDs
- Integration: each participant UUID differs from admin_token
- Integration: email sending job is queued once per participant
- E2E: organizer submits invite form → confirmation screen shows admin link

---

### Epic 2 — The Response Experience

---

#### US 2.1 — Geocoded Location Entry

**Story**
As a Participant I want to search for my address so that my location is resolved to coordinates without manual entry.

**Acceptance Criteria**
- [ ] Fuzzy search triggers after 3 characters typed
- [ ] Geocoding calls are debounced (≥300 ms)
- [ ] Selecting a result places a draggable pin on the map
- [ ] Dragging the pin updates the stored coordinates
- [ ] Coordinates are saved to the participant record on selection or drag-end

**Entities touched:** `Participant` (latitude, longitude, address_label)

**API:** `GET /api/geocode?q=` (proxied to external geocoding service); `PATCH /api/participate/:id/location`

**UI components:** `AddressSearchInput`, `LocationMap`, `DraggablePin`

**Test cases**
- Unit: debounce utility fires once after 300 ms of inactivity
- Unit: geocode response is mapped to {lat, lng, label}
- Integration: PATCH /api/participate/:id/location updates lat/lng
- Integration: GET /api/geocode proxies and returns results
- E2E: participant types address → selects result → pin appears on map → coordinates saved

---

#### US 2.2 — Tri-State Availability Grid

**Story**
As a Participant I want to toggle slot preferences across Yes / Maybe / No / Neutral so that I can express nuanced availability.

**Acceptance Criteria**
- [ ] Cell cycle on click: Neutral → Yes → Maybe → No → Neutral
- [ ] Each state is visually distinct (color/icon)
- [ ] State changes are auto-saved asynchronously with a visible status indicator (saving… / saved)
- [ ] Batch saves are debounced to avoid per-keystroke requests

**Entities touched:** `Availability` (state)

**API:** `PATCH /api/participate/:id/availability` — body: array of {slot_id, state}

**UI components:** `AvailabilityGrid`, `SlotCell`, `SaveStatusIndicator`

**Test cases**
- Unit: cell state machine cycles Neutral→Yes→Maybe→No→Neutral
- Unit: debounced save batches multiple rapid changes into one call
- Integration: PATCH /api/participate/:id/availability upserts correct states
- Integration: invalid state value returns 400
- E2E: participant clicks cells → states cycle → "saved" indicator appears

---

#### US 2.3 — Real-Time Group Insight

**Story**
As a Participant I want to see the group heatmap and fair center update live as others respond.

**Acceptance Criteria**
- [ ] Availability heatmap color intensity reflects the count of "yes" responses per slot
- [ ] "Estimated Meetup Area" map marker recalculates when any participant updates their location
- [ ] Updates propagate to all open participant views without a page refresh (WebSocket or SSE)

**Entities touched:** `Availability`, `Participant` (lat/lng), computed centroid

**API:** WebSocket or SSE endpoint for event-scoped updates; server pushes on Availability/Participant change

**UI components:** `HeatmapGrid`, `GroupMap`, `CentroidMarker`

**Test cases**
- Unit: heatmap color mapper returns correct intensity for given yes-count / total-participant ratio
- Unit: centroid calculation averages all active coordinate pairs
- Integration: updating availability triggers a broadcast to subscribed clients
- Integration: updating a participant location triggers centroid recalculation broadcast
- E2E: two participants open simultaneously → one changes slot → other sees heatmap update without refresh

---

### Epic 3 — Smart Aggregation & Finalization

---

#### US 3.1 — Geographic Centroid Calculation

**Story**
As an Organizer I want to see the mathematically fairest meeting point so that no participant is unreasonably disadvantaged.

**Acceptance Criteria**
- [ ] Fair Center = arithmetic mean of (latitude, longitude) of all participants who have provided a location
- [ ] Map adjusts bounds to fit all participant pins and the center marker
- [ ] Participants with no location set are excluded from the calculation
- [ ] Displays count of participants included in calculation

**Entities touched:** `Participant` (lat/lng), computed centroid (not persisted until finalization)

**API:** Centroid computed server-side; exposed via admin dashboard endpoint `GET /api/events/:adminToken`

**UI components:** `GroupMap`, `CentroidMarker`, `CoverageCounter`

**Test cases**
- Unit: centroid({[0,0],[2,2]}) → {lat:1, lng:1}
- Unit: participants missing lat/lng are excluded
- Integration: GET /api/events/:adminToken returns centroid object
- E2E: organizer admin view shows centroid marker on map

---

#### US 3.2 — Contextual Venue Recommendations

**Story**
As an Organizer I want venue suggestions near the fair center so that I can pick a real place without leaving the app.

**Acceptance Criteria**
- [ ] Venue search uses venue_type from event config and fair center coordinates
- [ ] Results are ranked by (distance from centroid ASC, rating DESC)
- [ ] Each venue card shows name, distance, rating, and a map pin
- [ ] Venue list refreshes if organizer changes the venue type filter

**Entities touched:** `Venue` (fetched + cached), `Event` (venue_type)

**API:** `GET /api/events/:adminToken/venues` — calls external places API, caches results in Venue table

**UI components:** `VenueList`, `VenueCard`, `VenueTypeFilter`

**Test cases**
- Unit: venue sorter orders by distance then rating
- Integration: GET /api/events/:adminToken/venues calls external API with correct params
- Integration: second call returns cached venues (no external API call)
- E2E: organizer admin view shows venue cards; changing venue type filter refreshes list

---

#### US 3.3 — Transactional Finalization & ICS Generation

**Story**
As an Organizer I want to confirm the final time and venue so that the system notifies everyone and sends calendar files.

**Acceptance Criteria**
- [ ] Organizer selects a slot and a venue (or enters custom details) before finalizing
- [ ] POST /finalize sets Event.status to "finalized" and stores final_slot_id + final_venue_id
- [ ] All further edits to availability or location are blocked after finalization
- [ ] System generates a valid .ics file (correct DTSTART, DTEND, LOCATION, SUMMARY)
- [ ] Each participant receives a notification email with the .ics file attached
- [ ] Organizer receives the same email

**Entities touched:** `Event` (status → finalized, final_slot_id, final_venue_id)

**API:** `POST /api/events/:adminToken/finalize` — body: {slot_id, venue_id}; triggers notification worker

**UI components:** `FinalizePanel`, `SlotPicker` (admin), `VenuePicker` (admin)

**Test cases**
- Unit: generateICS({slot, venue}) returns valid iCal string
- Unit: ICS contains correct DTSTART, DTEND, LOCATION, SUMMARY fields
- Integration: POST /finalize sets status to finalized
- Integration: POST /finalize on already-finalized event returns 409
- Integration: PATCH availability after finalization returns 403
- Integration: notification jobs are enqueued for all participants + organizer
- E2E: organizer clicks Finalize → confirmation shown → participant view becomes read-only
