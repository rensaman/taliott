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
  invite_mode     enum(email_invites|shared_link)   # set at creation; immutable thereafter
  join_token      UUID unique?           # populated only when invite_mode = shared_link
  date_range_start date
  date_range_end   date
  part_of_day     enum(morning|afternoon|evening|all)
  timezone        string                 # IANA tz string, e.g. "Europe/Paris"; set at creation
  venue_type      string                 # e.g. "bar", "restaurant"
  deadline        datetime               # stored in UTC
  status          enum(open|locked|finalized)
  final_slot_id   FK → Slot?
  final_venue_id  FK → Venue?            # null when organizer used custom venue details
  final_venue_name    string?            # populated when no Venue row selected (custom venue)
  final_venue_address string?            # populated when no Venue row selected (custom venue)
  created_at      datetime

Participant
  id              UUID PK                # also used as participation token
  event_id        FK → Event
  email           string?                # null until participant registers (shared_link mode only)
  name            string?
  latitude        float?
  longitude       float?
  address_label   string?
  responded_at    datetime?

Slot                                     # generated from Event date range; times stored in UTC
  id              UUID PK
  event_id        FK → Event
  starts_at       datetime               # UTC; convert to Event.timezone for display
  ends_at         datetime               # UTC; convert to Event.timezone for display

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
| GET | /api/join/:joinToken | none | Validate join token; return event name + deadline |
| POST | /api/join/:joinToken | none | Self-register with email (+ optional name); returns participant_id |

---

## Epics & User Stories

---

### Epic 1 — Initiation & Distribution

---

#### US 1.1 — Multi-Day Timeframe Definition

**Story**
As an Organizer I want to define a date range and part-of-day filter so that only relevant time slots are presented to participants.

**Acceptance Criteria**
- [x] Organizer must provide an event name at creation (required field)
- [x] Event name is persisted and returned in the API response
- [x] Event name is displayed in the confirmation screen after creation
- [x] Event name will be shown to participants in emails and on the participation UI (wired in US 1.3 / US 2.x)
- [x] Selecting a date range of N days generates exactly N day columns in the availability grid
- [x] Part-of-day filter (morning / afternoon / evening / all) bounds the hour rows shown
- [x] Edge case: 1-day range renders a single column
- [x] Edge case: range crossing a month boundary renders correctly
- [ ] Organizer must provide a timezone (IANA string, e.g. "Europe/Paris") at creation (required field)
- [ ] Timezone is persisted and returned in all event API responses
- [ ] Slot `starts_at` / `ends_at` are generated in UTC using the event timezone as the reference
- [ ] POST /api/events without timezone returns 400; invalid IANA string returns 400

**Entities touched:** `Event` (name, date_range_start, date_range_end, part_of_day, timezone), `Slot`

**API:** `POST /api/events` — body includes name, date_range_start, date_range_end, part_of_day, timezone; response includes name and generated slots

**UI components:** `DateRangePicker`, `PartOfDaySelector`, `TimezonePicker`, `EventSetupForm`

**Test cases**
- Unit: slot generation function produces correct count for N-day range
- Unit: part-of-day filter maps to correct hour boundaries
- Unit: slot times generated in UTC correctly for a given IANA timezone
- Integration: POST /api/events includes name in request and response
- Integration: POST /api/events without name returns 400
- Integration: POST /api/events without timezone returns 400
- Integration: POST /api/events with invalid timezone string returns 400
- Integration: POST /api/events with 3-day range creates 3×N slots
- Integration: POST /api/events with month-crossing range succeeds
- E2E: organizer fills name → confirmation screen displays it
- E2E: organizer selects date range → grid shows correct columns

---

#### US 1.2 — Hard Voting Deadline

**Story**
As an Organizer I want the event to lock automatically at the deadline so that late changes don't affect the final result.

**Acceptance Criteria**
- [x] Participation link transitions to "Results Only" state at deadline datetime
- [x] Availability grid becomes read-only after deadline
- [x] Organizer receives an automated email when the deadline expires (background worker; stub logs in dev — SMTP wired in prod)
- [x] Admin link still allows finalizing after deadline (finalise endpoint in US 3.3)

