/**
 * E2E tests for GDPR data rights UI:
 *   - Participant: Download my data
 *   - Participant: Delete my data
 *   - Organiser:   Delete event
 */
import { test, expect } from '@playwright/test';

const BASE_EVENT = {
  name: 'GDPR E2E Event',
  organizer_email: 'gdpr-e2e@example.com',
  date_range_start: '2025-10-01',
  date_range_end: '2025-10-01',
  time_range_start: 480, time_range_end: 720,
  timezone: 'UTC',
  deadline: '2099-12-31T23:59:59.000Z',
};

async function createEvent(request, overrides = {}) {
  const res = await request.post('/api/events', { data: { ...BASE_EVENT, ...overrides } });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

// ─── Participant page ─────────────────────────────────────────────────────────

test('participation page shows Download and Delete buttons', async ({ page, request }) => {
  const { participants } = await createEvent(request);
  await page.goto(`/participate/${participants[0].id}`);

  await expect(page.getByTestId('download-data-btn')).toBeVisible();
  await expect(page.getByTestId('delete-data-btn')).toBeVisible();
});

test('participant can download their data as JSON', async ({ page, request }) => {
  const { participants } = await createEvent(request);
  const pid = participants[0].id;

  await page.goto(`/participate/${pid}`);

  const download = page.waitForEvent('download');
  await page.getByTestId('download-data-btn').click();
  const dl = await download;

  expect(dl.suggestedFilename()).toBe('my-taliott-data.json');

  // Verify the downloaded content is valid JSON containing the participant
  const stream = await dl.createReadStream();
  let raw = '';
  for await (const chunk of stream) raw += chunk;
  const data = JSON.parse(raw);
  expect(data.participant_id).toBe(pid);
  expect(data.email).toBe('gdpr-e2e@example.com');
});

test('participant deletes their data — personal fields are gone from the API', async ({ page, request }) => {
  const { participants, slots } = await createEvent(request);
  const pid = participants[0].id;

  // Set some personal data first
  await request.patch(`/api/participate/${pid}/name`, { data: { name: 'Alice' } });
  await request.patch(`/api/participate/${pid}/location`, {
    data: { latitude: 48.8566, longitude: 2.3522, address_label: 'Paris' },
  });
  await request.patch(`/api/participate/${pid}/availability`, {
    data: { availability: [{ slot_id: slots[0].id, state: 'yes' }] },
  });

  await page.goto(`/participate/${pid}`);
  await expect(page.getByTestId('delete-data-btn')).toBeVisible();

  // Accept the confirmation dialog
  page.once('dialog', d => d.accept());
  await page.getByTestId('delete-data-btn').click();

  // Page shows erasure confirmation
  await expect(page.getByTestId('data-erased-status')).toBeVisible();

  // Delete button is gone
  await expect(page.getByTestId('delete-data-btn')).not.toBeVisible();

  // API confirms personal data is gone
  const res = await request.get(`/api/participate/${pid}`);
  const data = await res.json();
  expect(data.participant.name).toBeNull();
  expect(data.participant.latitude).toBeNull();
  expect(data.availability).toHaveLength(0);
});

test('participant cancels the delete confirmation — data is preserved', async ({ page, request }) => {
  const { participants } = await createEvent(request);
  const pid = participants[0].id;

  await request.patch(`/api/participate/${pid}/name`, { data: { name: 'Bob' } });

  await page.goto(`/participate/${pid}`);

  // Dismiss the confirmation dialog
  page.once('dialog', d => d.dismiss());
  await page.getByTestId('delete-data-btn').click();

  // Status message should not appear
  await expect(page.getByTestId('data-erased-status')).not.toBeVisible();

  // Data should still be intact
  const res = await request.get(`/api/participate/${pid}`);
  const data = await res.json();
  expect(data.participant.name).toBe('Bob');
});

// ─── Admin page ───────────────────────────────────────────────────────────────

test('admin page shows Delete event button', async ({ page, request }) => {
  const { admin_token } = await createEvent(request);
  await page.goto(`/admin/${admin_token}`);

  await expect(page.getByTestId('delete-event-btn')).toBeVisible();
});

test('organiser deletes the event and is redirected to the home page', async ({ page, request }) => {
  const { admin_token, event_id } = await createEvent(request);
  await page.goto(`/admin/${admin_token}`);

  await page.getByTestId('delete-event-btn').click();
  await page.getByTestId('delete-confirm-btn').click();

  await expect(page).toHaveURL('/');

  // Event API should return 404
  const res = await request.get(`/api/events/${admin_token}`);
  expect(res.status()).toBe(404);
});

test('organiser cancels event deletion — event is preserved', async ({ page, request }) => {
  const { admin_token } = await createEvent(request);
  await page.goto(`/admin/${admin_token}`);

  page.once('dialog', d => d.dismiss());
  await page.getByTestId('delete-event-btn').click();

  // Still on admin page
  await expect(page).toHaveURL(new RegExp(`/admin/${admin_token}`));
  await expect(page.getByRole('heading', { name: BASE_EVENT.name })).toBeVisible();
});
