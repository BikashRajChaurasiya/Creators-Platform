import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('admin dashboard shows report cards', async ({ page }) => {
  await login(page, 'admin@ugcnp.local');
  await page.waitForURL('**/admin');
  await expect(page.getByText('Platform fees')).toBeVisible();
  await expect(page.getByText('Gross volume')).toBeVisible();
});

test('admin users table renders', async ({ page }) => {
  await login(page, 'admin@ugcnp.local');
  await page.waitForURL('**/admin');
  await page.getByRole('link', { name: /Users/i }).click();
  await page.waitForURL('**/admin/users');
  await expect(page.getByRole('heading', { name: /Users/i })).toBeVisible();
});

test('admin campaigns renders', async ({ page }) => {
  await login(page, 'admin@ugcnp.local');
  await page.waitForURL('**/admin');
  await page.getByRole('link', { name: /Campaigns/i }).click();
  await page.waitForURL('**/admin/campaigns');
});

test('admin settings renders', async ({ page }) => {
  await login(page, 'admin@ugcnp.local');
  await page.waitForURL('**/admin');
  await page.getByRole('link', { name: /Settings/i }).click();
  await page.waitForURL('**/admin/settings');
});