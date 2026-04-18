#!/usr/bin/env node
/**
 * Documentation validator — fail fast when docs reference things that don't exist.
 *
 * Catches the common drift modes:
 *   - File path mentioned in a .md doesn't exist (rename/delete drift)
 *   - Internal markdown link points to a missing file (broken nav)
 *
 * Run:  node scripts/validate-docs.mjs
 * CI:   wired into .github/workflows/validate.yml
 * Hook: wired into .husky/pre-commit
 *
 * Exit 0 = all references resolve
 * Exit 1 = at least one broken reference
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

// ---------- Configuration ----------

// Skip these directories entirely
const IGNORE_DIRS = new Set([
  'node_modules',
  'build',
  'dist',
  '.git',
  'bin',
  'obj',
  '.playwright-mcp',
  'TestResults',
]);

// File extensions worth treating as "real file references" when found backticked.
// Anything outside this set is considered prose, not a path.
const PATH_EXTENSIONS = new Set([
  '.md', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx',
  '.cs', '.csproj', '.sln',
  '.json', '.yml', '.yaml', '.toml',
  '.html', '.css', '.scss', '.svg', '.png',
  '.sql', '.sh', '.dockerfile', '.conf',
]);

// Repo top-level directories — backticked paths must start with one of these
// (or have a recognizable file extension) to be validated. Keeps URL routes like
// `/realms/`, `/locales/` from being treated as file refs.
const REPO_TOP_DIRS = new Set([
  'api', 'ui', 'docs', 'deploy', 'scripts', '.github', '.husky',
]);

// Backticked tokens that look like paths but should be ignored
// (globs, npm packages, env vars, etc.)
const BACKTICK_IGNORE_PATTERNS = [
  /^[A-Z_]+$/,                  // ENV_VAR
  /^[A-Z_][A-Z0-9_]*=/,         // ENV_VAR=value
  /^@?[a-z][a-z0-9-]*\//,       // npm packages: @scope/name, react-router-dom/
  /\*/,                         // globs
  /^https?:\/\//,               // URLs
  /^[a-z]+:/,                   // protocols (file:, virtual:, etc.)
  /^\$\{/,                      // template literals
  /\s/,                         // anything with whitespace
  /^<.*>$/,                     // <placeholders>
  /^\.\.\.$/,                   // ellipsis
  /^~/,                         // home directory ($HOME) — outside repo
];

// ---------- Helpers ----------

/** Recursively list all .md files under root, skipping IGNORE_DIRS. */
function findMarkdownFiles(dir, acc = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.github' && entry.name !== '.husky') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findMarkdownFiles(full, acc);
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      acc.push(full);
    }
  }
  return acc;
}

/** Strip fenced code blocks and HTML comments — preserve line numbers by keeping newlines. */
function stripCode(md) {
  const blank = (s) => s.replace(/[^\n]/g, '');
  return md
    .replace(/```[\s\S]*?```/g, blank)   // fenced code
    .replace(/<!--[\s\S]*?-->/g, blank); // HTML comments
}

