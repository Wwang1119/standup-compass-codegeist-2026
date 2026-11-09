import { buildQuery } from './briefing.mjs';

// Fetch only fields the briefing needs. Descriptions, comments, and attachments
// stay in Jira, reducing both data exposure and function response size.
export const ISSUE_FIELDS = [
  'summary', 'status', 'assignee', 'labels',
  'updated', 'resolutiondate', 'duedate'
];
export const MAX_ISSUES = 200;

/**
 * requestPage is supplied by the Forge resolver, where it runs as the current
 * Jira user. Keeping pagination separate lets us test bounded collection with
 * synthetic responses without pretending those tests exercised Jira itself.
 */
export async function collectIssues(requestPage, options) {
  const jql = buildQuery(options);
  const issues = [];
  const seenTokens = new Set();
  let nextPageToken;
  let requests = 0;

  while (issues.length < MAX_ISSUES && requests < 2) {
    requests++;
    const body = { jql, fields: ISSUE_FIELDS, maxResults: Math.min(100, MAX_ISSUES - issues.length) };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const page = await requestPage(body);
    if (!page || !Array.isArray(page.issues)) throw new Error('Jira returned an unexpected search response.');
    issues.push(...page.issues.slice(0, body.maxResults));
    nextPageToken = page.nextPageToken;

    if (page.isLast === true || (!nextPageToken && page.isLast !== false)) {
      return { issues, truncated: page.issues.length > body.maxResults };
    }
    if (typeof nextPageToken !== 'string' || !nextPageToken || seenTokens.has(nextPageToken)) {
      throw new Error('Jira could not provide a valid next page. Please generate the briefing again.');
    }
    seenTokens.add(nextPageToken);
  }

  // Never silently present a partial search as a complete project inventory.
  return { issues, truncated: true };
}
