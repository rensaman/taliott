/**
 * Screenshot walkthrough — captures every screen in flow order for layout review.
 * Run with: npx playwright test e2e/screenshots.spec.js --headed
 * Output: screenshots/flow-*.png
 */
import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const OUT = path.resolve('screenshots');
fs.mkdirSync(OUT, { recursive: true });

let n = 0;
async function snap(page, label) {
  n += 1;
  const filename = `${String(n).padStart(2, '0')}-${label}.png`;
  await page.screenshot({ path: path.join(OUT, filename), fullPage: true });
  console.log(`  saved ${filename}`);
}

// Reusable event factory via API
async function createEvent(page, overrides = {}) {
  const res = await page.request.post('/api/events', {
    data: {
      name: 'Summer Meetup',
      organizer_email: 'alex@example.com',
      date_range_start: '2025-07-01',
      date_range_end: '2025-07-03',
      time_range_start: 540,   // 9:00 AM
      time_range_end: 1080,    // 6:00 PM
      timezone: 'Europe/Budapest',
      deadline: '2099-12-31T23:59:59.000Z',
      invite_mode: 'email_invites',
      participant_emails: ['jamie@example.com', 'sam@example.com'],
      ...overrides,
    },
  });
  return res.json();
}

// ─── ORGANIZER CREATION FLOW ─────────────────────────────────────────────────

test('01 landing page', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await snap(page, 'landing');
});

test('02–09 event setup wizard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /create an event/i }).click();
  await page.waitForLoadState('networkidle');

  // Step 1 — event name
  await snap(page, 'setup-01-event-name');
  await page.getByRole('textbox', { name: /event name/i }).fill('Summer Meetup');
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 2 — organizer email
  await snap(page, 'setup-02-organizer-email');
  await page.getByRole('textbox', { name: /your email/i }).fill('alex@example.com');
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 3 — date range
  await snap(page, 'setup-03-date-range');
  await page.locator('input[type="date"]').first().fill('2025-07-01');
  await page.locator('input[type="date"]').last().fill('2025-07-03');
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 4 — time of day
  await snap(page, 'setup-04-time-of-day');
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 5 — voting deadline
  await snap(page, 'setup-05-deadline');
  await page.locator('input[type="datetime-local"]').fill('2025-06-20T12:00');
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 6 — invite mode
  await snap(page, 'setup-06-invite-mode');
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 7 — participant emails (email_invites mode)
  await snap(page, 'setup-07-participant-emails');
  await page.getByRole('textbox', { name: /participant emails/i })
    .fill('jamie@example.com\nsam@example.com');
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 8 — review
  await snap(page, 'setup-08-review');
});

test('10 confirmation screen', async ({ page }) => {
  // Create event through the UI to get the real confirmation screen
  await page.goto('/');
  await page.getByRole('button', { name: /create an event/i }).click();

  await page.getByRole('textbox', { name: /event name/i }).fill('Summer Meetup');
  await page.getByRole('button', { name: /continue/i }).click();

  await page.getByRole('textbox', { name: /your email/i }).fill('alex@example.com');
  await page.getByRole('button', { name: /continue/i }).click();

  await page.locator('input[type="date"]').first().fill('2025-07-01');
  await page.locator('input[type="date"]').last().fill('2025-07-03');
  await page.getByRole('button', { name: /continue/i }).click();

  await page.getByRole('button', { name: /continue/i }).click(); // time

  await page.locator('input[type="datetime-local"]').fill('2025-06-20T12:00');
  await page.getByRole('button', { name: /continue/i }).click();

  // Switch to shared link to avoid email sending delay blocking screenshot
  await page.getByRole('radio', { name: /share a join link/i }).check();
  await page.getByRole('button', { name: /continue/i }).click();

  // review
  await page.getByRole('button', { name: /create event/i }).click();
  await page.waitForSelector('[data-testid="admin-token"]', { timeout: 15000 });
  await snap(page, 'confirmation');
});

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────

test('11 admin view', async ({ page }) => {
  const event = await createEvent(page);
  await page.goto(`/admin/${event.admin_token}`);
  await page.waitForSelector('h1', { timeout: 10000 });
  await page.waitForTimeout(800); // let map/venues settle
  await snap(page, 'admin-view');
});

// ─── PARTICIPANT FLOW ─────────────────────────────────────────────────────────

test('12–16 participate wizard', async ({ page }) => {
  const event = await createEvent(page);
  const pid = event.participants[0].id;

  await page.goto(`/participate/${pid}`);
  await page.waitForSelector('h1', { timeout: 10000 });

  // Step 1 — name
  await snap(page, 'participate-01-name');
  await page.getByRole('textbox', { name: /your name/i }).fill('Jamie');
  await page.getByRole('button', { name: /next/i }).click();

  // Step 2 — availability grid
  await page.waitForSelector('[data-testid="slot-cell"]', { timeout: 5000 });
  await snap(page, 'participate-02-availability');
  await page.getByRole('button', { name: /next/i }).click();

  // Step 3 — travel mode
  await snap(page, 'participate-03-travel-mode');
  await page.getByRole('button', { name: /next/i }).click();

  // Step 4 — address / map
  await snap(page, 'participate-04-address-map');

  // Submit
  await page.getByRole('button', { name: /submit/i }).click();
  await page.waitForTimeout(1000);
  await snap(page, 'participate-05-summary');
});

// ─── JOIN FLOW (shared link) ──────────────────────────────────────────────────

test('17 join view', async ({ page }) => {
  const event = await createEvent(page, { invite_mode: 'shared_link', participant_emails: [] });
  await page.goto(event.join_url);
  await page.waitForSelector('h1', { timeout: 15000 });
  await snap(page, 'join-view');
});

// ─── UTILITY PAGES ────────────────────────────────────────────────────────────

test('18 resend link', async ({ page }) => {
  await page.goto('/resend');
  await page.waitForLoadState('networkidle');
  await snap(page, 'resend-link');
});

test('19 privacy policy', async ({ page }) => {
  await page.goto('/privacy');
  await page.waitForLoadState('networkidle');
  await snap(page, 'privacy-policy');
});

test('20 terms', async ({ page }) => {
  await page.goto('/terms');
  await page.waitForLoadState('networkidle');
  await snap(page, 'terms');
});
