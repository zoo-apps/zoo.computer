import { test } from '@playwright/test';

test('check console errors', async ({ page }) => {
  // Collect all console messages
  const consoleMessages: string[] = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push(`[${type}] ${text}`);
    console.log(`Console [${type}]: ${text}`);
  });

  page.on('pageerror', error => {
    console.log('Page error:', error.message);
    consoleMessages.push(`[ERROR] ${error.message}`);
  });

  // Navigate to the page
  console.log('Navigating to http://localhost:3003/signin');
  const response = await page.goto('http://localhost:3003/signin', {
    waitUntil: 'domcontentloaded'
  });

  console.log('Response status:', response?.status());

  // Wait a bit for any async errors
  await page.waitForTimeout(2000);

  // Check if React root exists
  const hasRoot = await page.evaluate(() => {
    return document.getElementById('root') !== null;
  });
  console.log('Has root element:', hasRoot);

  // Check if React is loaded
  const hasReact = await page.evaluate(() => {
    return typeof (window as any).React !== 'undefined';
  });
  console.log('React loaded:', hasReact);

  // Get the HTML content
  const html = await page.content();
  console.log('HTML length:', html.length);

  // Check for any script errors in the page
  const errors = await page.evaluate(() => {
    return (window as any).__errors || [];
  });

  if (errors.length > 0) {
    console.log('Script errors:', errors);
  }

  console.log('\n=== All Console Messages ===');
  consoleMessages.forEach(msg => console.log(msg));
});