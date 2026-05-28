// Triggered by GitHub Actions on `issues opened with label: join`.
// Env required:
//   GITHUB_TOKEN          installation token (set by actions/create-github-app-token)
//   GITHUB_REPOSITORY     "<org>/classroom" — set by Actions
//   STATE_REPO            "<org>/classroom-state" — set in workflow
//   STATE_ROOT            absolute path to checkout of state repo
//   ISSUE_NUMBER, ISSUE_NODE_ID, ISSUE_TITLE, ISSUE_AUTHOR — from event payload

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
import { joinIssueUrl, welcomeIssue } from './lib/templates.js';
import { regenerateAll } from './build-readmes.js';

const [org, classroomRepo] = (process.env.GITHUB_REPOSITORY || '').split('/');
const stateRepo = (process.env.STATE_REPO || '').split('/')[1];
const issueNumber = Number(process.env.ISSUE_NUMBER);
const issueNodeId = process.env.ISSUE_NODE_ID || '';
const title = process.env.ISSUE_TITLE || '';
const author = process.env.ISSUE_AUTHOR || '';
const token = process.env.GITHUB_TOKEN;

if (!org || !classroomRepo || !issueNumber || !author || !token || !stateRepo) {
  console.error('Missing required env (GITHUB_REPOSITORY / STATE_REPO / ISSUE_* / GITHUB_TOKEN)');
  process.exit(2);
}

const octokit = new Octokit({ auth: token });

// ----- Issue helpers ---------------------------------------------------------

async function commentAndClose(body) {
  await octokit.issues.createComment({
    owner: org, repo: classroomRepo, issue_number: issueNumber, body,
  });
  await octokit.issues.update({
    owner: org, repo: classroomRepo, issue_number: issueNumber, state: 'closed',
  });
}

async function deleteIssueIfPossible() {
  if (!issueNodeId) {
    console.log('No ISSUE_NODE_ID provided; falling back to close-only.');
    return;
  }
  try {
    await octokit.graphql(
      `mutation($id: ID!) { deleteIssue(input: { issueId: $id }) { repository { id } } }`,
      { id: issueNodeId },
    );
    console.log(`Deleted issue #${issueNumber} (${issueNodeId}).`);
  } catch (e) {
    console.error(`deleteIssue failed (will leave closed): ${e.message}`);
  }
}

async function reject(reason) {
  await commentAndClose(`❌ ${reason}\n\nThis issue will close. Try again from the assignment page.`);
  // Don't delete reject issues — leave a trail so the student can see why it failed.
  // The visible PII is just their own username, which they themselves provided.
}

// ----- Repo creation ---------------------------------------------------------

