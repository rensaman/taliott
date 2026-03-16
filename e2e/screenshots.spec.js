/**
 * Mobile screenshot walkthrough — event creation and participation flows.
 * Run with: npm run screenshots
 * Output: screenshots/create-*.png, screenshots/participate-*.png
 */
import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const OUT = path.resolve('screenshots');
fs.mkdirSync(OUT, { recursive: true });

async function snap(page, filename) {
  await page.screenshot({ path: path.join(OUT, filename), fullPage: true });
  console.log(`  saved ${filename}`);
}

async function submitForm(page) {
  await page.evaluate(() => {
    const form = document.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

// Reusable event factory via API
async function createEvent(page, overrides = {}) {
  const res = await page.request.post('/api/events', {
    data: {
      name: 'Summer Meetup',
      organizer_email: 'alex@example.com',
      date_range_start: '2025-07-01',
      date_range_end: '2025-07-03',
      time_range_start: 540,
      time_range_end: 1080,
      timezone: 'Europe/Budapest',
      deadline: '2099-12-31T23:59:59.000Z',
      invite_mode: 'email_invites',
      participant_emails: ['jamie@example.com'],
      ...overrides,
    },
  });
  return res.json();
}

// ─── EVENT CREATION FLOW ──────────────────────────────────────────────────────

test.describe('Event creation flow', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('creation wizard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await snap(page, 'create-01-landing.png');

    await page.getByRole('button', { name: /create an event/i }).click();
    await page.waitForLoadState('networkidle');

    // Step 1 — event name
    await snap(page, 'create-02-event-name.png');
    await page.getByRole('textbox', { name: /event name/i }).fill('Summer Meetup');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 2 — organizer email
    await snap(page, 'create-03-organizer-email.png');
    await page.getByRole('textbox', { name: /your email/i }).fill('alex@example.com');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 3 — date range + time window (combined step)
    await snap(page, 'create-04-date-and-time.png');
    await page.locator('[data-testid="date-start"]').fill('2025-07-01');
    await page.locator('[data-testid="date-end"]').fill('2025-07-03');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 4 — voting deadline
    await snap(page, 'create-05-deadline.png');
    await page.locator('[data-testid="date-value"]').fill('2025-06-20');
    await page.getByRole('combobox', { name: /deadline time/i }).selectOption('12:00');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 5 — invite mode (defaults to shared link)
    await snap(page, 'create-06-invite-mode.png');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 6 — review
    await snap(page, 'create-07-review.png');
    await page.getByRole('button', { name: /create event/i }).click();
    await page.waitForSelector('[data-testid="admin-token"]', { timeout: 15000 });
    await snap(page, 'create-08-confirmation.png');
  });
});

// ─── PARTICIPATION FLOW ───────────────────────────────────────────────────────

test.describe('Participation flow', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('participant response wizard', async ({ page }) => {
    const event = await createEvent(page);
    const pid = event.participants[0].id;

    await page.goto(`/participate/${pid}`);
    await page.waitForSelector('h1', { timeout: 10000 });

    // Step 1 — name
    await snap(page, 'participate-01-name.png');
    await page.getByRole('textbox', { name: /your name/i }).fill('Jamie');
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(500);

    // Step 2 — travel mode & location (location required; bypass via form submit)
    await snap(page, 'participate-02-location.png');
    await submitForm(page);
    await page.waitForTimeout(300);

    // Step 3 — availability grid
    await page.waitForSelector('[data-testid="slot-cell"]', { timeout: 5000 });
    await snap(page, 'participate-03-availability.png');
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(300);

    // Step 4 — review & submit
    await snap(page, 'participate-04-review.png');
    await page.getByRole('button', { name: /submit/i }).click();
    await page.waitForTimeout(1500);
    await snap(page, 'participate-05-done.png');
  });
});
