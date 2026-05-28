// Markdown templates rendered into README.md files in two repos:
//   - public `classroom` repo: root, topic, per-assignment landing (no roster, no team list)
//   - private `classroom-state` repo: per-assignment roster + activity dashboard
//
// The public templates intentionally don't render team lists, because that
// would expose enrollment to anyone on the internet. Team growth is driven
// by direct-share join links, captured in the bot's welcome issue.

function escapeMd(s) {
  return String(s ?? '').replace(/\|/g, '\\|');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toISOString().slice(0, 16).replace('T', ' ') + 'Z';
}

export function joinIssueUrl(org, classroomRepo, title) {
  const u = new URL(`https://github.com/${org}/${classroomRepo}/issues/new`);
  u.searchParams.set('template', 'join.yml');
  u.searchParams.set('title', title);
  u.searchParams.set('labels', 'join');
  return u.toString();
}

export function rootReadme({ topics }) {
  const lines = [
    '# Classroom',
    '',
    'Course assignments. Pick a topic.',
    '',
    '> 🛈 Each assignment auto-creates a **private repo** in your name when you click Accept. You don\'t need to be a member of this GitHub org — the bot adds you as a collaborator on your own repo and emails you the invite.',
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
  lines.push(
    '',
    '## How it works',
    '',
    '1. Open a topic above.',
    '2. Open an assignment.',
    '3. Click the **Accept** link (or **Create team** / **Join team** for group assignments).',
    '4. Submit the prefilled issue — it\'ll disappear right after the bot processes it.',
    '5. Check your GitHub email inbox for the collaborator invite to your new repo.',
    '',
  );
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

// Public-facing per-assignment page. NO team list — team membership is private.
export function assignmentReadme({ org, classroomRepo, assignment }) {
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
    const acceptUrl = joinIssueUrl(org, classroomRepo, `join:${a.id}`);
    lines.push(
      '## Accept this assignment',
      '',
      `**[👉 Click here to accept](${acceptUrl})**`,
      '',
      'Submit the prefilled issue. The bot creates your private repo, adds you as collaborator, and emails you the invite. The submitted issue auto-deletes.',
      '',
    );
  } else {
    const createUrl = joinIssueUrl(org, classroomRepo, `join:${a.id} team:create:YOUR-TEAM-SLUG`);
    lines.push(
      '## Create a new team',
      '',
      `**[👉 Click here to create a team](${createUrl})**`,
      '',
      `1. Click the link above.`,
      `2. The issue title will contain \`team:create:YOUR-TEAM-SLUG\` — **replace \`YOUR-TEAM-SLUG\`** with a name you choose (lowercase letters/digits/hyphens, e.g. \`pair-alice\`).`,
      `3. Submit. The bot creates your repo, then files a welcome issue inside it with a **share link** for your ${a.maxSize - 1} teammate${a.maxSize - 1 === 1 ? '' : 's'}.`,
      '',
      '## Joining an existing team',
      '',
      'Team membership is private — there\'s no list to browse. Your teammate sends you their **share link** (created automatically when they created the team).',
      '',
      'If you have a share link, just click it and submit the prefilled issue.',
      '',
    );
  }

  lines.push(`[← back to ${a.topic}](../)`);
  return lines.join('\n');
}

// Roster page — written to the **private** state repo.
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

  lines.push('', '_Auto-generated by the classroom bot. Edit `assignments/<topic>/<id>.yml` in the public `classroom` repo to change assignment metadata._');
  return lines.join('\n');
}

// Top-level dashboard for the private state repo.
export function stateRootReadme({ assignments }) {
  const lines = [
    '# Classroom — private state',
    '',
    'Roster, team membership, and activity dashboards. Auto-generated; do not edit by hand.',
    '',
    '## Assignments',
    '',
  ];
  if (!assignments.length) {
    lines.push('_No assignments configured yet._');
  } else {
    lines.push('| Topic | Assignment | Type | Roster |', '|---|---|---|---|');
    for (const a of assignments) {
      const type = a.type === 'group' ? `group (≤${a.maxSize})` : 'solo';
      lines.push(`| ${a.topic} | ${escapeMd(a.title || a.id)} | ${type} | [→](./state/${a.id}/) |`);
    }
  }
  return lines.join('\n');
}

// Welcome issue body filed inside the student's newly-created repo.
export function welcomeIssue({ org, repo, assignment, isTeamLeader, teamSlug, joinUrl, maxTeammates }) {
  const cloneCmd = `git clone https://github.com/${org}/${repo}.git`;
  const lines = [
    `Welcome to **${assignment.title || assignment.id}**!`,
    '',
    `Your repo is **[${org}/${repo}](https://github.com/${org}/${repo})**.`,
    '',
    '## Clone it',
    '',
    '```bash',
    cloneCmd,
    `cd ${repo}`,
    '```',
    '',
  ];

  if (isTeamLeader && joinUrl) {
    lines.push(
      `## 🤝 Invite your ${maxTeammates === 1 ? 'teammate' : 'teammates'}`,
      '',
      `You're the first member of team \`${teamSlug}\`. Send this link to your ${maxTeammates === 1 ? 'partner' : 'teammates'} so they can join:`,
      '',
      `**\`${joinUrl}\`**`,
      '',
      `_(Up to ${maxTeammates} more ${maxTeammates === 1 ? 'person' : 'people'} can join via this link.)_`,
      '',
    );
  }

  lines.push(
    '## Next steps',
    '',
    `- Read the README in your repo.`,
    `- Push commits as you work — that's what your instructor sees.`,
    `- Due date: ${assignment.dueDate || 'see assignment page'}.`,
    '',
    '_You can close this issue once you\'ve cloned. Feel free to reopen as a personal scratchpad._',
  );

  return lines.join('\n');
}
