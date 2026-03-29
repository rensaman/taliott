# Admin Screen & Finalization — Review Backlog

**Reviewed:** 2026-03-29
**Scope:** `AdminView` → `FinalizePanel` / `FinalizedSummary` → `POST /api/events/:adminToken/finalize` + all sub-components (`SlotScoreCard`, `VenueList`, `VenueCard`, `VenueTypeFilter`, `ParticipantResponseList`, `GroupMap`) and the full `backend/src/routes/events.js`.

---

## SECURITY

### SEC-1 — HIGH: No rate limiting on finalize and delete routes
`backend/src/routes/events.js:315,414` — `POST /:adminToken/finalize` and `DELETE /:adminToken` have no rate limiter. While `eventsRouter` does sit behind the global limiter, these heavy endpoints (one triggers email sends + DB writes, the other is irreversible) have no per-route throttle.
**Fix:** Apply a tight per-IP write limiter (e.g. 10 req/min) to both routes, similar to how the participate route was tightened.

### SEC-2 — HIGH: No CSRF protection on state-mutating POSTs
`POST /api/events/:adminToken/finalize` and `DELETE /api/events/:adminToken` rely solely on the admin UUID in the URL as authorization. A CSRF attack from a different origin could trigger finalization or deletion if the admin is logged in (cookies/session) or if CORS is misconfigured.
**Fix:** Require a `Content-Type: application/json` check (already present for finalize) and verify `Origin`/`Referer` headers on mutations, or add a CSRF token header.

### SEC-3 — LOW: Event delete is a hard, irreversible cascade
`events.js:431` — `event.delete` cascades to all related records with no soft-delete or archival. An accidental or malicious delete is unrecoverable without a DB backup.
**Fix:** Add a soft-delete (`deletedAt` timestamp) and a 24 h grace period, or at minimum log the full event JSON before deletion.

---

## CODE QUALITY

### CQ-1 — HIGH: Hardcoded English fallback in finalize error handler
`FinalizePanel.jsx:50` — `setError(data.error || 'Finalization failed')` uses a bare English string as the fallback, bypassing i18n. If the backend returns no `error` field the user sees untranslated text.
**Fix:** Replace with `t('finalize.errorGeneric')` and add the key to all locale files.

### CQ-2 — MEDIUM: `useEffect` in FinalizePanel missing `slotId` dependency
`FinalizePanel.jsx:13–17` — the effect reads `slotId` (as a guard) but only lists `[slots]` in its deps. ESLint exhaustive-deps would flag this. While benign today (the guard only prevents a double-set), adding logic to the effect later risks stale-closure bugs.
**Fix:** Add `slotId` to the dependency array; the guard still prevents the double-set.

### CQ-3 — MEDIUM: VenueList uses eslint-disable instead of stabilising the callback ref
`VenueList.jsx:54` — `// eslint-disable-next-line react-hooks/exhaustive-deps` suppresses the warning about `onSelectVenue` missing from deps. The intent is correct (avoid re-fetching when the parent re-renders), but the right fix is to store the callback in a `useRef` and call `callbackRef.current?.()` inside the effect.
**Fix:** Replace the disable comment with a `useRef`-wrapped callback.

### CQ-4 — MEDIUM: Error state in AdminView renders with no page chrome
`AdminView.jsx:93` — `if (error) return <p role="alert">{error}</p>;` shows a bare paragraph with no header, footer, or navigation. A failed load leaves the user stranded.
**Fix:** Render a minimal error layout (header + error message + retry button) consistent with other error views in the app.

### CQ-5 — MEDIUM: Dead variable in `makeVenuePinIcon`
`GroupMap.jsx:43` — `const border = selected ? '#1a1a1a' : '#1a1a1a';` — both branches produce the same value. The variable is unused as a distinguishing factor.
**Fix:** Remove the ternary; use a plain `const border = '#1a1a1a'` or inline the value.

### CQ-6 — LOW: Hidden `slot-availability` list is kept "for test compatibility"
`ParticipantResponseList.jsx:39–51` — a `display:none` `<ul data-testid="slot-availability">` duplicates all availability data already rendered in the dot indicators. The comment acknowledges it is only there for tests.
**Fix:** Update the affected tests to query the visible dot elements, then remove the hidden list.

