import test from 'node:test';
import assert from 'node:assert/strict';
import { collectIssues, MAX_ISSUES } from '../src/domain/collect.mjs';

const options = { projectKey: 'DEMO', hours: 24 };

test('collection follows Jira tokens and requests only required fields', async () => {
  const calls = [];
  const result = await collectIssues(async body => {
    calls.push(body);
    return calls.length === 1
      ? { issues: [{ key: 'DEMO-1' }], nextPageToken: 'synthetic-next', isLast: false }
      : { issues: [{ key: 'DEMO-2' }], isLast: true };
  }, options);
  assert.equal(result.issues.length, 2);
  assert.equal(result.truncated, false);
  assert.equal(calls[1].nextPageToken, 'synthetic-next');
  assert.ok(!calls[0].fields.includes('description'));
  assert.ok(!calls[0].fields.includes('comment'));
});

test('large projects are bounded and explicitly marked incomplete', async () => {
  let requests = 0;
  const result = await collectIssues(async body => {
    requests++;
    return { issues: Array(body.maxResults).fill({ key: 'DEMO-1' }), nextPageToken: `synthetic-${requests}`, isLast: false };
  }, options);
  assert.equal(result.issues.length, MAX_ISSUES);
  assert.equal(result.truncated, true);
  assert.equal(requests, 2);
});

test('broken pagination fails visibly instead of looping or silently dropping data', async () => {
  await assert.rejects(() => collectIssues(async () => ({ issues: [], isLast: false }), options), /valid next page/);
  await assert.rejects(() => collectIssues(async () => ({ issues: [], nextPageToken: 'repeated', isLast: false }), options), /valid next page/);
  await assert.rejects(() => collectIssues(async () => ({ unexpected: true }), options), /unexpected search response/);
});

test('permission failures propagate without being converted into a misleading empty brief', async () => {
  await assert.rejects(() => collectIssues(async () => { throw new Error('Jira denied access'); }, options), /denied access/);
});
