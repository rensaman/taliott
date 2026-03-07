/**
 * E2E tests for US 1.2 — Hard Voting Deadline
 * Hits the real backend and DB.
 */
import { test, expect } from '@playwright/test';
import { clearMailpit, waitForEmail } from './mailpit.js';

const PAST_DEADLINE = '2020-01-01T00:00:00.000Z';
const FUTURE_DEADLINE = '2099-12-31T23:59:59.000Z';

async function createEvent(page, overrides = {}) {
  const res = await page.request.post('/api/events', {
    data: {
      name: 'Deadline E2E',
      organizer_email: 'alex@example.com',
      date_range_start: '2025-06-01',
      date_range_end: '2025-06-01',
      part_of_day: 'morning',
      deadline: PAST_DEADLINE,
      ...overrides,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test('participant visiting a past-deadline link sees locked state', async ({ page }) => {
  const { participants } = await createEvent(page, { deadline: PAST_DEADLINE });
  const pid = participants[0].id;

  await page.goto(`/participate/${pid}`);

  await expect(page.getByRole('heading', { name: /deadline e2e/i })).toBeVisible();
  await expect(page.getByText(/voting closed/i)).toBeVisible();
  await expect(page.getByRole('status')).toHaveText(/results only/i);
});

test('participant visiting an open event sees deadline and no locked banner', async ({ page }) => {
  const { participants } = await createEvent(page, { deadline: FUTURE_DEADLINE });
  const pid = participants[0].id;

  await page.goto(`/participate/${pid}`);

  await expect(page.getByRole('heading', { name: /deadline e2e/i })).toBeVisible();
  await expect(page.getByText(/voting deadline/i)).toBeVisible();
  await expect(page.getByRole('status')).not.toBeVisible();
});

test('participation view shows the correct number of time slots', async ({ page }) => {
  const { participants, slots } = await createEvent(page, { deadline: FUTURE_DEADLINE });
  const pid = participants[0].id;

  await page.goto(`/participate/${pid}`);

  await expect(page.getByTestId('slot-cell')).toHaveCount(slots.length);
});

// Email tests run serially to avoid Mailpit race conditions between parallel workers.
test.describe.serial('email notifications via Mailpit', () => {
  test.beforeAll(async () => {
    await clearMailpit();
  });

  test('deadline worker sends organizer email when event expires', async ({ page }) => {
    await createEvent(page, {
      deadline: PAST_DEADLINE,
      name: 'Email Notification Test',
      organizer_email: 'notify1@example.com',
    });

    const res = await page.request.post('/api/admin/run-deadline-worker');
    expect(res.ok()).toBeTruthy();
    const { locked } = await res.json();
    expect(locked).toBeGreaterThanOrEqual(1);

    const email = await waitForEmail('notify1@example.com');
    expect(email.Subject).toContain('Email Notification Test');
    expect(email.Subject).toMatch(/voting has closed/i);
  });

  test('deadline worker does not re-email when event is already locked', async ({ page }) => {
    await createEvent(page, {
      deadline: PAST_DEADLINE,
      name: 'Already Locked Event',
      organizer_email: 'notify2@example.com',
    });

    // First run — locks and emails
    await page.request.post('/api/admin/run-deadline-worker');
    await waitForEmail('notify2@example.com');

    // Second run — already locked, no new email
    await page.request.post('/api/admin/run-deadline-worker');
    await page.waitForTimeout(800);

    const data = await (await fetch('http://localhost:8025/api/v1/messages')).json();
    const count = data.messages?.filter(m =>
      m.To?.some(t => t.Address === 'notify2@example.com') &&
      m.Subject?.toLowerCase().includes('voting has closed')
    ).length ?? 0;
    expect(count).toBe(1);
  });
});
