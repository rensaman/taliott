/**
 * E2E tests for US 1.1 — static UI structure checks.
 * No API calls needed — these verify the form renders correctly.
 */
import { test, expect } from '@playwright/test';

test('home page shows the landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('create-event-btn')).toBeVisible();
});

test('clicking create an event shows the event setup form', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('create-event-btn').click();
  await expect(page.getByRole('heading', { name: 'taliott' })).toBeVisible();
  await expect(page.getByTestId('event-name-input')).toBeVisible();
});

test('step 1 shows event name input and a step counter', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('create-event-btn').click();
  await expect(page.getByTestId('event-name-input')).toBeVisible();
  await expect(page.getByText(/step 1 of/i)).toBeVisible();
});
