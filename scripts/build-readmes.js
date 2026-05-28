// Regenerates all auto-generated README.md files from YAML + state JSON.
// Run by the build-readmes workflow on push, and called inline by handle-join
// so the team list updates atomically with each join/create.

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ROOT,
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

  // Root README
  const topics = [...byTopic.entries()].map(([name, list]) => ({ name, count: list.length }));
  topics.sort((a, b) => a.name.localeCompare(b.name));
  await writeText('README.md', rootReadme({
    org, classroomRepo, topics,
    inviteHint: 'You need to be a member of this GitHub org to use the classroom. Use the invite link your instructor shared.',
  }));

  // Topic READMEs
  for (const [topic, list] of byTopic) {
    await writeText(`assignments/${topic}/README.md`, topicReadme({ topic, assignments: list }));
  }

  // Per-assignment READMEs + roster READMEs
  for (const a of assignments) {
    const groups = a.type === 'group' ? await readGroups(a.id) : [];
    const repos = a.type === 'solo' ? await readRepos(a.id) : [];
    const activity = await readActivity(a.id);
    await writeText(`assignments/${a.topic}/${a.id}/README.md`,
      assignmentReadme({ org, classroomRepo, assignment: a, groups }));
    await writeText(`state/${a.id}/README.md`,
      rosterReadme({ org, assignment: a, repos, groups, activity }));
  }
}

// CLI entry — runs when executed directly, not when imported.
const invokedDirectly = import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  regenerateAll().then(() => {
    console.log('READMEs regenerated.');
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
