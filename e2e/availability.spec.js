/**
 * E2E tests for US 2.2 — Tri-State Availability Grid
 */
import { test, expect } from '@playwright/test';

async function createEvent(page, deadline = '2099-12-31T23:59:59.000Z') {
  const res = await page.request.post('/api/events', {
    data: {
      name: 'Availability E2E',
      organizer_email: 'avail-e2e@example.com',
      date_range_start: '2025-10-01',
      date_range_end: '2025-10-01',
      time_range_start: 480, time_range_end: 720,
      timezone: 'UTC',
      deadline,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test('participant can click cells and states cycle correctly', async ({ page }) => {
  const { participants } = await createEvent(page);
  const pid = participants[0].id;
  await page.request.patch(`/api/participate/${pid}/location`, {
    data: { latitude: 51.5074, longitude: -0.1278, address_label: 'London' },
  });
  await page.goto(`/participate/${pid}`);
  await page.locator('[data-testid="travel-mode-transit"]').click();
  await page.getByTestId('wizard-next-btn').click(); // travel+location → dates

  const cells = page.getByTestId('slot-cell');
  await expect(cells.first()).toBeVisible();

  // Initial state is neutral
  await expect(cells.first()).toHaveAttribute('data-state', 'neutral');

  // Click cycles: neutral → yes
  await cells.first().click();
  await expect(cells.first()).toHaveAttribute('data-state', 'yes');

  // → maybe
  await cells.first().click();
  await expect(cells.first()).toHaveAttribute('data-state', 'maybe');

  // → no
  await cells.first().click();
  await expect(cells.first()).toHaveAttribute('data-state', 'no');

  // → neutral
  await cells.first().click();
  await expect(cells.first()).toHaveAttribute('data-state', 'neutral');
});


test('availability persists across page reload', async ({ page }) => {
  const { participants, slots } = await createEvent(page);
  const pid = participants[0].id;

  await page.request.patch(`/api/participate/${pid}/location`, {
    data: { latitude: 51.5074, longitude: -0.1278, address_label: 'London' },
  });

  await page.goto(`/participate/${pid}`);
  await page.locator('[data-testid="travel-mode-transit"]').click();
  await page.getByTestId('wizard-next-btn').click(); // travel+location → dates

  // Click first cell to 'yes' and wait for the PATCH to complete
  const saveResponse = page.waitForResponse(r => r.url().includes('/availability') && r.request().method() === 'PATCH');
  await page.getByTestId('slot-cell').first().click();
  await saveResponse;

  // Reload and verify state is restored
  await page.goto(`/participate/${pid}`);
  await page.locator('[data-testid="travel-mode-transit"]').click();
  await page.getByTestId('wizard-next-btn').click(); // travel+location → dates
  await expect(page.getByTestId('slot-cell').first()).toHaveAttribute('data-state', 'yes');
});

