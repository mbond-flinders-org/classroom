# Setup

For ongoing use after setup is done, see **[ADDING-ASSIGNMENTS.md](./ADDING-ASSIGNMENTS.md)**.

The classroom uses **two repos** in your GitHub org:

| Repo | Visibility | Purpose |
|---|---|---|
| `classroom` | **Public** | Assignment landing pages, Accept links, workflow code |
| `classroom-state` | **Private** | Rosters, team memberships, activity dashboards |

Splitting them lets students self-serve from the public side (no org membership, no instructor approval at 1AM) while enrollment data stays inside the private state repo.

## 1. Create org + repos

1. Create a personal GitHub org (Free plan is fine).
2. In that org, create **private template repos** for each assignment archetype. On each, Settings → tick **Template repository**.
3. Create `classroom` repo — start it as **private** while you set up, flip to public at the end of this guide.
4. Create `classroom-state` repo — **private** and stays private.

## 2. Install the GitHub App

Workflows need a token with repo-creation + collab-add + cross-repo access. The default `GITHUB_TOKEN` can't do this.

1. Create app at `github.com/organizations/<your-org>/settings/apps/new` (org-owned is cleanest).
2. Repository permissions:
   - **Administration: Read & write** (create repos, delete issues)
   - **Contents: Read & write** (read templates, commit state)
   - **Issues: Read & write** (comment, close, delete, file welcome issues)
   - **Metadata: Read** (default)
3. Organization permissions:
   - **Members: Read**
4. Webhook: disable.
5. "Where can this GitHub App be installed?" → **Only on this account** (since you own the org).
6. Create app, generate private key (.pem).
7. Install on the org → **All repositories** (it needs to touch templates, classroom, classroom-state, and the student repos it'll create).

## 3. Set repo secrets

In **`classroom`** repo → Settings → Secrets and variables → Actions:

| Name | Value |
|---|---|
| `APP_ID` | numeric App ID from app's General page |
| `APP_PRIVATE_KEY` | entire `.pem` contents incl. BEGIN/END lines |

No secrets needed on `classroom-state` — workflows live in `classroom` and use cross-repo tokens.

## 4. Allow Actions to commit to the repo

`classroom` → Settings → Actions → General → Workflow permissions → **Read and write permissions**.

If the radio is greyed out, fix the org-level setting first:
`github.com/organizations/<your-org>/settings/actions` → Workflow permissions → permissive.

## 5. Bootstrap `classroom-state`

Push one commit to give it a `main` branch:
```bash
git clone https://github.com/<your-org>/classroom-state.git
cd classroom-state
git checkout -b main
echo "# Classroom — private state" > README.md
git add README.md && git commit -m "init" && git push -u origin main
```

## 6. Wire up assignments

In `classroom` repo: edit `assignments/<topic>/*.yml`. Each file = one assignment. Format:

```yaml
id: my-assignment           # unique slug, used in issue titles + repo names + state paths
topic: my-topic             # folder name under assignments/
title: Human-readable title
template: <org>/<template-repo>   # full path of a Template-marked repo
type: solo                  # or "group"
maxSize: 2                  # only for group
dueDate: 2026-06-15         # optional
description: |
  Markdown rendered on the assignment page.
```

Push. The `Build READMEs` workflow runs and regenerates landing pages in both repos.

## 7. Flip `classroom` to public

Once you've reviewed `assignments/` and confirmed there's no PII in any tracked file (there shouldn't be — all student data lives in `classroom-state` only):

`classroom` → Settings → scroll to **Danger Zone** → **Change repository visibility** → **Make public**.

This is **the** step that makes the self-serve flow work. Students don't need to be org members or repo collaborators to open issues on a public repo.

## 8. Test from a second GitHub account

1. Visit `https://github.com/<your-org>/classroom` from a second account (or incognito + a colleague's account).
2. Navigate to a topic → an assignment.
3. Click **Accept**. Submit the prefilled issue.
4. Within ~30s:
   - A new private repo appears in your org named `<topic>-<asg>-<username>`
   - The student account gets a GitHub email invite to that repo
   - The submitted issue **deletes itself**
   - A "Welcome — read me first" issue appears in the new repo with clone instructions
5. In `classroom-state/state/<asg>/README.md`: the student's row appears.

## 9. Going live

- Share the public `classroom` URL with students via LMS announcement.
- Bookmark `classroom-state/state/<asg-id>/README.md` files as your roster dashboards.
- For marking: easiest is the helper script.
  - **Linux / macOS / Git-Bash:** `bin/grab.sh p1-welcomeback` → clones all student repos into `./marking/p1-welcomeback/`.
  - **Windows PowerShell:** `.\bin\grab.ps1 -Assignment p1-welcomeback` → clones into `.\marking\p1-welcomeback\`.
  - Or do it manually: Actions tab on `classroom` repo → **Bulk Clone** → input `assignment-id` → download artifact → run `clone.sh` / `clone.ps1`.
- Both scripts are idempotent — re-run to `git pull` everyone's latest commits before re-marking.

## How team formation works (group assignments)

Privacy-preserving:
- **No public team list.** That would leak who-is-in-which-team to anyone.
- Team A's first member clicks **Create team** → picks slug `pair-alice` → submits.
- Bot creates repo, files welcome issue **inside that repo** containing a share link like:
  `https://github.com/<org>/classroom/issues/new?...team:join:pair-alice...`
- Team A sends that link to their partner via Discord / SMS / chosen channel.
- Partner clicks → submits → bot adds them to the team repo.
- Both submitted issues on `classroom` get deleted.

## Privacy footprint

- **Public always**: assignment titles, due dates, template paths, the `classroom` repo and its commit history.
- **Public transiently** (~30s per join): one issue with `issue.user.login` visible, then deleted.
- **Private**: all of `classroom-state`, all student repos.

If you ever need a stricter audit, the deleted-issue trail still exists in `classroom-state`'s commit log (which records each join by username, not visible publicly).

## Troubleshooting

- **Issue submitted but nothing happens** → check `classroom`'s Actions tab. If no run appeared, the `join` label wasn't applied — verify the issue template's `labels: [join]` is intact and the title starts with `join:`.
- **"Resource not accessible by integration"** → App permission missing or installation token doesn't include both repos. Re-install the App granting access to all repos.
- **Can't generate repo from template** → confirm the template repo has **Template repository** ticked.
- **Activity column always "—"** → cron hasn't run yet. Trigger manually: Actions → **Refresh activity** → Run workflow.
- **Workflow ran but didn't push to classroom-state** → `App.repositories` in the workflow needs to include both `classroom` and `classroom-state`. Already done in our YAMLs — verify the App's installation grants both repos access.
