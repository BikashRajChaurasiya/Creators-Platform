import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('brand campaigns list renders', async ({ page }) => {
  await login(page, 'himalayanteaco@ugcnp.local');
  await page.waitForURL('**/brand');
  await page.getByRole('link', { name: /Campaigns/i }).first().click();
  await page.waitForURL('**/brand/campaigns');
  await expect(page.getByRole('heading', { name: /Campaign/i })).toBeVisible();
});

test('brand applications page renders decision rows', async ({ page }) => {
  await login(page, 'himalayanteaco@ugcnp.local');
  await page.waitForURL('**/brand');
  await page.getByRole('link', { name: /Applications/i }).click();
  await page.waitForURL('**/brand/applications');
  await expect(page.getByRole('heading', { name: /Applications/i })).toBeVisible();
});

test('brand messages renders', async ({ page }) => {
  await login(page, 'himalayanteaco@ugcnp.local');
  await page.waitForURL('**/brand');
  await page.getByRole('link', { name: /Messages/i }).click();
  await page.waitForURL('**/brand/messages');
});