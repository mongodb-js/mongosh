import { spawnSync as spawnSyncFn } from '../helpers';

export function generateChangelog(
  previousReleaseTag: string,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): string {
  const gitLog = spawnSync(
    'git',
    ['log', `${previousReleaseTag}...HEAD`, '--pretty=%s'],
    {
      encoding: 'utf-8',
    }
  );

  const renderLine = (c: ConventionalCommit) => `- ${renderCommit(c)}`;
  const renderSection = (s: { title: string; commits: ConventionalCommit[] }) =>
    `## ${s.title}\n\n${s.commits.map(renderLine).join('\n')}\n\n`;

  const commits = gitLog.stdout
    .split('\n')
    .map(parseCommit)
    .filter(Boolean) as ConventionalCommit[];

  const sections = [
    {
      title: 'Features',
      commits: commits.filter(({ type }) => type === 'feat'),
    },
    {
      title: 'Bug Fixes',
      commits: commits.filter(({ type }) => type === 'fix'),
    },
    {
      title: 'Performance Improvements',
      commits: commits.filter(({ type }) => type === 'perf'),
    },
  ];

  return sections
    .filter((section) => section.commits.length)
    .map(renderSection)
    .join('\n');
}

interface ConventionalCommit {
  type: string;
  scope: string;
  message: string;
  pr?: string | undefined;
  ticket?: string | undefined;
}

function capitalize(s: string | undefined): string {
  if (!s) {
    return '';
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseCommit(commit: string): ConventionalCommit | undefined {
  commit = commit?.trim();
  if (!commit) {
    return undefined;
  }

  const PR_RE = /\s+\((#\d+)\)$/;
  const pr = PR_RE.exec(commit)?.[1];
  commit = commit.replace(PR_RE, '');

  const TICKET_RE = /\s+\(?((MONGOSH|COMPASS)-\d+)\)?$/;
  let ticket = TICKET_RE.exec(commit)?.[1];
  commit = commit.replace(TICKET_RE, '');

  const COMMIT_RE =
    /^(?<type>feat|fix|perf)(\((?<scope>[^)]*)\))?:\s*(?<message>\S.*)/;
  const groups = COMMIT_RE.exec(commit)?.groups;
  if (!groups) {
    return undefined;
  }

  if (groups.scope && /(MONGOSH|COMPASS)-\d+/.exec(groups.scope)) {
    ticket = groups.scope;
    groups.scope = '';
  }

  groups.message = groups.message.trim();
  return {
    type: groups.type,
    scope: groups.scope,
    message: groups.message,
    pr,
    ticket,
  };
}

function renderCommit(commit: ConventionalCommit): string {
  let links = [commit.ticket, commit.pr].filter(Boolean).join(', ');
  if (links) {
    links = ` (${links})`;
  }

  return `${commit.scope ? `**${commit.scope}**` + ': ' : ''}${capitalize(
    commit.message
  )}${links}`;
}
