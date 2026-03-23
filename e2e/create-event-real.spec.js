/**
 * Full-stack E2E for US 1.1 — creates a real event through the UI.
 * No API mocking — hits the real backend and DB.
 * Requires both dev servers running and DATABASE_URL set in backend/.env.
 * Run: npm run test:e2e
 */
import { test, expect } from '@playwright/test';
import { fillWizard } from './helpers.js';

test('submitting the form creates a real event and shows confirmation', async ({ page }) => {
  await page.goto('/');
  await fillWizard(page, { inviteMode: 'email_invites', participantEmails: 'jamie@example.com\nsam@example.com' });
  await page.getByTestId('create-event-submit-btn').click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();
});

test('API response contains correct slot count for the submitted date range', async ({ page }) => {
  let responseBody;
  page.on('response', async res => {
    if (res.url().includes('/api/events') && res.request().method() === 'POST') {
      responseBody = await res.json().catch(() => null);
    }
  });

  await page.goto('/');
  // 3 days × full range (480–1320) = 3 × 29 = 87 slots (inclusive upper bound)
  await fillWizard(page, { dateStart: '2025-06-01', dateEnd: '2025-06-03', timeRangeStart: 480, timeRangeEnd: 1320 });
  await page.getByTestId('create-event-submit-btn').click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();

  const expectedSlots = 3 * ((1320 - 480) / 30 + 1);
  expect(responseBody?.slots?.length).toBe(expectedSlots);
});

test('confirmation shows the admin link returned by the backend', async ({ page }) => {
  // Intercept the response to capture the real admin_token without blocking the request
  let adminToken;
  page.on('response', async res => {
    if (res.url().includes('/api/events') && res.request().method() === 'POST') {
      const body = await res.json().catch(() => null);
      adminToken = body?.admin_token;
    }
  });

  await page.goto('/');
  await fillWizard(page);
  await page.getByTestId('create-event-submit-btn').click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();

  const tokenEl = page.getByTestId('admin-token');
  await expect(tokenEl).toBeVisible();
  const displayed = await tokenEl.textContent();
  expect(displayed).toContain(`/admin/${adminToken}`);
});

test('API response includes organizer and invited participants', async ({ page }) => {
  let responseBody;
  page.on('response', async res => {
    if (res.url().includes('/api/events') && res.request().method() === 'POST') {
      responseBody = await res.json().catch(() => null);
    }
  });

  await page.goto('/');
  await fillWizard(page, { inviteMode: 'email_invites', participantEmails: 'jamie@example.com\nsam@example.com' });
  await page.getByTestId('create-event-submit-btn').click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();

  const emails = responseBody?.participants?.map(p => p.email) ?? [];
  expect(emails).toContain('alex@example.com');
  expect(emails).toContain('jamie@example.com');
  expect(emails).toContain('sam@example.com');
});

test('request body includes a valid IANA timezone', async ({ page }) => {
  let requestBody;
  page.on('request', req => {
    if (req.url().includes('/api/events') && req.method() === 'POST') {
      requestBody = JSON.parse(req.postData() ?? '{}');
    }
  });

  await page.goto('/');
  await fillWizard(page);
  await page.getByTestId('create-event-submit-btn').click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();

  expect(typeof requestBody?.timezone).toBe('string');
  expect(requestBody.timezone.length).toBeGreaterThan(0);
  // Must be a valid IANA timezone (e.g. "Europe/Paris", "UTC", "America/New_York")
  expect(() => Intl.DateTimeFormat(undefined, { timeZone: requestBody.timezone })).not.toThrow();
});

test('backend returns 400 when end date precedes start date', async ({ page }) => {
  // The wizard's canAdvance() check blocks invalid dates in the UI,
  // so test backend validation directly via the API.
  const res = await page.request.post('/api/events', {
    data: {
      name: 'Test event',
      organizer_email: 'alex@example.com',
      date_range_start: '2025-06-05',
      date_range_end: '2025-06-01',
      time_range_start: 480, time_range_end: 1320,
      timezone: 'UTC',
      deadline: '2025-05-25T12:00:00.000Z',
    },
  });
  expect(res.status()).toBe(400);
});
