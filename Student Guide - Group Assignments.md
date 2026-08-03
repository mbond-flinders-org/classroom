# Group Assignments

**Student guide — Advanced Software Development**

---

## Read this first

Group assignments are like solo assignments, with one extra step: **forming a team**. Coordinate with your partner before either of you clicks anything — once a team is created, the other person joins it via a share link.

> **Important:** Use your Flinders email (@flinders.edu.au) when creating or signing into GitHub. Personal Gmail/Outlook accounts work but flag you for manual verification, slowing things down. You can add your Flinders email to an existing GitHub account under **Settings → Emails**.

## What you need

- A GitHub account using your **@flinders.edu.au** email.
- A partner (or partners) — both/all of you need GitHub accounts.
- Your classroom link from Canvas.
- A way to message each other (Discord, SMS, email — anything quick).

## Decide who creates the team

Pick **one person** to be the team creator. They'll get the repo first and send a share link to the other(s).

Pick a team name (a "slug"). Rules:

- Lowercase letters, digits, hyphens only.
- No spaces, no underscores, no special characters.
- 3–32 characters long.
- Must be unique within the assignment.

Examples: `pair-alice-bob`, `team-quokka`, `group-7`.

---

## Before either of you clones: connect Git to GitHub

**Both partners do this, once per computer.** It takes about five minutes and you never repeat it. Do it now, while you're waiting on each other — it's the step that catches people out.

Your team repo is **private**, so Git has to prove who you are before it will download anything.

> **Your GitHub password will not work here.** GitHub stopped accepting account passwords for Git in 2021. Typing your password at the prompt gives you `Password authentication is not supported for Git operations`, no matter how correct it is.

First check you have Git. Open **PowerShell** (Windows) or **Terminal** (macOS):

```
git --version
```

