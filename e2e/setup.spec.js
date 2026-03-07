/**
 * E2E tests for US 1.1 — Multi-Day Timeframe Definition
 * The API is intercepted so no real backend or DB is required.
 */
import { test, expect } from '@playwright/test';
import { PART_OF_DAY_HOURS } from '../backend/src/lib/slots.js';

const EVENT_NAME = 'Summer meetup';

const MOCK_RESPONSE = {
  event_id: 'e2e-event-id',
  name: EVENT_NAME,
  admin_token: 'e2e-admin-token',
  slots: Array.from(
    { length: 3 * (PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start) },
    (_, i) => ({ id: `slot-${i}` })
  ),
  participants: [{ id: 'p-1', email: 'alex@example.com' }],
};

test.beforeEach(async ({ page }) => {
  await page.route('/api/events', route =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_RESPONSE),
    })
  );
});

test('home page shows the event setup form', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'taliott' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /kick-off/i })).toBeVisible();
});

test('form has event name input, date range inputs and part-of-day options', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel(/event name/i)).toBeVisible();
  await expect(page.getByLabel(/from/i)).toBeVisible();
  await expect(page.getByLabel(/to/i)).toBeVisible();
  await expect(page.getByRole('radio', { name: 'all' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'morning' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'afternoon' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'evening' })).toBeVisible();
});

test('selecting a 3-day range and submitting shows confirmation with event name and slot count', async ({ page }) => {
  test.fixme(true, 'US 1.1: slot count on confirmation screen not yet implemented');
  await page.goto('/');

  await page.getByLabel(/event name/i).fill(EVENT_NAME);
  await page.getByLabel(/your email/i).fill('alex@example.com');
  await page.getByLabel(/from/i).fill('2025-06-01');
  await page.getByLabel(/to/i).fill('2025-06-03');
  await page.getByLabel(/voting deadline/i).fill('2025-05-25T12:00');
  await page.getByRole('radio', { name: 'all' }).check();

  await page.getByRole('button', { name: /create event/i }).click();

  await expect(page.getByRole('heading', { name: EVENT_NAME })).toBeVisible();

  const expectedSlots = 3 * (PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start);
  await expect(page.getByText(`${expectedSlots} slots generated`)).toBeVisible();
});

test('selecting morning filter limits displayed slot count accordingly', async ({ page }) => {
  test.fixme(true, 'US 1.1: slot count on confirmation screen not yet implemented');
  const morningSlotCount = 3 * (PART_OF_DAY_HOURS.morning.end - PART_OF_DAY_HOURS.morning.start);

  await page.route('/api/events', route =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        ...MOCK_RESPONSE,
        slots: Array.from({ length: morningSlotCount }, (_, i) => ({ id: `slot-${i}` })),
      }),
    })
  );

  await page.goto('/');

  await page.getByLabel(/event name/i).fill(EVENT_NAME);
  await page.getByLabel(/your email/i).fill('alex@example.com');
  await page.getByLabel(/from/i).fill('2025-06-01');
  await page.getByLabel(/to/i).fill('2025-06-03');
  await page.getByLabel(/voting deadline/i).fill('2025-05-25T12:00');
  await page.getByRole('radio', { name: 'morning' }).check();

  await page.getByRole('button', { name: /create event/i }).click();

  await expect(page.getByText(`${morningSlotCount} slots generated`)).toBeVisible();
});

test('1-day range produces a single day of slots', async ({ page }) => {
  test.fixme(true, 'US 1.1: slot count on confirmation screen not yet implemented');
  const oneDaySlots = PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start;

  await page.route('/api/events', route =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        ...MOCK_RESPONSE,
        slots: Array.from({ length: oneDaySlots }, (_, i) => ({ id: `slot-${i}` })),
      }),
    })
  );

  await page.goto('/');

  await page.getByLabel(/event name/i).fill(EVENT_NAME);
  await page.getByLabel(/your email/i).fill('alex@example.com');
  await page.getByLabel(/from/i).fill('2025-06-15');
  await page.getByLabel(/to/i).fill('2025-06-15');
  await page.getByLabel(/voting deadline/i).fill('2025-06-10T12:00');

  await page.getByRole('button', { name: /create event/i }).click();

  await expect(page.getByText(`${oneDaySlots} slots generated`)).toBeVisible();
});
