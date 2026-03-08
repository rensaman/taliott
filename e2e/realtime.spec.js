/**
 * E2E tests for US 2.3 — Real-Time Group Insight (SSE)
 * Opens two participant views simultaneously and verifies live updates.
 * No mocks — hits the real backend.
 */
import { test, expect } from '@playwright/test';

const BASE_EVENT = {
  name: 'Realtime E2E',
  organizer_email: 'org@realtime-e2e.com',
  invite_mode: 'email_invites',
  participant_emails: ['p1@realtime-e2e.com', 'p2@realtime-e2e.com'],
  date_range_start: '2025-06-01',
  date_range_end: '2025-06-01',
  part_of_day: 'morning',
  timezone: 'UTC',
  deadline: '2099-12-31T23:59:59.000Z',
};

test('participant 2 sees heatmap update in real-time when participant 1 votes yes', async ({ browser, request }) => {
  // Create event with 2 participants (plus organizer = 3 total)
  const res = await request.post('/api/events', { data: BASE_EVENT });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();

  const p1 = body.participants.find(p => p.email === 'p1@realtime-e2e.com');
  const p2 = body.participants.find(p => p.email === 'p2@realtime-e2e.com');

  // Open two independent browser contexts
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const page1 = await ctx1.newPage();
  const page2 = await ctx2.newPage();

  try {
    await page1.goto(`/participate/${p1.id}`);
    await page2.goto(`/participate/${p2.id}`);

    // Wait for both pages to load
    await expect(page1.getByRole('heading', { name: 'Realtime E2E' })).toBeVisible();
    await expect(page2.getByRole('heading', { name: 'Realtime E2E' })).toBeVisible();

    // Wait for SSE connections to establish
    await page1.waitForTimeout(500);
    await page2.waitForTimeout(500);

    // P1 clicks the first slot cell once (Neutral → Yes)
    await page1.getByTestId('slot-cell').first().click();

    // P2 should see a heatmap cell with 1 yes without refreshing
    // The heatmap shows "{yesCount}/{total}" and aria-label="{yesCount} of {total} yes"
    await expect(page2.getByLabel(/1 of \d+ yes/)).toBeVisible({ timeout: 5000 });
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});

test('participant 2 sees centroid update when participant 1 sets location', async ({ browser, request }) => {
  const res = await request.post('/api/events', { data: BASE_EVENT });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();

  const p1 = body.participants.find(p => p.email === 'p1@realtime-e2e.com');
  const p2 = body.participants.find(p => p.email === 'p2@realtime-e2e.com');

  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const page1 = await ctx1.newPage();
  const page2 = await ctx2.newPage();

  try {
    await page1.goto(`/participate/${p1.id}`);
    await page2.goto(`/participate/${p2.id}`);

    await expect(page1.getByRole('heading', { name: 'Realtime E2E' })).toBeVisible();
    await expect(page2.getByRole('heading', { name: 'Realtime E2E' })).toBeVisible();

    // P2 subscribes to SSE; wait for connection
    await page2.waitForTimeout(500);

    // P1 sets a location directly via API (bypasses address search UI)
    await request.patch(`/api/participate/${p1.id}/location`, {
      data: { latitude: 48.8566, longitude: 2.3522, address_label: 'Paris, France' },
    });

    // P2 should see the "Estimated meetup area" map section update
    // The GroupMap renders when centroid is non-null
    await expect(page2.getByLabel(/estimated meetup area/i)).toBeVisible({ timeout: 5000 });
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});
