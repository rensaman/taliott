/**
 * E2E tests for US 1.5 — Invite Mode Selection
 * Uses mocked API to verify UI behaviour for both invite modes.
 */
import { test, expect } from '@playwright/test';
import { clearMailpit } from './mailpit.js';
import { fillWizard } from './helpers.js';

const BASE_FORM = {
  name: 'Invite Mode E2E',
  organizerEmail: 'organizer@example.com',
  dateStart: '2025-09-01',
  dateEnd: '2025-09-01',
  deadline: '2025-08-25T12:00',
};

test.describe('invite mode selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows both invite mode options with email_invites selected by default', async ({ page }) => {
    await fillWizard(page, { ...BASE_FORM, stopAt: 'invite_mode' });
    await expect(page.getByRole('radio', { name: /send email invites/i })).toBeChecked();
    await expect(page.getByRole('radio', { name: /share a join link/i })).not.toBeChecked();
  });

  test('shows participant emails textarea when email_invites is selected', async ({ page }) => {
    await fillWizard(page, { ...BASE_FORM, stopAt: 'invite_mode' });
    // email_invites is the default — advance to the participant_emails step
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByLabel(/participant emails/i)).toBeVisible();
  });

  test('hides participant emails textarea when shared_link is selected', async ({ page }) => {
    await fillWizard(page, { ...BASE_FORM, stopAt: 'invite_mode' });
    await page.getByRole('radio', { name: /share a join link/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    // participant_emails step is skipped — review heading should be visible instead
    await expect(page.getByRole('heading', { name: /ready to create/i })).toBeVisible();
    await expect(page.getByLabel(/participant emails/i)).not.toBeVisible();
  });

  test('confirmation screen shows join URL with copy button when shared_link is selected', async ({ page }) => {
    await fillWizard(page, { ...BASE_FORM, inviteMode: 'shared_link' });
    await page.getByRole('button', { name: /create event/i }).click();

    await expect(page.getByTestId('join-url')).toBeVisible();
    await expect(page.getByRole('button', { name: /copy/i })).toBeVisible();
    // Participant email count message should NOT appear
    await expect(page.getByText(/invite emails have been sent/i)).not.toBeVisible();
  });

  test('confirmation screen shows participant count when email_invites is selected', async ({ page }) => {
    await fillWizard(page, { ...BASE_FORM, participantEmails: 'a@example.com' });
    await page.getByRole('button', { name: /create event/i }).click();

    await expect(page.getByText(/invite emails have been sent/i)).toBeVisible();
    await expect(page.getByTestId('join-url')).not.toBeVisible();
  });
});

test.describe.serial('shared_link mode — only organizer enrolled at creation', () => {
  test.beforeAll(async () => {
    await clearMailpit();
  });

  test('shared_link event creation creates organizer as participant and sends them a participant invite', async ({ page }) => {
    const res = await page.request.post('/api/events', {
      data: {
        name: 'Shared Link E2E',
        organizer_email: 'sl-org@example.com',
        invite_mode: 'shared_link',
        date_range_start: '2025-09-01',
        date_range_end: '2025-09-01',
        part_of_day: 'morning',
        timezone: 'UTC',
        deadline: '2099-12-31T23:59:59.000Z',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.join_url).toMatch(/\/join\/[0-9a-f-]{36}$/);
    // Organizer is always a participant — exactly 1 row created at event creation
    expect(body.participants).toHaveLength(1);
    expect(body.participants[0].email).toBe('sl-org@example.com');

    // Organizer receives both a participant invite and a confirmation email
    await page.waitForTimeout(500);
    const listRes = await fetch('http://localhost:8025/api/v1/messages');
    const data = await listRes.json();
    const orgEmails = data.messages?.filter(m =>
      m.To?.some(t => t.Address === 'sl-org@example.com')
    ) ?? [];
    // participant invite + organizer confirmation = 2 emails
    expect(orgEmails).toHaveLength(2);
  });
});
