# Contributing

This is a private project, but the same rules apply as if it weren't: small atomic commits, descriptive messages, working code on `main`. The point of this file is to make those defaults explicit so future you (or an AI assistant) doesn't have to guess.

## Workflow

We use **GitHub Flow**: trunk-based, short-lived branches, deploy from `main`.

```
main ─●─────●─────●─────●─────●─────
       \         /
        ●───●───●
       feature branch
```

`main` is always deployable. Every CI green push to `main` is rolled out to production by [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

### Branch lifecycle

```bash
# Start
git checkout main && git pull
git checkout -b <type>/<short-description>

# Work
# ... edits ...
git add <specific files>           # avoid `git add .`
git commit -m "<type>: subject"

# Share
git push -u origin <branch>
gh pr create --title "..." --body "..."

# After merge
git checkout main && git pull
git branch -d <branch>
```

Keep branches alive **a few days max**. Long-lived branches drift.

## Branch naming

| Prefix | Use for | Example |
|---|---|---|
| `feature/` | New capability | `feature/note-export` |
| `fix/` | Bug fix | `fix/login-redirect-loop` |
| `refactor/` | Restructure without behavior change | `refactor/notes-slice` |
| `docs/` | Documentation only | `docs/architecture-overhaul` |
| `chore/` | Build, deps, config, repo hygiene | `chore/upgrade-react-19` |
| `perf/` | Performance | `perf/lazy-load-editor` |
| `test/` | Tests only | `test/folders-cycle-detection` |

## Commit messages

Subject line: `<type>: <imperative subject ≤ 72 chars>`. Optional body explains *why*.

```
feat: add tag color picker to TagDialog

Folks were copy-pasting hex codes; the picker constrains input to the
project's color palette and validates against the same regex the API
uses (^#[0-9a-fA-F]{6}$).
```

Types match the branch prefixes (`feat`, `fix`, `refactor`, `docs`, `chore`, `perf`, `test`, plus `style` for formatting-only and `ci` for workflow changes).

**Atomic commits.** One logical change per commit. If you have to write "and" in the subject, split it.

## Pre-commit hook

The repo runs `npm run lint && npm run build` (in `ui/`) on every commit. This catches type errors, ESLint issues, and Vite build breaks before they hit the branch. **Never bypass with `--no-verify`** — if the hook is wrong, fix the hook (in the same PR).

Tests are not in the hook (kept fast). Run them yourself before pushing meaningful changes:

```bash
cd ui && npm run test:run
cd api && dotnet test
```

See [docs/testing.md](./docs/testing.md).

## Code style

The full rules live in `~/.claude/CLAUDE.md`. The short version:

### TypeScript

- **Strict types**. Never `any` — use `unknown` and narrow.
- **Interfaces** for object shapes; **types** for unions and computed types.
- **Generics** when they add real type safety, not for cleverness.

### Naming

- Reveal intent. No abbreviations beyond loop counters.
- Booleans: `is*`, `has*`, `can*`, `should*`.
- Functions: verb-first (`getUser`, `validateInput`).
- Constants: `UPPER_SNAKE_CASE`.

### Functions

- Small, focused, one purpose. If you need a comment to explain *what* it does, split it.
- ≤ 3 params; otherwise an options object.
- Pure when possible.

### Error handling

- Handle errors at every boundary (API, file, parse, user input).
- Never swallow silently. Log or propagate.
- API errors: see [docs/error-handling.md](./docs/error-handling.md).

### Patterns

- Composition over inheritance.
- Early returns to reduce nesting.
- Immutability: `const`, `readonly`, spread.
- `async/await` over raw promises. Never mix with callbacks.
- Colocate related code.

## Pull requests

### Before opening

- Branch is up to date with `main` (`git rebase main` or merge — pick one).
- Pre-commit hook passed (it does on commit; double-check after a rebase).
- Tests written for new logic; happy path + ≥1 edge case.
- Docs updated if you touched architecture, auth, deploy, or a public contract.
- ADR added if you made a significant architectural decision.

### PR description

- **What** changed, **why** it changed, **how** to verify.
- Link related issues / ADRs.
- Screenshots for UI changes.
- Checklist of manual verification steps.

```md
## Summary
- ...

## Test plan
- [ ] Unit tests pass: `cd ui && npm run test:run`
- [ ] Build green: `cd ui && npm run build`
- [ ] Manual: ...
```

### Review

- One reviewer minimum. AI review (`/reviewer`, `/security`, etc.) is a complement, not a substitute.
- Block on correctness and security; debate style in followups.
- "Approved with comments" is fine for non-blocking nits — let the author decide.

### Merging

- **Squash** for branches with messy history (most feature branches).
- **Merge commit** for branches that are intentionally split into atomic commits worth preserving.
- Delete the branch after merge.

## What gets a PR vs. just a push

`main` is protected — everything goes through a PR. Even a typo fix. PRs are cheap; the audit trail matters for a deployable trunk.

## ADRs

If you're introducing a new dependency, a new pattern, or reversing a previous decision: write an ADR. Template and existing decisions: [docs/adr/](./docs/adr/).

You don't need an ADR for: bug fixes, refactors that don't change shape, dep version bumps, new tests, doc updates.

## Hotfix

If production is broken:

```bash
git checkout main && git pull
git checkout -b fix/critical-<thing>
# minimal fix
git push -u origin fix/critical-<thing>
gh pr create --title "fix: ..." --body "..."
# Get a quick review, merge, monitor deploy
```

Don't skip the PR. Don't skip the tests. The five minutes you save are not worth the second incident.

## Cleanup sweeps (periodic)

- **Dead code**: `cd ui && npm run knip`
- **Copy-paste detection**: `cd ui && npx jscpd src/ --min-lines 3 --reporters console`
- **Wide refactor candidates**: scan `src/` for inconsistent patterns

These are cleanup sessions, not per-PR chores.

## See also

- [Architecture](./docs/architecture.md) — system shape
- [Testing](./docs/testing.md) — test strategy
- [Error handling](./docs/error-handling.md) — ProblemDetails end-to-end
- [ADRs](./docs/adr/) — *why* this codebase looks like it does
