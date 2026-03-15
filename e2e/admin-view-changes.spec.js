/**
 * E2E tests for admin view changes:
 * - Slot preferences visible per participant after they respond
 * - Venue list uses radio buttons with OSM links
 * - FinalizePanel uses the radio-selected venue (no duplicate dropdown)
 */
import { test, expect } from '@playwright/test';

const BASE_EVENT = {
  name: 'Admin View Changes E2E',
  organizer_email: 'org@admin-changes-e2e.com',
  date_range_start: '2025-09-01',
  date_range_end: '2025-09-01',
  time_range_start: 480, time_range_end: 720,
  timezone: 'UTC',
  deadline: '2099-12-31T23:59:59.000Z',
};

async function createEvent(request, overrides = {}) {
  const res = await request.post('/api/events', { data: { ...BASE_EVENT, ...overrides } });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

// ---------------------------------------------------------------------------
// Slot preference visibility on the admin screen
// ---------------------------------------------------------------------------

test('admin sees slot preferences after a participant responds', async ({ page, request }) => {
  const body = await createEvent(request, {
    participant_emails: ['alice@admin-changes-e2e.com'],
  });
  const participant = body.participants.find(p => p.email === 'alice@admin-changes-e2e.com');
  const firstSlot = body.slots[0];

  // Participant submits availability and confirms
  await request.patch(`/api/participate/${participant.id}/availability`, {
    data: { availability: [{ slot_id: firstSlot.id, state: 'yes' }] },
  });
  await request.patch(`/api/participate/${participant.id}/confirm`);

  await page.goto(`/admin/${body.admin_token}`);

  // Participant row shows "Responded"
  const row = page.getByTestId(`participant-${participant.id}`);
  await expect(row).toBeVisible();
  await expect(row.getByText(/responded/i)).toBeVisible();

  // Availability is shown via colored dots; the hidden list holds the data
  await expect(row.locator('.avail-dot--yes')).toBeVisible();
  await expect(row.getByTestId('slot-availability')).toContainText(/yes/i);
});

test('pending participant has no slot availability list shown', async ({ page, request }) => {
  const body = await createEvent(request, {
    participant_emails: ['bob@admin-changes-e2e.com'],
  });
  const participant = body.participants.find(p => p.email === 'bob@admin-changes-e2e.com');

  await page.goto(`/admin/${body.admin_token}`);

  const row = page.getByTestId(`participant-${participant.id}`);
  await expect(row).toBeVisible();
  await expect(row.getByText(/pending/i)).toBeVisible();
  await expect(row.getByTestId('slot-availability')).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Venue list radio buttons and OSM links
// ---------------------------------------------------------------------------

test('venue cards have radio buttons and OSM links for venue names', async ({ page, request }) => {
  const body = await createEvent(request);
  const pid = body.participants[0].id;
  await request.patch(`/api/participate/${pid}/location`, {
    data: { latitude: 51.5074, longitude: -0.1278 },
  });

  // Mock venue API to avoid hitting Overpass
  await page.route(`/api/events/${body.admin_token}/venues*`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        venues: [
          { id: 'v1', name: 'The Anchor', distanceM: 200, rating: 4.2, latitude: 51.508, longitude: -0.12 },
          { id: 'v2', name: 'Cafe Blue', distanceM: 500, rating: null, latitude: 51.51, longitude: -0.13 },
        ],
      }),
    })
  );

  await page.goto(`/admin/${body.admin_token}`);

  // Trigger venue search via the filter
  await page.getByLabel(/venue type/i).fill('restaurant');
  await page.getByRole('button', { name: /search/i }).click();

  const cards = page.getByTestId('venue-card');
  await expect(cards).toHaveCount(2);

  // Each card has a radio button
  const radios = page.getByTestId('venue-radio');
  await expect(radios).toHaveCount(2);

  // Venue name is a link to openstreetmap.org
  const firstLink = cards.first().getByRole('link');
  await expect(firstLink).toBeVisible();
  await expect(firstLink).toHaveAttribute('href', /openstreetmap\.org/);
});

test('selecting a venue radio updates the FinalizePanel selected venue display', async ({ page, request }) => {
  const body = await createEvent(request);
  const pid = body.participants[0].id;
  await request.patch(`/api/participate/${pid}/location`, {
    data: { latitude: 51.5074, longitude: -0.1278 },
  });

  await page.route(`/api/events/${body.admin_token}/venues*`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        venues: [
          { id: 'v1', name: 'The Anchor', distanceM: 200, rating: 4.2, latitude: 51.508, longitude: -0.12 },
        ],
      }),
    })
  );

  await page.goto(`/admin/${body.admin_token}`);

  // Trigger venue search via the filter
  await page.getByLabel(/venue type/i).fill('restaurant');
  await page.getByRole('button', { name: /search/i }).click();

  await expect(page.getByTestId('venue-card')).toBeVisible();

  // Before selection, FinalizePanel shows "no venue selected"
  await expect(page.getByTestId('selected-venue-display')).toContainText(/no venue selected/i);

  // Select the venue via radio
  await page.getByTestId('venue-radio').first().click();

  // FinalizePanel now shows the selected venue name
  await expect(page.getByTestId('selected-venue-display')).toContainText('The Anchor');
});

// ---------------------------------------------------------------------------
// Finalize with radio-selected recommended venue (no duplicate dropdown)
// ---------------------------------------------------------------------------

test('FinalizePanel has no venue dropdown — finalize works with slot only', async ({ page, request }) => {
  const body = await createEvent(request);
  const pid = body.participants[0].id;
  await request.patch(`/api/participate/${pid}/location`, {
    data: { latitude: 51.5074, longitude: -0.1278 },
  });

  await page.route(`/api/events/${body.admin_token}/venues*`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        venues: [
          { id: 'v1', name: 'The Anchor', distanceM: 200, rating: 4.2, latitude: 51.508, longitude: -0.12 },
        ],
      }),
    })
  );

  await page.goto(`/admin/${body.admin_token}`);

  // Trigger venue search via the filter
  await page.getByLabel(/venue type/i).fill('restaurant');
  await page.getByRole('button', { name: /search/i }).click();

  await expect(page.getByTestId('venue-card')).toBeVisible();

  // There is no venue combobox/dropdown inside FinalizePanel
  await expect(page.getByRole('combobox', { name: /select venue/i })).not.toBeVisible();

  // Finalize with slot only (no venue) — verifies the form still works without the old dropdown
  await page.locator('#slot-select').selectOption({ index: 1 });
  await page.getByRole('button', { name: /finalize event/i }).click();

  await expect(page.getByTestId('finalized-notice')).toBeVisible();
});
