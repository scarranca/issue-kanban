export const KANBAN_STATUSES = [
  'Backlog',
  'Todo',
  'In Progress',
  'In Review',
  'Done',
] as const;

export type KanbanStatus = (typeof KANBAN_STATUSES)[number];

export type Verdict =
  | 'done'
  | 'partially_done'
  | 'not_done'
  | 'insufficient_info';

export interface Repo {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  syncedAt: string | null;
  issueCount: number;
}

export interface EvidenceItem {
  source: string;
  detail: string;
}

export interface Analysis {
  id: number;
  issueId: number;
  provider: string;
  model: string | null;
  verdict: Verdict;
  confidence: number;
  summary: string;
  evidence: EvidenceItem[];
  criteriaMet: string[];
  criteriaMissing: string[];
  suggestedStatus: KanbanStatus | null;
  createdAt: string;
}

export interface Issue {
  id: number;
  repoId: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  author: string | null;
  assignees: string[];
  labels: string[];
  milestone: string | null;
  commentsCount: number;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  status: KanbanStatus;
  owner: string | null;
  repoFullName: string;
  lastAnalysis: Analysis | null;
}

export interface IssueComment {
  id: number;
  author: string;
  body: string;
  createdAt: string;
  htmlUrl: string;
}

export interface ProviderInfo {
  provider: string;
  label: string;
  hasKey: boolean;
  baseUrl: string;
  model: string;
}

export interface AppState {
  name: string;
  githubLogin: string | null;
  hasToken: boolean;
  repos: Repo[];
  providers: ProviderInfo[];
  defaultProvider: string;
}

export interface SyncResult {
  repoId: number;
  fullName: string;
  count: number;
  error?: string;
}
