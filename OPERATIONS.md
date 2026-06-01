# Operations

End-of-semester cleanup, dropped-student handling, token rotation, and other one-off ops.

## A student dropped the unit

You want to revoke their access without nuking their work. Two options:

### Option 1 — revoke collab only (keep repo)

```bash
gh api -X DELETE /repos/mbond-flinders-org/<repo-name>/collaborators/<username>
```

They lose access; you keep the repo in case anything was worth marking.

### Option 2 — delete the repo entirely

```bash
gh repo delete mbond-flinders-org/<repo-name> --yes
```

Then prune from state:
```bash
# Edit classroom-state/state/<asg-id>/repos.json or groups.json
# Remove the entry. Commit + push. build-readmes will regenerate roster.
```

If you skip the prune step, the roster will show a broken repo link until next manual cleanup.

## A student lost their team share link (group assignments)

Reconstruct:
```
https://github.com/mbond-flinders-org/classroom/issues/new?template=join.md&title=join:<asg-id>%20team:join:<slug>&labels=join
```

You can look up `<slug>` in `classroom-state/state/<asg-id>/groups.json`.

## End-of-semester archive

When the unit is done:

### 1. Archive the topic in `classroom`

```bash
git mv assignments/adv-soft-dev assignments/_archive/adv-soft-dev-2026s1
git commit -m "archive: adv-soft-dev semester 1 2026"
git push
```

`build-readmes` will drop the topic from the root index (only walks first level under `assignments/`, archived topic now hidden under `_archive/`).

Then update root `README.md` template to add a small "Past topics" footer if you want a visible archive — not necessary for v1.

### 2. Archive student repos

For each repo:
```bash
gh repo archive mbond-flinders-org/<repo-name> --yes
```

Archived repos are read-only — no more pushes, no more issues. Bot can still read them for marking. Cheap insurance against accidental edits.

Bulk-archive script:
```bash
ASG=adv-soft-dev-p1-welcomeback
# Pull state json, iterate over repo names, archive each
gh api /repos/mbond-flinders-org/classroom-state/contents/state/p1-welcomeback/repos.json \
  -q '.content' | base64 -d \
  | jq -r '.[].repo' \
  | while read repo; do gh repo archive "mbond-flinders-org/$repo" --yes; done
```

### 3. (Optional) wipe state

If you'd rather start fresh next semester:
```bash
# In classroom-state:
git rm -r state/p1-welcomeback state/p2-dogsandbrackets state/p3-youtubetrender
git commit -m "wipe: adv-soft-dev s1 2026 state"
git push
```

Keeps the state repo's history clean. Rosters re-render empty next semester.

## Rotate the GitHub App private key

Do this once a year, or immediately if the `.pem` was leaked.

1. `github.com/organizations/mbond-flinders-org/settings/apps/<app-slug>` → **General** → Private keys → **Generate a private key** (downloads new `.pem`).
2. Update `APP_PRIVATE_KEY` secret in `classroom` repo Settings → Secrets → Actions.
3. Test: Actions tab → **Refresh activity** → Run workflow → confirm green.
4. After confirmed working, **delete the old key** from the App's Private keys section.

`APP_ID` does not change.

## Test the full flow on a fresh assignment

Recommended at start of each semester:

1. Add `assignments/test/smoke.yml` pointing at a throwaway template
2. Push, wait for `Build READMEs`
3. From a second account: click Accept, verify repo creation + welcome issue + state update + issue deletion
4. Delete the smoke test: `git rm assignments/test/smoke.yml`, `gh repo delete mbond-flinders-org/test-smoke-<username> --yes`, push

Confirms the App token + workflow + cross-repo access are all still healthy before students arrive.

## When workflows start failing

- Check `classroom` → Actions tab. Click the failed run.
- "Mint installation token" failure → App private key invalid or `APP_ID` wrong. See rotation steps above.
- "Resource not accessible by integration" → App permissions changed or App was uninstalled from one of the repos. Re-install with "All repositories".
- "Not Found" on createUsingTemplate → template repo got renamed / deleted / un-template'd. Fix the YAML or the template's settings.
- Push rejection loop → another bot run pushed first. Should auto-retry; if it gives up after 5 attempts, manually trigger `Build READMEs` to re-converge.

## Backup the state repo

`classroom-state` is git, so it's already version-controlled. For extra paranoia:

```bash
# Run from anywhere, monthly
gh repo clone mbond-flinders-org/classroom-state ~/backups/classroom-state-$(date +%Y%m)
```

The history alone preserves every roster snapshot.

## Decommission

If you stop teaching:

1. Archive `classroom` (`gh repo archive mbond-flinders-org/classroom --yes`).
2. Archive `classroom-state` (same).
3. Archive all student repos.
4. Uninstall the GitHub App (`github.com/organizations/.../settings/installations`).
5. Org membership doesn't matter — Free org has no seat cost.

Or transfer ownership to a successor (org Settings → Transfer ownership).
