import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
  test('sign in page loads correctly', async ({ page }) => {
    await page.goto('http://localhost:3003/signin');

    // Check page title
    await expect(page.locator('h1')).toContainText('Welcome back');

    // Check form elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in');

    // Check Google sign in button
    await expect(page.locator('text=Sign in with Google')).toBeVisible();

    // Check sign up link (there are two, check the one at the bottom)
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/signin-page.png' });
  });

  test('sign up page loads correctly', async ({ page }) => {
    await page.goto('http://localhost:3003/signup');

    // Check page title
    await expect(page.locator('h1')).toContainText('Create your account');

    // Check form elements exist
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('input[name="companyName"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Create account');

    // Check Google sign up button
    await expect(page.locator('text=Sign up with Google')).toBeVisible();

    // Check sign in link (use the one at the bottom)
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/signup-page.png' });
  });

  test('header shows sign in button when not authenticated', async ({ page }) => {
    await page.goto('http://localhost:3003/');

    // Check for Sign In button in header (use the first one - the button)
    await expect(page.locator('header').getByRole('link', { name: 'Sign In' }).first()).toBeVisible();

    // Click Sign In button should navigate to signin page
    await page.locator('header').getByRole('link', { name: 'Sign In' }).first().click();
    await expect(page).toHaveURL('http://localhost:3003/signin');
  });
});