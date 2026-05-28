// Triggered by GitHub Actions on `issues opened with label: join`.
// Env required:
//   GITHUB_TOKEN          installation token (set by actions/create-github-app-token)
//   GITHUB_REPOSITORY     "<org>/classroom" — set by Actions
//   ISSUE_NUMBER, ISSUE_TITLE, ISSUE_AUTHOR  — set from event payload in workflow

import { Octokit } from '@octokit/rest';
import {
  loadAssignment,
  parseJoinTitle,
  readGroups,
  readRepos,
  writeGroups,
  writeRepos,
  repoNameForGroup,
  repoNameForSolo,
  assertSlug,
} from './lib/state.js';
import { regenerateAll } from './build-readmes.js';

const [org, classroomRepo] = (process.env.GITHUB_REPOSITORY || '').split('/');
const issueNumber = Number(process.env.ISSUE_NUMBER);
const title = process.env.ISSUE_TITLE || '';
const author = process.env.ISSUE_AUTHOR || '';

if (!org || !classroomRepo || !issueNumber || !author) {
  console.error('Missing GITHUB_REPOSITORY / ISSUE_NUMBER / ISSUE_AUTHOR env');
  process.exit(2);
}

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Missing GITHUB_TOKEN');
  process.exit(2);
}

const octokit = new Octokit({ auth: token });

async function reject(reason) {
  await octokit.issues.createComment({
    owner: org, repo: classroomRepo, issue_number: issueNumber,
    body: `❌ ${reason}\n\nIf you think this is a mistake, ping the course coordinator.`,
  });
  await octokit.issues.update({
    owner: org, repo: classroomRepo, issue_number: issueNumber, state: 'closed',
  });
  console.log(`Rejected: ${reason}`);
}

async function succeed(body) {
  await octokit.issues.createComment({
    owner: org, repo: classroomRepo, issue_number: issueNumber, body,
  });
  await octokit.issues.update({
    owner: org, repo: classroomRepo, issue_number: issueNumber, state: 'closed',
  });
}

async function repoExists(name) {
  try {
    await octokit.repos.get({ owner: org, repo: name });
    return true;
  } catch (e) {
    if (e.status === 404) return false;
    throw e;
  }
}

async function generateFromTemplate(templateFull, newName) {
  const [tOwner, tRepo] = templateFull.split('/');
  await octokit.repos.createUsingTemplate({
    template_owner: tOwner,
    template_repo: tRepo,
    owner: org,
    name: newName,
    private: true,
    include_all_branches: false,
  });
}

async function addCollab(repo, username) {
  await octokit.repos.addCollaborator({
    owner: org, repo, username, permission: 'push',
  });
}

async function handleSolo(asg) {
  const repos = await readRepos(asg.id);
  const existing = repos.find(r => r.student.toLowerCase() === author.toLowerCase());
  if (existing) {
    await succeed(`✅ You already have a repo for this assignment: https://github.com/${org}/${existing.repo}\n\nIf you didn't get the invite email, check https://github.com/${org}/${existing.repo}/invitations`);
    return;
  }

  const name = repoNameForSolo(asg, author);
  if (await repoExists(name)) {
    // Name collision but no state record — recover by adopting.
    await addCollab(name, author);
  } else {
    await generateFromTemplate(asg.template, name);
    await addCollab(name, author);
  }

  repos.push({ student: author, repo: name, createdAt: new Date().toISOString() });
  await writeRepos(asg.id, repos);
  await regenerateAll({ org, classroomRepo });

  await succeed(`✅ Repo created: https://github.com/${org}/${name}\n\nYou'll get a GitHub email invite to accept as a collaborator. Then clone with:\n\n\`\`\`\ngit clone https://github.com/${org}/${name}.git\n\`\`\``);
}

