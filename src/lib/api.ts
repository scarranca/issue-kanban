import type {
  Analysis,
  AppState,
  Board,
  GhRepo,
  Issue,
  IssueComment,
  KanbanStatus,
  SyncResult,
} from './types';

async function call<T>(method: string, params?: unknown): Promise<T> {
  return (await tiny.api.call(method, params)) as T;
}

export const api = {
  getState: () => call<AppState>('getState'),

  saveIdentity: (name: string) => call<AppState>('saveIdentity', { name }),
  setToken: (token: string) => call<AppState>('setToken', { token }),
  clearToken: () => call<AppState>('clearToken'),

  saveProvider: (p: {
    provider: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    isDefault?: boolean;
  }) => call<AppState>('saveProvider', p),
  clearProvider: (provider: string) =>
    call<AppState>('clearProvider', { provider }),

  listRepos: () => call<GhRepo[]>('listRepos'),

  addRepo: (fullName: string) => call<AppState>('addRepo', { fullName }),
  removeRepo: (id: number) => call<AppState>('removeRepo', { id }),

  sync: (repoIds?: number[]) => call<SyncResult[]>('sync', { repoIds }),
  getBoard: (repoIds?: number[]) =>
    call<Board>('getBoard', { repoIds: repoIds ?? [] }),

  createIssue: (input: {
    repoFullName: string;
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }) => call<Issue>('createIssue', input),

  updateIssue: (
    issueId: number,
    patch: {
      title?: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
    }
  ) => call<Issue>('updateIssue', { issueId, patch }),

  setIssueState: (issueId: number, state: 'open' | 'closed') =>
    call<Issue>('setIssueState', { issueId, state }),

  getIssue: (issueId: number) =>
    call<{ issue: Issue; comments: IssueComment[] }>('getIssue', { issueId }),

  setStatus: (issueId: number, status: KanbanStatus) =>
    call<Issue>('setStatus', { issueId, status }),

  claim: (issueId: number, name: string) =>
    call<Issue>('claim', { issueId, name }),

  analyze: (issueId: number, provider?: string) =>
    call<Analysis>('analyze', { issueId, provider }),
};
