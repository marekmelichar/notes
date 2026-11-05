import { test, expect, type Page } from '@playwright/test';
import { accessSync, constants, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Editor flows against the real Vite dev server, Keycloak, API, and Postgres.
 * Credentials are the documented synthetic dev user from notes-dev-realm.json.
 * Screenshots are opt-in: set E2E_ARTIFACTS to a writable directory.
 */
const DEV_USER = process.env.E2E_USER ?? 'testuser';
const DEV_PASSWORD = process.env.E2E_PASSWORD ?? 'testuser';
const ATTACHMENT = join(tmpdir(), 'e2e-note.txt');

function artifactDir(): string | null {
  const dir = process.env.E2E_ARTIFACTS;
  if (!dir) return null;
  try {
    mkdirSync(dir, { recursive: true });
    accessSync(dir, constants.W_OK);
    return dir;
  } catch {
    return null;
  }
}

async function shot(page: Page, name: string) {
  const dir = artifactDir();
  if (!dir) return;
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  });
  await page.mouse.move(8, 8);
  const tooltip = page.getByRole('tooltip');
  if (await tooltip.count()) {
    await tooltip.first().waitFor({ state: 'hidden', timeout: 2000 }).catch(() => undefined);
  }
  await page.screenshot({ path: `${dir}/${name}` });
}

const errors: string[] = [];

function resetErrors() {
  errors.length = 0;
}

async function login(page: Page) {
  await page.goto('/');
  const username = page.locator('#username');
  const header = page.getByTestId('header');
  await expect(username.or(header)).toBeVisible({ timeout: 20000 });
  if (await username.isVisible()) {
    await username.fill(DEV_USER);
    await page.locator('#password').fill(DEV_PASSWORD);
    await page.locator('#kc-login').click();
  }
  await expect(header).toBeVisible({ timeout: 20000 });
}

async function openNoteByTitle(page: Page, title: string) {
  const hit = page.getByText(title, { exact: true }).first();
  await hit.scrollIntoViewIfNeeded();
  await hit.click();
  await expect(page.getByTestId('editor-title-input')).toHaveValue(title, { timeout: 10000 });
}

async function createNote(page: Page, title: string) {
  await page.getByTestId('header-new-note-button').click();
  const titleInput = page.getByTestId('editor-title-input');
  await expect(titleInput).toBeVisible({ timeout: 15000 });
  await titleInput.fill(title);
  return titleInput;
}

function watchErrors(page: Page) {
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
}

test.describe.configure({ mode: 'serial' });

/** Title of the note the writing test created, so the phone test opens that exact note. */
let writingNoteTitle: string | null = null;

