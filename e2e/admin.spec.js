/**
 * E2E tests for US 3.0 — Admin Dashboard Shell
 * E2E tests for US 3.1 — Geographic Centroid Calculation
 * E2E tests for US 3.2 — Contextual Venue Recommendations
 */
import { test, expect } from '@playwright/test';

const BASE_EVENT = {
  name: 'Admin E2E Event',
  organizer_email: 'admin-e2e-org@example.com',
  participant_emails: ['jamie@example.com', 'sam@example.com'],
  date_range_start: '2025-09-01',
  date_range_end: '2025-09-01',
  part_of_day: 'morning',
  deadline: '2099-12-31T23:59:59.000Z',
};

async function createEvent(request, overrides = {}) {
  const res = await request.post('/api/events', { data: { ...BASE_EVENT, ...overrides } });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test('unknown admin token shows 404 error', async ({ page }) => {
  await page.goto('/admin/00000000-0000-0000-0000-000000000000');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('organizer navigates to admin link and sees dashboard with event data', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);

  await expect(page.getByRole('heading', { name: BASE_EVENT.name })).toBeVisible();
  await expect(page.locator('p:has-text("Status:") strong')).toHaveText('open');
  await expect(page.getByText(/deadline/i)).toBeVisible();
});

test('dashboard shows participant list with pending status before any response', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);

  await expect(page.getByText('jamie@example.com')).toBeVisible();
  await expect(page.getByText('sam@example.com')).toBeVisible();
  await expect(page.getByText(/pending/i).first()).toBeVisible();
});

test('dashboard shows response count summary', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);

  // 0 of N responded before anyone confirms
  await expect(page.getByText(/0 of \d+ responded/i)).toBeVisible();
});

test('admin view shows centroid marker when participants have locations', async ({ page, request }) => {
  const body = await createEvent(request);
  const pid = body.participants[0].id;

  // Give the first participant a location
  await request.patch(`/api/participate/${pid}/location`, {
    data: { latitude: 51.5074, longitude: -0.1278 },
  });

  await page.goto(`/admin/${body.admin_token}`);

  // Map is rendered
  await expect(page.locator('[data-testid="location-map"], .leaflet-container').first()).toBeVisible({ timeout: 5000 });

  // Coverage counter is shown
  await expect(page.getByTestId('coverage-counter')).toBeVisible();
  await expect(page.getByText(/1 of \d+ participants included in fair center/i)).toBeVisible();
});

test('admin view shows no coverage counter when no participants have locations', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);

  // Coverage counter should not be present when centroid is null
  await expect(page.getByTestId('coverage-counter')).not.toBeVisible();
});

test('venue list section is visible on the admin dashboard', async ({ page, request }) => {
  const body = await createEvent(request, { venue_type: 'restaurant' });
  const pid = body.participants[0].id;

  // Give a participant a location so centroid is available
  await request.patch(`/api/participate/${pid}/location`, {
    data: { latitude: 51.5074, longitude: -0.1278 },
  });

  await page.goto(`/admin/${body.admin_token}`);

  await expect(page.getByTestId('venue-list-section')).toBeVisible();
  await expect(page.getByRole('heading', { name: /venue recommendations/i })).toBeVisible();
  await expect(page.getByTestId('venue-type-filter')).toBeVisible();
  // Filter input is pre-populated with the event's venue_type
  await expect(page.getByLabel(/venue type/i)).toHaveValue('restaurant');
});

test('changing venue type filter triggers a new venue search', async ({ page, request }) => {
  const body = await createEvent(request, { venue_type: 'restaurant' });
  const pid = body.participants[0].id;
  await request.patch(`/api/participate/${pid}/location`, {
    data: { latitude: 51.5074, longitude: -0.1278 },
  });

  await page.goto(`/admin/${body.admin_token}`);
  await expect(page.getByTestId('venue-type-filter')).toBeVisible();

  // Intercept the venues API call to mock the response
  await page.route(`/api/events/${body.admin_token}/venues*`, route => {
    const url = new URL(route.request().url());
    const vt = url.searchParams.get('venue_type');
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        venues: [
          { id: 'v1', name: `Test ${vt}`, distanceM: 300, rating: 4.0, latitude: 51.508, longitude: -0.12 },
        ],
      }),
    });
  });

  // Change the filter to 'bar' and submit
  await page.getByLabel(/venue type/i).fill('bar');
  await page.getByRole('button', { name: /search/i }).click();

  await expect(page.getByTestId('venue-card').getByText('Test bar')).toBeVisible();
  await expect(page.getByTestId('venue-card')).toBeVisible();
});

test('confirmation screen admin link navigates to dashboard with correct event data', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/event name/i).fill('Confirm Nav Test');
  await page.getByLabel(/your email/i).fill('admin-e2e-org@example.com');
  await page.getByLabel(/from/i).fill('2025-09-01');
  await page.getByLabel(/to/i).fill('2025-09-01');
  await page.getByLabel(/voting deadline/i).fill('2099-12-31T23:59');
  await page.getByRole('button', { name: /create event/i }).click();

  const adminLink = page.getByTestId('admin-token');
  await expect(adminLink).toBeVisible();
  await adminLink.click();

  await expect(page).toHaveURL(/\/admin\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Confirm Nav Test' })).toBeVisible();
});
