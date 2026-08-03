# How to Accept an Assignment

**Student guide — Advanced Software Development**

---

## What you need

- A GitHub account using your **@flinders.edu.au** email address (free — [github.com/signup](https://github.com/signup)). Already have a GitHub account on a personal email? Either add your Flinders email under **Settings → Emails**, or create a separate account for university work.
- A web browser. No software install yet.
- Your classroom link from Canvas.

> **Important:** Use your Flinders email when creating or signing into GitHub. Your instructor uses this to confirm you're actually enrolled. Personal Gmail/Outlook accounts will work but flag you for manual verification, which slows things down.

You'll install Git and clone the repo at the end of this guide. Don't worry about that yet.

---

## Step 1: Open the assignment page

Click the classroom link your instructor shared in Canvas. Navigate to the assignment, e.g. **adv-soft-dev → P1 — Welcome Back**. You'll see the landing page below.

<!-- SCREENSHOT: assignment landing page -->

## Step 2: Click "Click here to accept"

The blue link with the pointing finger (👉) starts the process. You may be prompted to sign in to GitHub if you aren't already.

<!-- SCREENSHOT: accept link -->

## Step 3: Submit the prefilled issue

GitHub opens a form with the title and description **already filled in**. Don't change them. Just click the green **Create** button at the bottom.

The page will briefly show your submitted issue. That's normal.

Within about 30 seconds, the classroom bot processes your request and deletes the issue — if you see it disappear, that's a good sign.

<!-- SCREENSHOT: prefilled issue form -->

## Step 4: Check your email for the GitHub invite

GitHub emails you a collaborator invite to your brand-new repository. Open the email and click **View invitation**.

Accept the invitation in GitHub. The invite expires in **7 days**, so don't wait too long.

## Step 5: Open your repository

After accepting, you'll land on your new private repo. The name follows the pattern `<topic>-<assignment>-<your-username>`, e.g.

```
adv-soft-dev-p1-welcomeback-yourname
```

This is your copy of the starter code. Only you and your instructor can see it.

## Step 6: Read the welcome issue

Click the **Issues** tab at the top of your new repo. You'll see one issue:

Open **Welcome — read me first** to see your clone command and next steps.

<!-- SCREENSHOT: welcome issue -->

---

## Step 7: Install Git

You need Git on your computer before you can download your repo. Check whether you already have it — open **PowerShell** (Windows) or **Terminal** (macOS) and run:

```
git --version
```

If you see a version number like `git version 2.47.0`, you already have Git. Skip to Step 8.

**Windows** — download the installer from [git-scm.com/download/win](https://git-scm.com/download/win). Accept every default. Close and reopen PowerShell afterwards, or it won't find the new command.

**macOS** — running `git --version` pops up a dialog offering to install the Command Line Developer Tools. Click **Install** and wait — it takes a few minutes. That's all you need; you do *not* need the full Xcode download.

## Step 8: Connect Git to GitHub (once per computer)

Your repo is **private**, so Git has to prove who you are before it will download anything.

> **Your GitHub password will not work here.** GitHub stopped accepting account passwords for Git in 2021. If you type your password at the prompt you'll get `Password authentication is not supported for Git operations` — no matter how correct the password is. This trips up nearly everyone, so do this step *before* you clone.

The simplest fix is the GitHub CLI, a small tool that handles this for you. Install it:

**Windows** — in PowerShell:

```
winget install GitHub.cli
```

**macOS** — in Terminal (needs Homebrew from [brew.sh](https://brew.sh)):

```
brew install gh
```

No Homebrew and don't want it? Download the `.pkg` installer from [cli.github.com](https://cli.github.com) instead.

Close and reopen your terminal so it picks up the new command. Then, on **both** Windows and macOS:

```
gh auth login
```

Answer the prompts with the arrow keys and Enter:

1. **GitHub.com**
2. **HTTPS**
3. **Yes** — authenticate Git with your GitHub credentials
4. **Login with a web browser**

It shows you a one-time code like `A1B2-C3D4`. Copy it, press Enter, and your browser opens. Paste the code, sign in, click **Authorise**. Back in the terminal you'll see a green tick.

That's permanent. You never do this again on this computer.

**No admin rights?** On a lab or managed machine where you can't install the CLI, use a token instead. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → **Tokens (classic)** → **Generate new token (classic)**. Tick the **`repo`** checkbox, set an expiry that outlasts the semester, and click Generate. **Copy the token immediately** — GitHub shows it once and never again. When Git prompts you during Step 9, enter your **GitHub username** (not your email, not the repo name) and paste the **token** where it asks for a password.

On macOS, run this first so you only paste it once:

```
git config --global credential.helper osxkeychain
```

Windows stores it automatically via Git Credential Manager.

## Step 9: Clone the repo to your computer

Open the welcome issue in your repo and copy the `git clone` command from it.

> **Paste one line at a time.** Copy the first line, press Enter, wait for it to finish, *then* do the second. If you paste both lines together and Git stops to ask you something, your second line gets typed into that question instead of running as a command — and you'll get a confusing `Invalid username or token` error.

First:

```
git clone https://github.com/mbond-flinders-org/adv-soft-dev-p1-welcomeback-yourname.git
```

Wait for it to finish, then:

```
cd adv-soft-dev-p1-welcomeback-yourname
```

If you did Step 8, this runs without asking anything. You're ready to start work.

**A note on pasting passwords:** if you're using the token route, your terminal shows *nothing at all* while you paste — no dots, no asterisks, no movement. It looks broken. It isn't. Paste and press Enter.

---

## Group assignments

Some assignments are done in pairs or small groups. The flow is the same, with one extra step:

1. One partner clicks **Create a new team** — they pick a team name and submit. They get a private repo **+ a share link**.
2. They send the share link to their teammate(s) (via Teams, email, etc).
3. Teammates click the share link, submit the prefilled issue, and get added to the same repo.

Team membership is private — there's no public list of teams to browse. Coordinate with your partner before you create a team.

See the separate **Group Assignments** guide for the full walkthrough.

---

## Troubleshooting

**My issue disappeared. Did something break?**
No — that's expected. The bot deletes your join issue after processing so your username doesn't sit in a public log. Check your GitHub email for the invite.

**I never got the invite email.**
Check the email address linked to your GitHub account (not your university email unless they match). Also check spam. As a fallback, visit `https://github.com/<your-username>?tab=repositories` or go to [github.com/notifications](https://github.com/notifications) — the invite appears there too.

**I see a generic "Create new issue" form with no template loaded.**
You skipped the link and opened the issue manually. Go back to the assignment page and click the 👉 **Accept** link.

**I accidentally changed the issue title.**
Close the issue, go back to the assignment page, and click **Accept** again. Don't edit the title — the bot reads it to know which assignment you're joining.

**I need to join my partner's team but lost the share link.**
Ask your partner to copy it from their welcome issue. If they've lost it too, email your instructor with both of your GitHub usernames.

### Cloning problems

| What you see | What it means |
|---|---|
| `Password authentication is not supported for Git operations` | You typed your GitHub password. Go back to Step 8. |
| `Invalid username or token` | Wrong username, or an expired or mistyped token. Your username is not your email address and not the repo name. |
| `Authentication failed` | Same as above — redo Step 8. |
| `repository not found` | You're signed in fine, but haven't accepted the collaborator invite yet. Check your GitHub email inbox (Step 4). |
| `git: command not found` or `'git' is not recognised` | Git isn't installed, or you didn't reopen your terminal after installing. See Step 7. |
| `gh: command not found` | Same, for the GitHub CLI. Close and reopen your terminal. |
| It asks for a username when you weren't expecting it | You pasted two lines at once. Press `Ctrl+C` and start again, one line at a time. |

**Something else went wrong.**
Email your instructor with: your GitHub username, the assignment id (e.g. `p1-welcomeback`), and a screenshot of the error.

> **Never paste your token** into a screenshot or a message — it's a password. If you think you've exposed one, delete it at [github.com/settings/tokens](https://github.com/settings/tokens) and generate a new one.
