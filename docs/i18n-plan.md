# i18n Migration Plan: EN + Hungarian

> Reference this file at the start of each session with:
> "Read docs/i18n-plan.md and continue with Phase N"

## Locked Decisions
| Decision | Choice |
|----------|--------|
| Language selector | Manual toggle in UI header |
| Backend error messages | English only |
| Email language | Based on language at event creation (store `lang` on Event) |
| Legal pages | Separate routes (`/privacy/hu`, `/terms/hu`), not translated in-app |
| Rollout | EN-only stub first, HU added iteratively |

## Stack
- **Frontend:** `i18next` + `react-i18next`
- **Backend:** plain JSON locales + `t(lang, key, vars)` helper (emails only)

## Locale structure (target)
```
frontend/src/locales/
  en/common.json
  en/forms.json
  en/errors.json
  hu/common.json
  hu/forms.json
  hu/errors.json
backend/locales/
  en/emails.json
  hu/emails.json
```

---

## Phase 0 — Infrastructure (~12k tokens) [x]
**Goal:** i18n wired up, EN stub works, language toggle visible but only EN available

Tasks:
- [x] Add `i18next`, `react-i18next` to `frontend/package.json`
- [x] Create `frontend/src/i18n.js` (init, localStorage key: `taliott_lang`, browser detect fallback)
- [x] Wrap `<App>` in `<I18nextProvider>` in `main.jsx`
- [x] Add `LanguageSelector` component (EN/HU toggle, header placement)
- [x] Scaffold empty locale JSON files for all domains

---

## Phase 1a — Core Flow Components (~60k tokens) [x]
**Goal:** Event creation + participation flows fully translated

Files:
- [x] `frontend/src/features/setup/EventSetupForm.jsx` (~80 strings)
- [x] `frontend/src/features/participate/ResponseWizard.jsx` (~40 strings)
- [x] `frontend/src/features/admin/AdminView.jsx` (~30 strings)
- [x] `frontend/src/features/setup/DateRangePicker.jsx` (~30 strings, month/weekday names)
- [x] `frontend/src/features/admin/FinalizePanel.jsx` (~25 strings)

---

## Phase 1b — Remaining Frontend Components (~60k tokens) [x]
**Goal:** All remaining UI text extracted

Files:
- [x] `frontend/src/features/participate/ParticipateView.jsx` (~20 strings)
- [x] `frontend/src/App.jsx` — `ConfirmationView` (~20 strings)
- [x] `frontend/src/features/join/JoinView.jsx` (~15 strings)
- [x] `frontend/src/features/admin/VenueList.jsx` (~15 strings)
- [x] `frontend/src/features/admin/VenueTypeFilter.jsx` (~15 strings)
- [x] `frontend/src/features/resend/ResendLinkView.jsx` (~10 strings)
- [x] `frontend/src/features/participate/TravelModeSelector.jsx` (~10 strings)
- [x] `frontend/src/features/feedback/FeedbackForm.jsx` (~10 strings)
- [x] `frontend/src/features/participate/DeadlineBadge.jsx` (~5 strings)
- [x] `frontend/src/features/legal/LegalFooter.jsx` (~3 strings)

Notes:
- `TRAVEL_MODE_LABELS` kept as static English export (used by ResponseWizard/ResponseSummary review steps — update in Phase 3)
- New `VenueTypeFilter.test.jsx` created (6 behavioural + 2 i18n tests)
- i18n sentinel tests added to all 9 affected test files

---

## Phase 2 — Backend Email Localization (~30k tokens) [x]
**Goal:** Emails sent in the language chosen at event creation

Tasks:
- [x] Add `lang` field (String, default `"en"`) to `Event` model via Prisma migration
- [x] Pass `lang` from frontend event creation form (summary step) → `POST /api/events`
- [x] Create `backend/src/lib/t.js` — `t(lang, key, vars)` helper with JSON locale loading
- [x] Rewrite `backend/src/lib/invite-mailer.js` to use locale files
- [x] Create `backend/locales/en/emails.json` (7 email types)
- [x] Create `backend/locales/hu/emails.json` (Hungarian translations)

Notes:
- `t()` caches locale files in-process; falls back to EN if lang unrecognised or key missing
- `POST /api/events` validates `lang` — only `'en'` | `'hu'` accepted (400 otherwise)
- 9 new unit tests in `t.test.js`; 7 new i18n tests in `invite-mailer.test.js`; 3 new integration tests in `events.test.js`

---

## Phase 3 — Hungarian Translations (~15k tokens) [x]
**Goal:** All HU locale files complete and accurate

Tasks:
- [x] Fill `frontend/src/locales/hu/*.json` (all domains)
- [x] Review dynamic-value strings for Hungarian grammar (use neutral constructions)
- [x] Add `/privacy/hu` and `/terms/hu` routes with Hungarian legal pages

Notes:
- `hu/common.json` fully mirrors all keys in `en/common.json` (224 leaf keys)
- `hu/forms.json` and `hu/errors.json` remain `{}` (EN files are also empty)
- Locale key completeness enforced by `frontend/src/locales/locales.test.js`
- `PrivacyPolicyViewHu.jsx` and `TermsViewHu.jsx` are separate static components (not in-app translation)
- HU legal pages link to each other (`/privacy/hu` ↔ `/terms/hu`)
- NAIH (Hungarian DPA) referenced in HU privacy policy instead of generic EU authority list
- 4 new tests in `locales.test.js`; 5 tests in each of `PrivacyPolicyViewHu.test.jsx` and `TermsViewHu.test.jsx`; 2 new routing tests in `App.test.jsx`

---

## Phase 4 — Language Persistence + Wiring (~8k tokens) [ ]
**Goal:** Language choice persists across page loads and sessions

Tasks:
- [ ] Wire `LanguageSelector` to `i18next.changeLanguage()` + `localStorage`
- [ ] Pass `lang` in event creation payload from summary step
- [ ] Ensure `Intl.DateTimeFormat` locale strings use selected language

---

## Phase 5 — Test Updates (~25k tokens) [ ]
**Goal:** All tests pass with i18n in place

Tasks:
- [ ] Mock `useTranslation` in unit tests (return key as value)
- [ ] Replace text-based E2E selectors with `data-testid` where needed
- [ ] Backend integration tests assert on English errors only (no change needed)

---

## Token Budget Summary
| Phase | Estimate | Status |
|-------|----------|--------|
| 0 | ~12k | [x] |
| 1a | ~60k | [x] |
| 1b | ~60k | [x] |
| 2 | ~30k | [x] |
| 3 | ~15k | [x] |
| 4 | ~8k | [ ] |
| 5 | ~25k | [ ] |
| **Total** | **~210k** | |
| With buffer | ~270–315k | |
