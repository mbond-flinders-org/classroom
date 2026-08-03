# Keeping Build Files Out of Git

**Student guide — Advanced Software Development**

Your Java project produces two kinds of files: the ones **you write** (`.java` source, resources, docs) and the ones your **IDE generates** when it compiles (`.class` files in `out/` or `bin/`). Only the first kind belongs in Git.

This guide shows you how to stop the generated ones being committed — and how to fix it if they already have been.

---

## Why it matters

Committing `out/` causes real problems, not just clutter:

- **Constant fake changes.** Every time you hit Run, every `.class` file is rewritten. `git status` fills with modifications you didn't make and can't meaningfully review.
- **Merge conflicts on group work.** Two people compile the same project and get different bytes in the same files. Git can't merge compiled output, so you get conflicts that mean nothing and can't be resolved sensibly.
- **It's redundant.** Anyone with your source can rebuild `out/` in seconds. Storing it is like emailing someone a cake *and* the recipe.
- **Marks.** Your instructor reads your commit history. A history buried under thousands of `.class` changes is hard to assess, and "clean repository hygiene" is a real criterion in this topic.

---

## Step 1: Find out whether you have a problem

In your project folder:

```
git status
```

If you see anything mentioning `out/`, `bin/`, `target/`, `build/` or `.class`, you have files that shouldn't be tracked. Read on.

If it says `nothing to commit, working tree clean` and you've definitely compiled the project — you may already be fine, but do Step 2 anyway to make sure it stays that way.

---

## Step 2: Create the .gitignore file

A `.gitignore` file is a plain text list of things Git should pretend it can't see. It lives in the **root of your repository** — the same folder as your `src/` directory, not inside it.

### The easy way (IntelliJ IDEA)

In the Project pane, right-click the project root folder → **New** → **File** → type `.gitignore` exactly (with the leading dot) → Enter. IntelliJ recognises the name and may offer to add sensible defaults.

### The terminal way

Make sure you're in your repo root, then:

**macOS / Git Bash:**

```
touch .gitignore
```

**Windows PowerShell:**

```
New-Item -ItemType File -Name .gitignore
```

Then open it in your editor.

> **Windows File Explorer won't let you create a file starting with a dot.** It'll refuse the name or silently strip it. Use your IDE or the terminal instead.

---

## Step 3: Fill it in

Paste this into `.gitignore`. It covers IntelliJ, Eclipse, Maven and Gradle, so it works whatever you're using:

```gitignore
# Compiled output
out/
bin/
build/
target/
*.class

# IntelliJ IDEA
.idea/
*.iml
*.iws
*.ipr

# Eclipse
.classpath
.project
.settings/

# VS Code
.vscode/

# Logs and temp files
*.log
*.tmp

# OS junk
.DS_Store
Thumbs.db
```

**How the patterns work:**

| Pattern | Meaning |
|---|---|
| `out/` | The trailing slash means "a folder called `out`, anywhere in the project, and everything inside it". |
| `*.class` | The `*` matches any characters, so this catches every compiled class file wherever it sits. |
| `.DS_Store` | macOS scatters these invisible files everywhere. Ignoring them stops Mac users annoying Windows users in group work. |
| `!important.txt` | A leading `!` un-ignores something. You rarely need this. |

`.gitignore` itself **should** be committed — that's how your teammates get the same rules.

---

## Step 4: If `out/` was already committed, untrack it

**This is the part people miss.** `.gitignore` only applies to files Git isn't already tracking. If you committed `out/` before adding the ignore rules, Git keeps tracking it forever and your new rules do nothing.

Check whether that's happened:

```
git ls-files out/
```

Empty output means you're fine — skip to Step 5. Any filenames listed means they're tracked and you need to untrack them.

To untrack them while **keeping your local copies**:

```
git rm -r --cached out
```

> **The `--cached` flag is doing the important work here.** With it, Git stops tracking the folder but leaves it untouched on your disk. **Without it, `git rm -r out` deletes the folder from your computer.** Your IDE would just rebuild it, so it's recoverable — but check you typed `--cached` before pressing Enter.

You'll see a long list of `rm 'out/...'` lines. That's the removal being *staged*, not files disappearing.

Now commit the change:

```
git add .gitignore
```

```
git commit -m "Add gitignore and untrack compiled output"
```

```
git push
```

The files stay on your machine, but they're gone from GitHub and won't come back.

Repeat for any other folder that shouldn't be there — swap `out` for `bin`, `target` or `build` as needed.

---

## Step 5: Confirm it worked

```
git status
```

Compile your project again, then run `git status` once more. The `out/` folder should **not** appear either time.

To ask Git directly why a specific file is being ignored:

```
git check-ignore -v out/Main.class
```

It prints the line of `.gitignore` responsible. No output at all means the file is **not** ignored — something's wrong with your pattern or the file's location.

---

## Troubleshooting

**I added `out/` to .gitignore but `git status` still shows it.**
It was already tracked. Do Step 4.

**`fatal: pathspec 'out' did not match any files`**
Either the folder doesn't exist, or it was never tracked in the first place. Run `git ls-files out/` to check. If that's empty, nothing to do.

**My `.gitignore` seems to be ignored entirely.**
Three usual causes. It's in the wrong folder — it must sit in the repo root, beside `src/`. Or it got saved as `.gitignore.txt`, which Windows Notepad does silently; run `ls -a` (macOS) or `dir /a` (Windows) to see the real name. Or you're editing the wrong copy in a nested project folder.

**I committed a password or API key by mistake.**
`.gitignore` won't help — it's already in your history, and deleting it in a later commit doesn't remove it from earlier ones. **Change the credential immediately** — assume it's compromised — then email your instructor. Don't try to rewrite history on a shared repo without asking first.

**My teammate still has `out/` committed.**
Only one of you needs to do Step 4. Once it's pushed, the other person runs `git pull` and the folder becomes untracked for them too (their local copy survives).

**Should I commit `.idea/`?**
For this topic, no — the template above ignores it. It holds machine-specific paths that cause conflicts. Some professional projects commit parts of it deliberately; you don't need to.

---

## The short version

1. Create `.gitignore` in your repo root.
2. Put `out/`, `bin/`, `target/`, `build/`, `*.class`, `.idea/` in it.
3. If those were already committed: `git rm -r --cached out`, then commit and push.
4. Verify with `git status` after compiling.
5. Commit `.gitignore` itself so your team gets the same rules.
