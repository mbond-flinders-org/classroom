# Setup

One-time setup for a new classroom org.

## 1. Create org + repos

1. Create a personal GitHub org (free plan is fine).
2. Create one or more **private template repos** in the org with starter code for each assignment. Mark each as a template under repo Settings → Template repository.
3. Create a **private** repo called `classroom` in the same org. This is where this code lives.

## 2. Install the GitHub App

The workflows need a token with permission to create repos and add collaborators across the org. `GITHUB_TOKEN` (the default Actions token) can't do this — it's scoped to its own repo.

1. Go to https://github.com/settings/apps/new (or org-level: Settings → Developer settings → GitHub Apps → New GitHub App).
2. Settings:
   - **Name:** anything (e.g. `classroom-bot-<your-handle>`).
   - **Homepage URL:** the URL of your `classroom` repo.
   - **Webhook:** disable.
   - **Permissions** (Repository):
     - Administration: **Read & write** (create repos)
     - Contents: **Read & write** (read templates, commit state files)
     - Issues: **Read & write** (comment + close)
     - Metadata: **Read** (default, can't disable)
   - **Permissions** (Organization):
     - Members: **Read** (look up users)
   - **Where can this GitHub App be installed?** Only on this account.
3. Create the app.
4. On the app page, **Generate a private key** — downloads a `.pem` file. Keep it safe.
5. Click **Install App** → install on your org → grant access to **All repositories** (it needs to read templates + create new repos + write to `classroom`).

## 3. Set repo secrets

In the `classroom` repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|---|---|
| `APP_ID` | The numeric App ID from the app's General page |
| `APP_PRIVATE_KEY` | Paste the **entire contents** of the `.pem` file, including the `-----BEGIN…` and `-----END…` lines |

## 4. Allow Actions to commit to the repo

Settings → Actions → General → Workflow permissions:
- Select **Read and write permissions**
- Tick **Allow GitHub Actions to create and approve pull requests** (optional)

## 5. Enable issue templates

The issue template at `.github/ISSUE_TEMPLATE/join.yml` is auto-picked up by GitHub. Nothing to enable. Test: open `https://github.com/<org>/classroom/issues/new/choose` — you should see **Join an assignment**.

## 6. Create an org invite link

Org Settings → People → Invite member → **Generate invitation link**:
- Role: **Member**
- Max uses: leave unlimited or set to class size + 10
- Duration: 7 days (max — set a calendar reminder to renew weekly during enrolment)

Share via LMS / lecture slides. Students click → sign in to GitHub → request to join. You approve from Org Settings → People → Pending invitations.

## 7. Add your first assignment

1. Edit `assignments/test/asg1.yml` — change `template:` to your real template path (e.g. `my-org/template-html-basics`).
2. Commit + push.
3. The **Build READMEs** workflow runs and generates the topic + assignment landing pages.
4. Test from a second GitHub account (or a colleague who's an org member): open the `classroom` repo, navigate to the assignment, click **Accept**. Verify a new private repo appears in the org and you get a collaborator invite.

## 8. Going live

- Pin `state/<asg-id>/README.md` files as your roster dashboards.
- Bookmark Actions → **Bulk Clone** for marking day.
- When the semester ends: revoke the org invite link. Optionally remove inactive members (free org has no seat cost so this is just hygiene).

## Troubleshooting

- **Issue opened but nothing happens** → check Actions tab. If no run appeared, the `join` label wasn't applied — the issue template sets it automatically. Verify the title still starts with `join:`.
- **"Resource not accessible by integration"** → GitHub App lacks a permission. Re-check step 2's permission list, then **re-install** the app (changing permissions doesn't auto-apply).
- **Can't generate repo from template** → make sure the source repo has **Template repository** ticked in its Settings, and the app installation has access to it.
- **READMEs not updating** → check the `Build READMEs` workflow ran. If it ran but didn't push, the `[skip ci]` marker prevents recursion; that's fine for `[skip ci]` commits, but real state changes from `handle-join` should commit.
- **Activity column always "—"** → the hourly cron hasn't run yet, or repos are empty. Trigger manually via Actions → **Refresh activity** → **Run workflow**.