**Entities touched:** `Event` (deadline, status → locked)

**API:** `GET /api/participate/:participantId` returns `locked: true` after deadline; `PATCH /api/participate/:participantId/availability` returns 403 when locked; background worker (`deadline-worker.js`) polls every 60 s

**UI components:** `DeadlineBadge`, `ParticipateView` (shows read-only slots + "Results only" banner when locked)

**Test cases**
- Unit: isEventLocked(event) returns true when deadline < now ✓
- Unit: processExpiredEvents locks events and emails organizer ✓
- Integration: GET /api/participate/:id with past deadline returns locked:true ✓
- Integration: PATCH availability on locked event returns 403 ✓
- Integration: deadline expiry triggers email notification job ✓ (unit-level via processExpiredEvents)
- E2E: participant visits link after deadline → sees "Results only" banner ✓

---

#### US 1.3 — Tokenized Email Distribution

**Story**
As an Organizer I want each invitee to receive a unique, passwordless access link so that entry is secure without requiring accounts.

**Acceptance Criteria**
- [x] Each participant receives a distinct UUID-based participation link
- [x] Participation UUIDs are non-sequential (v4)
- [x] Organizer receives a separate admin link with a distinct admin_token
- [x] No two participants share the same token
- [ ] If the organizer's email appears in the participant list, they receive both a confirmation email (admin link) and a participant invite email (participation link); these are two distinct emails with distinct purposes
- [ ] If the organizer's email does not appear in the participant list, they are NOT auto-enrolled as a participant; the UI shows a hint suggesting they add themselves if they want to participate

**Entities touched:** `Event` (admin_token), `Participant` (id used as token)

**API:** `POST /api/events` — accepts organizer email + participant email list; creates one Participant row per email; sends emails

**UI components:** `InviteForm` (email list input, organizer-as-participant hint), `ConfirmationScreen` (shows admin link to organizer)

**Test cases**
- Unit: token generation produces v4 UUIDs ✓
- Integration: POST /api/events with 3 participant emails creates 3 Participant rows with distinct UUIDs ✓
- Integration: each participant UUID differs from admin_token ✓
- Integration: email sending job is queued once per participant ✓
- Integration: POST /api/events where organizer_email is in participant list → organizer receives 2 emails (confirmation + invite)
- Integration: POST /api/events where organizer_email is NOT in participant list → organizer receives only 1 email (confirmation)
- E2E: organizer submits invite form → confirmation screen shows admin link ✓

> **Note:** Organizer email delivery of the admin link is a separate concern handled in US 1.4. The admin_token is currently returned in the API response and displayed on the confirmation screen only.

---

#### US 1.4 — Organizer Confirmation Email

**Story**
As an Organizer I want to receive an email with my admin link after creating an event so that I can return to manage it later without bookmarking the confirmation screen.

**Acceptance Criteria**
- [x] Organizer receives a distinct email (not a participant invite) after event creation
- [x] Email contains a direct link to the admin surface: `APP_BASE_URL/admin/:adminToken`
- [x] Subject clearly identifies the event by name
- [x] Organizer's participant invite (if they are also a participant) is sent separately and is unchanged
- [x] Confirmation screen also displays the full admin URL (not just the raw token)

**Entities touched:** `Event` (admin_token, organizer_email)

**API:** No new endpoints; `POST /api/events` triggers a second email to `organizer_email` via `invite-mailer.js`

**UI components:** `ConfirmationScreen` (show full clickable admin URL)

**Test cases**
- Unit: buildOrganizerConfirmation(event) returns correct subject, to, and admin link in body ✓
- Integration: POST /api/events sends one additional email to organizer_email with admin link ✓
- Integration: organizer confirmation email is distinct from participant invite (different subject / body) ✓
- E2E: organizer creates event → inbox contains a confirmation email with /admin/:adminToken link ✓

---

#### US 1.5 — Invite Mode Selection

