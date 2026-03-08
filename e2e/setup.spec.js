/**
 * E2E tests for US 1.1 — static UI structure checks.
 * No API calls needed — these verify the form renders correctly.
 */
import { test, expect } from '@playwright/test';

test('home page shows the event setup form', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'taliott' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /kick-off/i })).toBeVisible();
});

test('form has event name input, date range inputs and part-of-day options', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel(/event name/i)).toBeVisible();
  await expect(page.getByLabel(/from/i)).toBeVisible();
  await expect(page.getByLabel(/to/i)).toBeVisible();
  await expect(page.getByRole('radio', { name: 'all' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'morning' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'afternoon' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'evening' })).toBeVisible();
});
