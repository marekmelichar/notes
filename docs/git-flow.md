# Git Flow Guide

This document describes the Git branching strategy used in this project.

## Branching Model

We use **GitHub Flow** - a simplified Git workflow suitable for continuous deployment.

```
main ─────●─────●─────●─────●─────
           \         /
            ●───●───●
          feature branch
```

## Main Branch

- `main` - Production-ready code, always deployable
- Protected branch - no direct commits
- All changes come through Pull Requests

## Workflow

### 1. Create a Feature Branch

Always branch from `main`:

```bash
git checkout main
git pull origin main
git checkout -b feature/short-description
```

**Branch naming conventions:**
- `feature/` - New features (e.g., `feature/user-auth`)
- `fix/` - Bug fixes (e.g., `fix/login-error`)
- `refactor/` - Code refactoring (e.g., `refactor/api-client`)
- `docs/` - Documentation changes (e.g., `docs/api-guide`)
- `chore/` - Maintenance tasks (e.g., `chore/update-deps`)

### 2. Make Changes

```bash
# Make your changes
git add .
git commit -m "feat: Add user authentication"
```

**Commit message format:**
```
type: Short description

Optional longer description explaining the change.

Co-Authored-By: Name <email>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation
- `style` - Formatting, styling
- `test` - Adding tests
- `chore` - Maintenance

### 3. Push and Create Pull Request

```bash
git push -u origin feature/short-description
```

Then create a Pull Request on GitHub:
- Write a clear title and description
- Reference any related issues
- Request reviewers if needed

### 4. Review and Merge

- Address review feedback
- Ensure CI checks pass
- Merge via GitHub (squash or merge commit)
- Delete the feature branch

### 5. Update Local Main

```bash
git checkout main
git pull origin main
git branch -d feature/short-description
```

## Hotfixes

For urgent production fixes:

```bash
git checkout main
git pull origin main
git checkout -b fix/critical-bug
# fix the issue
git push -u origin fix/critical-bug
# create PR and merge quickly
```

## Best Practices

1. **Keep branches short-lived** - Merge within a few days
2. **Pull main frequently** - Stay up to date to avoid conflicts
3. **Write descriptive commits** - Future you will thank you
4. **One feature per branch** - Keep changes focused
5. **Test before pushing** - Run `npm test` and `npm run build`
6. **Delete merged branches** - Keep the repo clean

## Quick Reference

```bash
# Start new feature
git checkout main && git pull && git checkout -b feature/name

# Save work
git add . && git commit -m "feat: Description"

# Push branch
git push -u origin feature/name

# After PR is merged
git checkout main && git pull && git branch -d feature/name
```