### CQ-7 — LOW: `loadDashboard` fetch has no AbortController for unmount cleanup
`AdminView.jsx:39–47` — if the component unmounts while the initial fetch is in flight (e.g. user navigates away quickly), `setData` / `setError` are called on an unmounted component. React 18 suppresses the warning but the state update is wasted work.
**Fix:** Create an `AbortController` in the effect and call `controller.abort()` in the cleanup function; pass `signal` to `fetch`.

### CQ-8 — LOW: `FinalizedSummary` borrows a translation key from the `finalize` namespace
`FinalizedSummary.jsx:28` — `t('finalize.venueLegend')` is used inside the `admin` screen's summary component. Cross-namespace key borrowing creates implicit coupling.
**Fix:** Add a `admin.finalizedVenueLabel` key with the same text, or extract the key to a shared namespace.

### CQ-9 — LOW: Dead CSS from a replaced native `<select>` for slot selection
`AdminView.css:310–338` — `.slot-select-row`, `.form-label`, `.slot-native-select` are defined but no longer referenced in any JSX after the slot selection was replaced by `SlotScoreCard` clicks.
**Fix:** Delete the three dead rule blocks.

---

## UX

### UX-1 — HIGH: No confirmation step before irreversible finalization
`FinalizePanel.jsx:25–60` — clicking "Finalize Event" immediately calls the API. Finalization is irreversible (status change, emails sent to all participants). There is no "are you sure?" prompt.
**Fix:** Add a confirmation modal (or inline review step) summarising the chosen slot, venue, duration, and notes, with a "Confirm & Send" button.

### UX-2 — HIGH: Finalize button enabled when custom venue name is empty
`FinalizePanel.jsx:181` — `disabled={loading || !slotId}` — when `venueMode === 'custom'` and `venueName` is blank the button is still active. The backend will return a 400, meaning the organizer hits an error after clicking. Client-side validation should mirror the backend rule.
**Fix:** Add `|| (venueMode === 'custom' && !venueName.trim())` to the `disabled` condition and show an inline hint near the name field.

### UX-3 — MEDIUM: After finalization the thank-you screen has no route back to the finalized event
`AdminView.jsx:79–91` — the `justFinalized` screen shows only a "Go home" button. The organizer may want to copy the event details or verify the summary immediately after.
**Fix:** Add a secondary link "View finalized event" that navigates to the same admin URL (which will now show `FinalizedSummary`), i.e. reload the current admin page without `justFinalized=true`.

### UX-4 — MEDIUM: Default duration of 30 minutes is too short for most gatherings
`FinalizePanel.jsx:20` — `useState('30')` defaults to 30 minutes. Most social or work meetups run 60–120 minutes; 30 will generate incorrect ICS calendar entries for the majority of events.
**Fix:** Change the default to `'60'`.

### UX-5 — MEDIUM: Venue pins on the map have no tooltip or hover label
`GroupMap.jsx:84–92` — venue `<Marker>` elements have no `<Tooltip>` child. The organizer must cross-reference the numbered pin against the venue list to know which venue is which.
**Fix:** Add `<Tooltip>{v.name}</Tooltip>` inside each venue `<Marker>` (same pattern used for participant markers).

### UX-6 — MEDIUM: No legend for the availability dot colour coding
`ParticipantResponseList.jsx` / `AdminView.css:215–219` — green/amber/red/grey dots appear with no key. First-time users have no way to learn what the colours mean without trial and error.
**Fix:** Add a compact inline legend (e.g. `✓ yes  ? maybe  ✗ no`) above the first participant row, or as a `<caption>` / `title` attribute on the dot container.

### UX-7 — LOW: Event delete confirmation uses `window.confirm` — unstyled and jarring
`AdminView.jsx:65` — `window.confirm(t('admin.deleteConfirm'))` opens a browser-native modal that ignores the app's design system and can be auto-dismissed in some browser environments.
**Fix:** Replace with a styled in-page confirmation dialog that also requires the user to type the event name or click a clearly destructive button.

### UX-8 — LOW: No "copy join link" affordance for shared-link events
The admin dashboard shows participant emails but provides no way to copy or re-share the join URL for `shared_link` events. An organiser who wants to re-invite new members must dig it out of the creation email.
**Fix:** Show the join URL in the admin header or meta bar for shared-link events, with a one-click copy button.

