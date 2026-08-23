import { Database } from 'tjs:sqlite';
import type { GhIssue } from './github';
import {
  KANBAN_STATUSES,
  type Analysis,
  type Issue,
  type KanbanStatus,
  type Repo,
  type Verdict,
} from './types';

let db: Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL UNIQUE,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  synced_at TEXT,
  issue_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  github_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT NOT NULL DEFAULT 'open',
  author TEXT,
  assignees TEXT NOT NULL DEFAULT '[]',
  labels TEXT NOT NULL DEFAULT '[]',
  milestone TEXT,
  comments_count INTEGER NOT NULL DEFAULT 0,
  html_url TEXT,
  created_at TEXT,
  updated_at TEXT,
  status TEXT NOT NULL DEFAULT 'Backlog',
  owner TEXT,
  synced_at TEXT,
  UNIQUE(repo_id, number)
);
CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT,
  verdict TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  summary TEXT,
  evidence TEXT NOT NULL DEFAULT '[]',
  criteria_met TEXT NOT NULL DEFAULT '[]',
  criteria_missing TEXT NOT NULL DEFAULT '[]',
  suggested_status TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE INDEX IF NOT EXISTS idx_issues_repo ON issues(repo_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_analyses_issue ON analyses(issue_id);
`;

function join(base: string, file: string): string {
  return base.replace(/\/+$/, '') + '/' + file;
}

export async function initDb(dataDir: string): Promise<void> {
  if (db) return;
  // tjs.makeDir is async — must await before SQLite can open a file in it.
  await tjs.makeDir(dataDir, { recursive: true });
  db = new Database(join(dataDir, 'issue-kanban.db'));
  db.exec(SCHEMA);
}

function d(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// meta
// ---------------------------------------------------------------------------

export function getMeta(key: string): string | null {
  const row = d()
    .prepare('SELECT value FROM meta WHERE key = ?')
    .all(key)[0] as { value: string } | undefined;
  return row ? row.value : null;
}

export function setMeta(key: string, value: string): void {
  d().prepare(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

// ---------------------------------------------------------------------------
// repos
// ---------------------------------------------------------------------------

interface RepoRow {
  id: number;
  full_name: string;
  owner: string;
  name: string;
  synced_at: string | null;
  issue_count: number;
}

function mapRepo(r: RepoRow): Repo {
  return {
    id: r.id,
    fullName: r.full_name,
    owner: r.owner,
    name: r.name,
    syncedAt: r.synced_at,
    issueCount: r.issue_count,
  };
}

export function listRepos(): Repo[] {
  const rows = d()
    .prepare('SELECT * FROM repos ORDER BY full_name ASC')
    .all() as unknown as RepoRow[];
  return rows.map(mapRepo);
}

export function getRepoByFullName(fullName: string): Repo | null {
  const row = d()
    .prepare('SELECT * FROM repos WHERE full_name = ?')
    .all(fullName)[0] as unknown as RepoRow | undefined;
  return row ? mapRepo(row) : null;
}

export function addRepo(fullName: string): Repo {
  const [owner, name] = fullName.split('/');
  d().prepare('INSERT INTO repos (full_name, owner, name) VALUES (?, ?, ?)').run(
    fullName,
    owner,
    name
  );
  return getRepoByFullName(fullName)!;
}

export function removeRepo(id: number): void {
  d().prepare('DELETE FROM repos WHERE id = ?').run(id);
}

export function updateRepoSync(id: number, issueCount: number): void {
  d()
    .prepare('UPDATE repos SET synced_at = ?, issue_count = ? WHERE id = ?')
    .run(new Date().toISOString(), issueCount, id);
}

// ---------------------------------------------------------------------------
// issues
// ---------------------------------------------------------------------------

interface IssueRow {
  id: number;
  repo_id: number;
  github_id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  author: string | null;
  assignees: string;
  labels: string;
  milestone: string | null;
  comments_count: number;
  html_url: string;
  created_at: string;
  updated_at: string;
  status: string;
  owner: string | null;
  synced_at: string | null;
  repo_full_name: string;
}

interface AnalysisRow {
  id: number;
  issue_id: number;
  provider: string;
  model: string | null;
  verdict: string;
  confidence: number;
  summary: string | null;
  evidence: string;
  criteria_met: string;
  criteria_missing: string;
  suggested_status: string | null;
  created_at: string;
}

function mapAnalysis(r: AnalysisRow): Analysis {
  return {
    id: r.id,
    issueId: r.issue_id,
    provider: r.provider,
    model: r.model,
    verdict: r.verdict as Verdict,
    confidence: r.confidence,
    summary: r.summary ?? '',
    evidence: parseJson(r.evidence, []),
    criteriaMet: parseJson(r.criteria_met, []),
    criteriaMissing: parseJson(r.criteria_missing, []),
    suggestedStatus: KANBAN_STATUSES.includes(r.suggested_status as KanbanStatus)
      ? (r.suggested_status as KanbanStatus)
      : null,
    createdAt: r.created_at,
  };
}

function mapIssue(r: IssueRow, lastAnalysis: Analysis | undefined): Issue {
  return {
    id: r.id,
    repoId: r.repo_id,
    number: r.number,
    title: r.title,
    body: r.body,
    state: r.state === 'closed' ? 'closed' : 'open',
    author: r.author,
    assignees: parseJson<string[]>(r.assignees, []),
    labels: parseJson<string[]>(r.labels, []),
    milestone: r.milestone,
    commentsCount: r.comments_count,
    htmlUrl: r.html_url,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    status: KANBAN_STATUSES.includes(r.status as KanbanStatus)
      ? (r.status as KanbanStatus)
      : 'Backlog',
    owner: r.owner,
    repoFullName: r.repo_full_name,
    lastAnalysis: lastAnalysis ?? null,
  };
}

const ISSUE_SELECT = `
  SELECT i.*, r.full_name AS repo_full_name
  FROM issues i JOIN repos r ON r.id = i.repo_id
`;

function latestAnalyses(ids: number[]): Map<number, Analysis> {
  const map = new Map<number, Analysis>();
  if (!ids.length) return map;
  const placeholders = ids.map(() => '?').join(',');
  const rows = d()
    .prepare(
      `SELECT * FROM analyses WHERE issue_id IN (${placeholders}) ORDER BY id DESC`
    )
    .all(...ids) as unknown as AnalysisRow[];
  for (const r of rows) {
    if (!map.has(r.issue_id)) map.set(r.issue_id, mapAnalysis(r));
  }
  return map;
}

export function listIssues(filterRepoIds?: number[]): Issue[] {
  let rows: IssueRow[];
  if (filterRepoIds && filterRepoIds.length) {
    const placeholders = filterRepoIds.map(() => '?').join(',');
    rows = d()
      .prepare(`${ISSUE_SELECT} WHERE i.repo_id IN (${placeholders}) ORDER BY i.updated_at DESC`)
      .all(...filterRepoIds) as unknown as IssueRow[];
  } else {
    rows = d()
      .prepare(`${ISSUE_SELECT} ORDER BY i.updated_at DESC`)
      .all() as unknown as IssueRow[];
  }
  const analyses = latestAnalyses(rows.map((r) => r.id));
  return rows.map((r) => mapIssue(r, analyses.get(r.id)));
}

export function getIssueById(id: number): Issue | null {
  const row = d()
    .prepare(`${ISSUE_SELECT} WHERE i.id = ?`)
    .all(id)[0] as unknown as IssueRow | undefined;
  if (!row) return null;
  const a = latestAnalyses([id]).get(id);
  return mapIssue(row, a);
}

export function upsertIssue(repoId: number, gh: GhIssue): number {
  d()
    .prepare(
      `INSERT INTO issues
        (repo_id, github_id, number, title, body, state, author, assignees, labels,
         milestone, comments_count, html_url, created_at, updated_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(repo_id, number) DO UPDATE SET
         github_id = excluded.github_id,
         title = excluded.title,
         body = excluded.body,
         state = excluded.state,
         author = excluded.author,
         assignees = excluded.assignees,
         labels = excluded.labels,
         milestone = excluded.milestone,
         comments_count = excluded.comments_count,
         html_url = excluded.html_url,
         updated_at = excluded.updated_at,
         synced_at = excluded.synced_at`
    )
    .run(
      repoId,
      gh.id,
      gh.number,
      gh.title,
      gh.body ?? null,
      gh.state === 'closed' ? 'closed' : 'open',
      gh.user?.login ?? null,
      JSON.stringify(gh.assignees?.map((a) => a.login) ?? []),
      JSON.stringify(gh.labels?.map((l) => l.name) ?? []),
      gh.milestone?.title ?? null,
      gh.comments ?? 0,
      gh.html_url,
      gh.created_at,
      gh.updated_at,
      new Date().toISOString()
    );
  const row = d()
    .prepare('SELECT id FROM issues WHERE repo_id = ? AND number = ?')
    .all(repoId, gh.number)[0] as { id: number } | undefined;
  return row ? row.id : 0;
}

export function deleteIssue(id: number): void {
  d().prepare('DELETE FROM issues WHERE id = ?').run(id);
}

export function deleteIssueByNumber(repoId: number, number: number): void {
  d()
    .prepare('DELETE FROM issues WHERE repo_id = ? AND number = ?')
    .run(repoId, number);
}

export function listIssueNumbers(repoId: number): number[] {
  const rows = d()
    .prepare('SELECT number FROM issues WHERE repo_id = ?')
    .all(repoId) as unknown as Array<{ number: number }>;
  return rows.map((r) => r.number);
}

export function setIssueStatus(id: number, status: KanbanStatus): void {
  d().prepare('UPDATE issues SET status = ? WHERE id = ?').run(status, id);
}

export function claimIssue(id: number, owner: string): void {
  d().prepare('UPDATE issues SET owner = ? WHERE id = ?').run(owner, id);
}

// ---------------------------------------------------------------------------
// analyses
// ---------------------------------------------------------------------------

export interface NewAnalysis {
  issueId: number;
  provider: string;
  model: string | null;
  verdict: Verdict;
  confidence: number;
  summary: string;
  evidence: Array<{ source: string; detail: string }>;
  criteriaMet: string[];
  criteriaMissing: string[];
  suggestedStatus: KanbanStatus | null;
}

export function saveAnalysis(a: NewAnalysis): void {
  d()
    .prepare(
      `INSERT INTO analyses
        (issue_id, provider, model, verdict, confidence, summary, evidence,
         criteria_met, criteria_missing, suggested_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      a.issueId,
      a.provider,
      a.model,
      a.verdict,
      a.confidence,
      a.summary,
      JSON.stringify(a.evidence),
      JSON.stringify(a.criteriaMet),
      JSON.stringify(a.criteriaMissing),
      a.suggestedStatus,
      new Date().toISOString()
    );
}