**Story**
As an Organizer I want to choose at creation time between sending email invites directly or generating a shareable join link so that I can use whichever distribution channel suits my group.

**Acceptance Criteria**
- [x] `EventSetupForm` presents an invite mode selector: "Send email invites" (default) or "Share a join link"
- [x] When `email_invites` is selected the existing email list input is shown (current behaviour)
- [x] When `shared_link` is selected the email list input is hidden; no `participant_emails` are submitted
- [x] `POST /api/events` accepts `invite_mode` field (`email_invites` | `shared_link`); defaults to `email_invites` when omitted
- [x] When `invite_mode = email_invites`: behaviour is unchanged from US 1.3 / US 1.4
- [x] When `invite_mode = shared_link`: no `Participant` rows are created at event creation time; a `join_token` UUID is generated and stored on the `Event`
- [x] `POST /api/events` response includes `join_url` (`APP_BASE_URL/join/:joinToken`) when mode is `shared_link`
- [x] Confirmation screen displays the `join_url` with a copy button when mode is `shared_link`
- [x] `invite_mode` is immutable after creation (no update endpoint exists; enforced by API design)
- [ ] When `invite_mode = shared_link`: confirmation screen displays a note reminding the organizer to register themselves via the join link if they wish to participate (organizer is not auto-enrolled)

**Entities touched:** `Event` (invite_mode, join_token)

**API:** `POST /api/events` — new optional field `invite_mode`; response gains `join_url` when applicable

**UI components:** `InviteModeSelector`, `EventSetupForm` (conditional email list), `ConfirmationScreen` (conditional join URL display + organizer self-registration reminder)

**Test cases**
- Unit: POST /api/events with invite_mode=shared_link generates a join_token and no participants
- Unit: POST /api/events with invite_mode=email_invites behaves as before (participants created, emails sent)
- Unit: POST /api/events without invite_mode defaults to email_invites
- Integration: POST /api/events with shared_link returns join_url in response
- Integration: POST /api/events with shared_link creates zero Participant rows
- Integration: POST /api/events with invalid invite_mode returns 400
- E2E: organizer selects "Share a join link" → confirmation screen shows join URL → no invite emails sent
- E2E: confirmation screen (shared_link mode) shows self-registration reminder to organizer

---

#### US 1.6 — Self-Registration via Shared Join Link

**Story**
As a Participant I want to register myself by entering my email on the join page so that I can participate without needing a personal email invite.

**Acceptance Criteria**
- [x] `GET /join/:joinToken` renders a join page showing event name and deadline
- [x] Join page shows a form with a required email field and an optional name field
- [x] Submitting the form with a valid email creates a `Participant` row (or returns the existing one for that email + event, making registration idempotent)
- [x] After successful registration the participant is redirected to `/participate/:participantId`
- [x] The system sends a confirmation email to the participant containing their personal participation link (so they can return later)
- [x] `GET /join/:joinToken` with an unknown token returns 404
- [x] `GET /join/:joinToken` on a locked or finalized event returns a "voting closed" page (no registration allowed)
- [x] `POST /api/join/:joinToken` on a locked or finalized event returns 403
- [x] Email is validated (format check) before the Participant row is created; invalid email returns 400
- [ ] When a new (previously unseen) participant registers via the join link, the organizer receives a notification email naming the participant and linking to the admin dashboard
- [ ] Re-registration of an existing email does NOT trigger a second organizer notification

**Entities touched:** `Event` (join_token, invite_mode, status), `Participant` (email, name)

**API:**
- `GET /api/join/:joinToken` — returns `{name, deadline, status}` or 404
- `POST /api/join/:joinToken` — body `{email, name?}`; creates or retrieves Participant; returns `{participant_id}`; sends confirmation email

**UI components:** `JoinView` (email + name form), `JoinClosedView` (locked/finalized state)

