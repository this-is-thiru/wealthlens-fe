# Branch Protection Settings

The exact GitHub settings that enforce [BRANCHING.md](./BRANCHING.md) on `development`, `staging` and `release`.

> **Plan requirement.** GitHub only *enforces* rulesets and branch protection on **private** repositories on a paid plan
> (**GitHub Team** for an organization, GitHub Pro for a personal account). Public repositories get them on Free.
> On a Free private repo the settings below cannot be turned on; treat them as **team rules** that everyone follows by
> convention. The CI checks still run and still show red/green on every PR. They just do not block the merge button.

## What is enforced

| Setting                                   | `development`        | `staging`        | `release`        |
|-------------------------------------------|----------------------|------------------|------------------|
| Require a pull request before merging     | ✅                   | ✅               | ✅               |
| Required approvals                        | 1                    | 1                | 1                |
| Dismiss stale approvals on new commits    | ✅                   | ✅               | ✅               |
| Require approval of the most recent push  | –                    | –                | ✅               |
| Require conversation resolution           | ✅                   | ✅               | ✅               |
| Allowed merge methods                     | Squash, Merge commit | Merge commit     | Merge commit     |
| Required status checks                    | `build-and-test`, `branch-policy` | same | same       |
| Require branch to be up to date           | –                    | ✅               | ✅               |
| Block force pushes                        | ✅                   | ✅               | ✅               |
| Block deletion                            | ✅                   | ✅               | ✅               |
| Require linear history                    | ❌ (see below)       | ❌               | ❌               |
| Bypass list                               | empty                | empty            | empty            |

Because the PR rule applies to everyone and the bypass list is empty, nobody (admins included) can push directly to these branches.

### Why linear history is off on all three

*Require linear history* rejects merge commits.

- `staging` and `release` **must** receive merge commits (promotions and back-merges), so linear history cannot apply there.
- `development` receives squash merges for features, but it also receives **merge commits for hotfix back-merges** (`staging` → `development`). With linear history on, a back-merge would have to be squashed, which breaks the shared history and causes the same conflict to reappear on the next promotion.

Feature history on `development` still stays linear in practice: every feature/bugfix PR is squashed into a single commit. Only the occasional back-merge adds a merge commit.

### Why "up to date" is off on `development`

With many feature PRs open, requiring each one to be rebased on the latest `development` before merging causes a lot of re-runs for little benefit. On `staging` and `release` it is on: a promotion PR can only be merged if it already contains everything on the target branch. In practice that means any hotfix must be back-merged first, which is exactly what we want.

### What the status checks do

Both come from `.github/workflows/ci.yml`. The **job names are the check names**, so do not rename the jobs without updating the rulesets.

| Check            | What it does |
|------------------|--------------|
| `build-and-test` | `npm ci`, `npm run build`, and the Karma unit tests in headless Chrome. |
| `branch-policy`  | Fails the PR if the source branch is not allowed for the target (e.g. a `feature/*` PR into `staging`, or anything other than `staging`/`hotfix/*` into `release`), or if a `feature/`, `bugfix/` or `hotfix/` branch is not named `<type>/<TICKET>-<short-desc>`. |

A check only shows up in the ruleset UI's search once it has run at least once, so open one PR (or push to one of the branches) after adding the workflow, before configuring the rulesets.

## Option A: import the rulesets (recommended)

The three rulesets are saved as JSON in `.github/rulesets/`:

- `.github/rulesets/development.json`
- `.github/rulesets/staging.json`
- `.github/rulesets/release.json`

For each file:

1. *Settings → Rules → Rulesets → New ruleset → **Import a ruleset***.
2. Select the JSON file.
3. Check the values match the table above, then **Create**.

Or apply them with the GitHub CLI (needs admin on the repo):

```bash
for f in development staging release; do
  gh api -X POST repos/this-is-thiru/wealthlens-fe/rulesets --input .github/rulesets/$f.json
done
```

These files are not applied automatically. GitHub does not read them from the repo. If you change a ruleset in the UI, export it (*Rulesets → … → Export ruleset*) and commit the JSON so the files stay accurate.

## Option B: configure by hand

*Settings → Rules → Rulesets → New ruleset → New branch ruleset.* Create one ruleset per branch:

1. **Ruleset name:** `development` / `staging` / `release`.
2. **Enforcement status:** Active.
3. **Bypass list:** leave empty.
4. **Target branches → Add target → Include by pattern:** `development` / `staging` / `release`.
5. **Branch rules**, tick:
   - **Restrict deletions**
   - **Block force pushes**
   - **Require a pull request before merging**
     - Required approvals: `1`
     - Dismiss stale pull request approvals when new commits are pushed: ✅
     - Require approval of the most recent reviewable push: ✅ on `release` only
     - Require conversation resolution before merging: ✅
     - Allowed merge methods: `development` → **Squash** + **Merge**; `staging`, `release` → **Merge** only
   - **Require status checks to pass**
     - Require branches to be up to date before merging: ✅ on `staging` and `release`, ❌ on `development`
     - Add checks: `build-and-test`, `branch-policy` (source: GitHub Actions)
   - Leave **Require linear history** unticked (see above).
6. **Create**.

> Classic *Branch protection rules* (*Settings → Branches*) can express almost the same thing, but cannot restrict merge
> methods per branch. Use rulesets.

## Repository-wide settings

*Settings → General*:

| Setting                                         | Value |
|-------------------------------------------------|-------|
| Default branch                                  | `development` |
| Pull Requests → Allow merge commits             | ✅ (default message: *Pull request title*) |
| Pull Requests → Allow squash merging            | ✅ (default message: *Pull request title and description*) |
| Pull Requests → Allow rebase merging            | ❌ |
| Pull Requests → Always suggest updating pull request branches | ✅ |
| Pull Requests → Automatically delete head branches | ✅ |

Automatic head-branch deletion never deletes `development`, `staging` or `release` when they are the source of a promotion PR: the deletion rule blocks it.

## If the repo stays on a Free private plan

None of the above can be enforced, so the team agrees to:

1. Never push directly to `development`, `staging` or `release`; always open a PR.
2. Only merge when `build-and-test` and `branch-policy` are green and someone else has approved.
3. Use **Squash** for feature/bugfix PRs and **Create a merge commit** for promotions, hotfixes and back-merges.
4. Never force-push to or delete the three branches.
5. Back-merge every hotfix to `staging` and `development` straight away.

The repository-wide settings (default branch, allowed merge methods, auto-delete) *are* available on Free and should still be applied. Disabling rebase merging there at least removes the wrong button.
