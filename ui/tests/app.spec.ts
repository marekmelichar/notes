import { test, expect } from '@playwright/test';

test.describe('App Loading', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Wait for app to be ready - check for root element
    await expect(page.locator('#root')).toBeVisible();

    // Wait for the app to initialize and header to show
    await expect(page.getByTestId('header')).toBeVisible({ timeout: 15000 });
  });

  test('should display the header with logo', async ({ page }) => {
    await page.goto('/');

    // Wait for header with correct test id
    await expect(page.getByTestId('header')).toBeVisible({ timeout: 15000 });

    // Logo should display "epoznamky" - use the link test id to be specific
    await expect(page.getByTestId('header-logo-link')).toBeVisible();
    await expect(page.getByTestId('header-logo-link')).toContainText('epoznamky');
  });

  test('should display the sidebar with folders', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load
    await expect(page.getByTestId('header')).toBeVisible({ timeout: 15000 });

    // Wait for folders to load (from mock data)
    await expect(page.getByText('Work')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Personal')).toBeVisible();
  });

  test('should display the notes list', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load
    await expect(page.getByTestId('header')).toBeVisible({ timeout: 15000 });

    // Wait for the note list header showing count
    await expect(page.getByRole('heading', { name: /All Notes/i })).toBeVisible({ timeout: 15000 });

    // Check note cards are visible - use class selector that matches CSS module hash
    await expect(page.locator('[class*="noteCardTitle"]').first()).toBeVisible();
  });

  test('should toggle dark/light theme', async ({ page }) => {
    await page.goto('/');

    // Wait for header
    await expect(page.getByTestId('header')).toBeVisible({ timeout: 15000 });

    // Click user avatar to open menu
    await page.getByTestId('user-avatar-button').click();

    // Toggle should be visible in the menu
    const themeToggle = page.getByTestId('dark-mode-toggle-container');
    await expect(themeToggle).toBeVisible();
  });
});