**Test cases**
- Integration: GET /api/join/:joinToken returns event name and deadline for valid token
- Integration: GET /api/join/:joinToken with unknown token returns 404
- Integration: POST /api/join/:joinToken creates a Participant and returns participant_id
- Integration: POST /api/join/:joinToken with same email twice returns the same participant_id (idempotent)
- Integration: POST /api/join/:joinToken on locked event returns 403
- Integration: POST /api/join/:joinToken with invalid email returns 400
- Integration: POST /api/join/:joinToken sends confirmation email with participation link
- Integration: POST /api/join/:joinToken (new participant) sends organizer a notification email
- Integration: POST /api/join/:joinToken (same email twice) does NOT send a second organizer notification
- E2E: participant opens join URL → enters email → is redirected to participate view
- E2E: same participant re-registers with same email → lands on same participate view

---

#### US 1.7 — Link Recovery

**Story**
As an Organizer or Participant I want to retrieve my personal link by entering my email so that I am not permanently locked out if I lose the original email.

**Acceptance Criteria**
- [ ] A "Resend my link" page is reachable from the home page and from any 404/access-denied state
- [ ] Page shows a single email input field and a submit button
- [ ] On submit, if the email matches an organizer: the admin link is re-sent to that address (one email per matching event)
- [ ] On submit, if the email matches one or more participant records (email_invites mode): the participation link is re-sent for each matching event
- [ ] On submit, if the email matches a shared_link participant: the participation link is re-sent
- [ ] If the email matches nothing, the response is still 200 (no user enumeration) but no email is sent
- [ ] The resend operation is rate-limited (max 3 requests per email per 15 minutes) to prevent abuse
- [ ] Confirmation message shown after submit: "If we found a matching event, we've sent the link to your inbox"

**Entities touched:** `Event` (organizer_email, admin_token), `Participant` (email, id)

**API:**
- `POST /api/resend-link` — body: `{email}`; always returns 200; triggers email(s) asynchronously

**UI components:** `ResendLinkView` (email form + confirmation message)

**Test cases**
- Integration: POST /api/resend-link with organizer email → admin link email sent
- Integration: POST /api/resend-link with participant email (email_invites) → participation link email sent
- Integration: POST /api/resend-link with participant email (shared_link) → participation link email sent
- Integration: POST /api/resend-link with unknown email → 200, no email sent
- Integration: POST /api/resend-link exceeding rate limit → 429
- E2E: organizer loses admin link → uses "Resend my link" → receives admin link in inbox
- E2E: participant loses invite → uses "Resend my link" → receives participation link in inbox

---

### Epic 2 — The Response Experience

---

#### US 2.1 — Geocoded Location Entry

**Story**
As a Participant I want to search for my address so that my location is resolved to coordinates without manual entry.

**Acceptance Criteria**
- [x] Fuzzy search triggers after 3 characters typed
- [x] Geocoding calls are debounced (≥300 ms)
- [x] Selecting a result places a draggable pin on the map
- [x] Dragging the pin updates the stored coordinates
- [x] Coordinates are saved to the participant record on selection or drag-end

**Entities touched:** `Participant` (latitude, longitude, address_label)

**API:** `GET /api/geocode?q=` (proxied to external geocoding service); `PATCH /api/participate/:id/location`

**UI components:** `AddressSearchInput`, `LocationMap`, `DraggablePin`

**Test cases**
- Unit: debounce utility fires once after 300 ms of inactivity ✓
- Unit: geocode response is mapped to {lat, lng, label} ✓
- Integration: PATCH /api/participate/:id/location updates lat/lng ✓
- Integration: GET /api/geocode proxies and returns results ✓
- E2E: participant types address → selects result → pin appears on map → coordinates saved ✓

---

#### US 2.2 — Tri-State Availability Grid

**Story**
As a Participant I want to toggle slot preferences across Yes / Maybe / No / Neutral so that I can express nuanced availability.

