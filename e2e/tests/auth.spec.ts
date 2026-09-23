import { test, expect } from '@playwright/test';
import { login, PASSWORD } from './helpers';

test('login page renders and validates', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Sign in to the creator economy platform')).toBeVisible();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await expect(page.getByText(/Valid email|required|invalid/i)).toBeHidden();
});

test('brand login redirects to /brand', async ({ page }) => {
  await login(page, 'himalayanteaco@ugcnp.local');
  await page.waitForURL('**/brand');
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
});

test('creator login redirects to /creator', async ({ page }) => {
  await login(page, 'rijanmaharjan@ugcnp.local');
  await page.waitForURL('**/creator');
});

test('admin login redirects to /admin', async ({ page }) => {
  await login(page, 'admin@ugcnp.local');
  await page.waitForURL('**/admin');
});

test('invalid credentials show an error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('nobody@example.com');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: /Sign in/i }).click();
  await expect(page.getByText(/Invalid|incorrect|sign in/i).last()).toBeVisible();
});

test('creator landing page requires auth and redirects to login', async ({ page }) => {
  await page.goto('/creator');
  await page.waitForURL(/\/login/);
  await expect(page.getByText('Sign in to the creator economy platform')).toBeVisible();
});