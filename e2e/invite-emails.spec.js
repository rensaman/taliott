/**
 * E2E tests for US 1.3 + US 1.4 — Tokenized Email Distribution & Organizer Confirmation
 * Verifies that invite and confirmation emails land in Mailpit after event creation.
 */
import { test, expect } from '@playwright/test';
import { waitForEmail } from './mailpit.js';
import { fillWizard } from './helpers.js';

// Unique suffix per test run prevents stale emails in Mailpit from matching
// the since filter and causing false positives or accumulated-DB interference.
const RUN_ID = Date.now();

test.describe.serial('invite emails via Mailpit', () => {
  test('organizer receives a confirmation email with admin link', async ({ page }) => {
    const orgEmail = `organizer-${RUN_ID}@example.com`;
    const res = await page.request.post('/api/events', {
      data: {
        name: 'Invite E2E Event',
        organizer_email: orgEmail,
        participant_emails: [`invitee1-${RUN_ID}@example.com`],
        date_range_start: '2025-08-01',
        date_range_end: '2025-08-01',
        time_range_start: 480, time_range_end: 720,
        timezone: 'UTC',
        deadline: '2099-12-31T23:59:59.000Z',
      },
    });
    expect(res.ok()).toBeTruthy();
    const { admin_token } = await res.json();

    // Unique email — no since filter needed
    const confirmationEmail = await waitForEmail(orgEmail, { timeout: 8000, subject: 'is ready' });
    expect(confirmationEmail).toBeDefined();

    const msgRes = await fetch(`http://localhost:8025/api/v1/message/${confirmationEmail.ID}`);
    const msg = await msgRes.json();
    expect(msg.Text).toContain(`/admin/${admin_token}`);
  });

  test('each invitee receives an email containing their participation link', async ({ page }) => {
    const guest1Email = `guest1-${RUN_ID}@example.com`;
    const guest2Email = `guest2-${RUN_ID}@example.com`;
    const res = await page.request.post('/api/events', {
      data: {
        name: 'Multi Invite E2E',
        organizer_email: `host-${RUN_ID}@example.com`,
        participant_emails: [guest1Email, guest2Email],
        date_range_start: '2025-08-02',
        date_range_end: '2025-08-02',
        time_range_start: 480, time_range_end: 720,
        timezone: 'UTC',
        deadline: '2099-12-31T23:59:59.000Z',
      },
    });
    expect(res.ok()).toBeTruthy();
    const { participants } = await res.json();

    const guest1 = participants.find(p => p.email === guest1Email);
    const guest2 = participants.find(p => p.email === guest2Email);

    // Unique emails — no since filter needed
    const email1 = await waitForEmail(guest1Email, { timeout: 10_000 });
    const email2 = await waitForEmail(guest2Email, { timeout: 10_000 });

    expect(email1.Subject).toContain('Multi Invite E2E');
    expect(email2.Subject).toContain('Multi Invite E2E');

    const msgRes1 = await fetch(`http://localhost:8025/api/v1/message/${email1.ID}`);
    const msg1 = await msgRes1.json();
    expect(msg1.Text).toContain(`/participate/${guest1.id}`);

    const msgRes2 = await fetch(`http://localhost:8025/api/v1/message/${email2.ID}`);
    const msg2 = await msgRes2.json();
    expect(msg2.Text).toContain(`/participate/${guest2.id}`);
  });

  test('confirmation screen shows admin token after form submit', async ({ page }) => {
    await page.goto('/');
    await fillWizard(page, {
      name: 'E2E Confirmation Test',
      organizerEmail: `conf-${RUN_ID}@example.com`,
      dateStart: '2025-09-01',
      dateEnd: '2025-09-01',
      deadline: '2025-08-31T12:00',
    });
    await page.getByRole('button', { name: /create event/i }).click();

    await expect(page.getByTestId('admin-token')).toBeVisible();
  });
});
