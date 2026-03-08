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
  part_of_day: 'morning',
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
  await expect(page.getByRole('button', { name: /finalize event/i })).toBeDisabled();
  await page.locator('#slot-select').selectOption({ index: 1 });
  await expect(page.getByRole('button', { name: /finalize event/i })).toBeEnabled();
});

test('organizer selects a slot and finalizes — finalized notice replaces panel', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);

  await expect(page.getByTestId('finalize-panel')).toBeVisible();

  await page.locator('#slot-select').selectOption({ index: 1 });
  await page.getByRole('button', { name: /finalize event/i }).click();

  await expect(page.getByTestId('finalized-notice')).toBeVisible();
  await expect(page.getByTestId('finalize-panel')).not.toBeVisible();
});

test('admin dashboard shows "finalized" status after finalization', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);

  await page.locator('#slot-select').selectOption({ index: 1 });
  await page.getByRole('button', { name: /finalize event/i }).click();

  await expect(page.getByTestId('finalized-notice')).toBeVisible();
  await expect(page.getByText(/status/i)).toContainText('finalized');
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

  // Participant visits their link — should see locked/results-only state
  await page.goto(`/participate/${participant.id}`);
  await expect(page.getByRole('status')).toHaveText(/results only/i);
});
