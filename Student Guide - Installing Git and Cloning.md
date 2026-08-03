# Installing Git and Cloning Your Repo

**Student guide — Advanced Software Development**

Start here once you've accepted an assignment and have your own repository on GitHub. If you haven't done that yet, see **How to Accept an Assignment** first.

Everything below is a **one-off setup** except the final clone. You'll do steps 1 and 2 once per computer, ever.

---

## Step 1: Install Git

Check whether you already have it. Open **PowerShell** (Windows) or **Terminal** (macOS) and run:

```
git --version
```

If you see a version number like `git version 2.47.0`, you already have Git. Skip to Step 2.

**Windows** — download the installer from [git-scm.com/download/win](https://git-scm.com/download/win). Accept every default. Close and reopen PowerShell afterwards, or it won't find the new command.

**macOS** — running `git --version` pops up a dialog offering to install the Command Line Developer Tools. Click **Install** and wait — it takes a few minutes. That's all you need; you do *not* need the full Xcode download.

## Step 2: Connect Git to GitHub

Your assignment repo is **private**, so Git has to prove who you are before it will download anything.

> **Your GitHub password will not work here.** GitHub stopped accepting account passwords for Git in 2021. If you type your password at the prompt you'll get `Password authentication is not supported for Git operations` — no matter how correct the password is. This catches out nearly everyone, so do this step *before* you clone.

The simplest fix is the GitHub CLI, a small tool that handles the sign-in for you.

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

**No admin rights?** On a lab or managed machine where you can't install the CLI, use a token instead. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → **Tokens (classic)** → **Generate new token (classic)**. Tick the **`repo`** checkbox, set an expiry that outlasts the semester, and click Generate. **Copy the token immediately** — GitHub shows it once and never again. When Git prompts you during Step 4, enter your **GitHub username** (not your email, not the repo name) and paste the **token** where it asks for a password.

On macOS, run this first so you only paste it once:

```
git config --global credential.helper osxkeychain
```

Windows stores it automatically via Git Credential Manager.

## Step 3: Tell Git who you are

Your name and email get stamped on every commit you make. Set them once:

```
git config --global user.name "Your Name"
```

```
git config --global user.email "your.id@flinders.edu.au"
```

Use the same email that's on your GitHub account, otherwise your commits won't be linked to your profile.

## Step 4: Clone your repo

Open the **Welcome — read me first** issue in your repo and copy the `git clone` command from it.

> **Paste one line at a time.** Copy the first line, press Enter, wait for it to finish, *then* do the second. If you paste both lines together and Git stops to ask you something, your second line gets typed into that question instead of running as a command — and you'll get a confusing `Invalid username or token` error.

First:

```
git clone https://github.com/mbond-flinders-org/adv-soft-dev-p1-welcomeback-yourname.git
```

Wait for it to finish, then:

```
cd adv-soft-dev-p1-welcomeback-yourname
```

If you did Step 2, this runs without asking anything.

**A note on pasting passwords:** if you're using the token route, your terminal shows *nothing at all* while you paste — no dots, no asterisks, no movement. It looks broken. It isn't. Paste and press Enter.

### Where does it end up?

`git clone` creates a folder inside whatever directory you're currently in. Run `pwd` (macOS) or `cd` (Windows, on its own) to see where that is. If you want it somewhere specific, `cd` there first:

```
cd Documents
```

Then clone.

---

## Step 5: Check it worked

Inside the cloned folder:

```
git status
```

You should see `On branch main` and `nothing to commit, working tree clean`. That means Git is watching the folder and everything is in sync.

---

## Your everyday commands

Once set up, this is the loop you'll use all semester:

```
git status
```
See what's changed.

```
git add .
```
Stage all your changes for the next commit.

```
git commit -m "Describe what you changed"
```
Save a snapshot locally.

```
git push
```
Upload it to GitHub. **This is what your instructor sees** — work that isn't pushed doesn't count as submitted.

```
git pull
```
Download changes made elsewhere (essential on group assignments — pull before you start work).

---

## Troubleshooting

| What you see | What it means |
|---|---|
| `Password authentication is not supported for Git operations` | You typed your GitHub password. Go back to Step 2. |
| `Invalid username or token` | Wrong username, or an expired or mistyped token. Your username is not your email address and not the repo name. |
| `Authentication failed` | Same as above — redo Step 2. |
| `repository not found` | You're signed in fine, but haven't accepted the collaborator invite yet. Check your GitHub email inbox. |
| `git: command not found` or `'git' is not recognised` | Git isn't installed, or you didn't reopen your terminal after installing. See Step 1. |
| `gh: command not found` | Same, for the GitHub CLI. Close and reopen your terminal. |
| `Please tell me who you are` | You skipped Step 3. Run the two `git config` commands. |
| `fatal: not a git repository` | You're in the wrong folder. `cd` into your cloned repo first. |
| It asks for a username when you weren't expecting it | You pasted two lines at once. Press `Ctrl+C` and start again, one line at a time. |
| `Support for password authentication was removed` | Same as the first row — use `gh auth login`. |

**Something else went wrong.**
Email your instructor with: your GitHub username, the assignment id (e.g. `p1-welcomeback`), and a screenshot of the error.

> **Never paste your token** into a screenshot or a message — it's a password. If you think you've exposed one, delete it at [github.com/settings/tokens](https://github.com/settings/tokens) and generate a new one.