test('editor writing, save, and persistence on the real stack', async ({ page }) => {
  test.setTimeout(180_000);
  writeFileSync(ATTACHMENT, 'local e2e attachment\n');
  resetErrors();
  watchErrors(page);
  await page.setViewportSize({ width: 1440, height: 1000 });

  await login(page);
  const title = `E2E editor ${Date.now()}`;
  writingNoteTitle = title;
  await createNote(page, title);

  const editor = page.locator('.ProseMirror').first();
  await editor.click();
  const placeholder = await editor.locator('p').first().getAttribute('data-placeholder');
  expect(placeholder).toBeTruthy();

  await page.keyboard.type('Opening sentence.');
  await page.keyboard.press('Enter');
  await page.keyboard.type('# Heading one');
  await page.keyboard.press('Enter');
  await page.keyboard.type('**bold** and *italic*');
  await page.keyboard.press('Enter');
  await page.keyboard.type('- bullet item');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('1. numbered item');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('[ ] todo item');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('> quoted line');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('See [Docs](example.com) tail');

  await expect(editor.locator('h1')).toHaveText('Heading one');
  await expect(editor.locator('strong')).toHaveText('bold');
  await expect(editor.locator('em')).toHaveText('italic');
  await expect(editor.locator('ul li').first()).toContainText('bullet item');
  await expect(editor.locator('ol li').first()).toContainText('numbered item');
  await expect(editor.locator('ul[data-type="taskList"] li')).toContainText('todo item');
  await expect(editor.locator('blockquote')).toContainText('quoted line');
  const docsLink = editor.locator('a', { hasText: 'Docs' });
  await expect(docsLink).toHaveAttribute('href', 'https://example.com');
  await expect(editor).toContainText('tail');
  const tailInsideLink = await docsLink.evaluate((node) => node.textContent?.includes('tail') ?? false);
  expect(tailInsideLink).toBe(false);

  await page.keyboard.press('Control+s');
  await expect(page.getByTestId('editor-save-button')).toContainText(/Saved|Uloženo/i, { timeout: 10000 });

  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('autosave token');
  await expect(page.locator('.ProseMirror').locator('text=autosave token')).toBeVisible();
  await expect(page.getByTestId('editor-save-button')).toHaveText(/^(Save|Uložit)$/);
  await expect(page.getByTestId('editor-save-button')).toContainText(/Saved|Uloženo/i, { timeout: 15000 });

  // Readable line length on a wide pane: the text column is capped and centred.
  const column = await editor.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const pane = (el.parentElement as HTMLElement).getBoundingClientRect();
    return { width: box.width, pane: pane.width, left: box.left - pane.left, right: pane.right - box.right };
  });
  expect(column.width).toBeLessThan(column.pane);
  expect(Math.abs(column.left - column.right)).toBeLessThan(2);

  await page.reload();
  await expect(page.getByTestId('header')).toBeVisible({ timeout: 20000 });
  await expect(editor).toContainText('Opening sentence.');
  await expect(editor).toContainText('autosave token');
  await expect(page.getByTestId('editor-title-input')).toHaveValue(title);

  await page.evaluate(() => {
    const ed = document.querySelector('.ProseMirror')?.editor;
    ed?.chain().focus('end').insertContent('<p>linked</p>').run();
  });
  const word = editor.getByText('linked', { exact: true });
  const box = await word.boundingBox();
  if (!box) throw new Error('linked word has no box');
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 2, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () =>
    page.evaluate(() => {
      const view = document.querySelector('.ProseMirror')?.editor?.view;
      if (!view) return '';
      const { from, to } = view.state.selection;
      return view.state.doc.textBetween(from, to);
    }),
  ).toBe('linked');
  await page.keyboard.press('Control+k');
  const linkUrl = page.getByTestId('link-dialog-url-input').locator('input');
  await linkUrl.fill('ftp://files.example.com/readme.txt');
  await page.getByTestId('link-dialog-submit').click();
  await expect(page.getByText(/http, https, or mailto/i)).toBeVisible();
  await linkUrl.fill('https://example.com/docs');
  await page.getByTestId('link-dialog-submit').click();
  await expect(page.getByTestId('link-dialog-url-input')).toBeHidden();
  const created = editor.locator('a', { hasText: 'linked' });
  await expect(created).toHaveAttribute('href', 'https://example.com/docs');
  await page.keyboard.press('End');
  await page.keyboard.type(' after');
  await expect(editor).toContainText('after');
  const afterInside = await created.evaluate((node) => node.textContent?.includes('after') ?? false);
  expect(afterInside).toBe(false);

  await created.click();
  await page.getByTestId('link-bubble-edit').click();
  await page.getByTestId('link-bubble-url-input').locator('input').fill('https://example.com/edited');
  await page.getByTestId('link-bubble-save').click();
  await expect(editor.locator('a', { hasText: 'linked' })).toHaveAttribute('href', 'https://example.com/edited');
  await editor.locator('a', { hasText: 'linked' }).click();
  await page.getByTestId('link-bubble-unlink').click();
  await expect(editor.locator('a', { hasText: 'linked' })).toHaveCount(0);

  // Clicks on the link leave the caret in the word. Move to the end so the
  // file and the long lines are inserted after the sentence, not inside it.
  await page.evaluate(() => {
    document.querySelector('.ProseMirror')?.editor?.chain().focus('end').run();
  });
  await page.locator('input[type="file"]').setInputFiles(ATTACHMENT);
  await expect(editor).toContainText('e2e-note.txt', { timeout: 15000 });

  await page.getByTestId('toolbar-more').click();
  await expect(page.getByTestId('toolbar-underline')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    document.querySelector('.ProseMirror')?.editor?.chain().focus('end').run();
  });

  for (let i = 0; i < 30; i += 1) {
    await page.keyboard.press('Enter');
    await page.keyboard.type(`Long line ${i} keeps scrolling.`);
  }
  const scrolled = await page.locator('[class*="editorContent"]').evaluate((node) => {
    node.scrollTop = node.scrollHeight;
    return node.scrollTop > 0;
  });
  expect(scrolled).toBe(true);

  await page.keyboard.press('Control+s');
  await expect(page.getByTestId('editor-save-button')).toContainText(/Saved|Uloženo/i, { timeout: 10000 });
  await shot(page, 'desktop-normal.png');

  const other = `E2E other ${Date.now()}`;
  await createNote(page, other);
  const otherEditor = page.locator('.ProseMirror').first();
  await otherEditor.click();
  await page.keyboard.type('only in the second note');
  await page.keyboard.press('Control+s');
  await expect(page.getByTestId('editor-save-button')).toContainText(/Saved|Uloženo/i, { timeout: 10000 });
  await expect(otherEditor).not.toContainText('Opening sentence.');

  await openNoteByTitle(page, title);
  await expect(page.locator('.ProseMirror').first()).toContainText('Opening sentence.');
  await expect(page.locator('.ProseMirror').first()).not.toContainText('only in the second note');

  await page.getByTestId('user-avatar-button').click();
  await page.getByTestId('logout-menu-item').click();
  await expect(page.locator('#username').or(page.getByTestId('header'))).toBeVisible({ timeout: 20000 });
  await login(page);
  await openNoteByTitle(page, title);
  await expect(page.locator('.ProseMirror').first()).toContainText('Opening sentence.', { timeout: 10000 });
  await expect(page.locator('.ProseMirror').first()).toContainText('e2e-note.txt');
  await shot(page, 'reloaded-note.png');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('editor chrome fits a phone viewport', async ({ page }) => {
  test.setTimeout(120_000);
  resetErrors();
  watchErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  if (writingNoteTitle) {
    // Exact title from this run, not the first leftover "E2E editor" note.
    await page.getByRole('button', { name: writingNoteTitle }).first().click();
    await expect(page.getByTestId('editor-title-input')).toHaveValue(writingNoteTitle, {
      timeout: 15000,
    });
  } else {
    // Run on its own (e.g. --grep): make a fresh note instead.
    await createNote(page, `E2E phone ${Date.now()}`);
  }
  const editor = page.locator('.ProseMirror').first();
  await expect(editor).toBeVisible({ timeout: 15000 });

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);

  for (const id of ['toolbar-insert', 'toolbar-more']) {
    const button = page.getByTestId(id);
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  }

  const overlap = await page.evaluate(() => {
    const footer = document.querySelector('[data-testid="note-editor"] [class*="footer"]');
    const scroll = document.querySelector('[class*="editorContent"]');
    const nav = document.querySelector('[data-testid="mobile-navigation"]');
    if (!footer || !scroll || !nav) return 'missing';
    const f = footer.getBoundingClientRect();
    const s = scroll.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    const contentUnderFooter = s.bottom > f.top + 2;
    const footerUnderNav = f.bottom > n.top + 2 && f.top < n.bottom;
    return contentUnderFooter || footerUnderNav ? 'overlap' : 'ok';
  });
  expect(overlap).toBe('ok');

  // The toolbar fits in one row: nothing hidden past the right edge.
  const toolbarFits = await page
    .getByTestId('editor-toolbar')
    .evaluate((node) => node.scrollWidth <= node.clientWidth);
  expect(toolbarFits).toBe(true);
  await shot(page, 'phone-normal.png');

  expect(errors, errors.join('\n')).toEqual([]);
});
