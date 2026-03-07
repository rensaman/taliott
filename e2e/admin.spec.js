/**
 * E2E tests for US 3.0 — Admin Dashboard Shell
 */
import { test, expect } from '@playwright/test';

const BASE_EVENT = {
  name: 'Admin E2E Event',
  organizer_email: 'admin-e2e-org@example.com',
  participant_emails: ['jamie@example.com', 'sam@example.com'],
  date_range_start: '2025-09-01',
  date_range_end: '2025-09-01',
  part_of_day: 'morning',
  deadline: '2099-12-31T23:59:59.000Z',
};

async function createEvent(request, overrides = {}) {
  const res = await request.post('/api/events', { data: { ...BASE_EVENT, ...overrides } });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test('unknown admin token shows 404 error', async ({ page }) => {
  await page.goto('/admin/00000000-0000-0000-0000-000000000000');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('organizer navigates to admin link and sees dashboard with event data', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);

  await expect(page.getByRole('heading', { name: BASE_EVENT.name })).toBeVisible();
  await expect(page.getByText(/open/i)).toBeVisible();
  await expect(page.getByText(/deadline/i)).toBeVisible();
});

test('dashboard shows participant list with pending status before any response', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);

  await expect(page.getByText('jamie@example.com')).toBeVisible();
  await expect(page.getByText('sam@example.com')).toBeVisible();
  await expect(page.getByText(/pending/i).first()).toBeVisible();
});

test('dashboard shows response count summary', async ({ page, request }) => {
  const body = await createEvent(request);
  await page.goto(`/admin/${body.admin_token}`);

  // 0 of N responded before anyone confirms
  await expect(page.getByText(/0 of \d+ responded/i)).toBeVisible();
});

test('confirmation screen admin link navigates to dashboard with correct event data', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/event name/i).fill('Confirm Nav Test');
  await page.getByLabel(/your email/i).fill('admin-e2e-org@example.com');
  await page.getByLabel(/from/i).fill('2025-09-01');
  await page.getByLabel(/to/i).fill('2025-09-01');
  await page.getByLabel(/voting deadline/i).fill('2099-12-31T23:59');
  await page.getByRole('button', { name: /create event/i }).click();

  const adminLink = page.getByTestId('admin-token');
  await expect(adminLink).toBeVisible();
  await adminLink.click();

  await expect(page).toHaveURL(/\/admin\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Confirm Nav Test' })).toBeVisible();
});
