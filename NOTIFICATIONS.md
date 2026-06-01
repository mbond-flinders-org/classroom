# Killing notification noise

The classroom triggers a lot of GitHub activity — join issues, repo creation, welcome issues, hourly cron commits. Without tuning, your inbox will hurt. Here's how to silence everything you don't actually need.

## 1. Mute issue notifications on the `classroom` repo

Every Accept click opens an issue (which the bot deletes ~30s later). GitHub may still send you an email before deletion.

`https://github.com/mbond-flinders-org/classroom` → **Watch** button (top right) → **Custom** → **uncheck Issues, Pull requests, Discussions, Releases** → **Apply**.

You'll still see Actions failures (those follow a separate setting — see §4).

## 2. Block outside PRs on the public `classroom` repo

`classroom` is public, so any GitHub user can open a PR against it. Tighten:

### a. Require contributor approval for first-time PRs

`classroom` → Settings → Actions → General → "Fork pull request workflows from outside collaborators" → **Require approval for first-time contributors who are new to GitHub**.

Stops random PRs from triggering workflows. They still appear in your inbox unless §1 muted them.

### b. Branch protection on `main`

`classroom` → Settings → Branches → **Add rule** → Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Restrict who can push to matching branches → only you (and your collaborator)

Even if someone opens a PR, they can't merge it. You can close + delete the branch.

## 3. Tighten template-repo settings (one-time, per template)

Generated student repos **inherit** features from the template. Keep things students don't need turned off.

For each template repo (`P1-WelcomeBack`, `P2-DogsAndBrackets`, etc) → Settings → **Features**:

- **Issues** — keep enabled. The bot files the welcome message here, and students may use it as a scratchpad.
- **Discussions** — disable.
- **Projects** — disable.
- **Wiki** — disable.

## 4. Workflow failure emails

Every workflow you trigger sends you an email if it fails. You're the App installer, so you get them.

`github.com/settings/notifications` → **Actions** section:
- **Failed workflows only** is the default — keep it.
- Or tighten to **Notify me: Off** if you'd rather check the Actions tab manually.

Recommend: leave on. A silent failed workflow is worse than an email.

## 5. Bot commits to `classroom-state`

Hourly cron + every join → bot pushes commits to both repos. If you're watching `classroom-state` you'll get notifications.

`https://github.com/mbond-flinders-org/classroom-state` → **Watch** → **Ignore**. You're the only human who reads it, and you'll visit deliberately.

## 6. Don't auto-watch newly created student repos

By default GitHub auto-watches repos you push to. The bot pushes, not you, so you should _not_ be auto-watching student repos. Verify:

`github.com/settings/notifications` → **Automatic watching** section:
- ❌ Automatically watch repositories — **off**
- ❌ Automatically watch teams — **off**

## 7. Filter, don't mute

If you want a paper trail without inbox pain:

- Set up a Gmail / Outlook filter: `from:notifications@github.com AND "mbond-flinders-org/classroom"` → skip inbox, label "classroom".
- Periodically check the label.

## Verification

After applying §1-6, do a smoke-test join from a second account. You should see:

- ✅ No email for the join issue opening
- ✅ No email for the issue deletion
- ✅ No email for the new student repo creation
- ✅ No email for the welcome issue (you're not a collab on the student repo)
- ✅ No email for the bot's commit to `classroom-state`
- ✅ Workflow success: silent. Workflow failure: email.

If anything still leaks, the fix is almost always "uncheck more things in the Watch menu" on the relevant repo.
