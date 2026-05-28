// Regenerates auto-generated README.md files in two repos:
//   - public classroom (ROOT):       root + topic + per-assignment landing pages
//   - private classroom-state (STATE_ROOT): roster dashboards + state-root index
//
// Run by the build-readmes workflow on push, and called inline by handle-join
// + refresh-activity so dashboards update atomically.

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ROOT,
  STATE_ROOT,
  listAssignments,
  readGroups,
  readRepos,
  readActivity,
  writeText,
} from './lib/state.js';
import {
  rootReadme,
  topicReadme,
  assignmentReadme,
  rosterReadme,
  stateRootReadme,
} from './lib/templates.js';

function getOrgAndRepo() {
  const r = process.env.GITHUB_REPOSITORY;
  if (r && r.includes('/')) {
    const [org, repo] = r.split('/');
    return { org, classroomRepo: repo };
  }
  return {
    org: process.env.CLASSROOM_ORG || 'YOUR-ORG',
    classroomRepo: process.env.CLASSROOM_REPO || 'classroom',
  };
}

export async function regenerateAll({ org, classroomRepo } = {}) {
  if (!org || !classroomRepo) ({ org, classroomRepo } = getOrgAndRepo());

  const assignments = await listAssignments();
  const byTopic = new Map();
  for (const a of assignments) {
    if (!byTopic.has(a.topic)) byTopic.set(a.topic, []);
    byTopic.get(a.topic).push(a);
  }
  for (const list of byTopic.values()) {
    list.sort((x, y) => String(x.dueDate || '').localeCompare(String(y.dueDate || '')) || x.id.localeCompare(y.id));
  }

  // ---- Public repo (ROOT) ----
  const topics = [...byTopic.entries()].map(([name, list]) => ({ name, count: list.length }));
  topics.sort((a, b) => a.name.localeCompare(b.name));
  await writeText(ROOT, 'README.md', rootReadme({ topics }));

  for (const [topic, list] of byTopic) {
    await writeText(ROOT, `assignments/${topic}/README.md`, topicReadme({ topic, assignments: list }));
  }
  for (const a of assignments) {
    await writeText(ROOT, `assignments/${a.topic}/${a.id}/README.md`,
      assignmentReadme({ org, classroomRepo, assignment: a }));
  }

  // ---- Private state repo (STATE_ROOT) ----
  // Only write if STATE_ROOT actually exists (skips locally if you haven't checked it out).
  let stateAvailable = true;
  try { await fs.access(STATE_ROOT); } catch { stateAvailable = false; }
  if (!stateAvailable) {
    console.log(`STATE_ROOT (${STATE_ROOT}) not present — skipping roster output.`);
    return;
  }

  await writeText(STATE_ROOT, 'README.md', stateRootReadme({ assignments }));

  for (const a of assignments) {
    const groups = a.type === 'group' ? await readGroups(a.id) : [];
    const repos = a.type === 'solo' ? await readRepos(a.id) : [];
    const activity = await readActivity(a.id);
    await writeText(STATE_ROOT, `state/${a.id}/README.md`,
      rosterReadme({ org, assignment: a, repos, groups, activity }));
  }
}

const invokedDirectly = import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  regenerateAll().then(() => {
    console.log('READMEs regenerated.');
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
