# Architecture

How the pieces fit together. Read this once when getting onboarded.

## Repos

| Repo | Visibility | Role |
|---|---|---|
| `classroom` | **public** | All UI (READMEs), workflows, scripts, assignment YAMLs. Public so students can open issues without being members of the org. |
| `classroom-state` | **private** | All enrollment data: `state/<asg-id>/{repos,groups,activity}.json` + roster READMEs. |
| Template repos (e.g. `P1-WelcomeBack`) | **private**, template-flagged | Source of truth for starter code, one per assignment archetype. |
| Generated student repos (e.g. `adv-soft-dev-p1-welcomeback-alice-gh`) | **private**, one per join | The student's actual work. Owned by the org, student added as `push` collab. |

## Auth

One GitHub App (org-owned, e.g. `classroom-bot-mbond`) installed on the org with permissions:

- Repository: Administration (R/W), Contents (R/W), Issues (R/W), Metadata (R)
- Organization: Members (R)

The App's `APP_ID` + `APP_PRIVATE_KEY` are stored as secrets in `classroom`. Workflows mint short-lived installation tokens via `actions/create-github-app-token`. Tokens auto-cover every repo the App is installed on (we install on "All repositories").

No PATs. No long-lived tokens. No third-party secrets.

## Code layout (in `classroom`)

```
.github/
  ISSUE_TEMPLATE/join.md          # The one template students use (auto-labelled `join`)
  workflows/
    handle-join.yml               # on: issues opened — the main flow
    build-readmes.yml             # on: push to assignments/ or scripts/ — regenerate landing pages
    refresh-activity.yml          # on: schedule hourly + workflow_dispatch
    bulk-clone.yml                # on: workflow_dispatch — generates clone scripts
assignments/<topic>/<asg-id>.yml  # Hand-edited config
assignments/<topic>/<asg-id>/README.md  # Auto-generated landing page (Accept / Create team links)
bin/
  grab.sh, grab.ps1               # One-shot bulk-clone helpers
scripts/
  handle-join.js                  # The bot. Reads issue, validates, creates repo, files welcome, deletes issue.
  build-readmes.js                # Walks YAML, joins with state JSON, writes all READMEs.
  refresh-activity.js             # Per-repo: GET /commits, write activity.json.
  bulk-clone.js                   # Reads state JSON, emits clone.sh + clone.ps1.
  lib/
    state.js                      # Path helpers, YAML loader, slug validator, parseJoinTitle
    templates.js                  # Markdown renderers for all README types + welcome-issue body
```

## The flow

Solo assignment, end-to-end:

```
1. Student visits public classroom repo
   └─ navigates to assignments/<topic>/<asg-id>/README.md (auto-generated landing)
2. Clicks Accept link
   └─ URL: github.com/<org>/classroom/issues/new?template=join.md&title=join:<asg-id>&labels=join
3. GitHub opens prefilled issue form (markdown template, `join` label applied)
4. Student clicks Submit
5. GitHub fires issues.opened webhook
6. handle-join workflow triggers (only if labels contain `join`)
   ├─ Checkout classroom + classroom-state (cross-repo via App token)
   ├─ scripts/handle-join.js:
   │    ├─ parseJoinTitle("join:<asg-id>") → { asgId }
   │    ├─ loadAssignment(asgId) → YAML config
   │    ├─ Read state/<asg-id>/repos.json from classroom-state
   │    ├─ If student already has a repo → comment + close + delete issue (idempotent)
   │    ├─ createUsingTemplate → new private repo in org
   │    ├─ addCollaborator(push)
   │    ├─ Append to repos.json
   │    ├─ fileWelcomeIssue() inside the new repo (with clone instructions)
   │    ├─ regenerateAll() → rebuild READMEs in both repos
   │    └─ GraphQL deleteIssue() on the original issue (no PII in public history)
   ├─ Commit + push classroom changes
   └─ Commit + push classroom-state changes
7. Student gets email: "you've been added to <new-repo>"
8. Student accepts, clones, works.
```

Group assignment differs only in handle-join branching:
- `team:create:<slug>` → like solo, but stores in `groups.json` with `members: [author]`, welcome issue includes a share link.
- `team:join:<slug>` → adds collaborator to existing team repo, appends to `members`.

## State files

All in `classroom-state` repo:

- `state/<asg-id>/repos.json` — solo joiners. `[{ student, repo, createdAt }]`
- `state/<asg-id>/groups.json` — group joiners. `[{ slug, repo, members, createdAt }]`
- `state/<asg-id>/activity.json` — cron-refreshed. `[{ repo, lastCommit, commitCount, lastAuthor }]`
- `state/<asg-id>/README.md` — auto-rendered roster table (joins the JSON files).
- `README.md` (root) — auto-rendered index of all assignments.

Everything is **regenerated** by `build-readmes.js` after any mutation. No hand-edits.

## Concurrency

Every workflow that touches state has `concurrency: classroom-state, cancel-in-progress: false`. Serializes all writes across handle-join + build-readmes + refresh-activity. Different assignments still process in parallel within a single run.

Each commit step does `git pull --rebase` before push, with 3-5 retry attempts.

## Why split into two repos

- `classroom` must be **public** so non-org students can open issues. This is the only way to skip the "I'll invite you next morning" gate.
- But enrollment data (who joined, which team, activity timestamps) can't be public.
- Solution: state lives in a sibling private repo. The App token has cross-repo access, so workflows can read/write both without leaking the private one.

## Issue deletion

We use the GitHub GraphQL `deleteIssue` mutation (requires `administration:write`, which our App has). After the bot processes a join issue, it deletes the issue entirely — including the student's username and timestamp. The classroom-state commit log still records the join (privately).

Window of public exposure: from issue submit to delete, typically 5-15s.

## What's _not_ in here

- No grading / marking automation
- No deadline enforcement (could add — reject join issues after `dueDate`)
- No anti-cheating
- No analytics
- No third-party services

Everything runs on GitHub-native primitives.