**Acceptance Criteria**
- [x] Cell cycle on click: Neutral → Yes → Maybe → No → Neutral
- [x] Each state is visually distinct (color/icon)
- [x] State changes are auto-saved asynchronously with a visible status indicator (saving… / saved)
- [x] Batch saves are debounced to avoid per-keystroke requests
- [x] A "Mark as done" button lets the participant explicitly confirm their response; clicking it sets `responded_at` and changes the label to "✓ Submitted — update response"
- [x] Participants who have already responded see the "✓ Submitted" label on load
- [x] The confirm button is hidden when the event is locked

**Entities touched:** `Availability` (state), `Participant` (responded_at)

**API:**
- `PATCH /api/participate/:id/availability` — body: array of {slot_id, state}
- `PATCH /api/participate/:id/confirm` — sets `responded_at`; returns 403 if locked

**UI components:** `AvailabilityGrid`, `SlotCell`, `SaveStatusIndicator`, confirm button in `ParticipateView`

**Test cases**
- Unit: cell state machine cycles Neutral→Yes→Maybe→No→Neutral ✓
- Unit: debounced save batches multiple rapid changes into one call ✓
- Unit: "Mark as done" button shown on open event; hidden when locked ✓
- Unit: button label switches to "✓ Submitted" after clicking ✓
- Unit: already-responded participant sees "✓ Submitted" label on load ✓
- Integration: PATCH /api/participate/:id/availability upserts correct states ✓
- Integration: invalid state value returns 400 ✓
- Integration: PATCH /api/participate/:id/confirm sets responded_at ✓
- Integration: confirm returns 403 when event is locked ✓
- E2E: participant clicks cells → states cycle → "saved" indicator appears ✓

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

#### US 3.0 — Admin Dashboard Shell

**Story**
As an Organizer I want a dedicated admin page accessible via my secret link so that I can track who has responded and prepare to finalize the event.

**Acceptance Criteria**
- [x] `GET /admin/:adminToken` renders the organizer dashboard (returns 404 for unknown tokens)
- [x] Dashboard shows event name, deadline, and current status (open / locked / finalized)
- [x] Participant list displays each invitee's email and whether they have responded
- [x] Response count summary is shown (e.g. "3 of 5 responded")
- [x] Admin token in the URL is the sole auth mechanism — no session or login required
- [x] Navigating to `/admin/:adminToken` directly works (deep-link, no redirect to home)

**Entities touched:** `Event` (admin_token, status, deadline), `Participant` (responded_at)

**API:** `GET /api/events/:adminToken` — returns event details, participant list with responded_at, and slot count; returns 404 if token unknown

**UI components:** `AdminView`, `ParticipantResponseList`, `EventStatusBadge`

**Test cases**
- Integration: GET /api/events/:adminToken returns event name, deadline, status, participants
- Integration: GET /api/events/:adminToken with unknown token returns 404
- Integration: responded_at is set when participant clicks "Mark as done" (PATCH /confirm)
- Unit: AdminView renders event name and participant count
- Unit: ParticipantResponseList marks responded vs pending correctly
- E2E: organizer clicks admin link from confirmation screen → dashboard loads with correct event data
- E2E: unknown admin token → 404 page shown

---

#### US 3.1 — Geographic Centroid Calculation

**Story**
As an Organizer I want to see the mathematically fairest meeting point so that no participant is unreasonably disadvantaged.

**Acceptance Criteria**
- [x] Fair Center = arithmetic mean of (latitude, longitude) of all participants who have provided a location
- [x] Map adjusts bounds to fit all participant pins and the center marker
- [x] Participants with no location set are excluded from the calculation
- [x] Displays count of participants included in calculation

**Entities touched:** `Participant` (lat/lng), computed centroid (not persisted until finalization)

**API:** Centroid computed server-side; exposed via admin dashboard endpoint `GET /api/events/:adminToken`

**UI components:** `GroupMap`, `CentroidMarker`, `CoverageCounter`

**Test cases**
- Unit: centroid({[0,0],[2,2]}) → {lat:1, lng:1} ✓
- Unit: participants missing lat/lng are excluded ✓
- Integration: GET /api/events/:adminToken returns centroid object ✓
- E2E: organizer admin view shows centroid marker on map ✓

---

