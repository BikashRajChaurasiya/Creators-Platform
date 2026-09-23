import { test, expect, Page } from '@playwright/test';

export const PASSWORD = 'Password123!';

export async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /Sign in/i }).click();
}

export async function expectRedirected(page: Page, basePath: string) {
  await page.waitForURL(new RegExp(`^.*${basePath.replace('/', '\\/')}(/|$)`));
}

export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('ugcnp.access');
    localStorage.removeItem('ugcnp.refresh');
    localStorage.removeItem('ugcnp.user');
  });
}