/** Strip inline code spans (`...`) — preserves line count, blanks the content. */
function stripInlineCode(md) {
  return md.replace(/`([^`\n]+)`/g, (_, inner) => '`' + ' '.repeat(inner.length) + '`');
}

/** Extract markdown links [text](url) — return list of {text, url, line}. */
function extractMarkdownLinks(md) {
  const links = [];
  const lines = md.split('\n');
  // Match [text](url) but not images ![alt](url)
  const linkRe = /(?<!\!)\[([^\]]*)\]\(([^)]+)\)/g;
  for (let i = 0; i < lines.length; i++) {
    let m;
    while ((m = linkRe.exec(lines[i])) !== null) {
      links.push({ text: m[1], url: m[2], line: i + 1 });
    }
  }
  return links;
}

/** Extract backticked tokens that look like file paths from prose (after stripCode). */
function extractBacktickedPaths(prose) {
  const paths = [];
  const lines = prose.split('\n');
  const tickRe = /`([^`\n]+)`/g;
  for (let i = 0; i < lines.length; i++) {
    let m;
    while ((m = tickRe.exec(lines[i])) !== null) {
      const token = m[1].trim();
      if (looksLikePath(token)) {
        paths.push({ raw: token, line: i + 1 });
      }
    }
  }
  return paths;
}

/** Heuristic: does a backticked token look like a file path we should verify? */
function looksLikePath(token) {
  for (const re of BACKTICK_IGNORE_PATTERNS) {
    if (re.test(token)) return false;
  }
  if (!token.includes('/')) return false;

  // Strip leading ./ for analysis
  const clean = token.replace(/^\.\//, '');
  const firstSegment = clean.split('/')[0].replace(/^\//, '');
  const ext = extname(token).toLowerCase();

  // (a) Has a recognized file extension → validate
  if (ext && PATH_EXTENSIONS.has(ext)) return true;

  // (b) Starts with a known top-level repo dir → validate
  //     (catches dir references like `api/EpoznamkyApi/Services/`)
  if (REPO_TOP_DIRS.has(firstSegment)) return true;

  // Otherwise: probably prose or a URL route, skip.
  return false;
}

/** Is this URL "internal" — i.e. a local file we should resolve? */
function isInternalLink(url) {
  if (!url) return false;
  if (url.startsWith('http://') || url.startsWith('https://')) return false;
  if (url.startsWith('mailto:')) return false;
  if (url.startsWith('#')) return false;  // pure anchor
  return true;
}

/** Resolve a path reference (link or backticked) relative to a doc, return absolute path or null. */
function resolveRef(ref, fromDoc) {
  // Strip anchor
  const [pathPart] = ref.split('#');
  if (!pathPart) return null;
  // Absolute repo paths (start with /) — strip leading slash, resolve from REPO_ROOT
  if (pathPart.startsWith('/')) {
    return resolve(REPO_ROOT, pathPart.slice(1));
  }
  // Relative to doc location
  return resolve(dirname(fromDoc), pathPart);
}

/** Check if a path exists (file or directory). */
function pathExists(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

// ---------- Main ----------

function validateDoc(docPath) {
  const errors = [];
  const md = readFileSync(docPath, 'utf8');
  const prose = stripCode(md);
  const relativeDoc = relative(REPO_ROOT, docPath);

  // 1. Markdown links — strip fenced code AND inline code spans first
  //    (a link inside `...` is documentation about the syntax, not a real link)
  const linkProse = stripInlineCode(prose);
  const links = extractMarkdownLinks(linkProse);
  for (const { text, url, line } of links) {
    if (!isInternalLink(url)) continue;
    const resolved = resolveRef(url, docPath);
    if (!resolved) continue;
    if (!pathExists(resolved)) {
      errors.push({
        file: relativeDoc,
        line,
        kind: 'link',
        ref: url,
        text,
      });
    }
  }

  // 2. Backticked file paths in prose
  const paths = extractBacktickedPaths(prose);
  for (const { raw, line } of paths) {
    // Strip leading ./ or absolute marker for resolution
    const resolved = resolveRef(raw, docPath);
    if (!resolved) continue;
    // Backticked refs are repo-relative — ALSO try resolving from REPO_ROOT
    const altResolved = resolve(REPO_ROOT, raw.replace(/^\.?\//, ''));
    if (!pathExists(resolved) && !pathExists(altResolved)) {
      errors.push({
        file: relativeDoc,
        line,
        kind: 'path',
        ref: raw,
      });
    }
  }

  return errors;
}

function main() {
  const docs = findMarkdownFiles(REPO_ROOT);
  const allErrors = [];

  for (const doc of docs) {
    const errors = validateDoc(doc);
    allErrors.push(...errors);
  }

  if (allErrors.length === 0) {
    console.log(`✓ Validated ${docs.length} markdown files. No broken references.`);
    process.exit(0);
  }

  // Group errors by file
  const byFile = new Map();
  for (const err of allErrors) {
    if (!byFile.has(err.file)) byFile.set(err.file, []);
    byFile.get(err.file).push(err);
  }

  console.error(`✗ Found ${allErrors.length} broken reference(s) in ${byFile.size} file(s):\n`);
  for (const [file, errors] of byFile) {
    console.error(`  ${file}`);
    for (const err of errors) {
      const label = err.kind === 'link' ? 'link' : 'path';
      const text = err.text ? ` (${err.text})` : '';
      console.error(`    L${err.line}  [${label}] ${err.ref}${text}`);
    }
    console.error('');
  }

  console.error('Fix the references or update the docs to remove them.');
  process.exit(1);
}

main();