### UX-9 — LOW: Auto-selected single slot not communicated to the organizer
`FinalizePanel.jsx:13–17` — when `slots.length === 1`, the slot is silently pre-selected. The organizer sees a "selected" card but may not understand why; they might think they need to take an action.
**Fix:** Add a small hint label "Only one time slot — automatically selected" when there is exactly one slot.

### UX-10 — LOW: Tied slot scores are ranked arbitrarily without a tie indicator
`AdminView.jsx:26` — `scoreSlots` sorts by `yes*2 + maybe`. Slots with identical scores are ordered by array insertion, not communicated as tied. The organiser may pick slot #1 not realising it's tied with #2.
**Fix:** When two or more adjacent scored slots have the same score, show a "TIE" indicator rather than different rank numbers.

### UX-11 — LOW: Selecting a venue from the list doesn't reset venue mode to "recommended"
`FinalizePanel.jsx` — if the organizer switched to "custom" mode, then clicks a venue in the list, the venue selection in `AdminView` updates (`selectedVenue`) but `venueMode` stays `'custom'`. The selected venue is silently ignored at submit time.
**Fix:** When `selectedVenue` changes (via `onSelectVenue`) and `venueMode` is `'custom'`, switch `venueMode` back to `'recommended'`; or surface a visible notice "Switch to Recommended to use this venue."

---

## UI

### UI-1 — HIGH: Notes textarea content loses line breaks on display
`FinalizedSummary.jsx:40–43` — `finalNotes` is rendered in a `<dd>` with no `white-space` override. Newlines entered in the `<textarea>` are collapsed by the browser.
**Fix:** Add `style={{ whiteSpace: 'pre-line' }}` (or a CSS class) to the `<dd>` that renders `finalNotes`.

### UI-2 — MEDIUM: Map and venue list remain fully visible after finalization
`AdminView.jsx:116–136` — the map+venue band and `VenueList` are always rendered regardless of event status. After finalization the organizer no longer needs to browse venues; the section adds visual noise alongside `FinalizedSummary`.
**Fix:** Hide or collapse the venue-browsing band when `data.status === 'finalized'` (the map showing participant positions may still be useful, so consider keeping a compact map-only view).

### UI-3 — MEDIUM: Rank number shown even for single-slot events
`SlotScoreCard.jsx:23` — `<span className="slot-score-rank">#{rank}</span>` — when there's only one slot the rank "#1" is meaningless and wastes visual space.
**Fix:** Conditionally hide `slot-score-rank` when `displayedSlots.length === 1`.

### UI-4 — MEDIUM: No visual cue linking "no venue selected" display to the venue list above
`FinalizePanel.jsx:112–118` — the "No venue selected" callout in the finalize section is visually isolated; there's no arrow, label, or reference pointing the organizer to the venue list above it.
**Fix:** Add instructional copy, e.g. "Select a venue from the list above, or switch to Custom." Alternatively link the callout text to the venue list section with an anchor.

### UI-5 — LOW: `.venue-card-block--selected .venue-card-number` applies no visual change
`AdminView.css:508–510` — the selected modifier re-declares `background: var(--ink)` but the unselected state already uses `background: var(--ink)` (line 495). The rule exists but produces no visible difference.
**Fix:** Either differentiate the selected state (e.g. inverted colours) or remove the dead selector.

### UI-6 — LOW: Inline `style` props in VenueList break the CSS-class convention
`VenueList.jsx:64–68` — loading/error/empty states use `style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}` inline, while the rest of the file (and codebase) uses CSS classes.
**Fix:** Extract these states into named CSS classes in `AdminView.css`.

### UI-7 — LOW: Map `<div>` wrapper has no accessible name
`GroupMap.jsx:73` — the outer `<div>` has no `aria-label` or `role`. Screen readers announce nothing meaningful for the map region.
**Fix:** Add `role="region"` and `aria-label={t('admin.mapAriaLabel')}` to the wrapper `<div>` (and add the translation key).

### UI-8 — LOW: Section titles are inconsistent — only "Participants" has a label header
`AdminView.jsx:139` — only the participant section uses `admin-section-title`. The slot scorer and finalize sections use plain `<h2>` elements, while the map/venue band has no heading at all.
**Fix:** Apply consistent section heading treatment: either use `admin-section-title` labels for all sections or promote the existing `<h2>` headings consistently.