No version number? **Windows:** install from [git-scm.com/download/win](https://git-scm.com/download/win), accept the defaults, then close and reopen PowerShell. **macOS:** the command itself pops up a dialog offering the Command Line Developer Tools — click **Install** and wait.

Now install the GitHub CLI, which handles the sign-in for you.

**Windows**, in PowerShell:

```
winget install GitHub.cli
```

**macOS**, in Terminal (needs Homebrew from [brew.sh](https://brew.sh)):

```
brew install gh
```

No Homebrew? Download the `.pkg` from [cli.github.com](https://cli.github.com) instead.

Close and reopen your terminal, then — same command on **both** Windows and macOS:

```
gh auth login
```

Answer with the arrow keys and Enter: **GitHub.com** → **HTTPS** → **Yes** (authenticate Git) → **Login with a web browser**. Copy the one-time code it shows, press Enter, paste the code into the browser, click **Authorise**. Green tick in the terminal means done.

**On a lab machine where you can't install anything?** Use a token: [github.com/settings/tokens](https://github.com/settings/tokens) → **Tokens (classic)** → **Generate new token (classic)** → tick **`repo`** → Generate. Copy it straight away, GitHub shows it once. When Git prompts you, the username is your **GitHub username** (not your email, not the repo name) and the password is the **token**. On macOS run `git config --global credential.helper osxkeychain` first so you only paste it once; Windows saves it automatically.

> **Never send your token to your partner.** It's a password, and it's yours, not the team's. You each set up your own computer.

---

# Part A — If you're the team creator

## Step 1: Open the assignment page

Click the classroom link, navigate to the group assignment (e.g. **P3 — YouTube Trender**).

You'll see two sections: **Create a new team** and **Joining an existing team**.

<!-- SCREENSHOT: group assignment landing page -->

## Step 2: Click "Click here to create a team"

The blue link with the pointing finger (👉) opens the issue form below.

<!-- SCREENSHOT: create team issue form -->

## Step 3: Replace YOUR-TEAM-SLUG with your team name

The issue title looks like:

```
join:p3-youtubetrender team:create:YOUR-TEAM-SLUG
```

Replace `YOUR-TEAM-SLUG` with the team name you picked (e.g. `pair-alice-bob`). It should look like:

```
join:p3-youtubetrender team:create:pair-alice-bob
```

> **Don't change anything else.** Only edit the slug part. Don't touch the rest of the title or the description.

## Step 4: Click Create

Within ~30 seconds the bot creates your team repo and deletes the submitted issue.

## Step 5: Check email for the collaborator invite

GitHub emails you. Click **View invitation** and accept.

## Step 6: Open the welcome issue — get the share link

On your new repo, open the **Issues** tab and click **Welcome — read me first**. It contains a section called **🤝 Invite your teammate** with a long URL — that's your share link.

## Step 7: Send the share link to your partner

Copy the share link and send it to your partner via Discord, SMS, email, anything. They click it to join your team. The link looks like:

```
https://github.com/mbond-flinders-org/classroom/issues/new?template=join.md&title=join:p3-youtubetrender%20team:join:pair-alice-bob&labels=join
```

> **Heads up:** The share link only works while there's a spot left in the team. Once you're full, the link rejects further joiners.

## Step 8: Wait for your partner to join, then clone

Once your partner clicks the link and submits, they're added as a collaborator on the same repo.

Make sure you've done **"Before either of you clones"** above, then copy the `git clone` command from your welcome issue.

> **Paste one line at a time.** Run the clone, wait for it to finish, *then* run the `cd`. Pasting both together means the second line can get typed into a prompt instead of running as a command — which produces a baffling `Invalid username or token` error.

```
git clone https://github.com/mbond-flinders-org/<your-team-repo>.git
```

Then:

```
cd <your-team-repo>
```

The repo name follows `<topic>-<assignment>-<team-slug>`, e.g. `adv-soft-dev-p3-youtubetrender-pair-alice-bob`.

---

# Part B — If you're joining a team

## Step 1: Get the share link from your partner

Your team creator sends you a link that looks like:

```
https://github.com/mbond-flinders-org/classroom/issues/new?template=join.md&title=join:p3-youtubetrender%20team:join:pair-alice-bob&labels=join
```

If they haven't sent it yet, ask them to open their welcome issue and copy it.

## Step 2: Click the share link

It opens a prefilled issue form. The title already contains `team:join:` followed by the team slug. **Don't change anything.**

## Step 3: Click Create

Within ~30 seconds the bot adds you as a collaborator on the team's repo and deletes the submitted issue.

## Step 4: Check email for the collaborator invite

GitHub emails you. Click **View invitation** and accept.

## Step 5: Open the team repo

This is the same repo your team creator has — both of you push to it.

## Step 6: Clone it

Do **"Before either of you clones"** above first — your partner's setup doesn't carry across to your machine. You each authenticate your own computer.

Copy the `git clone` command from the welcome issue and run it, **one line at a time**:

```
git clone https://github.com/mbond-flinders-org/<your-team-repo>.git
```

Then:

```
cd <your-team-repo>
```

---

## Working together

- You both have push access — commits from either of you go to the same `main` branch.
- **Pull before you push:** `git pull --rebase` then `git push`.
- If you both edit the same file, you'll get a merge conflict. Talk to each other first.
- Use branches if you're doing big changes: `git switch -c my-feature`, commit there, open a pull request when ready.

---

## Troubleshooting

**My partner created the team but didn't send me the link.**
Ask them to open the team repo → **Issues** → **Welcome — read me first**. The share link is in the "🤝 Invite your teammate" section.

**The bot says the team is full.**
Each team caps at the size set by the instructor (usually 2). If full, either make a new team yourself (you become the new creator) or join a different one.

**I clicked Create Team but used the same name as someone else.**
The bot rejects duplicate names. Pick a unique slug and click the Create link again.

**I joined the wrong team.**
Email your instructor with both team slugs and ask to be moved. The bot can't undo joins.

**My partner created a team but I'm already in a different one.**
The bot rejects you — one student = one team per assignment. Pick one team, email the instructor if you need to switch.

**I never got the invite email after joining.**
Check the email linked to your GitHub account. As fallback, visit [github.com/notifications](https://github.com/notifications) — the collaborator invite shows up there too.

### Cloning problems

**Git asks for a username and password, and my password is rejected.**
You skipped "Before either of you clones". GitHub hasn't accepted passwords for Git since 2021. Run `gh auth login` and try again.

**`repository not found`, but I'm definitely on the team.**
You're signed in fine, but haven't accepted the collaborator invite yet. Check the email linked to your GitHub account, or [github.com/notifications](https://github.com/notifications).

**It worked on my partner's laptop but not mine.**
Authentication is per-computer, not per-team. Each of you runs `gh auth login` on your own machine. Also common between operating systems — Windows installs a credential helper by default that macOS doesn't, so a Mac is more likely to stop and ask.

**My first `git push` asks me to identify myself.**
Run these once, with your own details:

```
git config --global user.name "Your Name"
```

```
git config --global user.email "your.id@flinders.edu.au"
```

**It asks for a username when I wasn't expecting it.**
You probably pasted two lines at once. Press `Ctrl+C` and start again, one line at a time.
