# Adding & managing assignments

How to add a new assignment, edit an existing one, see the roster, and download student work. Assumes the org is already set up (see `SETUP.md` if not).

## Add a new assignment — 3 steps

### 1. Make a template repo

In the org (e.g. `mbond-flinders-org`):

1. Create a new private repo with the starter code for the assignment (e.g. `P4-WhateverThing`).
2. Push your starter code.
3. **Settings → tick "Template repository"**. This is mandatory — without it, the bot can't generate student copies.

### 2. Add an assignment YAML

In the `classroom` repo, create `assignments/<topic>/<asg-id>.yml`. Topic = folder, can be new or existing.

Example for a solo assignment:

```yaml
id: p4-whatever                  # unique slug. Used in issue titles, repo names, state paths
topic: adv-soft-dev              # folder name under assignments/
title: "P4 — Whatever Thing"     # human-readable, shown on landing page
template: mbond-flinders-org/P4-WhateverThing   # full path of the template repo
type: solo
dueDate: 2026-08-30              # optional; omit if no fixed due
description: |
  Markdown rendered on the assignment page. Keep it short — students
  read the actual brief inside the repo.
```

For a group assignment, set `type: group` and add `maxSize`:

```yaml
id: p4-pair-project
topic: adv-soft-dev
title: "P4 — Pair Project"
template: mbond-flinders-org/P4-PairProject
type: group
maxSize: 2                       # 2 = pairs, 3 = triples, etc
dueDate: 2026-08-30
description: |
  Pair work. First partner clicks Create team and shares the link with their partner.
```

Rules:
- `id` must be **unique across all assignments** in the repo (state files are keyed by id alone).
- `id` and `topic` must be kebab-case (lowercase letters/digits/hyphens).
- `template` must be a repo that has "Template repository" ticked.

### 3. Commit + push

```bash
git add assignments/adv-soft-dev/p4-whatever.yml
git commit -m "feat(p4): add Whatever Thing assignment"
git push
```

That's it. The `Build READMEs` workflow runs (~15s) and auto-generates the landing page at `assignments/adv-soft-dev/p4-whatever/README.md` with an Accept link.

## Edit an existing assignment

Edit the YAML, push. Build workflow regenerates the landing page.

Safe to change at any time:
- `title`, `description`, `dueDate`

Avoid changing after students have joined:
- `id` (breaks state files — they're keyed by id)
- `template` (existing student repos already generated from old template — won't re-generate)
- `type` solo ↔ group (state is in `repos.json` for solo, `groups.json` for group — switching corrupts the roster view)
- `maxSize` (downward — would invalidate existing oversized teams)

If you must change a breaking field: delete `state/<asg-id>/` in `classroom-state`, change the YAML, push. Anyone already joined loses their entry and would need to re-Accept.

## Group assignment flow (what students do)

No public team list — privacy preserving. Flow:

1. **Partner A** opens assignment page, clicks **Create a new team**. Issue title gets prefilled with `team:create:YOUR-TEAM-SLUG`. They replace `YOUR-TEAM-SLUG` with their chosen slug (e.g. `pair-alice`), submit.
2. Bot creates repo `<topic>-<asg-id>-pair-alice`, adds A as collaborator, files a welcome issue **inside the new repo** with a share link.
3. **Partner A** sends the share link to Partner B via Discord / SMS / whatever.
4. **Partner B** clicks the link → submits the prefilled issue → bot adds them as collaborator on the same repo.
5. Both submitted issues on `classroom` get auto-deleted.

You can also send the share link yourself if students get stuck. The format is:
```
https://github.com/mbond-flinders-org/classroom/issues/new?template=join.md&title=join:<asg-id>%20team:join:<slug>&labels=join
```

## See who has joined

Roster lives in the **private** `classroom-state` repo:

`https://github.com/mbond-flinders-org/classroom-state/blob/main/state/<asg-id>/README.md`

Solo assignments show: student username, repo link, accepted-at, last commit, commit count.
Group assignments show: team slug, member usernames, slots used, repo link, last commit, commit count.

Last-commit / commit-count are refreshed hourly by the `Refresh activity` cron. To force-refresh right now: Actions → **Refresh activity** → **Run workflow**.

## Bulk-download student repos for marking

### Easiest — helper script

From a checkout of `classroom` (you'll need it cloned anyway to edit YAMLs):

```bash
# Linux / macOS / Git-Bash:
./bin/grab.sh p1-welcomeback                    # clones to ./marking/p1-welcomeback/
./bin/grab.sh p1-welcomeback ~/grading/p1       # custom output dir
```

```powershell
# Windows PowerShell:
.\bin\grab.ps1 -Assignment p1-welcomeback
.\bin\grab.ps1 -Assignment p1-welcomeback -OutDir C:\grading\p1
```

The script: triggers the bulk-clone workflow, waits for it to finish, downloads the artifact, runs the generated clone script. Idempotent — re-running pulls latest commits instead of re-cloning.

### Manual fallback

1. Actions tab on `classroom` → **Bulk Clone** → **Run workflow** → input `assignment-id` → Run.
2. Wait ~10s for the run, click it.
3. Scroll to **Artifacts** → download `clone-<asg-id>.zip`.
4. Unzip, run `clone.sh` (Linux/macOS/Git-Bash) or `clone.ps1` (PowerShell).

### Prereq

Your local `git` must be authenticated to the org. Once-per-machine:

```bash
gh auth login         # log in as a user with access to the org
gh auth setup-git     # wires up git creds
```

## Common pitfalls

- **Template repo not marked as template** → bot fails with `Not Found`. Fix: Settings → tick "Template repository".
- **Bot can't access a template** → re-check the GitHub App installation grants "All repositories" on the org.
- **`labels=join` doesn't auto-apply** → the `join` label must exist in `classroom` repo. Create with `gh label create join -R mbond-flinders-org/classroom`.
- **Build workflow doesn't push README updates** → `classroom` Settings → Actions → General → Workflow permissions → **Read and write**. May need to be set at org level too.
- **Student says "I didn't get an invite"** → check `https://github.com/<org>/<repo>/invitations` from your owner account, or have them check their GitHub email.
- **Student lost their team share link** → look up the team in `classroom-state/state/<asg-id>/groups.json` (slug + members), then construct the join link manually (format above).

## Architecture cheat-sheet

| Repo | Role |
|---|---|
| `classroom` (public) | Landing pages, Accept links, workflows, scripts, YAML configs |
| `classroom-state` (private) | All enrollment data — `state/<asg-id>/{repos,groups,activity}.json` + roster READMEs |
| `<topic>-<asg-id>-<student-or-team>` (private, one per join) | The student's actual work repo, generated from the template |
| Template repos (private) | Source of truth for starter code per assignment |

The classroom bot (GitHub App) is the only thing with cross-repo write access. Everything else is read-only or scoped to a single student repo.
