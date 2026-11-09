import React, { useEffect, useRef, useState } from 'react';
import ForgeReconciler, {
  Box, Button, DynamicTable, Heading, Inline, Label, Link,
  Lozenge, SectionMessage, Select, Spinner, Stack,
  Tab, TabList, TabPanel, Tabs, Text, TextArea, useProductContext
} from '@forge/react';
import { invoke } from '@forge/bridge';

const WINDOWS = [
  { label: 'Last 24 hours', value: 24 },
  { label: 'Last 72 hours', value: 72 },
  { label: 'Last 7 days', value: 168 }
];

function Metric({ label, value, color }) {
  return (
    <Box padding="space.200" backgroundColor={color}>
      <Stack space="space.100">
        <Heading size="xlarge">{String(value)}</Heading>
        <Text>{label}</Text>
      </Stack>
    </Box>
  );
}

function IssueTable({ title, description, issues, brief, showReasons = false, empty }) {
  const head = {
    cells: [
      { key: 'issue', content: 'Issue', width: 12 },
      { key: 'summary', content: 'Work item', width: showReasons ? 35 : 48 },
      { key: 'owner', content: 'Assignee', width: 18 },
      { key: 'context', content: showReasons ? 'Evidence' : 'Status', width: showReasons ? 35 : 22 }
    ]
  };
  const rows = issues.map(issue => ({
    key: issue.key,
    cells: [
      { key: issue.key, content: <Link href={`${brief.siteUrl}/browse/${issue.key}`} openNewTab>{issue.key}</Link> },
      { key: issue.summary, content: <Text>{issue.summary}</Text> },
      { key: issue.owner, content: <Text>{issue.owner}</Text> },
      { key: issue.status, content: <Text>{showReasons ? issue.reasons.join(' · ') : issue.status}</Text> }
    ]
  }));
  return (
    <Stack space="space.150">
      <Heading size="small">{`${title} · ${issues.length}`}</Heading>
      <Text>{description}</Text>
      <DynamicTable head={head} rows={rows} rowsPerPage={5} emptyView={empty} />
    </Stack>
  );
}

