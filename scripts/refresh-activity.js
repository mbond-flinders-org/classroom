// Cron-triggered. For each assignment:
//   1. Fetch latest commit metadata for every recorded repo.
//   2. If a repo returns 404 (deleted by teacher/student), prune the state entry.
//   3. Write state/<asg-id>/activity.json + rebuild rosters.
//
// Auto-pruning keeps the roster honest when repos are removed out-of-band.

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
      const prunedRepos = [];
      for (const entry of repos) {
        const act = await activityFor(entry.repo);
        if (act.gone) {
          prunedRepos.push(entry);
          continue;
        }
        keptRepos.push(entry);
        activityByRepo.set(entry.repo, act);
      }
      if (prunedRepos.length) {
        console.log(`[${a.id}] Pruned ${prunedRepos.length} deleted repo(s): ${prunedRepos.map(r => r.repo).join(', ')}`);
        await writeRepos(a.id, keptRepos);
      }
      await writeActivity(a.id, [...activityByRepo.values()]);
      console.log(`[${a.id}] activity: ${activityByRepo.size} live / ${prunedRepos.length} pruned`);
    } else {
      const groups = await readGroups(a.id);
      const activityByRepo = new Map();
      const keptGroups = [];
      const prunedGroups = [];
      for (const g of groups) {
        const act = await activityFor(g.repo);
        if (act.gone) {
          prunedGroups.push(g);
          continue;
        }
        keptGroups.push(g);
        activityByRepo.set(g.repo, act);
      }
      if (prunedGroups.length) {
        console.log(`[${a.id}] Pruned ${prunedGroups.length} deleted team repo(s): ${prunedGroups.map(g => g.slug).join(', ')}`);
        await writeGroups(a.id, keptGroups);
      }
      await writeActivity(a.id, [...activityByRepo.values()]);
      console.log(`[${a.id}] activity: ${activityByRepo.size} live / ${prunedGroups.length} pruned`);
    }
  }
  await regenerateAll();
  console.log('Activity refresh + prune complete.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
