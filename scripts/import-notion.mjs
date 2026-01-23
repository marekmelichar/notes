#!/usr/bin/env node
/**
 * Import Notion export into epoznamky.cz PostgreSQL database.
 *
 * Usage:
 *   node scripts/import-notion.mjs <export-folder> <user-id> [output-file]
 *
 * Arguments:
 *   export-folder  Path to the Notion export root folder
 *   user-id        The Keycloak user UUID (find via Keycloak admin or DB query)
 *   output-file    Output SQL file (default: import.sql)
 *
 * Example:
 *   node scripts/import-notion.mjs ~/Downloads/Export-xxx "user-uuid" import.sql
 *
 * Then run on production:
 *   docker exec -i epoznamky-db psql -U postgres epoznamky < import.sql
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// --- Configuration ---
const EXPORT_DIR = process.argv[2];
const USER_ID = process.argv[3];
const OUTPUT_FILE = process.argv[4] || "import.sql";

if (!EXPORT_DIR || !USER_ID) {
  console.error(
    "Usage: node scripts/import-notion.mjs <export-folder> <user-id> [output-file]"
  );
  process.exit(1);
}

// --- Helpers ---
function generateId() {
  return crypto.randomUUID();
}

function nowMs() {
  return Date.now();
}

function escapeSQL(str) {
  if (str === null || str === undefined) return "NULL";
  return "'" + str.replace(/'/g, "''") + "'";
}

/**
 * Strip Notion's UUID suffix from filenames/folders.
 * e.g. "My Note abc123def456.md" -> "My Note"
 * e.g. "My Folder abc123def456" -> "My Folder"
 */
function stripNotionId(name) {
  // Notion appends a space + 32-char hex ID (sometimes with hyphens)
  return name
    .replace(/\s+[a-f0-9]{32}$/i, "")
    .replace(/\s+[a-f0-9-]{32,36}$/i, "")
    .trim();
}

function getCleanTitle(filePath) {
  const basename = path.basename(filePath, path.extname(filePath));
  return stripNotionId(basename);
}

