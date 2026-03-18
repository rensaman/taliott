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

## Phase 0 — Infrastructure (~12k tokens) [ ]
**Goal:** i18n wired up, EN stub works, language toggle visible but only EN available

Tasks:
- [ ] Add `i18next`, `react-i18next` to `frontend/package.json`
- [ ] Create `frontend/src/i18n.js` (init, localStorage key: `taliott_lang`, browser detect fallback)
- [ ] Wrap `<App>` in `<I18nextProvider>` in `main.jsx`
- [ ] Add `LanguageSelector` component (EN/HU toggle, header placement)
- [ ] Scaffold empty locale JSON files for all domains

---

## Phase 1a — Core Flow Components (~60k tokens) [ ]
**Goal:** Event creation + participation flows fully translated

Files:
- [ ] `frontend/src/features/setup/EventSetupForm.jsx` (~80 strings)
- [ ] `frontend/src/features/participate/ResponseWizard.jsx` (~40 strings)
- [ ] `frontend/src/features/admin/AdminView.jsx` (~30 strings)
- [ ] `frontend/src/features/setup/DateRangePicker.jsx` (~30 strings, month/weekday names)
- [ ] `frontend/src/features/admin/FinalizePanel.jsx` (~25 strings)

---

## Phase 1b — Remaining Frontend Components (~60k tokens) [ ]
**Goal:** All remaining UI text extracted

Files:
- [ ] `frontend/src/features/participate/ParticipateView.jsx` (~20 strings)
- [ ] `frontend/src/App.jsx` (~20 strings)
- [ ] `frontend/src/features/join/JoinView.jsx` (~15 strings)
- [ ] `frontend/src/features/admin/VenueList.jsx` (~15 strings)
- [ ] `frontend/src/features/admin/VenueTypeFilter.jsx` (~15 strings)
- [ ] `frontend/src/features/resend/ResendLinkView.jsx` (~10 strings)
- [ ] `frontend/src/features/participate/TravelModeSelector.jsx` (~10 strings)
- [ ] `frontend/src/features/feedback/FeedbackForm.jsx` (~10 strings)
- [ ] `frontend/src/features/participate/DeadlineBadge.jsx` (~5 strings)
- [ ] `frontend/src/features/legal/LegalFooter.jsx` (~3 strings)
- [ ] All remaining small components

---

## Phase 2 — Backend Email Localization (~30k tokens) [ ]
**Goal:** Emails sent in the language chosen at event creation

Tasks:
- [ ] Add `lang` field (String, default `"en"`) to `Event` model via Prisma migration
- [ ] Pass `lang` from frontend event creation form (summary step) → `POST /api/events`
- [ ] Create `backend/src/lib/t.js` — `t(lang, key, vars)` helper with JSON locale loading
- [ ] Rewrite `backend/src/lib/invite-mailer.js` to use locale files
- [ ] Create `backend/locales/en/emails.json` (7 email types)
- [ ] Create `backend/locales/hu/emails.json` (Hungarian translations)

---

## Phase 3 — Hungarian Translations (~15k tokens) [ ]
**Goal:** All HU locale files complete and accurate

Tasks:
- [ ] Fill `frontend/src/locales/hu/*.json` (all domains)
- [ ] Review dynamic-value strings for Hungarian grammar (use neutral constructions)
- [ ] Add `/privacy/hu` and `/terms/hu` routes with Hungarian legal pages

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
| 0 | ~12k | [ ] |
| 1a | ~60k | [ ] |
| 1b | ~60k | [ ] |
| 2 | ~30k | [ ] |
| 3 | ~15k | [ ] |
| 4 | ~8k | [ ] |
| 5 | ~25k | [ ] |
| **Total** | **~210k** | |
| With buffer | ~270–315k | |
