# Git Flow Guide

This document describes the Git branching strategy used in this project.

## Branching Model

We use a **two-branch deployment model** with `main` (production) and `staging` (pre-production).

```
main (prod) ──●──────────────●──────────
               \            /
staging ────●───●──────●───●────────────
             \       /
              ●─────●
           feature branch
```

## Branches

| Branch | Deploys to | URL |
|--------|-----------|-----|
| `main` | Production | https://notes.nettio.eu |
| `staging` | Staging | https://staging.notes.nettio.eu |

- **`main`** — Production-ready code, always deployable. Protected branch — no direct commits.
- **`staging`** — Pre-production testing. Feature branches merge here first for validation.

## Workflow

### 1. Create a Feature Branch

Always branch from `staging`:

```bash
git checkout staging
git pull origin staging
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

Then create a Pull Request on GitHub **targeting `staging`**:
- Write a clear title and description
- Reference any related issues
- Request reviewers if needed

### 4. Review and Merge to Staging

- Address review feedback
- Ensure CI checks pass
- Merge via GitHub (squash or merge commit)
- Delete the feature branch
- Verify on https://staging.notes.nettio.eu

### 5. Promote to Production

Once changes are validated on staging:

```bash
# Create PR from staging → main on GitHub
# Or merge locally:
git checkout main
git pull origin main
git merge staging
git push origin main
```

This triggers the production deployment automatically.

### 6. Update Local Branches

```bash
git checkout staging
git pull origin staging
git branch -d feature/short-description
```

## Hotfixes

For urgent production fixes that can't wait for staging:

```bash
git checkout main
git pull origin main
git checkout -b fix/critical-bug
# fix the issue
git push -u origin fix/critical-bug
# create PR targeting main and merge quickly
# then backport to staging:
git checkout staging
git pull origin staging
git merge main
git push origin staging
```

## Best Practices

1. **Keep branches short-lived** - Merge within a few days
2. **Pull staging frequently** - Stay up to date to avoid conflicts
3. **Write descriptive commits** - Future you will thank you
4. **One feature per branch** - Keep changes focused
5. **Test before pushing** - Run `npm test` and `npm run build`
6. **Delete merged branches** - Keep the repo clean
7. **Always verify on staging** - Before promoting to production

## Quick Reference

```bash
# Start new feature
git checkout staging && git pull && git checkout -b feature/name

# Save work
git add . && git commit -m "feat: Description"

# Push branch
git push -u origin feature/name

# After PR is merged to staging and verified
# Create PR: staging → main (on GitHub)

# After production merge
git checkout staging && git pull && git branch -d feature/name
```
