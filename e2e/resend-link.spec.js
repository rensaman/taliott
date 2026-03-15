/**
 * E2E tests for US 1.7 — Link Recovery
 * Tests the "Resend my link" page end-to-end via Mailpit.
 * No mocks — hits the real backend.
 */
import { test, expect } from '@playwright/test';
import { waitForEmail } from './mailpit.js';

// Unique suffix per test run: prevents rate-limit exhaustion and accumulated
// DB events from prior runs interfering with email lookups.
const RUN_ID = Date.now();

test('/resend page renders an email input and submit button', async ({ page }) => {
  await page.goto('/resend');
  await expect(page.getByRole('heading', { name: /recover your link/i })).toBeVisible();
  await expect(page.getByLabel(/your email/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /send my link/i })).toBeVisible();
});

test('submitting an unknown email shows confirmation message but sends no email', async ({ page }) => {
  await page.goto('/resend');
  await page.getByLabel(/your email/i).fill('nobody@unknown-resend.com');
  await page.getByRole('button', { name: /send my link/i }).click();

  await expect(page.getByRole('status')).toContainText(/if we found a matching event/i);
});

test('organizer recovers admin link via resend page', async ({ page, request }) => {
  const orgEmail = `org-${RUN_ID}@resend-e2e.com`;

  const res = await request.post('/api/events', {
    data: {
      name: 'Resend E2E Event',
      organizer_email: orgEmail,
      invite_mode: 'email_invites',
      participant_emails: [],
      date_range_start: '2025-09-01',
      date_range_end: '2025-09-01',
      time_range_start: 480, time_range_end: 720,
      timezone: 'UTC',
      deadline: '2099-12-31T23:59:59.000Z',
    },
  });
  expect(res.ok()).toBeTruthy();

  await page.goto('/resend');
  await page.getByLabel(/your email/i).fill(orgEmail);
  await page.getByRole('button', { name: /send my link/i }).click();

  await expect(page.getByRole('status')).toContainText(/if we found a matching event/i);

  // Unique email means no interference — no since filter needed
  const email = await waitForEmail(orgEmail, { timeout: 8000, subject: 'is ready' });
  expect(email).toBeDefined();
  const msgRes = await fetch(`http://localhost:8025/api/v1/message/${email.ID}`);
  const msg = await msgRes.json();
  expect(msg.Text).toContain('/admin/');
});

test('participant recovers participation link via resend page', async ({ page, request }) => {
  const orgEmail = `org2-${RUN_ID}@resend-e2e.com`;
  const partEmail = `part-${RUN_ID}@resend-e2e.com`;

  const res = await request.post('/api/events', {
    data: {
      name: 'Resend Participant E2E',
      organizer_email: orgEmail,
      invite_mode: 'email_invites',
      participant_emails: [partEmail],
      date_range_start: '2025-09-01',
      date_range_end: '2025-09-01',
      time_range_start: 480, time_range_end: 720,
      timezone: 'UTC',
      deadline: '2099-12-31T23:59:59.000Z',
    },
  });
  expect(res.ok()).toBeTruthy();

  await page.goto('/resend');
  await page.getByLabel(/your email/i).fill(partEmail);
  await page.getByRole('button', { name: /send my link/i }).click();

  await expect(page.getByRole('status')).toContainText(/if we found a matching event/i);

  // Unique email means no interference — no since filter needed
  const email = await waitForEmail(partEmail, { timeout: 8000 });
  expect(email).toBeDefined();
  const msgRes = await fetch(`http://localhost:8025/api/v1/message/${email.ID}`);
  const msg = await msgRes.json();
  expect(msg.Text).toContain('/participate/');
});
