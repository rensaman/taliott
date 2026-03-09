/**
 * E2E tests for US 1.6 — Self-Registration via Shared Join Link
 */
import { test, expect } from '@playwright/test';
import { clearMailpit, waitForEmail } from './mailpit.js';

const SHARED_LINK_EVENT = {
  name: 'Join E2E Event',
  organizer_email: 'join-org@example.com',
  invite_mode: 'shared_link',
  date_range_start: '2025-09-01',
  date_range_end: '2025-09-01',
  part_of_day: 'morning',
  timezone: 'UTC',
  deadline: '2099-12-31T23:59:59.000Z',
};

async function createSharedLinkEvent(request) {
  const res = await request.post('/api/events', { data: SHARED_LINK_EVENT });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.join_url; // e.g. /join/<token>
}

test.describe('join page', () => {
  test('shows event name and deadline for a valid join link', async ({ page, request }) => {
    const joinUrl = await createSharedLinkEvent(request);
    await page.goto(joinUrl);
    await expect(page.getByRole('heading', { name: SHARED_LINK_EVENT.name })).toBeVisible();
    await expect(page.getByText(/deadline/i)).toBeVisible();
  });

  test('shows invalid message for an unknown join token', async ({ page }) => {
    await page.goto('/join/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
  });

  test('shows closed message for a locked event', async ({ page, request }) => {
    const res = await request.post('/api/events', {
      data: { ...SHARED_LINK_EVENT, deadline: '2000-01-01T00:00:00.000Z' },
    });
    const body = await res.json();
    await page.goto(body.join_url);
    await expect(page.getByTestId('closed-message')).toBeVisible();
  });

  test('participant enters email and is redirected to participate view', async ({ page, request }) => {
    const joinUrl = await createSharedLinkEvent(request);
    await page.goto(joinUrl);

    await page.getByLabel(/email/i).fill('e2e-joiner@example.com');
    await page.getByRole('button', { name: /join event/i }).click();

    await expect(page).toHaveURL(/\/participate\/[0-9a-f-]{36}$/);
  });

  test('different participants each get their own participate URL', async ({ page, request }) => {
    const joinUrl = await createSharedLinkEvent(request);

    await page.goto(joinUrl);
    await page.getByLabel(/email/i).fill('participant-one@example.com');
    await page.getByRole('button', { name: /join event/i }).click();
    await expect(page).toHaveURL(/\/participate\/[0-9a-f-]{36}$/);
    const firstUrl = page.url();

    await page.goto(joinUrl);
    await page.getByLabel(/email/i).fill('participant-two@example.com');
    await page.getByRole('button', { name: /join event/i }).click();
    await expect(page).toHaveURL(/\/participate\/[0-9a-f-]{36}$/);
    const secondUrl = page.url();

    expect(firstUrl).not.toBe(secondUrl);
  });

  test('same email re-registration lands on same participate view', async ({ page, request }) => {
    const joinUrl = await createSharedLinkEvent(request);

    await page.goto(joinUrl);
    await page.getByLabel(/email/i).fill('repeat-joiner@example.com');
    await page.getByRole('button', { name: /join event/i }).click();
    await expect(page).toHaveURL(/\/participate\/[0-9a-f-]{36}$/);
    const firstUrl = page.url();

    await page.goto(joinUrl);
    await page.getByLabel(/email/i).fill('repeat-joiner@example.com');
    await page.getByRole('button', { name: /join event/i }).click();
    await expect(page).toHaveURL(/\/participate\/[0-9a-f-]{36}$/);
    expect(page.url()).toBe(firstUrl);
  });
});

test.describe.serial('join confirmation email', () => {
  test.beforeAll(async () => {
    await clearMailpit();
  });

  test('participant receives confirmation email with participation link after joining', async ({ page, request }) => {
    const joinUrl = await createSharedLinkEvent(request);
    await page.goto(joinUrl);

    const joinerEmail = 'email-joiner@example.com';
    await page.getByLabel(/email/i).fill(joinerEmail);
    await page.getByRole('button', { name: /join event/i }).click();
    await expect(page).toHaveURL(/\/participate\/[0-9a-f-]{36}$/);

    const participantId = page.url().split('/').at(-1);
    const email = await waitForEmail(joinerEmail, { timeout: 5_000 });
    expect(email.Subject).toMatch(/registered/i);

    // Fetch full message to verify body contains participation link
    const msgRes = await fetch(`http://localhost:8025/api/v1/message/${email.ID}`);
    const msg = await msgRes.json();
    expect(msg.Text ?? msg.HTML).toContain(`/participate/${participantId}`);
  });
});
