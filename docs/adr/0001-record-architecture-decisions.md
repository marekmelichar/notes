# 0001. Record architecture decisions

Date: 2026-04-18
Status: Accepted

## Context

This codebase has accumulated meaningful architectural choices — Redux instead of RTK Query, TipTap for rich text, Keycloak for auth, server-backed instead of offline-first, PWA via Vite plugin, feature-folder layout, soft-delete with a sweeper. Each of these has trade-offs that aren't obvious from reading the code.

Without a record, every future contributor (human or agent) ends up re-asking "why don't we just use X?" and either making the same decision again with no record, reversing it without understanding what we'll lose, or worst — adding *both* approaches because nobody knew the question had been answered.

## Decision

**Adopt lightweight ADRs (Architecture Decision Records) under `docs/adr/`, one Markdown file per decision, numbered sequentially.**

Format follows the original Michael Nygard template: Context → Decision → Consequences → Alternatives. See `_template.md`.

ADRs are immutable once Accepted. To change a decision, write a new ADR that supersedes the old one (and update the old one's status to "Superseded by NNNN").

Write an ADR when you:

- Add a new runtime dependency that touches multiple files
- Introduce a new architectural pattern
- Reverse a previous decision

Skip ADRs for: bug fixes, version bumps, refactors that don't change shape.

## Consequences

**Positive:**
- Future contributors (incl. AI assistants) can read the *why* in minutes.
- Discussions on PRs become "we should write ADR XYZ to revisit decision ABC" instead of relitigating from scratch.
- Forces the author to think clearly about trade-offs at decision time.

**Negative:**
- Mild ceremony tax on each significant change.
- Easy to skip — must be enforced via PR review.

**Neutral:**
- Living documents — ADRs evolve with status changes, not edits to the body.

## Alternatives considered

- **Wiki / Notion / external doc**: separates decisions from code, drifts faster, less discoverable from a `grep`.
- **Inline comments in code**: too local; an architectural decision often spans many files.
- **Commit messages only**: ephemeral, not browsable, hard to find.
- **Nothing**: the current state, which is what motivated this ADR.

## Notes

The first batch of ADRs (0002–0008) are retroactive — they document decisions already made and embedded in the code. They are best-effort reconstructions of the original reasoning. New decisions from this point forward should be written *before* or *with* the implementation, not after.
