import { test, expect } from '@playwright/test';

test('first visit reaches the island', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.locator('.loading h1')).toHaveText('somewhere.');
  const enter = page.getByRole('button', { name: 'Enter the island' });
  await expect(enter).toBeVisible();
  await enter.click();

  await expect(page.locator('#scene')).toBeVisible();
  await expect(page.locator('.loading')).toBeHidden({ timeout: 5000 });
  await page.waitForTimeout(2500);
  await expect(page.locator('.control-hint')).toBeAttached();
  expect(errors).toEqual([]);
});

test('settings open, toggle reduced motion, close with Escape', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the island' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.locator('.settings')).toBeVisible();
  const toggle = page.locator('[data-toggle="reducedMotion"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('.settings')).toBeHidden();
});
