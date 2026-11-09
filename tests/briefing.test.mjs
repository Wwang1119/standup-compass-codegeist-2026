import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuery, compileBrief, toMarkdown } from '../src/domain/briefing.mjs';

// Deliberately synthetic fixtures; these are not evidence of a cloud installation.
const now = Date.parse('2026-11-09T16:30:00Z');
const options = { projectKey: 'DEMO', hours: 24, now, timeZone: 'Asia/Macau' };
const issue = (n, category, overrides = {}) => ({
  key: `DEMO-${n}`,
  fields: {
    summary: `Synthetic work item ${n}`,
    status: { name: category === 'done' ? 'Done' : 'In progress', statusCategory: { key: category } },
    assignee: { displayName: 'Demo contributor', accountId: 'synthetic-user' },
    updated: '2026-11-09T15:00:00Z', labels: [], ...overrides
  }
});

test('completion uses resolution time rather than any recent update', () => {
  const brief = compileBrief([
    issue(1, 'done', { resolutiondate: '2026-11-09T10:00:00Z' }),
    issue(2, 'done', { resolutiondate: '2026-11-07T10:00:00Z' }),
    issue(3, 'done'),
    issue(4, 'done', { resolutiondate: '2026-11-10T10:00:00Z' })
  ], options);
  assert.deepEqual(brief.completed.map(x => x.key), ['DEMO-1']);
  assert.equal(brief.warnings.length, 1);
});

test('explicit blockers and inferred risks stay distinct; done issues are excluded', () => {
  const brief = compileBrief([
    issue(1, 'indeterminate', { labels: ['blocked'] }),
    issue(2, 'indeterminate', { duedate: '2026-11-09' }),
    issue(3, 'done', { labels: ['blocked'], duedate: '2026-11-01' }),
    issue(4, 'indeterminate', { labels: ['unblocked'], updated: 'invalid-date' })
  ], options);
  assert.deepEqual(brief.blockers.map(x => x.key), ['DEMO-1']);
  // It is already November 10 in Macau at the fixed briefing time.
  assert.deepEqual(brief.risks.map(x => x.key), ['DEMO-2']);
});

test('stale/unassigned active work is signalled, while due-today work is not overdue', () => {
  const brief = compileBrief([
    issue(1, 'indeterminate', { assignee: null, updated: '2026-11-01T00:00:00Z' }),
    issue(2, 'new', { duedate: '2026-11-10' })
  ], options);
  assert.equal(brief.risks.length, 1);
  assert.equal(brief.risks[0].reasons.length, 2);
  assert.equal(brief.risks[0].owner, 'Unassigned');
});

test('duplicate pages and other projects cannot inflate the briefing', () => {
  const first = issue(1, 'indeterminate');
  const brief = compileBrief([first, first, { ...issue(2, 'new'), key: 'OTHER-2' }, null], options, { truncated: true });
  assert.equal(brief.retrievedCount, 1);
  assert.equal(brief.counts.active, 1);
  assert.match(brief.warnings[0], /retrieved issues only/);
});

test('bounded query rejects project-key injection and unapproved lookbacks', () => {
  assert.match(buildQuery(options), /project = "DEMO"/);
  assert.throws(() => buildQuery({ ...options, projectKey: 'DEMO" OR project = SECRET' }));
  assert.throws(() => buildQuery({ ...options, hours: 99999 }));
  assert.throws(() => compileBrief([], { ...options, timeZone: 'Invalid/Zone' }));
});

test('export escapes user-controlled Markdown and retains source issue links', () => {
  const brief = compileBrief([issue(1, 'indeterminate', { summary: '[Click](https://evil.invalid) <script>' })], options);
  const markdown = toMarkdown(brief, 'https://demo.atlassian.net');
  assert.match(markdown, /\[DEMO-1\]\(https:\/\/demo.atlassian.net\/browse\/DEMO-1\)/);
  assert.ok(markdown.includes('\\[Click\\]'));
  assert.throws(() => toMarkdown(brief, 'https://evil.invalid'));
  assert.throws(() => toMarkdown(brief, 'http://demo.atlassian.net'));
});
