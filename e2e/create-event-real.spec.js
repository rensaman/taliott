/**
 * Full-stack E2E for US 1.1 — creates a real event through the UI.
 * No API mocking — hits the real backend and DB.
 * Requires both dev servers running and DATABASE_URL set in backend/.env.
 * Run: npm run test:e2e
 */
import { test, expect } from '@playwright/test';
import { PART_OF_DAY_HOURS } from '../backend/src/lib/slots.js';

async function fillAndSubmitForm(page, {
  name = 'Summer meetup',
  partOfDay = 'all',
  dateStart = '2025-06-01',
  dateEnd = '2025-06-03',
  deadline = '2025-05-25T12:00',
} = {}) {
  await page.getByLabel(/event name/i).fill(name);
  await page.getByLabel(/your email/i).fill('alex@example.com');
  await page.getByLabel(/from/i).fill(dateStart);
  await page.getByLabel(/to/i).fill(dateEnd);
  await page.getByLabel(/voting deadline/i).fill(deadline);
  await page.getByRole('radio', { name: partOfDay }).check();
  await page.getByLabel(/participant emails/i).fill('jamie@example.com\nsam@example.com');
}

test('submitting the form creates a real event and shows confirmation', async ({ page }) => {
  await page.goto('/');
  await fillAndSubmitForm(page);
  await page.getByRole('button', { name: /create event/i }).click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();
});

test('confirmation shows the correct slot count for the submitted date range', async ({ page }) => {
  await page.goto('/');
  await fillAndSubmitForm(page, { dateStart: '2025-06-01', dateEnd: '2025-06-03', partOfDay: 'all' });
  await page.getByRole('button', { name: /create event/i }).click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();

  const expectedSlots = 3 * (PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start);
  await expect(page.getByText(`${expectedSlots} slots generated`)).toBeVisible();
});

test('confirmation shows the admin token returned by the backend', async ({ page }) => {
  // Intercept the response to capture the real admin_token without blocking the request
  let adminToken;
  page.on('response', async res => {
    if (res.url().includes('/api/events') && res.request().method() === 'POST') {
      const body = await res.json().catch(() => null);
      adminToken = body?.admin_token;
    }
  });

  await page.goto('/');
  await fillAndSubmitForm(page);
  await page.getByRole('button', { name: /create event/i }).click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();

  const tokenEl = page.getByTestId('admin-token');
  await expect(tokenEl).toBeVisible();
  const displayed = await tokenEl.textContent();
  expect(displayed).toBe(adminToken);
});

test('API response contains correct slot count for morning filter', async ({ page }) => {
  let responseBody;
  page.on('response', async res => {
    if (res.url().includes('/api/events') && res.request().method() === 'POST') {
      responseBody = await res.json().catch(() => null);
    }
  });

  await page.goto('/');
  await fillAndSubmitForm(page, { dateStart: '2025-06-01', dateEnd: '2025-06-03', partOfDay: 'morning' });
  await page.getByRole('button', { name: /create event/i }).click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();

  const expectedSlots = 3 * (PART_OF_DAY_HOURS.morning.end - PART_OF_DAY_HOURS.morning.start);
  expect(responseBody?.slots?.length).toBe(expectedSlots);
});

test('API response includes organizer and invited participants', async ({ page }) => {
  let responseBody;
  page.on('response', async res => {
    if (res.url().includes('/api/events') && res.request().method() === 'POST') {
      responseBody = await res.json().catch(() => null);
    }
  });

  await page.goto('/');
  await fillAndSubmitForm(page);
  await page.getByRole('button', { name: /create event/i }).click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();

  const emails = responseBody?.participants?.map(p => p.email) ?? [];
  expect(emails).toContain('alex@example.com');
  expect(emails).toContain('jamie@example.com');
  expect(emails).toContain('sam@example.com');
});

test('1-day range produces the correct slot count', async ({ page }) => {
  let responseBody;
  page.on('response', async res => {
    if (res.url().includes('/api/events') && res.request().method() === 'POST') {
      responseBody = await res.json().catch(() => null);
    }
  });

  await page.goto('/');
  await fillAndSubmitForm(page, { dateStart: '2025-06-15', dateEnd: '2025-06-15', partOfDay: 'all' });
  await page.getByRole('button', { name: /create event/i }).click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();

  const expectedSlots = PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start;
  expect(responseBody?.slots?.length).toBe(expectedSlots);
});

test('request body includes a valid IANA timezone', async ({ page }) => {
  let requestBody;
  page.on('request', req => {
    if (req.url().includes('/api/events') && req.method() === 'POST') {
      requestBody = JSON.parse(req.postData() ?? '{}');
    }
  });

  await page.goto('/');
  await fillAndSubmitForm(page);
  await page.getByRole('button', { name: /create event/i }).click();

  await expect(page.getByRole('heading', { name: /summer meetup/i })).toBeVisible();

  expect(typeof requestBody?.timezone).toBe('string');
  expect(requestBody.timezone.length).toBeGreaterThan(0);
  // Must be a valid IANA timezone (e.g. "Europe/Paris", "UTC", "America/New_York")
  expect(() => Intl.DateTimeFormat(undefined, { timeZone: requestBody.timezone })).not.toThrow();
});

test('backend returns 400 and form shows error when end date precedes start date', async ({ page }) => {
  // HTML5 min-attribute prevents this via the UI normally;
  // bypass it with evaluate to test the backend validation path.
  let statusCode;
  page.on('response', res => {
    if (res.url().includes('/api/events') && res.request().method() === 'POST') {
      statusCode = res.status();
    }
  });

  await page.goto('/');
  await page.getByLabel(/event name/i).fill('Test event');
  await page.getByLabel(/your email/i).fill('alex@example.com');
  await page.getByLabel(/voting deadline/i).fill('2025-05-25T12:00');

  // Set end < start by removing the min guard and dispatching change events
  await page.getByLabel(/from/i).evaluate(el => { el.value = '2025-06-05'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.getByLabel(/to/i).evaluate(el => { el.removeAttribute('min'); el.value = '2025-06-01'; el.dispatchEvent(new Event('change', { bubbles: true })); });

  await page.getByRole('button', { name: /create event/i }).click();

  await expect(page.getByRole('alert')).toBeVisible();
  expect(statusCode).toBe(400);
  await expect(page.getByRole('heading', { name: /summer meetup/i })).not.toBeVisible();
});
