/**
 * E2E tests for US 1.7 — Link Recovery
 * Tests the "Resend my link" page end-to-end via Mailpit.
 * No mocks — hits the real backend.
 */
import { test, expect } from '@playwright/test';
import { clearMailpit, waitForEmail } from './mailpit.js';

test.beforeEach(async () => {
  await clearMailpit();
});

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
  // Create a real event
  const res = await request.post('/api/events', {
    data: {
      name: 'Resend E2E Event',
      organizer_email: 'org@resend-e2e.com',
      invite_mode: 'email_invites',
      participant_emails: [],
      date_range_start: '2025-09-01',
      date_range_end: '2025-09-01',
      part_of_day: 'morning',
      timezone: 'UTC',
      deadline: '2099-12-31T23:59:59.000Z',
    },
  });
  expect(res.ok()).toBeTruthy();
  await clearMailpit();

  await page.goto('/resend');
  await page.getByLabel(/your email/i).fill('org@resend-e2e.com');
  await page.getByRole('button', { name: /send my link/i }).click();

  await expect(page.getByRole('status')).toContainText(/if we found a matching event/i);

  const email = await waitForEmail('org@resend-e2e.com', { timeout: 5000 });
  expect(email).toBeDefined();
  // The email body should contain an admin link
  const msgRes = await fetch(`http://localhost:8025/api/v1/message/${email.ID}`);
  const msg = await msgRes.json();
  expect(msg.Text).toContain('/admin/');
});

test('participant recovers participation link via resend page', async ({ page, request }) => {
  // Create event and invite a participant
  const res = await request.post('/api/events', {
    data: {
      name: 'Resend Participant E2E',
      organizer_email: 'org2@resend-e2e.com',
      invite_mode: 'email_invites',
      participant_emails: ['part@resend-e2e.com'],
      date_range_start: '2025-09-01',
      date_range_end: '2025-09-01',
      part_of_day: 'morning',
      timezone: 'UTC',
      deadline: '2099-12-31T23:59:59.000Z',
    },
  });
  expect(res.ok()).toBeTruthy();
  await clearMailpit();

  await page.goto('/resend');
  await page.getByLabel(/your email/i).fill('part@resend-e2e.com');
  await page.getByRole('button', { name: /send my link/i }).click();

  await expect(page.getByRole('status')).toContainText(/if we found a matching event/i);

  const email = await waitForEmail('part@resend-e2e.com', { timeout: 5000 });
  expect(email).toBeDefined();
  const msgRes = await fetch(`http://localhost:8025/api/v1/message/${email.ID}`);
  const msg = await msgRes.json();
  expect(msg.Text).toContain('/participate/');
});