async function repoExists(name) {
  try { await octokit.repos.get({ owner: org, repo: name }); return true; }
  catch (e) { if (e.status === 404) return false; throw e; }
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

async function fileWelcomeIssue(repo, body) {
  // Retry once if repo isn't initialized yet (template-generation is async on GH's side).
  for (let i = 0; i < 5; i++) {
    try {
      const { data } = await octokit.issues.create({
        owner: org, repo, title: 'Welcome — read me first', body,
      });
      return data.html_url;
    } catch (e) {
      if (e.status === 410 || e.status === 404) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      throw e;
    }
  }
  console.warn(`Could not file welcome issue on ${repo} (still 404/410 after retries).`);
  return null;
}

// ----- Flows -----------------------------------------------------------------

async function handleSolo(asg) {
  const repos = await readRepos(asg.id);
  const existing = repos.find(r => r.student.toLowerCase() === author.toLowerCase());
  if (existing) {
    await commentAndClose(`✅ You already have a repo for this assignment: https://github.com/${org}/${existing.repo}\n\nCheck https://github.com/${org}/${existing.repo}/invitations if you missed the email.`);
    await deleteIssueIfPossible();
    return;
  }

  const name = repoNameForSolo(asg, author);
  if (!(await repoExists(name))) {
    await generateFromTemplate(asg.template, name);
  }
  await addCollab(name, author);

  repos.push({ student: author, repo: name, createdAt: new Date().toISOString() });
  await writeRepos(asg.id, repos);

  await fileWelcomeIssue(name, welcomeIssue({
    org, repo: name, assignment: asg, isTeamLeader: false,
  }));

  await deleteIssueIfPossible();
}

async function handleGroupCreate(asg, slug) {
  try { assertSlug(slug); } catch (e) { return reject(e.message); }

  const groups = await readGroups(asg.id);

  if (groups.some(g => g.slug === slug)) {
    return reject(`Team \`${slug}\` already exists. Ask the team for their share link, or pick a different slug.`);
  }

  const alreadyIn = groups.find(g => g.members.map(m => m.toLowerCase()).includes(author.toLowerCase()));
  if (alreadyIn) {
    return reject(`You're already in team \`${alreadyIn.slug}\` for this assignment (repo: https://github.com/${org}/${alreadyIn.repo}). One student = one team per assignment.`);
  }

  const name = repoNameForGroup(asg, slug);
  if (!(await repoExists(name))) {
    await generateFromTemplate(asg.template, name);
  }
  await addCollab(name, author);

  groups.push({ slug, repo: name, members: [author], createdAt: new Date().toISOString() });
  await writeGroups(asg.id, groups);

  const joinUrl = joinIssueUrl(org, classroomRepo, `join:${asg.id} team:join:${slug}`);
  await fileWelcomeIssue(name, welcomeIssue({
    org, repo: name, assignment: asg,
    isTeamLeader: true, teamSlug: slug, joinUrl,
    maxTeammates: asg.maxSize - 1,
  }));

  await deleteIssueIfPossible();
}

async function handleGroupJoin(asg, slug) {
  try { assertSlug(slug); } catch (e) { return reject(e.message); }

  const groups = await readGroups(asg.id);
  const group = groups.find(g => g.slug === slug);

  if (!group) return reject(`Team \`${slug}\` doesn't exist. Get a fresh share link from your teammate.`);
  if (group.members.length >= asg.maxSize) {
    return reject(`Team \`${slug}\` is full (${group.members.length}/${asg.maxSize}). Members: ${group.members.map(m => '@' + m).join(', ')}. Create your own team or join another.`);
  }
  if (group.members.map(m => m.toLowerCase()).includes(author.toLowerCase())) {
    return reject(`You're already in team \`${slug}\`. Repo: https://github.com/${org}/${group.repo}`);
  }
  const otherTeam = groups.find(g => g.slug !== slug && g.members.map(m => m.toLowerCase()).includes(author.toLowerCase()));
  if (otherTeam) return reject(`You're already in team \`${otherTeam.slug}\` for this assignment. One student = one team per assignment.`);

  await addCollab(group.repo, author);
  group.members.push(author);
  await writeGroups(asg.id, groups);

  await fileWelcomeIssue(group.repo, welcomeIssue({
    org, repo: group.repo, assignment: asg,
    isTeamLeader: false, teamSlug: slug,
  }));

  await deleteIssueIfPossible();
}

// ----- Entry ----------------------------------------------------------------

async function main() {
  const parsed = parseJoinTitle(title);
  if (!parsed) {
    return reject(`Couldn't parse the issue title \`${title}\`. Don't open this issue manually — use the links on the assignment page.`);
  }

  let asg;
  try { asg = await loadAssignment(parsed.asgId); }
  catch { return reject(`Unknown assignment \`${parsed.asgId}\`. Check the topic page for the current list.`); }

  if (asg.type === 'solo') {
    if (parsed.teamAction) return reject(`Assignment \`${asg.id}\` is solo — don't include a \`team:...\` part.`);
    await handleSolo(asg);
  } else if (asg.type === 'group') {
    if (!parsed.teamAction || !parsed.teamSlug) {
      return reject(`Assignment \`${asg.id}\` is a group assignment. The title must include \`team:create:<slug>\` or \`team:join:<slug>\`.`);
    }
    if (parsed.teamAction === 'create') await handleGroupCreate(asg, parsed.teamSlug);
    else if (parsed.teamAction === 'join') await handleGroupJoin(asg, parsed.teamSlug);
  } else {
    return reject(`Assignment \`${asg.id}\` has unknown type \`${asg.type}\`.`);
  }

  // Refresh both repos' READMEs in-place. Workflow commits + pushes after this exits.
  try {
    await regenerateAll({ org, classroomRepo });
  } catch (e) {
    console.error('regenerateAll failed (non-fatal):', e.message);
  }
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
