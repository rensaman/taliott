/**
 * E2E tests for US 3.3 — Transactional Finalization
 * Tests the organizer finalization UI flow end-to-end.
 * No mocks — hits the real backend and DB.
 */
import { test, expect } from '@playwright/test';

const BASE_EVENT = {
  name: 'Finalize E2E',
  organizer_email: 'org@finalize-e2e.com',
  invite_mode: 'email_invites',
  participant_emails: [],
  date_range_start: '2025-06-01',
  date_range_end: '2025-06-01',
  time_range_start: 480, time_range_end: 720,
  timezone: 'UTC',
  deadline: '2099-12-31T23:59:59.000Z',
};

async function createEvent(request, overrides = {}) {
  const res = await request.post('/api/events', { data: { ...BASE_EVENT, ...overrides } });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test('finalize panel is visible on admin dashboard for open event', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);
  await expect(page.getByTestId('finalize-panel')).toBeVisible();
});

test('finalize button is disabled until a slot is selected', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);
  await expect(page.getByTestId('finalize-btn')).toBeDisabled();
  await page.locator('[data-testid^="slot-card-"]').first().click();
  await expect(page.getByTestId('finalize-btn')).toBeEnabled();
});

test('organizer selects a slot and finalizes — thank-you screen replaces panel', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);

  await expect(page.getByTestId('finalize-panel')).toBeVisible();

  await page.locator('[data-testid^="slot-card-"]').first().click();
  await page.getByTestId('finalize-btn').click();
  await page.getByTestId('confirm-send-btn').click();

  await expect(page.getByTestId('finalized-thankyou')).toBeVisible();
  await expect(page.getByTestId('finalize-panel')).not.toBeVisible();
});

test('admin dashboard shows thank-you screen after finalization', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);

  await page.locator('[data-testid^="slot-card-"]').first().click();
  await page.getByTestId('finalize-btn').click();
  await page.getByTestId('confirm-send-btn').click();

  await expect(page.getByTestId('finalized-thankyou')).toBeVisible();
});

test('organizer finalizes with custom venue — participant view shows final slot and venue', async ({ page, request }) => {
  const body = await createEvent(request, { participant_emails: ['p@finalize-e2e.com'] });
  const participant = body.participants.find(p => p.email === 'p@finalize-e2e.com');

  await page.goto(`/admin/${body.admin_token}`);

  await page.locator('[data-testid^="slot-card-"]').first().click();
  await page.getByTestId('custom-venue-radio').click();
  await page.getByTestId('custom-venue-name').fill('The Blue Note');
  await page.getByTestId('custom-venue-address').fill('131 W 3rd St, New York');
  await page.getByTestId('finalize-btn').click();
  await page.getByTestId('confirm-send-btn').click();

  await expect(page.getByTestId('finalized-thankyou')).toBeVisible();

  await page.goto(`/participate/${participant.id}`);
  await expect(page.getByTestId('finalized-banner')).toBeVisible();
  await expect(page.getByText('The Blue Note')).toBeVisible();
  await expect(page.getByText(/131 W 3rd St/)).toBeVisible();
});

test('participant view is read-only after organizer finalizes', async ({ page, request }) => {
  const body = await createEvent(request, { participant_emails: ['p@finalize-e2e.com'] });

  // Find the non-organizer participant
  const participant = body.participants.find(p => p.email === 'p@finalize-e2e.com');

  // Finalize via API directly
  const slots = body.slots;
  await request.post(`/api/events/${body.admin_token}/finalize`, {
    data: { slot_id: slots[0].id },
  });

  // Participant visits their link — should see locked/results-only state and finalized banner
  await page.goto(`/participate/${participant.id}`);
  await expect(page.getByTestId('results-only-status')).toBeVisible();
  await expect(page.getByTestId('finalized-banner')).toBeVisible();
});
