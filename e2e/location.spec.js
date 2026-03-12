/**
 * E2E tests for US 2.1 — Geocoded Location Entry
 * Hits the real backend and Nominatim geocoding API.
 */
import { test, expect } from '@playwright/test';

async function createEvent(page) {
  const res = await page.request.post('/api/events', {
    data: {
      name: 'Location E2E',
      organizer_email: 'geo-e2e@example.com',
      date_range_start: '2025-10-01',
      date_range_end: '2025-10-01',
      part_of_day: 'morning',
      timezone: 'UTC',
      deadline: '2099-12-31T23:59:59.000Z',
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test('participant sees address search on the location step', async ({ page }) => {
  const { participants } = await createEvent(page);
  const pid = participants[0].id;

  await page.goto(`/participate/${pid}`);
  await page.getByRole('button', { name: /next/i }).click(); // step 1 → 2
  await page.getByRole('button', { name: /next/i }).click(); // step 2 → 3

  await expect(page.getByLabel(/search address/i)).toBeVisible();
});

test('participant does not see location section on a locked event', async ({ page }) => {
  const res = await page.request.post('/api/events', {
    data: {
      name: 'Locked Location E2E',
      organizer_email: 'geo-locked-e2e@example.com',
      date_range_start: '2025-10-01',
      date_range_end: '2025-10-01',
      part_of_day: 'morning',
      timezone: 'UTC',
      deadline: '2020-01-01T00:00:00.000Z',
    },
  });
  const { participants } = await res.json();
  const pid = participants[0].id;

  await page.goto(`/participate/${pid}`);

  await expect(page.getByLabel(/search address/i)).not.toBeVisible();
});

test('participant types address, selects result, and coordinates are saved', async ({ page }) => {
  const { participants } = await createEvent(page);
  const pid = participants[0].id;

  await page.goto(`/participate/${pid}`);
  await page.getByRole('button', { name: /next/i }).click(); // step 1 → 2
  await page.getByRole('button', { name: /next/i }).click(); // step 2 → 3

  const input = page.getByLabel(/search address/i);
  await input.fill('London');

  // Wait for debounce + geocode results to appear
  await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });

  // Select the first result
  await page.getByRole('listbox').locator('button').first().click();

  // Dropdown should close after selection
  await expect(page.getByRole('listbox')).not.toBeVisible();

  // Verify coordinates were saved by re-fetching the participant
  const participantRes = await page.request.get(`/api/participate/${pid}`);
  const data = await participantRes.json();
  expect(data.participant.latitude).not.toBeNull();
  expect(data.participant.longitude).not.toBeNull();
});