#### US 3.2 — Contextual Venue Recommendations

**Story**
As an Organizer I want venue suggestions near the fair center so that I can pick a real place without leaving the app.

**Acceptance Criteria**
- [x] Venue search uses venue_type from event config and fair center coordinates
- [x] Results are ranked by (distance from centroid ASC, rating DESC)
- [x] Each venue card shows name, distance, rating, and a map pin
- [x] Venue list refreshes if organizer changes the venue type filter

**Entities touched:** `Venue` (fetched + cached), `Event` (venue_type)

**API:** `GET /api/events/:adminToken/venues` — calls external places API, caches results in Venue table

**UI components:** `VenueList`, `VenueCard`, `VenueTypeFilter`

**Test cases**
- Unit: venue sorter orders by distance then rating ✓
- Integration: GET /api/events/:adminToken/venues calls external API with correct params ✓
- Integration: second call returns cached venues (no external API call) ✓
- E2E: organizer admin view shows venue cards; changing venue type filter refreshes list ✓

---

#### US 3.3 — Transactional Finalization & ICS Generation

**Story**
As an Organizer I want to confirm the final time and venue so that the system notifies everyone and sends calendar files.

**Acceptance Criteria**
- [x] Organizer selects a slot and either a recommended venue OR enters custom venue details before finalizing
- [x] POST /finalize sets Event.status to "finalized"
- [ ] POST /finalize body accepts `{slot_id, venue_id}` OR `{slot_id, venue_name, venue_address}` (custom venue); exactly one venue form must be provided, otherwise 400
- [ ] When a recommended venue is selected: `final_slot_id` and `final_venue_id` are stored
- [ ] When a custom venue is entered: `final_slot_id`, `final_venue_name`, and `final_venue_address` are stored; `final_venue_id` remains null
- [x] All further edits to availability or location are blocked after finalization
- [x] System generates a valid .ics file (correct DTSTART, DTEND, LOCATION, SUMMARY)
- [ ] ICS DTSTART and DTEND use the event's timezone (TZID property set to Event.timezone); times are not rendered as UTC floating times
- [x] Each participant receives a notification email with the .ics file attached
- [x] Organizer receives the same email
- [ ] After finalization, `GET /api/participate/:participantId` returns the final slot and venue details (name + address) so participants can view the decision in their participation URL even if they lose the ICS email

**Entities touched:** `Event` (status → finalized, final_slot_id, final_venue_id, final_venue_name, final_venue_address)

**API:**
- `POST /api/events/:adminToken/finalize` — body: `{slot_id, venue_id}` or `{slot_id, venue_name, venue_address}`; triggers notification worker
- `GET /api/participate/:participantId` — response includes `finalSlot` and `finalVenue` when event is finalized

**UI components:** `FinalizePanel`, `SlotPicker` (admin), `VenuePicker` (admin, toggle between recommended/custom), `FinalizedBanner` (participant view, shows final slot + venue)

**Test cases**
- Unit: generateICS({slot, venue, timezone}) returns valid iCal string
- Unit: ICS contains correct DTSTART, DTEND, LOCATION, SUMMARY fields
- Unit: ICS DTSTART/DTEND include TZID matching Event.timezone
- Integration: POST /finalize with venue_id sets final_venue_id, null final_venue_name
- Integration: POST /finalize with venue_name+venue_address sets final_venue_name+address, null final_venue_id
- Integration: POST /finalize with both venue_id and venue_name returns 400
- Integration: POST /finalize with neither venue_id nor venue_name returns 400
- Integration: POST /finalize sets status to finalized
- Integration: POST /finalize on already-finalized event returns 409
- Integration: PATCH availability after finalization returns 403
- Integration: notification jobs are enqueued for all participants + organizer
- Integration: GET /api/participate/:id on finalized event returns finalSlot and finalVenue fields
- E2E: organizer clicks Finalize with custom venue → confirmation shown → participant view becomes read-only and shows final slot + venue
- E2E: organizer clicks Finalize → confirmation shown → participant view becomes read-only
