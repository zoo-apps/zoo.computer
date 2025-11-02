import { test, expect } from '@playwright/test';

test('sign in page renders', async ({ page }) => {
  // Navigate to sign in page
  await page.goto('http://localhost:3003/signin');

  // Wait for network idle
  await page.waitForLoadState('networkidle');

  // Check console for errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });

  // Take a screenshot
  await page.screenshot({ path: 'signin-debug.png', fullPage: true });

  // Try to wait for any h1 element
  const h1Count = await page.locator('h1').count();
  console.log('Number of h1 elements found:', h1Count);

  // Check if page has any content
  const bodyText = await page.locator('body').textContent();
  console.log('Body text length:', bodyText?.length);

  // Check for any visible text
  const hasContent = bodyText && bodyText.trim().length > 0;
  expect(hasContent).toBeTruthy();
});