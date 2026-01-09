# Feature Testing Checklist

This document provides a comprehensive checklist for testing all features of epoznamky.cz.

**Test Environment:** https://epoznamky.cz

## 1. Authentication

| Feature | Status | Notes |
|---------|--------|-------|
| Register new account | | |
| Login with email/password | | |
| Logout | | |
| Session persistence (refresh page) | | |

## 2. Notes CRUD

| Feature | Status | Notes |
|---------|--------|-------|
| Create new note | | |
| Edit note title | | |
| Edit note content | | |
| Save note (Ctrl+S) | | |
| Save note (Save button) | | |
| Delete note (soft delete) | | |
| Auto-save indicator | | |

## 3. Rich Text Editor

| Feature | Status | Notes |
|---------|--------|-------|
| Bold text (Ctrl+B) | | |
| Italic text (Ctrl+I) | | |
| Underline text (Ctrl+U) | | |
| Strikethrough | | |
| Heading 1 | | |
| Heading 2 | | |
| Heading 3 | | |
| Bullet list | | |
| Numbered list | | |
| Task/checkbox list | | |
| Blockquote | | |
| Code block | | |
| Inline code | | |
| Horizontal rule | | |
| Links | | |
| Images | | |
| Tables | | |

## 4. Folders

| Feature | Status | Notes |
|---------|--------|-------|
| Create folder | | |
| Rename folder | | |
| Change folder color | | |
| Delete folder | | |
| Move note to folder | | |
| View notes in folder | | |
| Nested folders (if supported) | | |

## 5. Tags

| Feature | Status | Notes |
|---------|--------|-------|
| Create tag | | |
| Rename tag | | |
| Change tag color | | |
| Delete tag | | |
| Assign tag to note | | |
| Remove tag from note | | |
| Filter notes by tag | | |

## 6. Note Organization

| Feature | Status | Notes |
|---------|--------|-------|
| Pin note | | |
| Unpin note | | |
| View pinned notes | | |
| Reorder notes (drag & drop) | | |
| Grid view | | |
| List view | | |
| Sort by modified date | | |
| Sort by created date | | |
| Sort by title | | |

## 7. Trash & Restore

| Feature | Status | Notes |
|---------|--------|-------|
| Move note to trash | | |
| View trash | | |
| Restore note from trash | | |
| Permanently delete note | | |

## 8. Search

| Feature | Status | Notes |
|---------|--------|-------|
| Search by title | | |
| Search by content | | |
| Clear search | | |
| Search results highlighting | | |

## 9. User Interface

| Feature | Status | Notes |
|---------|--------|-------|
| Dark theme | | |
| Light theme | | |
| Theme toggle | | |
| Responsive layout | | |
| Sidebar collapse/expand | | |
| Keyboard shortcuts | | |

## 10. User Isolation

| Feature | Status | Notes |
|---------|--------|-------|
| Notes visible only to owner | | |
| Folders visible only to owner | | |
| Tags visible only to owner | | |
| Different users have separate data | | |

## 11. Performance

| Feature | Status | Notes |
|---------|--------|-------|
| Page load time < 3s | | |
| Note save response < 1s | | |
| Search response < 1s | | |
| No UI freezing | | |

## 12. Error Handling

| Feature | Status | Notes |
|---------|--------|-------|
| Network error notification | | |
| Session expired handling | | |
| Invalid input validation | | |
| 404 page | | |

---

## Test Accounts

| Username | Password | Role |
|----------|----------|------|
| demo@example.com | demo123 | User |
| admin@example.com | admin123 | Admin |

## Status Legend

- ✅ Pass
- ❌ Fail
- ⚠️ Partial/Issue
- ⏭️ Skipped
- (empty) Not tested

## Bug Reports

Document any bugs found during testing:

### Bug #1
- **Feature:**
- **Expected:**
- **Actual:**
- **Steps to reproduce:**

---

*Last updated: 2026-01-09*
