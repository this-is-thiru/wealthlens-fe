---
trigger: always_on
---

# Git Safety Rules (wealthlens-fe)

## Branches
| Branch | Purpose | Agent may push? |
|---|---|---|
| `development` | Integration branch | ❌ Never directly — PR only |
| `staging` | Pre-production | ❌ Never |
| `release` | Production | ❌ Never |
| `feature/<ticket>-<slug>` | Feature work | ✅ After approval |
| `chore/<slug>` | Setup / tooling / pipeline | ✅ After approval |
| `fix/<ticket>-<slug>` | Bug fixes | ✅ After approval |

- Create working branches from the latest `development` unless I say otherwise. If unsure, ask.
- Promotion `development → staging → release` happens only through PRs that I or the repo owner create and merge. Never merge these yourself.

## Never
- Push to, commit on, merge into, rebase or reset `development`, `staging` or `release`.
- `git push --force` / `--force-with-lease`, `git reset --hard` on shared history, delete remote branches.
- Commit or push without my explicit `APPROVE` for that commit.
- Commit secrets, `.env` files, tokens, keys, or `node_modules`/build output.
- Change `.github/workflows`, Dockerfile, Sonar config or branch rules unless the approved plan says so.
- Bypass hooks (`--no-verify`) or CI checks.

## Always
- Show `git status` and the diff summary before proposing a commit.
- Conventional Commits: `type(scope): summary` (types: feat, fix, chore, docs, refactor, style, test, ci, build), with the YouTrack ID when there is one, e.g. `feat(portfolio): add holdings table [WL-42]`.
- Keep commits focused; one logical change per commit.
- Before proposing a push: build, lint, format check, typecheck, and tests pass locally (Node.js/npm/Angular CLI/Git only — **never** require local Docker or ask the user to install/run Docker locally). All Docker builds, smoke tests, and GHCR publishing run exclusively through mandatory GitHub Actions CI checks, verified via GitHub Actions logs/summaries and GHCR.
- After a push: report the GitHub Actions result and the Sonar quality gate status.
- If a git command fails or the state is unexpected (wrong branch, conflicts, detached HEAD), stop and tell me. Don't try to fix it with destructive commands.
