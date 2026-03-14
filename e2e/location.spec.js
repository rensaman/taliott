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
      time_range_start: 480, time_range_end: 720,
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
  await page.getByRole('button', { name: /next/i }).click(); // step 3 → 4

  await expect(page.getByLabel(/search address/i)).toBeVisible();
});

test('participant does not see location section on a locked event', async ({ page }) => {
  const res = await page.request.post('/api/events', {
    data: {
      name: 'Locked Location E2E',
      organizer_email: 'geo-locked-e2e@example.com',
      date_range_start: '2025-10-01',
      date_range_end: '2025-10-01',
      time_range_start: 480, time_range_end: 720,
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
  await page.getByRole('button', { name: /next/i }).click(); // step 3 → 4

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

test('participant can select a travel mode on step 3', async ({ page }) => {
  const { participants } = await createEvent(page);
  const pid = participants[0].id;

  await page.goto(`/participate/${pid}`);
  await page.getByRole('button', { name: /next/i }).click(); // step 1 → 2
  await page.getByRole('button', { name: /next/i }).click(); // step 2 → 3

  // Travel mode selector should be visible
  await expect(page.getByText(/how will you get there/i)).toBeVisible();

  // Select 'cycling' and wait for the PATCH to complete
  const patchDone = page.waitForResponse(r =>
    r.url().includes('/travel-mode') && r.request().method() === 'PATCH'
  );
  await page.getByRole('radio', { name: /cycling/i }).click();
  await patchDone;

  // Verify mode was saved
  const participantRes = await page.request.get(`/api/participate/${pid}`);
  const data = await participantRes.json();
  expect(data.participant.travel_mode).toBe('cycling');
});

test('centroid is returned in admin view after participant sets location (Euclidean fallback — no ORS key in E2E env)', async ({ page }) => {
  // Create event with two participants so centroid computation is meaningful
  const res = await page.request.post('/api/events', {
    data: {
      name: 'Centroid E2E',
      organizer_email: 'centroid-e2e@example.com',
      participant_emails: ['other-e2e@example.com'],
      date_range_start: '2025-10-01',
      date_range_end: '2025-10-01',
      time_range_start: 480, time_range_end: 720,
      timezone: 'UTC',
      deadline: '2099-12-31T23:59:59.000Z',
    },
  });
  expect(res.ok()).toBeTruthy();
  const { admin_token, participants } = await res.json();

  // Give both participants Budapest-area locations
  await page.request.patch(`/api/participate/${participants[0].id}/location`, {
    data: { latitude: 47.497, longitude: 19.040 },
  });
  await page.request.patch(`/api/participate/${participants[1].id}/location`, {
    data: { latitude: 47.550, longitude: 19.080 },
  });

  // Admin endpoint must include a centroid between the two locations
  const adminRes = await page.request.get(`/api/events/${admin_token}`);
  expect(adminRes.ok()).toBeTruthy();
  const adminData = await adminRes.json();

  expect(adminData.centroid).not.toBeNull();
  expect(adminData.centroid.count).toBe(2);
  expect(adminData.centroid.lat).toBeGreaterThan(47.49);
  expect(adminData.centroid.lat).toBeLessThan(47.56);
});