### UI-9 — LOW: Emoji pin (📍) in VenueCard is inconsistent with symbol style elsewhere
`VenueCard.jsx:29` — `<span className="venue-card-pin">📍</span>` uses an emoji, while the rest of the admin UI uses ASCII/text symbols (✓ ? ✗ #). Emoji rendering varies significantly across platforms and OS dark modes.
**Fix:** Replace with an SVG icon, a CSS-drawn dot, or a plain text distance prefix consistent with the design system.

---

## Summary counts

| Category | HIGH | MEDIUM | LOW | Total |
|---|---|---|---|---|
| Security | 2 | 0 | 1 | **3** |
| Code Quality | 1 | 3 | 5 | **9** |
| UX | 2 | 3 | 6 | **11** |
| UI | 1 | 3 | 5 | **9** |
| **Total** | **6** | **9** | **17** | **32** |

---

## Completed

- SEC-1 — per-route `adminMutateLimiter` (5 req/15 min) on finalize and delete (`events.js`)
- SEC-2 — `requireSameOrigin` middleware on finalize and delete; cross-origin requests return 403 (`events.js`)
- SEC-3 — audit log (name, organiserEmail, status, createdAt) emitted before hard delete (`events.js`)
- UX-1 — confirmation modal (slot, venue, duration, notes) before irreversible finalization (`FinalizePanel.jsx`)
- UX-2 — finalize button disabled + inline hint when custom venue name is empty (`FinalizePanel.jsx`)
- UX-3 — "View finalized event" link in the just-finalized thank-you screen (`AdminView.jsx`)
- UX-4 — default duration changed from 30 min to 60 min (`FinalizePanel.jsx`)
- UX-5 — venue pin tooltips showing venue name on the map (`GroupMap.jsx`)
- UX-6 — availability dot colour legend above participant list (`ParticipantResponseList.jsx`)
- UX-7 — styled in-page delete confirmation dialog replacing `window.confirm` (`AdminView.jsx`)
- UX-8 — join-link bar with one-click copy for `shared_link` events (`AdminView.jsx`, `events.js`)
- UX-9 — "only one time slot — automatically selected" hint in FinalizePanel (`FinalizePanel.jsx`)
- UX-10 — TIE indicator replaces rank number for tied slot scores (`AdminView.jsx`, `SlotScoreCard.jsx`)
- UX-11 — selecting a venue from the list switches venue mode back to recommended (`FinalizePanel.jsx`)
- UI-1 — `finalNotes` `<dd>` gets `.finalized-notes` CSS class with `white-space: pre-line` (`FinalizedSummary.jsx`, `AdminView.css`)
- UI-2 — venue list column hidden when event is finalized; map keeps full-width via `.admin-map-venue-band--finalized` modifier (`AdminView.jsx`, `AdminView.css`)
- UI-3 — rank span hidden in `SlotScoreCard` when `totalSlots === 1`; `FinalizePanel` passes `totalSlots={displayedSlots.length}` (`SlotScoreCard.jsx`, `FinalizePanel.jsx`)
- UI-4 — `finalize.venueNone` updated to "select one from the list above, or switch to Custom" (`locales/en`, `locales/hu`)
- UI-5 — `.venue-card-block--selected .venue-card-number` now inverts to `background: var(--paper); color: var(--ink)` (`AdminView.css`)
- UI-6 — inline styles in `VenueList` replaced with `.venue-list-status` / `.venue-list-status--error` CSS classes; `.venue-card-list` margin moved to CSS (`VenueList.jsx`, `AdminView.css`)
- UI-7 — `GroupMap` outer `<div>` gets `role="region"` and `aria-label={t('admin.mapAriaLabel')}`; translation keys added (`GroupMap.jsx`, `locales/en`, `locales/hu`)
- UI-8 — `FinalizePanel` heading changed from `<h2>` to `.admin-section-title` div; map/venue band gets `.admin-section-title` label in `AdminView`; dead `.finalize-section > h2` CSS rule removed (`FinalizePanel.jsx`, `AdminView.jsx`, `AdminView.css`)
- UI-9 — 📍 emoji in `VenueCard` replaced with empty `aria-hidden` span styled via `::before { content: '●' }` CSS pseudo-element (`VenueCard.jsx`, `AdminView.css`)
