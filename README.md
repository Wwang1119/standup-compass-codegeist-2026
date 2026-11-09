# Standup Compass

A daily standup briefing inside a Jira project, built on Atlassian Forge.

Standup Compass organizes the issues visible to the current Jira user into completed work, active work, explicit blockers, risk signals, and next-up work. Every item links to its source issue. A Markdown export keeps the same source links and coverage notes.

## Implementation

- Official `jira-project-page-ui-kit` template, created with Forge CLI.
- Native `jira:projectPage` UI Kit interface and Forge resolver.
- Node.js 24 runtime, 256 MB memory, ARM64 architecture.
- Jira REST API v3 enhanced JQL search through `api.asUser().requestJira`.
- One app permission: `read:jira-work`.
- No external backend, model API, database, scheduled background work, or app storage.

## Briefing rules

- **Completed:** currently Done issues with a resolution date inside the selected 24-hour, 72-hour, or seven-day window.
- **Active:** currently in Jira's In Progress status category.
- **Explicit blockers:** a status beginning with Blocked or Impediment, or an exact `blocked`, `impediment`, or `standup-blocked` label.
- **Risk signals:** an overdue due date, an active issue with no update for 72 hours, or an active issue without an assignee. These are not treated as confirmed blockers.
- **Next up:** To Do issues without an explicit blocker, ordered by due date and then oldest update. The app makes no automatic assignments.

The search retrieves at most 200 issues in two pages. If more results exist, the app displays a coverage warning. Counts describe the retrieved issues and may overlap between groups. Open work is a current snapshot; it is not restricted to the completion window. Due-date checks use the user's browser time zone. Jira search can briefly lag behind edits.

## Development

Requires a supported Node.js LTS release, Forge CLI, an Atlassian account, a Forge API token, and a Jira developer site. Use environment variables for CLI authentication; never put credentials in this app's source files.

```sh
npm install
npm test
forge lint
forge deploy --non-interactive -e development
forge install --non-interactive --confirm-scopes --site YOUR_SITE.atlassian.net --product Jira --environment development
```

Open a Jira project and choose Standup Compass in the project's Apps navigation. The app generates a briefing when the page loads. Use Generate briefing to refresh it after changing the completion window or updating issues.

## Verification status

Ten local domain and pagination tests passed using synthetic fixtures. Forge lint passed. Both development and production versions were deployed to Forge and installed into Jira on an Atlassian demo site. The Jira-hosted app generated a briefing for a company-managed software project, correctly showed the 200-issue coverage limit, and displayed its next-up issue table. It also generated a briefing in a new team-managed software project after adding the app to project navigation. In the production app, five explicitly synthetic tasks verified one recently completed task, two active tasks, an exact blocker label, an overdue/unassigned risk with both reasons, a next-up task, a working source issue link, a seven-day completion-window refresh, and Markdown containing the same items and evidence. No adoption or time-saving measurements have been made.

See [JUDGING.md](JUDGING.md) for production installation and testing instructions.

## Data and privacy

See [PRIVACY.md](PRIVACY.md) for the data used to generate a briefing, processing and retention behavior, and export considerations.

## Credits

Created by Wang Yexiang for Codegeist 2026, starting from Atlassian's official UI Kit template. Dependencies retain their respective licenses.
