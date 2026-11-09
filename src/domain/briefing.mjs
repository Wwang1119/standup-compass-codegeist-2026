/** Deterministic, evidence-linked standup briefing rules. */
export const LOOKBACK_HOURS = [24, 72, 168];

const BLOCKER_LABELS = new Set(['blocked', 'impediment', 'standup-blocked']);
const HOUR = 3_600_000;
const clean = (value, fallback = '') => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 500)
  : fallback;
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  ? Date.parse(value) : null;
const escapeMd = text => clean(text).replace(/([\\`*_{}\[\]<>])/g, '\\$1');

export function validateOptions({ projectKey, hours = 24, now = Date.now(), timeZone = 'UTC' }) {
  if (typeof projectKey !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(projectKey)) {
    throw new Error('A valid Jira project key is required.');
  }
  if (!LOOKBACK_HOURS.includes(hours)) throw new Error('Choose 24, 72, or 168 hours.');
  if (!Number.isFinite(now)) throw new Error('A valid briefing time is required.');
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format(now);
  } catch {
    throw new Error('A valid time zone is required.');
  }
  return { projectKey, hours, now, timeZone };
}

export function buildQuery(options) {
  const { projectKey, hours } = validateOptions(options);
  return `project = "${projectKey}" AND (statusCategory != Done OR resolved >= -${hours}h) ORDER BY updated DESC`;
}

function dayAt(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const part = name => parts.find(p => p.type === name).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function normalize(issue) {
  if (!issue || typeof issue.key !== 'string' || !/^[A-Z][A-Z0-9_]*-\d+$/.test(issue.key)) return null;
  const f = issue.fields || {};
  const owner = f.assignee;
  return {
    key: issue.key,
    summary: clean(f.summary, 'Untitled issue'),
    status: clean(f.status?.name, 'Unknown status'),
    category: clean(f.status?.statusCategory?.key, 'unknown'),
    owner: clean(owner?.displayName, 'Unassigned'),
    assigned: Boolean(owner),
    labels: Array.isArray(f.labels) ? f.labels.map(x => clean(x).toLowerCase()) : [],
    updatedAt: timestamp(f.updated),
    resolvedAt: timestamp(f.resolutiondate),
    dueDate: typeof f.duedate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.duedate) ? f.duedate : null
  };
}

/** Counts describe only the issues actually retrieved, never an entire unseen project. */
export function compileBrief(issues, options, { truncated = false } = {}) {
  const config = validateOptions(options);
  const { now, hours, projectKey, timeZone } = config;
  const cutoff = now - hours * HOUR;
  const today = dayAt(now, timeZone);
  const seen = new Set();
  const rows = issues.map(normalize).filter(row => {
    if (!row || !row.key.startsWith(`${projectKey}-`) || seen.has(row.key)) return false;
    seen.add(row.key);
    return true;
  });
  const open = rows.filter(row => row.category !== 'done');
  const completed = rows.filter(row => row.category === 'done' && row.resolvedAt !== null
    && row.resolvedAt >= cutoff && row.resolvedAt <= now)
    .sort((a, b) => b.resolvedAt - a.resolvedAt);
  const active = open.filter(row => row.category === 'indeterminate');
  const blockers = open.flatMap(row => {
    const reasons = [];
    if (/^(blocked|impediment)(\b|$)/i.test(row.status)) reasons.push(`Status: ${row.status}`);
    const labels = row.labels.filter(label => BLOCKER_LABELS.has(label));
    if (labels.length) reasons.push(`Label: ${labels.join(', ')}`);
    return reasons.length ? [{ ...row, reasons }] : [];
  });
  const risks = open.flatMap(row => {
    const reasons = [];
    if (row.dueDate && row.dueDate < today) reasons.push(`Overdue: due ${row.dueDate}`);
    if (row.category === 'indeterminate' && row.updatedAt !== null && now - row.updatedAt >= 72 * HOUR) {
      reasons.push('No Jira update for at least 72 hours');
    }
    if (row.category === 'indeterminate' && !row.assigned) reasons.push('Active issue has no assignee');
    return reasons.length ? [{ ...row, reasons }] : [];
  });
  const blockedKeys = new Set(blockers.map(row => row.key));
  const nextUp = open.filter(row => row.category === 'new' && !blockedKeys.has(row.key))
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
      || (a.updatedAt ?? now) - (b.updatedAt ?? now));
  const warnings = [];
  if (truncated) warnings.push('Collection limit reached. Counts and findings cover retrieved issues only.');
  const missingResolution = rows.filter(row => row.category === 'done' && row.resolvedAt === null).length;
  if (missingResolution) warnings.push(`${missingResolution} done issue(s) lack a resolution date and are excluded from completed-in-window counts.`);
  return {
    projectKey, hours, timeZone,
    generatedAt: new Date(now).toISOString(),
    windowStart: new Date(cutoff).toISOString(),
    retrievedCount: rows.length,
    truncated: Boolean(truncated), warnings,
    completed, active, blockers, risks, nextUp,
    counts: {
      completed: completed.length, active: active.length,
      blockers: blockers.length, risks: risks.length, nextUp: nextUp.length
    }
  };
}

export function toMarkdown(brief, siteUrl = '') {
  let origin = '';
  if (siteUrl) {
    const url = new URL(siteUrl);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.atlassian.net') || url.username || url.password) {
      throw new Error('Use an HTTPS Atlassian Cloud site URL.');
    }
    origin = url.origin;
  }
  const lines = [
    `# Standup Compass — ${escapeMd(brief.projectKey)}`,
    `Generated: ${brief.generatedAt}`,
    `Completion window: ${brief.windowStart} to ${brief.generatedAt} (${brief.hours} hours).`,
    `Due-date time zone: ${brief.timeZone}. Retrieved issues: ${brief.retrievedCount}.`,
    '',
    'Active work, blockers, and risks describe the current retrieved issues. These groups may overlap.',
    'Risk signals are prompts for discussion, not confirmed blockers.',
    ...brief.warnings.map(warning => `Note: ${warning}`)
  ];
  const groups = [
    ['Completed in the window', brief.completed],
    ['Currently in progress', brief.active],
    ['Explicit blockers', brief.blockers],
    ['Risk signals', brief.risks],
    ['Next up — earliest due date, then oldest update', brief.nextUp]
  ];
  for (const [title, rows] of groups) {
    lines.push('', `## ${title} (${rows.length})`);
    if (!rows.length) lines.push('No matching issues in the retrieved data.');
    for (const row of rows) {
      lines.push(`- [${row.key}](${origin}/browse/${row.key}) ${escapeMd(row.summary)} — ${escapeMd(row.owner)}; ${escapeMd(row.status)}${row.reasons?.length ? `; ${row.reasons.map(escapeMd).join('; ')}` : ''}`);
    }
  }
  return lines.join('\n');
}
