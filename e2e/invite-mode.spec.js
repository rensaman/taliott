/**
 * E2E tests for US 1.5 — Invite Mode Selection
 * Uses mocked API to verify UI behaviour for both invite modes.
 */
import { test, expect } from '@playwright/test';
import { clearMailpit } from './mailpit.js';

const BASE_FORM = {
  name: 'Invite Mode E2E',
  from: '2025-09-01',
  to: '2025-09-01',
  deadline: '2025-08-25T12:00',
};

async function fillForm(page, { name, from, to, deadline }) {
  await page.getByLabel(/event name/i).fill(name);
  await page.getByLabel(/your email/i).fill('organizer@example.com');
  await page.getByLabel(/from/i).fill(from);
  await page.getByLabel(/to/i).fill(to);
  await page.getByLabel(/voting deadline/i).fill(deadline);
}

test.describe('invite mode selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows both invite mode options with email_invites selected by default', async ({ page }) => {
    await expect(page.getByRole('radio', { name: /send email invites/i })).toBeChecked();
    await expect(page.getByRole('radio', { name: /share a join link/i })).not.toBeChecked();
  });

  test('shows participant emails textarea when email_invites is selected', async ({ page }) => {
    await expect(page.getByLabel(/participant emails/i)).toBeVisible();
  });

  test('hides participant emails textarea when shared_link is selected', async ({ page }) => {
    await page.getByRole('radio', { name: /share a join link/i }).click();
    await expect(page.getByLabel(/participant emails/i)).not.toBeVisible();
  });

  test('confirmation screen shows join URL with copy button when shared_link is selected', async ({ page }) => {
    const JOIN_URL = '/join/00000000-0000-0000-0000-000000000001';

    await page.route('/api/events', route =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          event_id: 'e2e-id',
          name: BASE_FORM.name,
          admin_token: 'e2e-admin-token',
          slots: [{ id: 'slot-1' }],
          participants: [],
          join_url: JOIN_URL,
        }),
      })
    );

    await fillForm(page, BASE_FORM);
    await page.getByRole('radio', { name: /share a join link/i }).click();
    await page.getByRole('button', { name: /create event/i }).click();

    await expect(page.getByTestId('join-url')).toBeVisible();
    await expect(page.getByRole('button', { name: /copy/i })).toBeVisible();
    // Participant email count message should NOT appear
    await expect(page.getByText(/invite emails have been sent/i)).not.toBeVisible();
  });

  test('confirmation screen shows participant count when email_invites is selected', async ({ page }) => {
    await page.route('/api/events', route =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          event_id: 'e2e-id',
          name: BASE_FORM.name,
          admin_token: 'e2e-admin-token',
          slots: [{ id: 'slot-1' }],
          participants: [{ id: 'p-1', email: 'a@example.com' }],
        }),
      })
    );

    await fillForm(page, BASE_FORM);
    await page.getByRole('button', { name: /create event/i }).click();

    await expect(page.getByText(/invite emails have been sent/i)).toBeVisible();
    await expect(page.getByTestId('join-url')).not.toBeVisible();
  });
});

test.describe.serial('shared_link mode — no invite emails sent', () => {
  test.beforeAll(async () => {
    await clearMailpit();
  });

  test('shared_link event creation sends no participant invite emails', async ({ page }) => {
    const res = await page.request.post('/api/events', {
      data: {
        name: 'Shared Link E2E',
        organizer_email: 'sl-org@example.com',
        invite_mode: 'shared_link',
        date_range_start: '2025-09-01',
        date_range_end: '2025-09-01',
        part_of_day: 'morning',
        deadline: '2099-12-31T23:59:59.000Z',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.join_url).toMatch(/\/join\/[0-9a-f-]{36}$/);
    expect(body.participants).toHaveLength(0);

    // Wait briefly then confirm no "You're invited" emails were sent
    await page.waitForTimeout(500);
    const listRes = await fetch('http://localhost:8025/api/v1/messages');
    const data = await listRes.json();
    const inviteEmails = data.messages?.filter(m =>
      m.Subject?.toLowerCase().includes("you're invited") &&
      m.To?.some(t => t.Address === 'sl-org@example.com')
    ) ?? [];
    expect(inviteEmails).toHaveLength(0);
  });
});
