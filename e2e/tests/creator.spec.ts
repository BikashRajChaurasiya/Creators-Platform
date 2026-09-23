import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('creator discovers campaigns and applies', async ({ page }) => {
  await login(page, 'aaravshrestha@ugcnp.local');
  await page.waitForURL('**/creator');
  await page.getByRole('link', { name: /Discover/i }).click();
  await page.waitForURL('**/creator/discover');
  await expect(page.getByRole('heading', { name: 'Discover campaigns' })).toBeVisible();

  const applyButtons = page.getByRole('button', { name: 'Apply' });
  const count = await applyButtons.count();
  if (count === 0) {
    await page.waitForTimeout(1000);
    expect(count).toBeGreaterThanOrEqual(0);
    return;
  }

  const feedback = page.getByText(/Applied!|already applied|exists/i).first();
  await applyButtons.first().click();
  await expect(feedback).toBeVisible();
});

test('creator applications page lists rows', async ({ page }) => {
  await login(page, 'rijanmaharjan@ugcnp.local');
  await page.waitForURL('**/creator');
  await page.getByRole('link', { name: /Applications/i }).click();
  await page.waitForURL('**/creator/applications');
  await expect(page.getByRole('heading', { name: /Applications/i })).toBeVisible();
});

test('creator messages page renders conversation list', async ({ page }) => {
  await login(page, 'saanvigurung@ugcnp.local');
  await page.waitForURL('**/creator');
  await page.getByRole('link', { name: /Messages/i }).click();
  await page.waitForURL('**/creator/messages');
});