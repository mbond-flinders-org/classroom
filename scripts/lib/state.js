import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

// ROOT       = checkout of the public `classroom` repo (config: assignments/, scripts/)
// STATE_ROOT = checkout of the private `classroom-state` repo (state/*.json + roster READMEs)
//
// Workflows clone the state repo into ./state-repo by default. CLI runs locally
// can override either.
export const ROOT = process.env.CLASSROOM_ROOT || process.cwd();
export const STATE_ROOT = process.env.STATE_ROOT || path.join(ROOT, 'state-repo');

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

export function assertSlug(slug) {
  if (!SLUG_RE.test(slug)) {
    throw new Error(`Invalid slug "${slug}". Use 3-32 chars, lowercase letters/digits/hyphens, must start and end with a letter or digit.`);
  }
}

async function readJsonAt(root, rel, fallback) {
  try {
    const txt = await fs.readFile(path.join(root, rel), 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    if (e.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw e;
  }
}

async function writeJsonAt(root, rel, data) {
  const abs = path.join(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function writeText(root, rel, text) {
  const abs = path.join(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, text, 'utf8');
}

export async function listAssignments() {
  const base = path.join(ROOT, 'assignments');
  const out = [];
  let topics;
  try {
    topics = await fs.readdir(base, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
  for (const t of topics) {
    if (!t.isDirectory()) continue;
    const topicDir = path.join(base, t.name);
    const entries = await fs.readdir(topicDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith('.yml')) continue;
      const raw = await fs.readFile(path.join(topicDir, e.name), 'utf8');
      const data = yaml.load(raw);
      if (!data || !data.id) continue;
      // YAML auto-parses dates — coerce to ISO date string for stable rendering/sorting.
      if (data.dueDate instanceof Date) {
        data.dueDate = data.dueDate.toISOString().slice(0, 10);
      } else if (data.dueDate != null) {
        data.dueDate = String(data.dueDate);
      }
      out.push({ ...data, topic: data.topic || t.name });
    }
  }
  return out;
}

export async function loadAssignment(asgId) {
  const all = await listAssignments();
  const found = all.find(a => a.id === asgId);
  if (!found) throw new Error(`Unknown assignment "${asgId}"`);
  return found;
}

// State JSON lives in the private state repo.
export async function readRepos(asgId)   { return readJsonAt(STATE_ROOT, `state/${asgId}/repos.json`, []); }
export async function readGroups(asgId)  { return readJsonAt(STATE_ROOT, `state/${asgId}/groups.json`, []); }
export async function readActivity(asgId){ return readJsonAt(STATE_ROOT, `state/${asgId}/activity.json`, []); }
export async function writeRepos(asgId, d)   { return writeJsonAt(STATE_ROOT, `state/${asgId}/repos.json`, d); }
export async function writeGroups(asgId, d)  { return writeJsonAt(STATE_ROOT, `state/${asgId}/groups.json`, d); }
export async function writeActivity(asgId, d){ return writeJsonAt(STATE_ROOT, `state/${asgId}/activity.json`, d); }

export function repoNameForSolo(asg, username) {
  return `${asg.topic}-${asg.id}-${username}`.toLowerCase();
}

export function repoNameForGroup(asg, slug) {
  return `${asg.topic}-${asg.id}-${slug}`.toLowerCase();
}

export function parseJoinTitle(title) {
  // Formats:
  //   join:<asg-id>
  //   join:<asg-id> team:create:<slug>
  //   join:<asg-id> team:join:<slug>
  const t = (title || '').trim();
  const m = t.match(/^join:([a-z0-9][a-z0-9-]*)(?:\s+team:(create|join):([a-z0-9][a-z0-9-]*))?$/i);
  if (!m) return null;
  return {
    asgId: m[1].toLowerCase(),
    teamAction: m[2] ? m[2].toLowerCase() : null,
    teamSlug: m[3] ? m[3].toLowerCase() : null,
  };
}
