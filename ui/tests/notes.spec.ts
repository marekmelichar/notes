import { test, expect } from '@playwright/test';

test.describe('Notes CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to fully load
    await expect(page.getByTestId('header')).toBeVisible({ timeout: 15000 });
    // Wait for note list header to confirm notes loaded
    await expect(page.getByRole('heading', { name: /All Notes/i })).toBeVisible({ timeout: 15000 });
  });

  test('should display existing notes from mock data', async ({ page }) => {
    // Check note cards are visible - target the note card title elements
    const noteCards = page.locator('[class*="noteCardTitle"]');
    await expect(noteCards).toHaveCount(3);
  });

  test('should select a note and display its content', async ({ page }) => {
    // Click on a note card in the list
    await page.locator('[class*="noteCardTitle"]').first().click();

    // Wait for editor to show - look for BlockNote editor container
    const editor = page.locator('.bn-container, .bn-editor, [data-node-view-wrapper]');
    await expect(editor.first()).toBeVisible({ timeout: 5000 });
  });

  test('should expand folder in sidebar', async ({ page }) => {
    // Click on Work folder to expand it
    await page.getByText('Work').click();

    // The folder should expand and show child folders/notes
    // Look for the Projects subfolder which is under Work
    await expect(page.getByText('Projects')).toBeVisible({ timeout: 5000 });
  });
});
