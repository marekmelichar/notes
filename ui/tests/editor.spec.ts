import { test, expect } from '@playwright/test';

test.describe('Editor - Save and Reload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('header')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: /All Notes/i })).toBeVisible({ timeout: 15000 });
  });

  test('should persist typed content after save and page reload', async ({ page }) => {
    // Select the first note
    await page.locator('[class*="noteCardTitle"]').first().click();

    // Wait for TipTap editor to appear
    const editor = page.locator('.ProseMirror');
    await expect(editor.first()).toBeVisible({ timeout: 5000 });

    // Type unique content to verify later
    const uniqueText = `E2E test content ${Date.now()}`;
    await editor.first().click();
    await editor.first().press('End');
    await editor.first().pressSequentially(uniqueText, { delay: 10 });

    // Save via Ctrl+S
    await page.keyboard.press('Control+s');

    // Wait for save to complete — button should show "Saved" state
    await expect(page.getByTestId('editor-save-button')).toContainText(/Saved|Uloženo/i, {
      timeout: 5000,
    });

    // Reload the page
    await page.reload();
    await expect(page.getByTestId('header')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: /All Notes/i })).toBeVisible({ timeout: 15000 });

    // Re-select the same note
    await page.locator('[class*="noteCardTitle"]').first().click();
    const editorAfterReload = page.locator('.ProseMirror');
    await expect(editorAfterReload.first()).toBeVisible({ timeout: 5000 });

    // Verify the typed content persisted
    await expect(editorAfterReload.first()).toContainText(uniqueText);
  });

  test('should update title and persist it', async ({ page }) => {
    // Select the first note
    await page.locator('[class*="noteCardTitle"]').first().click();

    // Wait for editor
    const editor = page.locator('.ProseMirror');
    await expect(editor.first()).toBeVisible({ timeout: 5000 });

    // Get title input and change it
    const titleInput = page.locator('[class*="titleInput"]');
    const uniqueTitle = `Test Title ${Date.now()}`;
    await titleInput.fill(uniqueTitle);

    // Save
    await page.keyboard.press('Control+s');
    await expect(page.getByTestId('editor-save-button')).toContainText(/Saved|Uloženo/i, {
      timeout: 5000,
    });

    // Reload and verify
    await page.reload();
    await expect(page.getByTestId('header')).toBeVisible({ timeout: 15000 });

    // The note card in the list should show the new title
    await expect(page.locator('[class*="noteCardTitle"]').first()).toContainText(uniqueTitle, {
      timeout: 5000,
    });
  });

  test('should show unsaved indicator after editing', async ({ page }) => {
    // Select the first note
    await page.locator('[class*="noteCardTitle"]').first().click();

    const editor = page.locator('.ProseMirror');
    await expect(editor.first()).toBeVisible({ timeout: 5000 });

    // Type something to trigger unsaved state
    await editor.first().click();
    await editor.first().pressSequentially('unsaved test', { delay: 10 });

    // Save button should show "Save" (unsaved) state with contained variant
    const saveButton = page.getByTestId('editor-save-button');
    await expect(saveButton).toContainText(/^Save$|^Uložit$/i, { timeout: 3000 });
  });
});
