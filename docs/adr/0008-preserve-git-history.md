# 0008 — Keep the original git history

- Status: Accepted
- Date: 2026-10-26

## Context

The original code was hand-written before AI coding tools, across three Bitbucket repos. The 2026 re-architecture
could start from a clean repo, but then reviewers could not tell what was built originally and what was rebuilt. The
history also contained secrets and personal and business contact data that cannot go public.

## Decision

Keep all three repos' history (PLAN.md decision log). Each repo was rewritten into `apps/<name>` with
`git filter-repo` and merged into one `main` (329 commits; admin 49, API 137, storefront 139, verified identical
authorship and dates). The only sanctioned rewrites are the one-time scrubs of 2026-10-27:

- secrets replaced in every commit and legacy config files deleted from history;
- personal and business contact data replaced with placeholders (`owner@example.com`, `9000000000`, …);
- 17 commits under a former employer's username reassigned to the owner.

After that, history is never rewritten, squashed or force-pushed (AGENTS.md §1, §11). gitleaks runs in pre-commit and
on the full history.

## Consequences

- **Tech:** `git log` shows the system's real evolution, and the legacy apps stay readable (for example the Pages
  Router storefront at `117c451`).
- **Business:** the history is the evidence that a real, hand-built store sits behind the demo, while customers'
  and the business's data stay private.
- Any future leak found in history needs an explicit owner decision; it is not fixed by routine rewrites.
