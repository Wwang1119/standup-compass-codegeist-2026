import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { compileBrief, toMarkdown, validateOptions } from '../domain/briefing.mjs';
import { collectIssues, MAX_ISSUES } from '../domain/collect.mjs';

const resolver = new Resolver();

async function readJira(path, options = {}) {
  // asUser preserves Jira's project permissions and issue-level visibility.
  // A project key supplied by a browser is never treated as authorization.
  const response = await api.asUser().requestJira(path, {
    ...options,
    headers: { Accept: 'application/json', ...options.headers }
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Jira denied access. Check that you can browse this project and allow the app access if prompted.');
    }
    if (response.status === 429) throw new Error('Jira is receiving too many requests. Please try again shortly.');
    throw new Error(`Jira could not return the briefing data (HTTP ${response.status}). Please try again.`);
  }
  return response.json();
}

resolver.define('generateBrief', async ({ payload = {}, context }) => {
  const project = context.extension?.project;
  const projectRef = String(project?.id || project?.key || '');
  if (!/^(\d+|[A-Z][A-Z0-9_]{0,63})$/.test(projectRef)) {
    throw new Error('Open Standup Compass from the Apps section inside a Jira project.');
  }

  // Resolve the project through Jira, so the name and source links come from
  // the actual site instead of an arbitrary URL supplied by the client.
  const jiraProject = await readJira(route`/rest/api/3/project/${projectRef}`);
  const options = validateOptions({
    projectKey: jiraProject.key,
    hours: payload.hours ?? 24,
    timeZone: payload.timeZone || 'UTC'
  });
  const { issues, truncated } = await collectIssues(
    body => readJira(route`/rest/api/3/search/jql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
    options
  );
  const brief = compileBrief(issues, options, { truncated });
  const siteUrl = new URL(jiraProject.self).origin;
  const markdown = toMarkdown(brief, siteUrl);

  // No issue data or brief is saved to Forge storage or sent to another service.
  return {
    ...brief,
    projectName: jiraProject.name,
    siteUrl,
    collectionLimit: MAX_ISSUES,
    markdown
  };
});

export const handler = resolver.getDefinitions();
