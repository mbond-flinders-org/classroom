// Cron-triggered. For each assignment:
//   1. Fetch latest commit metadata for every recorded repo.
//   2. If a repo returns 404 (deleted by teacher/student), prune the state entry.
//   3. Cross-check each repo's collaborator list against the recorded students.
//      Prune students who are no longer collaborators (teacher removed them).
//      For groups: drop the whole group if no recorded members remain.
//   4. Write state/<asg-id>/activity.json + rebuild rosters.
//
// Auto-pruning keeps the roster honest when repos or collabs are changed out-of-band.

import { Octokit } from '@octokit/rest';
import {
  listAssignments,
  readGroups,
  readRepos,
  writeActivity,
  writeGroups,
  writeRepos,
} from './lib/state.js';
import { regenerateAll } from './build-readmes.js';

const [org] = (process.env.GITHUB_REPOSITORY || '').split('/');
const token = process.env.GITHUB_TOKEN;

if (!org || !token) {
  console.error('Missing GITHUB_REPOSITORY or GITHUB_TOKEN');
  process.exit(2);
}

const octokit = new Octokit({ auth: token });

async function collabLoginsFor(repo) {
  try {
    const collabs = await octokit.paginate(octokit.repos.listCollaborators, {
      owner: org, repo, affiliation: 'all', per_page: 100,
    });
    return new Set(collabs.map(c => c.login.toLowerCase()));
  } catch (e) {
    if (e.status === 404) return null;
    console.error(`collabLoginsFor(${repo}) failed:`, e.message);
    return null;
  }
}

async function activityFor(repo) {
  try {
    const { data } = await octokit.repos.listCommits({
      owner: org, repo, per_page: 1,
    });
    if (!data.length) return { repo, lastCommit: null, commitCount: 0, lastAuthor: null };
    const c = data[0];
    let commitCount = 1;
    const linkHeader = (await octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner: org, repo, per_page: 1,
    })).headers.link;
    if (linkHeader) {
      const m = linkHeader.match(/&page=(\d+)>; rel="last"/);
      if (m) commitCount = Number(m[1]);
    }
    return {
      repo,
      lastCommit: c.commit?.author?.date || c.commit?.committer?.date || null,
      commitCount,
      lastAuthor: c.author?.login || c.commit?.author?.name || null,
    };
  } catch (e) {
    if (e.status === 404) {
      // Repo is gone — pruning signal.
      return { repo, gone: true };
    }
    if (e.status === 409) {
      // 409 = empty repo (no commits). Alive but no activity.
      return { repo, lastCommit: null, commitCount: 0, lastAuthor: null };
    }
    console.error(`activityFor(${repo}) failed:`, e.message);
    return { repo, lastCommit: null, commitCount: null, lastAuthor: null, error: e.message };
  }
}

async function main() {
  const assignments = await listAssignments();
  for (const a of assignments) {
    if (a.type === 'solo') {
      const repos = await readRepos(a.id);
      const activityByRepo = new Map();
      const keptRepos = [];
      const prunedGone = [];
      const prunedRevoked = [];
      for (const entry of repos) {
        const act = await activityFor(entry.repo);
        if (act.gone) {
          prunedGone.push(entry);
          continue;
        }
        const collabs = await collabLoginsFor(entry.repo);
        if (collabs && !collabs.has(entry.student.toLowerCase())) {
          // Student was removed as collab but repo still exists.
          // Drop the state entry so the roster stops showing them,
          // and so they can re-Accept (handle-join's stale-check
          // will succeed since state no longer has their entry).
          prunedRevoked.push(entry);
          continue;
        }
        keptRepos.push(entry);
        activityByRepo.set(entry.repo, act);
      }
      if (prunedGone.length || prunedRevoked.length) {
        if (prunedGone.length) console.log(`[${a.id}] Pruned ${prunedGone.length} deleted repo(s): ${prunedGone.map(r => r.repo).join(', ')}`);
        if (prunedRevoked.length) console.log(`[${a.id}] Pruned ${prunedRevoked.length} revoked-collab entry(ies): ${prunedRevoked.map(r => r.student).join(', ')}`);
        await writeRepos(a.id, keptRepos);
      }
      await writeActivity(a.id, [...activityByRepo.values()]);
      console.log(`[${a.id}] activity: ${activityByRepo.size} live / ${prunedGone.length} gone / ${prunedRevoked.length} revoked`);
    } else {
      const groups = await readGroups(a.id);
      const activityByRepo = new Map();
      const keptGroups = [];
      const prunedGone = [];
      let membersRevokedTotal = 0;
      const emptied = [];
      for (const g of groups) {
        const act = await activityFor(g.repo);
        if (act.gone) {
          prunedGone.push(g);
          continue;
        }
        const collabs = await collabLoginsFor(g.repo);
        const originalMembers = g.members.slice();
        const keptMembers = collabs
          ? originalMembers.filter(m => collabs.has(m.toLowerCase()))
          : originalMembers;
        const revoked = originalMembers.length - keptMembers.length;
        membersRevokedTotal += revoked;
        if (revoked) {
          console.log(`[${a.id}/${g.slug}] Pruned ${revoked} revoked member(s): ${originalMembers.filter(m => !keptMembers.includes(m)).join(', ')}`);
        }
        if (!keptMembers.length) {
          // Whole team was emptied out — drop the group entirely.
          emptied.push(g);
          continue;
        }
        keptGroups.push({ ...g, members: keptMembers });
        activityByRepo.set(g.repo, act);
      }
      if (prunedGone.length || membersRevokedTotal || emptied.length) {
        if (prunedGone.length) console.log(`[${a.id}] Pruned ${prunedGone.length} deleted team repo(s): ${prunedGone.map(g => g.slug).join(', ')}`);
        if (emptied.length) console.log(`[${a.id}] Emptied team(s) dropped: ${emptied.map(g => g.slug).join(', ')}`);
        await writeGroups(a.id, keptGroups);
      }
      await writeActivity(a.id, [...activityByRepo.values()]);
      console.log(`[${a.id}] teams: ${keptGroups.length} live / ${prunedGone.length} gone / ${emptied.length} emptied • members revoked: ${membersRevokedTotal}`);
    }
  }
  await regenerateAll();
  console.log('Activity refresh + prune complete.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