const App = () => {
  const context = useProductContext();
  const projectKey = context?.extension?.project?.key;
  const initialLoad = useRef(false);
  const [window, setWindow] = useState(WINDOWS[0]);
  const [brief, setBrief] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function generate(hours = window.value) {
    setBusy(true);
    setError('');
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const next = await invoke('generateBrief', { hours, timeZone });
      setBrief(next);
    } catch (failure) {
      setError(failure?.message || 'The briefing could not be generated. Check your Jira access and try again.');
    } finally {
      setBusy(false);
    }
  }

  // Generate once when Jira supplies the project context. Later refreshes are
  // explicit so reading the page never creates a stream of background requests.
  useEffect(() => {
    if (projectKey && !initialLoad.current) {
      initialLoad.current = true;
      generate(24);
    }
  }, [projectKey]);

  return (
    <Stack space="space.300">
      <Box padding="space.300" backgroundColor="color.background.discovery">
        <Stack space="space.150">
          <Inline space="space.100" alignBlock="center" shouldWrap>
            <Lozenge appearance="new">Daily briefing</Lozenge>
            <Text>{brief ? brief.projectName : projectKey || 'Your Jira project'}</Text>
          </Inline>
          <Heading size="xlarge">Standup Compass</Heading>
          <Text>Know what moved, what is stuck, and what to pick up next. Every finding links to its Jira issue.</Text>
        </Stack>
      </Box>

      <Inline space="space.200" alignBlock="end" shouldWrap>
        <Stack space="space.100">
          <Label labelFor="briefing-window">Completion window</Label>
          <Select inputId="briefing-window" options={WINDOWS} value={window} onChange={setWindow} isDisabled={busy} />
        </Stack>
        <Button appearance="primary" onClick={() => generate()} isDisabled={busy || !projectKey}>
          {busy ? 'Generating…' : 'Generate briefing'}
        </Button>
        {brief && <Text>{`Generated ${new Date(brief.generatedAt).toLocaleString('en-GB', { timeZone: brief.timeZone, hour12: false })} · ${brief.timeZone}`}</Text>}
      </Inline>

      {busy && <Inline space="space.150" alignBlock="center"><Spinner size="small" /><Text>Reading the Jira issues you can access…</Text></Inline>}
      {error && <SectionMessage title="We could not generate this briefing" appearance="error"><Text>{error}</Text></SectionMessage>}

      {brief && (
        <Stack space="space.300">
          {brief.warnings.map((warning, index) => <SectionMessage key={index} title="Briefing coverage" appearance="warning"><Text>{warning}</Text></SectionMessage>)}
          <Inline space="space.200" shouldWrap>
            <Metric label={`Completed · last ${brief.hours}h`} value={brief.counts.completed} color="color.background.success" />
            <Metric label="Currently in progress" value={brief.counts.active} color="color.background.information" />
            <Metric label="Explicit blockers" value={brief.counts.blockers} color="color.background.danger" />
            <Metric label="Risk signals" value={brief.counts.risks} color="color.background.warning" />
          </Inline>

          {brief.retrievedCount === 0 && <SectionMessage title="Nothing to brief yet" appearance="information"><Text>Create or update a few work items in this project, then generate another briefing. Jira search may take a moment to reflect recent changes.</Text></SectionMessage>}

          <Tabs id="standup-compass-tabs">
            <TabList>
              <Tab>Needs a conversation</Tab>
              <Tab>Progress</Tab>
              <Tab>Next up</Tab>
              <Tab>Export briefing</Tab>
            </TabList>
            <TabPanel>
              <Box paddingBlock="space.200">
                <Stack space="space.300">
                  <IssueTable title="Explicit blockers" description="Blocked or impediment status, or a blocked, impediment, or standup-blocked label." issues={brief.blockers} brief={brief} showReasons empty="No explicit blockers in the retrieved issues." />
                  <IssueTable title="Risk signals" description="Overdue work, an active issue with no update for 72 hours, or an active issue without an assignee. These are discussion prompts, not confirmed blockers." issues={brief.risks} brief={brief} showReasons empty="No risk signals in the retrieved issues." />
                </Stack>
              </Box>
            </TabPanel>
            <TabPanel>
              <Box paddingBlock="space.200">
                <Stack space="space.300">
                  <IssueTable title="Completed in the window" description={`Currently done issues with a resolution date in the last ${brief.hours} hours.`} issues={brief.completed} brief={brief} empty="No completed work in this window." />
                  <IssueTable title="Currently in progress" description="All retrieved issues currently in Jira's In Progress status category." issues={brief.active} brief={brief} empty="No work currently in progress in the retrieved issues." />
                </Stack>
              </Box>
            </TabPanel>
            <TabPanel>
              <Box paddingBlock="space.200">
                <IssueTable title="Next up" description="To Do work without an explicit blocker, ordered by earliest due date and then oldest update. This is a discussion order, not an automatic assignment." issues={brief.nextUp} brief={brief} empty="No next-up work in the retrieved issues." />
              </Box>
            </TabPanel>
            <TabPanel>
              <Box paddingBlock="space.200">
                <Stack space="space.150">
                  <Heading size="small">Take your briefing into the meeting</Heading>
                  <Text>Select and copy the Markdown below into your standup note. The export includes source links and coverage notes.</Text>
                  <Label labelFor="briefing-export">Standup briefing (Markdown)</Label>
                  <TextArea id="briefing-export" name="briefing-export" value={brief.markdown} isReadOnly isMonospaced minimumRows={18} />
                </Stack>
              </Box>
            </TabPanel>
          </Tabs>
          <Text>{`Based on ${brief.retrievedCount} retrieved issues you can access (collection limit: ${brief.collectionLimit}). Active work, blockers, and risks describe the current state and may overlap. Due dates use ${brief.timeZone}.`}</Text>
        </Stack>
      )}
    </Stack>
  );
};

ForgeReconciler.render(<App />);
