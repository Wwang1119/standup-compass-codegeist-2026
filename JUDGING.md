# Install and test Standup Compass

## Requirements

- A Jira Cloud site and an administrator who can install Forge apps.
- A Jira software project that the testing user can browse.
- No external API key, model subscription, database, or separate service is required.

## Production installation

The production installation link is supplied in the Codegeist submission's installation-link field for the judges and review team.

1. Open the installation link while signed in to Atlassian.
2. Choose **Get app**, select a Jira site you administer, review the requested **View Jira issue data** permission, and complete installation.
3. Open a software project. Find **Standup Compass** in its project navigation or the **More** tabs menu.
4. If it is not visible, choose **Add to navigation**, select **Standup Compass** under **Apps**, and choose **Add to navigation**. This step was needed in the new team-managed demo project.
5. Open the app. It generates a briefing for the current project using the current user's Jira permissions. Use **Generate briefing** to refresh after edits.

The production app does not carry the development **Dev** badge. App ID: `ari:cloud:ecosystem::app/1f03b510-6140-46cb-a3bf-bdf590bd1e02`.

## Suggested test data

Use disposable, clearly labeled synthetic work items in your own test project. The app is read-only; create or change the issues through Jira itself.

| Work item | Jira setup | Expected briefing group |
| --- | --- | --- |
| `[Demo] Publish onboarding checklist` | Move a task to Done now; its workflow must set a resolution date | Completed in the last 24 hours |
| `[Demo] Build source-linked dashboard` | In Progress, assigned to the testing user | Currently in progress |
| `[Demo] Confirm dependency contract` | Open task with the exact label `standup-blocked` | Explicit blockers, with evidence |
| `[Demo] Review API contract` | In Progress, unassigned, with a due date before today | Risk signals for unassigned active work and overdue date |
| `[Demo] Add regression checks` | To Do, without blocker labels | Next up |

The statuses' **categories**, rather than their exact display names, determine To Do, In Progress, and Done. Blocker labels are exact: `blocked`, `impediment`, or `standup-blocked`. An explicit Blocked or Impediment status also works. A risk is a prompt for discussion and does not assert that work is blocked.

## Walkthrough

1. Generate the default **Last 24 hours** briefing.
2. Inspect **Needs a conversation** for blockers and separately explained risk signals.
3. Inspect **Progress** for recently resolved work and the current active-work snapshot.
4. Open a source issue link and confirm the evidence in Jira.
5. Inspect **Next up**. To Do work is ordered by due date and then oldest update; the app does not assign work.
6. Inspect **Export briefing**, select and copy its Markdown into a note. Source links and coverage notes are included.
7. Select **Last 72 hours** or **Last 7 days**, then choose **Generate briefing**. This changes only the completion window; active work, blockers, and risks remain a current snapshot.
8. Change one synthetic issue in Jira and generate again. Jira's search index can take a moment to reflect edits.

## Limits and privacy

The app retrieves at most two pages and 200 issues. A visible warning states when coverage is partial. Counts describe the retrieved issues and can overlap. Completed items with a missing resolution date are reported as a coverage limitation. Due dates use the browser's time zone. No issue descriptions, comments, attachments, or user email addresses are requested.

All product API requests run as the current user on Forge. There is no external backend, model API, app storage, or scheduled job. Exporting or copying a briefing is a deliberate user action; the copied text contains issue summaries, assignee display names, and links. See [PRIVACY.md](PRIVACY.md).

## Support

[GitHub issues](https://github.com/Wwang1119/standup-compass-codegeist-2026/issues). Do not include private Jira data or credentials in a public support issue.
