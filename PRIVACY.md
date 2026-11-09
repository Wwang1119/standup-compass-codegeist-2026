# Standup Compass — data and privacy

Effective date: 9 November 2026.

Standup Compass is a Jira Cloud app created by Wang Yexiang for Codegeist 2026. It runs on Atlassian Forge.

## Data used to generate a briefing

The app reads the current project's name and key and retrieves Jira issues the current user is permitted to see. It uses issue keys, summaries, statuses, assignee display names, labels, update times, resolution dates, and due dates to organize the briefing. Jira may return additional metadata with these fields; the app does not include unused assignee account identifiers in its briefing response.

The app uses the user's browser time zone to interpret due dates. It retrieves at most 200 issues for each briefing and shows a warning when the results are incomplete.

## Processing and retention

Briefings are generated in an Atlassian-hosted Forge function and displayed in the user's Jira session. Standup Compass does not save issue content or briefings in app storage, run an external server, or send this data to an external AI provider or analytics service. It does not write issue descriptions, assignee details, or briefing content to application logs.

The app does not modify issues, assign work, or post comments. It does not create an account for end users or require an external API key.

Atlassian operates the underlying platform and may process platform service and diagnostic data under its own policies: [Atlassian Privacy Policy](https://www.atlassian.com/legal/privacy-policy).

## Markdown export

The export contains issue summaries, source links, recorded assignee names, and briefing findings. Users choose whether and where to copy it. Check the destination's access permissions before sharing Jira information outside the original project.

## Access and removal

Jira's project and issue visibility rules apply because the app requests data as the current user. A site administrator can uninstall Standup Compass through Atlassian's connected-app management. Uninstalling does not delete or change Jira work items; the app has no separately stored issue database to remove.

## Questions

Use [GitHub Issues](https://github.com/Wwang1119/standup-compass-codegeist-2026/issues) for product questions. Do not include confidential issue content, credentials, or private project data in a public issue.
