// Markdown templates rendered into the various README.md files.
// All output is committed to the private classroom repo; renders natively
// on github.com web + mobile.

import { repoNameForGroup, repoNameForSolo } from './state.js';

function escapeMd(s) {
  return String(s ?? '').replace(/\|/g, '\\|');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toISOString().slice(0, 16).replace('T', ' ') + 'Z';
}

function issueNewUrl(org, classroomRepo, title) {
  const u = new URL(`https://github.com/${org}/${classroomRepo}/issues/new`);
  u.searchParams.set('template', 'join.yml');
  u.searchParams.set('title', title);
  u.searchParams.set('labels', 'join');
  return u.toString();
}

export function rootReadme({ org, classroomRepo, topics, inviteHint }) {
  const lines = [
    '# Classroom',
    '',
    'Private workspace for course assignments. You should only see this page if you have been invited to the GitHub org.',
    '',
    inviteHint ? `> **New here?** ${inviteHint}` : '',
    '',
    '## Topics',
    '',
  ];
  if (!topics.length) {
    lines.push('_No topics yet._');
  } else {
    for (const t of topics) {
      lines.push(`- [**${t.name}**](./assignments/${t.name}/) — ${t.count} assignment${t.count === 1 ? '' : 's'}`);
    }
  }
  lines.push('', '## How to accept an assignment', '', '1. Open a topic above.', '2. Open an assignment.', '3. Click the **Accept** link (or **Create team** / **Join team** for group assignments).', '4. Submit the prefilled issue. The bot will create your repo and email you a collaborator invite within ~30s.', '');
  return lines.join('\n');
}

export function topicReadme({ topic, assignments }) {
  const lines = [
    `# Topic: ${topic}`,
    '',
    '| Assignment | Type | Due | Open |',
    '|---|---|---|---|',
  ];
  for (const a of assignments) {
    const type = a.type === 'group' ? `group (≤${a.maxSize})` : 'solo';
    lines.push(`| ${escapeMd(a.title || a.id)} | ${type} | ${a.dueDate || '—'} | [→](./${a.id}/) |`);
  }
  lines.push('', '[← back to topics](../../)');
  return lines.join('\n');
}

export function assignmentReadme({ org, classroomRepo, assignment, groups }) {
  const a = assignment;
  const lines = [
    `# ${a.title || a.id}`,
    '',
    `**Topic:** ${a.topic}  •  **Due:** ${a.dueDate || '—'}  •  **Type:** ${a.type === 'group' ? `group (teams of ${a.maxSize})` : 'solo'}`,
    '',
  ];

  if (a.description) {
    lines.push(a.description, '');
  }

  if (a.type === 'solo') {
    const acceptUrl = issueNewUrl(org, classroomRepo, `join:${a.id}`);
    lines.push(
      '## Accept this assignment',
      '',
      `**[👉 Click here to accept](${acceptUrl})**`,
      '',
      'Submit the prefilled issue. The bot creates your private repo, adds you as collaborator, and emails you the invite.',
      '',
    );
  } else {
    const createUrl = issueNewUrl(org, classroomRepo, `join:${a.id} team:create:YOUR-TEAM-SLUG`);
    lines.push(
      '## Create a new team',
      '',
      `**[👉 Click here to create a team](${createUrl})**`,
      '',
      `1. Click the link above. The issue title will contain \`team:create:YOUR-TEAM-SLUG\`.`,
      `2. Replace **YOUR-TEAM-SLUG** with your chosen team name (lowercase letters, digits, hyphens — e.g. \`pair-alice\`).`,
      `3. Submit. You'll get a repo + a join link to share with up to ${a.maxSize - 1} teammate${a.maxSize - 1 === 1 ? '' : 's'}.`,
      '',
      '## Or join an existing team',
      '',
    );

    if (!groups.length) {
      lines.push('_No teams yet. Be the first to create one above._', '');
    } else {
      lines.push('| Team | Members | Slots used | Action |', '|---|---|---|---|');
      for (const g of groups) {
        const used = g.members.length;
        const full = used >= a.maxSize;
        const members = g.members.map(m => `@${m}`).join(', ');
        const action = full
          ? '~~full~~'
          : `[Join \`${g.slug}\`](${issueNewUrl(org, classroomRepo, `join:${a.id} team:join:${g.slug}`)})`;
        lines.push(`| \`${g.slug}\` | ${members} | ${used} / ${a.maxSize} | ${action} |`);
      }
      lines.push('');
    }
  }

  lines.push(`[← back to ${a.topic}](../)`);
  return lines.join('\n');
}

export function rosterReadme({ org, assignment, repos, groups, activity }) {
  const a = assignment;
  const actByRepo = new Map(activity.map(x => [x.repo, x]));
  const lines = [`# Roster — ${a.title || a.id}`, ''];

  if (a.type === 'solo') {
    const total = repos.length;
    lines.push(`**${total}** student${total === 1 ? '' : 's'} joined.`, '');
    if (!repos.length) {
      lines.push('_No joiners yet._');
    } else {
      lines.push('| Student | Repo | Accepted | Last commit | Commits |', '|---|---|---|---|---|');
      for (const r of repos) {
        const act = actByRepo.get(r.repo) || {};
        lines.push(`| @${r.student} | [${r.repo}](https://github.com/${org}/${r.repo}) | ${fmtDate(r.createdAt)} | ${fmtDate(act.lastCommit)} | ${act.commitCount ?? '—'} |`);
      }
    }
  } else {
    const totalTeams = groups.length;
    const totalMembers = groups.reduce((n, g) => n + g.members.length, 0);
    const full = groups.filter(g => g.members.length >= a.maxSize).length;
    const partial = groups.filter(g => g.members.length < a.maxSize).length;
    lines.push(`**${totalTeams}** team${totalTeams === 1 ? '' : 's'} • **${totalMembers}** student${totalMembers === 1 ? '' : 's'} joined • ${full} full • ${partial} with open slots.`, '');
    if (!groups.length) {
      lines.push('_No teams yet._');
    } else {
      lines.push('| Team | Members | Slots | Repo | Last commit | Commits |', '|---|---|---|---|---|---|');
      for (const g of groups) {
        const act = actByRepo.get(g.repo) || {};
        const members = g.members.map(m => `@${m}`).join(', ');
        lines.push(`| \`${g.slug}\` | ${members} | ${g.members.length} / ${a.maxSize} | [${g.repo}](https://github.com/${org}/${g.repo}) | ${fmtDate(act.lastCommit)} | ${act.commitCount ?? '—'} |`);
      }
    }
  }

  lines.push('', '_Auto-generated. Edit the YAML in `assignments/` instead._');
  return lines.join('\n');
}