async function handleGroupCreate(asg, slug) {
  try { assertSlug(slug); } catch (e) { return reject(e.message); }

  const groups = await readGroups(asg.id);

  if (groups.some(g => g.slug === slug)) {
    return reject(`Team \`${slug}\` already exists. Pick a different name, or join it: https://github.com/${org}/${classroomRepo}/issues/new?template=join.yml&title=${encodeURIComponent(`join:${asg.id} team:join:${slug}`)}&labels=join`);
  }

  const alreadyIn = groups.find(g => g.members.map(m => m.toLowerCase()).includes(author.toLowerCase()));
  if (alreadyIn) {
    return reject(`You're already in team \`${alreadyIn.slug}\` for this assignment (repo: https://github.com/${org}/${alreadyIn.repo}). One student = one team per assignment.`);
  }

  const name = repoNameForGroup(asg, slug);
  if (await repoExists(name)) {
    await addCollab(name, author);
  } else {
    await generateFromTemplate(asg.template, name);
    await addCollab(name, author);
  }

  groups.push({ slug, repo: name, members: [author], createdAt: new Date().toISOString() });
  await writeGroups(asg.id, groups);
  await regenerateAll({ org, classroomRepo });

  const joinUrl = `https://github.com/${org}/${classroomRepo}/issues/new?template=join.yml&title=${encodeURIComponent(`join:${asg.id} team:join:${slug}`)}&labels=join`;
  await succeed(`✅ Team \`${slug}\` created. Your repo: https://github.com/${org}/${name}\n\n**Share this link with your teammate${asg.maxSize > 2 ? 's' : ''} so they can join your team:**\n\n${joinUrl}\n\nMax team size: ${asg.maxSize}.`);
}

async function handleGroupJoin(asg, slug) {
  try { assertSlug(slug); } catch (e) { return reject(e.message); }

  const groups = await readGroups(asg.id);
  const group = groups.find(g => g.slug === slug);

  if (!group) {
    return reject(`Team \`${slug}\` doesn't exist. Check the assignment page for the list of teams.`);
  }
  if (group.members.length >= asg.maxSize) {
    return reject(`Team \`${slug}\` is full (${group.members.length}/${asg.maxSize}). Members: ${group.members.map(m => '@' + m).join(', ')}. Pick another team or create your own.`);
  }
  if (group.members.map(m => m.toLowerCase()).includes(author.toLowerCase())) {
    return reject(`You're already a member of team \`${slug}\`. Repo: https://github.com/${org}/${group.repo}`);
  }
  const otherTeam = groups.find(g => g.slug !== slug && g.members.map(m => m.toLowerCase()).includes(author.toLowerCase()));
  if (otherTeam) {
    return reject(`You're already in team \`${otherTeam.slug}\` for this assignment. One student = one team per assignment.`);
  }

  await addCollab(group.repo, author);
  group.members.push(author);
  await writeGroups(asg.id, groups);
  await regenerateAll({ org, classroomRepo });

  await succeed(`✅ Joined team \`${slug}\`. Repo: https://github.com/${org}/${group.repo}\n\nMembers now: ${group.members.map(m => '@' + m).join(', ')} (${group.members.length}/${asg.maxSize}).`);
}

async function main() {
  const parsed = parseJoinTitle(title);
  if (!parsed) {
    await octokit.issues.addLabels({
      owner: org, repo: classroomRepo, issue_number: issueNumber, labels: ['invalid'],
    });
    return reject(`Couldn't parse the issue title.\n\nExpected one of:\n- \`join:<assignment-id>\`\n- \`join:<assignment-id> team:create:<team-slug>\`\n- \`join:<assignment-id> team:join:<team-slug>\`\n\nDon't open this issue manually — use the links on the assignment page.`);
  }

  let asg;
  try {
    asg = await loadAssignment(parsed.asgId);
  } catch {
    return reject(`Unknown assignment \`${parsed.asgId}\`. Check the topic page for the current list.`);
  }

  if (asg.type === 'solo') {
    if (parsed.teamAction) return reject(`Assignment \`${asg.id}\` is solo — don't include a \`team:...\` part.`);
    return handleSolo(asg);
  }

  if (asg.type === 'group') {
    if (!parsed.teamAction || !parsed.teamSlug) {
      return reject(`Assignment \`${asg.id}\` is a group assignment. You must include either \`team:create:<slug>\` or \`team:join:<slug>\` in the issue title.`);
    }
    if (parsed.teamAction === 'create') return handleGroupCreate(asg, parsed.teamSlug);
    if (parsed.teamAction === 'join') return handleGroupJoin(asg, parsed.teamSlug);
  }

  return reject(`Assignment \`${asg.id}\` has unknown type \`${asg.type}\`.`);
}

main().catch(async (e) => {
  console.error(e);
  try {
    await octokit.issues.createComment({
      owner: org, repo: classroomRepo, issue_number: issueNumber,
      body: `💥 Workflow error: \`${e.message}\`\n\nA coordinator will need to look at the Actions log.`,
    });
  } catch {}
  process.exit(1);
});
