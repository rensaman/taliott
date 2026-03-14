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
  await page.goto(`/participate/${participants[0].id}`);
  await page.getByRole('button', { name: /next/i }).click();

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

test('saved indicator appears after clicking a cell', async ({ page }) => {
  const { participants } = await createEvent(page);
  await page.goto(`/participate/${participants[0].id}`);
  await page.getByRole('button', { name: /next/i }).click();

  await page.getByTestId('slot-cell').first().click();

  // Saving… then Saved
  await expect(page.getByTestId('save-status')).toContainText(/saving|saved/i, { timeout: 3000 });
  await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 5000 });
});

test('availability persists across page reload', async ({ page }) => {
  const { participants, slots } = await createEvent(page);
  const pid = participants[0].id;

  await page.goto(`/participate/${pid}`);
  await page.getByRole('button', { name: /next/i }).click();

  // Click first cell to 'yes' and wait for save
  await page.getByTestId('slot-cell').first().click();
  await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 5000 });

  // Reload and verify state is restored
  await page.goto(`/participate/${pid}`);
  await page.getByRole('button', { name: /next/i }).click();
  await expect(page.getByTestId('slot-cell').first()).toHaveAttribute('data-state', 'yes');
});

test('cells are disabled on a locked event', async ({ page }) => {
  const { participants } = await createEvent(page, '2020-01-01T00:00:00.000Z');
  await page.goto(`/participate/${participants[0].id}`);

  const cells = page.getByTestId('slot-cell');
  const count = await cells.count();
  for (let i = 0; i < count; i++) {
    await expect(cells.nth(i)).toBeDisabled();
  }
});
