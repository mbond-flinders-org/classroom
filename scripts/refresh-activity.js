// Cron-triggered. For each assignment, fetches latest commit metadata for
// every created repo and writes state/<asg-id>/activity.json. Roster README
// joins this in next build-readmes run.

import { Octokit } from '@octokit/rest';
import {
  listAssignments,
  readGroups,
  readRepos,
  writeActivity,
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
    // commitCount: cheap-ish — use the contributors stats endpoint isn't reliable;
    // instead, GET /repos/{owner}/{repo}/commits with per_page=1 + parse Link header for last page.
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
    if (e.status === 404 || e.status === 409) {
      // 409 = empty repo (no commits beyond initial template). Treat as zero.
      return { repo, lastCommit: null, commitCount: 0, lastAuthor: null };
    }
    console.error(`activityFor(${repo}) failed:`, e.message);
    return { repo, lastCommit: null, commitCount: null, lastAuthor: null, error: e.message };
  }
}

async function main() {
  const assignments = await listAssignments();
  for (const a of assignments) {
    const repos = a.type === 'solo'
      ? (await readRepos(a.id)).map(r => r.repo)
      : (await readGroups(a.id)).map(g => g.repo);
    if (!repos.length) {
      await writeActivity(a.id, []);
      continue;
    }
    const out = [];
    for (const repo of repos) {
      out.push(await activityFor(repo));
    }
    await writeActivity(a.id, out);
    console.log(`Refreshed activity for ${a.id}: ${out.length} repos`);
  }
  await regenerateAll();
  console.log('Activity refresh complete.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