// --- Markdown to BlockNote JSON converter ---
function parseInlineContent(text) {
  const content = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    let match = remaining.match(/^\*\*(.+?)\*\*/);
    if (!match) match = remaining.match(/^__(.+?)__/);
    if (match) {
      content.push({
        type: "text",
        text: match[1],
        styles: { bold: true },
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Italic: *text* or _text_
    match = remaining.match(/^\*(.+?)\*/);
    if (!match) match = remaining.match(/^_(.+?)_/);
    if (match) {
      content.push({
        type: "text",
        text: match[1],
        styles: { italic: true },
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Inline code: `text`
    match = remaining.match(/^`(.+?)`/);
    if (match) {
      content.push({
        type: "text",
        text: match[1],
        styles: { code: true },
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Link: [text](url)
    match = remaining.match(/^\[([^\]]*)\]\(([^)]+)\)/);
    if (match) {
      content.push({
        type: "link",
        content: [{ type: "text", text: match[1] || match[2], styles: {} }],
        href: match[2],
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Image reference in inline: ![alt](path) - handle as link
    match = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (match) {
      content.push({
        type: "text",
        text: `[Image: ${match[1] || match[2]}]`,
        styles: { italic: true },
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Plain text (up to next special char)
    match = remaining.match(/^[^*_`[\]!]+/);
    if (match) {
      content.push({
        type: "text",
        text: match[0],
        styles: {},
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Single special char that didn't match a pattern
    content.push({
      type: "text",
      text: remaining[0],
      styles: {},
    });
    remaining = remaining.slice(1);
  }

  return content;
}

function markdownToBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        id: generateId(),
        type: "heading",
        props: { level: headingMatch[1].length },
        content: parseInlineContent(headingMatch[2].trim()),
        children: [],
      });
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        id: generateId(),
        type: "codeBlock",
        props: { language: lang || "plain" },
        content: [
          { type: "text", text: codeLines.join("\n"), styles: {} },
        ],
        children: [],
      });
      continue;
    }

    // Image on its own line: ![alt](path)
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      blocks.push({
        id: generateId(),
        type: "image",
        props: {
          url: imgMatch[2],
          caption: imgMatch[1] || "",
          width: 512,
        },
        content: undefined,
        children: [],
      });
      i++;
      continue;
    }

    // Bullet list item: - or *
    const bulletMatch = line.match(/^(\s*)([-*])\s+(.+)/);
    if (bulletMatch) {
      blocks.push({
        id: generateId(),
        type: "bulletListItem",
        props: {},
        content: parseInlineContent(bulletMatch[3].trim()),
        children: [],
      });
      i++;
      continue;
    }

    // Numbered list item: 1.
    const numMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (numMatch) {
      blocks.push({
        id: generateId(),
        type: "numberedListItem",
        props: {},
        content: parseInlineContent(numMatch[2].trim()),
        children: [],
      });
      i++;
      continue;
    }

    // Checkbox: - [ ] or - [x]
    const checkMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.*)/);
    if (checkMatch) {
      blocks.push({
        id: generateId(),
        type: "checkListItem",
        props: { checked: checkMatch[2] !== " " },
        content: parseInlineContent(checkMatch[3].trim()),
        children: [],
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      i++;
      continue;
    }

    // Table: | col | col |
    if (line.trim().startsWith("|")) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i]
          .trim()
          .split("|")
          .filter((c) => c.trim() !== "")
          .map((c) => c.trim());
        // Skip separator rows (|---|---|)
        if (!row.every((c) => /^[-:]+$/.test(c))) {
          tableRows.push(row);
        }
        i++;
      }
      if (tableRows.length > 0) {
        const tableContent = {
          type: "tableContent",
          rows: tableRows.map((row) => ({
            cells: row.map((cell) => [parseInlineContent(cell)]),
          })),
        };
        blocks.push({
          id: generateId(),
          type: "table",
          props: {},
          content: tableContent,
          children: [],
        });
      }
      continue;
    }

    // Blockquote: >
    const quoteMatch = line.match(/^>\s*(.*)/);
    if (quoteMatch) {
      blocks.push({
        id: generateId(),
        type: "paragraph",
        props: { textColor: "gray" },
        content: parseInlineContent(quoteMatch[1].trim()),
        children: [],
      });
      i++;
      continue;
    }

    // Default: paragraph
    blocks.push({
      id: generateId(),
      type: "paragraph",
      props: {},
      content: parseInlineContent(line.trim()),
      children: [],
    });
    i++;
  }

  return blocks;
}

// --- File/folder scanner ---
const folders = []; // { id, name, parentId, order }
const notes = []; // { id, title, content, folderId, order }

function isNotionFolderMd(filePath, parentDir) {
  // A .md file that has a matching folder (same name without .md)
  const dirName = path.basename(filePath, ".md");
  const matchingDir = path.join(parentDir, stripNotionId(dirName));
  // Check if there's a directory with the stripped name or the full name
  return fs.existsSync(path.join(parentDir, dirName));
}

function getFileDescription(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const size = fs.statSync(filePath).size;
  const sizeStr =
    size > 1024 * 1024
      ? `${(size / 1024 / 1024).toFixed(1)} MB`
      : `${(size / 1024).toFixed(1)} KB`;

  const descriptions = {
    ".csv": "CSV spreadsheet",
    ".pdf": "PDF document",
    ".png": "Image (PNG)",
    ".jpg": "Image (JPEG)",
    ".jpeg": "Image (JPEG)",
    ".gif": "Image (GIF)",
    ".svg": "Image (SVG)",
    ".zip": "ZIP archive",
    ".xls": "Excel spreadsheet",
    ".xlsx": "Excel spreadsheet",
    ".docx": "Word document",
    ".json": "JSON file",
    ".xml": "XML file",
    ".ovpn": "OpenVPN config",
    ".bat": "Batch script",
    ".xhtml": "XHTML document",
  };

  return `${descriptions[ext] || `File (${ext})`} - ${sizeStr}`;
}

function isAttachmentFolder(dirPath) {
  // In Notion exports, attachment folders only contain binary files (images, PDFs, etc.)
  // Real content folders contain .md files (sub-pages).
  try {
    const entries = fs.readdirSync(dirPath);
    const hasMdFiles = entries.some((e) => e.endsWith(".md"));
    const hasSubDirs = entries.some((e) => {
      const fullPath = path.join(dirPath, e);
      return fs.statSync(fullPath).isDirectory();
    });
    return !hasMdFiles && !hasSubDirs;
  } catch {
    return false;
  }
}

function scanDirectory(dirPath, parentFolderId, order = 0) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (e) {
    console.error(`Cannot read directory: ${dirPath}`);
    return;
  }

  // Sort entries for consistent ordering
  entries.sort((a, b) => a.name.localeCompare(b.name));

  let noteOrder = 0;
  let folderOrder = 0;

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const folderName = stripNotionId(entry.name);

      // Skip attachment folders (only contain images/files, no .md sub-pages)
      if (isAttachmentFolder(fullPath)) {
        continue;
      }

      const folderId = generateId();

      folders.push({
        id: folderId,
        name: folderName,
        parentId: parentFolderId,
        order: folderOrder++,
      });

      scanDirectory(fullPath, folderId, 0);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();

      if (ext === ".md") {
        // Check if this is a "folder description" md (has matching real content directory)
        const possibleDir = path.join(
          dirPath,
          path.basename(entry.name, ".md")
        );
        if (
          fs.existsSync(possibleDir) &&
          fs.statSync(possibleDir).isDirectory() &&
          !isAttachmentFolder(possibleDir)
        ) {
          // This is a folder's own description page - import as a note inside that folder
          const matchingFolderId = folders.find(
            (f) =>
              f.name === stripNotionId(path.basename(entry.name, ".md")) &&
              f.parentId === parentFolderId
          )?.id;

          if (matchingFolderId) {
            const content = fs.readFileSync(fullPath, "utf-8");
            const title = getCleanTitle(fullPath);
            // Skip if it's essentially empty (just a title)
            const contentWithoutTitle = content
              .replace(/^#\s+.*\n?/, "")
              .trim();
            if (contentWithoutTitle.length > 0) {
              const blocks = markdownToBlocks(contentWithoutTitle);
              notes.push({
                id: generateId(),
                title: title + " (overview)",
                content: JSON.stringify(blocks),
                folderId: matchingFolderId,
                order: -1, // Put at top
              });
            }
            continue;
          }
        }

        // Regular markdown note
        const content = fs.readFileSync(fullPath, "utf-8");
        const title = getCleanTitle(fullPath);

        // Remove the first heading if it matches the title
        let mdContent = content;
        const firstHeading = content.match(/^#\s+(.+)\n?/);
        if (firstHeading) {
          mdContent = content.slice(firstHeading[0].length);
        }

        const blocks = markdownToBlocks(mdContent.trim());
        notes.push({
          id: generateId(),
          title: title,
          content: JSON.stringify(blocks),
          folderId: parentFolderId,
          order: noteOrder++,
        });
      } else if (ext === ".html") {
        // Skip index.html and other HTML files
        continue;
      } else {
        // Non-markdown file: create a placeholder note
        const title = getCleanTitle(fullPath);
        const description = getFileDescription(fullPath);
        const blocks = [
          {
            id: generateId(),
            type: "paragraph",
            props: {},
            content: [
              {
                type: "text",
                text: `${description}`,
                styles: { italic: true },
              },
            ],
            children: [],
          },
          {
            id: generateId(),
            type: "paragraph",
            props: {},
            content: [
              {
                type: "text",
                text: `Original file: ${entry.name}`,
                styles: { code: true },
              },
            ],
            children: [],
          },
        ];

        notes.push({
          id: generateId(),
          title: title,
          content: JSON.stringify(blocks),
          folderId: parentFolderId,
          order: noteOrder++,
        });
      }
    }
  }
}

// --- Main ---
console.log(`Scanning export folder: ${EXPORT_DIR}`);
console.log(`User ID: ${USER_ID}`);

// Find the main content folder (Private & Shared or similar)
const rootEntries = fs.readdirSync(EXPORT_DIR, { withFileTypes: true });
const contentDirs = rootEntries.filter((e) => e.isDirectory());

// Scan each top-level directory
for (const dir of contentDirs) {
  const dirPath = path.join(EXPORT_DIR, dir.name);
  const folderName = stripNotionId(dir.name);
  const folderId = generateId();

  // Only create a top-level folder if there are multiple content dirs
  if (contentDirs.length > 1) {
    folders.push({
      id: folderId,
      name: folderName,
      parentId: null,
      order: folders.length,
    });
    scanDirectory(dirPath, folderId);
  } else {
    scanDirectory(dirPath, null);
  }
}

// Also scan root-level .md files
for (const entry of rootEntries) {
  if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") {
    const fullPath = path.join(EXPORT_DIR, entry.name);
    const content = fs.readFileSync(fullPath, "utf-8");
    const title = getCleanTitle(fullPath);
    let mdContent = content;
    const firstHeading = content.match(/^#\s+(.+)\n?/);
    if (firstHeading) {
      mdContent = content.slice(firstHeading[0].length);
    }
    const blocks = markdownToBlocks(mdContent.trim());
    notes.push({
      id: generateId(),
      title: title,
      content: JSON.stringify(blocks),
      folderId: null,
      order: notes.length,
    });
  }
}

console.log(`Found ${folders.length} folders and ${notes.length} notes`);

// --- Generate SQL ---
const timestamp = nowMs();
let sql = `-- epoznamky.cz import from Notion export
-- Generated: ${new Date().toISOString()}
-- User ID: ${USER_ID}
-- Folders: ${folders.length}
-- Notes: ${notes.length}

BEGIN;

`;

// Insert folders (parent folders must be inserted before children due to FK constraint)
if (folders.length > 0) {
  sql += `-- Folders\n`;

  // Topological sort: insert parents before children
  const folderMap = new Map(folders.map((f) => [f.id, f]));
  const inserted = new Set();
  const sortedFolders = [];

  function insertFolder(folder) {
    if (inserted.has(folder.id)) return;
    if (folder.parentId && folderMap.has(folder.parentId)) {
      insertFolder(folderMap.get(folder.parentId));
    }
    sortedFolders.push(folder);
    inserted.add(folder.id);
  }

  for (const folder of folders) {
    insertFolder(folder);
  }

  for (const folder of sortedFolders) {
    sql += `INSERT INTO "Folders" ("Id", "Name", "ParentId", "Color", "Order", "CreatedAt", "UpdatedAt", "UserId")
VALUES (${escapeSQL(folder.id)}, ${escapeSQL(folder.name)}, ${folder.parentId ? escapeSQL(folder.parentId) : "NULL"}, '', ${folder.order}, ${timestamp}, ${timestamp}, ${escapeSQL(USER_ID)});\n`;
  }
  sql += `\n`;
}

// Insert notes
if (notes.length > 0) {
  sql += `-- Notes\n`;
  for (const note of notes) {
    sql += `INSERT INTO "Notes" ("Id", "Title", "Content", "FolderId", "IsPinned", "IsDeleted", "Order", "CreatedAt", "UpdatedAt", "UserId")
VALUES (${escapeSQL(note.id)}, ${escapeSQL(note.title)}, ${escapeSQL(note.content)}, ${note.folderId ? escapeSQL(note.folderId) : "NULL"}, false, false, ${note.order}, ${timestamp}, ${timestamp}, ${escapeSQL(USER_ID)});\n`;
  }
}

sql += `\nCOMMIT;\n`;

fs.writeFileSync(OUTPUT_FILE, sql, "utf-8");
console.log(`SQL written to: ${OUTPUT_FILE}`);
console.log(`\nTo import on production:`);
console.log(
  `  docker exec -i epoznamky-db psql -U postgres epoznamky < ${OUTPUT_FILE}`
);
