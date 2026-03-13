/**
 * E2E tests for US 1.3 + US 1.4 — Tokenized Email Distribution & Organizer Confirmation
 * Verifies that invite and confirmation emails land in Mailpit after event creation.
 */
import { test, expect } from '@playwright/test';
import { waitForEmail } from './mailpit.js';
import { fillWizard } from './helpers.js';

test.describe.serial('invite emails via Mailpit', () => {
  test('organizer receives a confirmation email with admin link', async ({ page }) => {
    const since = new Date();
    const res = await page.request.post('/api/events', {
      data: {
        name: 'Invite E2E Event',
        organizer_email: 'organizer-e2e@example.com',
        participant_emails: ['invitee1-e2e@example.com'],
        date_range_start: '2025-08-01',
        date_range_end: '2025-08-01',
        part_of_day: 'morning',
        timezone: 'UTC',
        deadline: '2099-12-31T23:59:59.000Z',
      },
    });
    expect(res.ok()).toBeTruthy();
    const { admin_token } = await res.json();

    // Poll until we find the confirmation email (subject contains "is ready")
    const deadline = Date.now() + 5_000;
    let confirmationEmail;
    while (Date.now() < deadline) {
      const listRes = await fetch('http://localhost:8025/api/v1/messages');
      const data = await listRes.json();
      confirmationEmail = data.messages?.find(m =>
        m.To?.some(t => t.Address === 'organizer-e2e@example.com') &&
        m.Subject?.includes('is ready') &&
        new Date(m.Created) >= since
      );
      if (confirmationEmail) break;
      await page.waitForTimeout(300);
    }
    expect(confirmationEmail).toBeDefined();

    const msgRes = await fetch(`http://localhost:8025/api/v1/message/${confirmationEmail.ID}`);
    const msg = await msgRes.json();
    expect(msg.Text).toContain(`/admin/${admin_token}`);
  });

  test('each invitee receives an email containing their participation link', async ({ page }) => {
    const since = new Date();
    const res = await page.request.post('/api/events', {
      data: {
        name: 'Multi Invite E2E',
        organizer_email: 'host-e2e@example.com',
        participant_emails: ['guest1-e2e@example.com', 'guest2-e2e@example.com'],
        date_range_start: '2025-08-02',
        date_range_end: '2025-08-02',
        part_of_day: 'morning',
        timezone: 'UTC',
        deadline: '2099-12-31T23:59:59.000Z',
      },
    });
    expect(res.ok()).toBeTruthy();
    const { participants } = await res.json();

    const guest1 = participants.find(p => p.email === 'guest1-e2e@example.com');
    const guest2 = participants.find(p => p.email === 'guest2-e2e@example.com');

    const email1 = await waitForEmail('guest1-e2e@example.com', { timeout: 10_000, since });
    const email2 = await waitForEmail('guest2-e2e@example.com', { timeout: 10_000, since });

    // Verify each email links to the correct participant path
    const body1 = email1.Snippet ?? '';
    const body2 = email2.Snippet ?? '';

    expect(email1.Subject).toContain('Multi Invite E2E');
    expect(email2.Subject).toContain('Multi Invite E2E');

    // Fetch full message body to check participate link
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
      organizerEmail: 'conf-e2e@example.com',
      dateStart: '2025-09-01',
      dateEnd: '2025-09-01',
      deadline: '2025-08-31T12:00',
    });
    await page.getByRole('button', { name: /create event/i }).click();

    await expect(page.getByTestId('admin-token')).toBeVisible();
  });
});
