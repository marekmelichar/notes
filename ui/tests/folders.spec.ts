import { test, expect } from '@playwright/test';

test.describe('Folders Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to fully load
    await expect(page.getByTestId('header')).toBeVisible({ timeout: 15000 });
    // Wait for folders data to load
    await expect(page.getByText('Work')).toBeVisible({ timeout: 15000 });
  });

  test('should display existing folders from mock data', async ({ page }) => {
    // Check mock folders are displayed
    await expect(page.getByText('Work')).toBeVisible();
    await expect(page.getByText('Personal')).toBeVisible();
  });

  test('should expand folder to show subfolders and notes', async ({ page }) => {
    // Click on Work folder to expand it
    await page.getByText('Work').click();

    // The folder should expand showing subfolders and notes
    await expect(page.getByText('Projects')).toBeVisible({ timeout: 5000 });
  });

  test('should show All Notes option', async ({ page }) => {
    // All Notes should be visible at the top of the sidebar - use exact match
    await expect(page.getByText('All Notes', { exact: true })).toBeVisible();

    // It should show count in the note list header
    await expect(page.getByRole('heading', { name: /All Notes \(\d+\)/i })).toBeVisible();
  });
});
