import { runDoneCheck } from './agent';
import {
  addRepo,
  claimIssue,
  deleteIssueByNumber,
  getIssueById,
  getMeta,
  getRepoByFullName,
  initDb,
  listIssueNumbers,
  listIssues,
  listRepos,
  removeRepo,
  saveAnalysis,
  setIssueStatus,
  setMeta,
  updateRepoSync,
  upsertIssue,
} from './db';
import * as gh from './github';
import { PROVIDER_KEYS, PROVIDERS } from './providers';
import type { AppState, KanbanStatus, SyncResult } from './types';

// --- helpers ---------------------------------------------------------------

async function requireToken(app: TinyApp): Promise<string> {
  const token = await app.secrets.get('github-token');
  if (!token) throw new Error('No GitHub token set. Add one in Settings.');
  return token;
}

interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

async function getLlmConfig(app: TinyApp, provider: string): Promise<LlmConfig> {
  const key = await app.secrets.get('llm:' + provider);
  const def = PROVIDERS[provider] ?? { label: provider, baseUrl: '', model: '' };
  const baseUrl =
    getMeta('provider:' + provider + ':baseUrl') || def.baseUrl;
  const model = getMeta('provider:' + provider + ':model') || def.model;
  return { apiKey: key ?? '', baseUrl, model };
}

async function buildState(app: TinyApp): Promise<AppState> {
  const token = await app.secrets.get('github-token');
  const defaultProvider = getMeta('defaultProvider') || 'openai';
  const providers = await Promise.all(
    PROVIDER_KEYS.map(async (key) => {
      const def = PROVIDERS[key];
      return {
        provider: key,
        label: def.label,
        hasKey: !!(await app.secrets.get('llm:' + key)),
        baseUrl: getMeta('provider:' + key + ':baseUrl') || def.baseUrl,
        model: getMeta('provider:' + key + ':model') || def.model,
      };
    })
  );
  return {
    name: getMeta('identity.name') ?? '',
    githubLogin: getMeta('identity.login') || null,
    hasToken: !!token,
    repos: listRepos(),
    providers,
    defaultProvider,
  };
}

async function syncRepo(token: string, repo: { id: number; fullName: string }) {
  const [owner, name] = repo.fullName.split('/');
  const ghIssues = await gh.listIssues(token, owner, name);
  for (const i of ghIssues) upsertIssue(repo.id, i);
  const ghNumbers = new Set(ghIssues.map((i) => i.number));
  for (const n of listIssueNumbers(repo.id)) {
    if (!ghNumbers.has(n)) deleteIssueByNumber(repo.id, n);
  }
  updateRepoSync(repo.id, ghIssues.length);
}

function splitRepo(fullName: string): [string, string] {
  const parts = fullName.split('/');
  if (parts.length !== 2) throw new Error(`Invalid repo name: ${fullName}`);
  return [parts[0], parts[1]];
}

// --- api -------------------------------------------------------------------

export const api: Record<string, TinyApiHandler> = {
  // state / identity / token ------------------------------------------------
  getState: async (_params, app) => buildState(app),

  saveIdentity: async ({ name }, app) => {
    setMeta('identity.name', String(name ?? '').trim());
    return buildState(app);
  },

  setToken: async ({ token }, app) => {
    const t = String(token ?? '').trim();
    if (!t) throw new Error('Token is empty');
    const user = await gh.whoami(t);
    await app.secrets.set('github-token', t);
    setMeta('identity.login', user.login);
    return buildState(app);
  },

  clearToken: async (_params, app) => {
    await app.secrets.delete('github-token');
    setMeta('identity.login', '');
    return buildState(app);
  },

  // providers ---------------------------------------------------------------
  saveProvider: async ({ provider, apiKey, baseUrl, model, isDefault }, app) => {
    const p = String(provider ?? '');
    if (!PROVIDERS[p]) throw new Error(`Unknown provider: ${p}`);
    if (apiKey) await app.secrets.set('llm:' + p, String(apiKey));
    if (baseUrl !== undefined) setMeta('provider:' + p + ':baseUrl', String(baseUrl));
    if (model !== undefined) setMeta('provider:' + p + ':model', String(model));
    if (isDefault) setMeta('defaultProvider', p);
    return buildState(app);
  },

  clearProvider: async ({ provider }, app) => {
    await app.secrets.delete('llm:' + String(provider ?? ''));
    return buildState(app);
  },

  // repos -------------------------------------------------------------------
  listRepos: async (_params, app) => {
    const token = await requireToken(app);
    return gh.listRepos(token);
  },

  addRepo: async ({ fullName }, app) => {
    const token = await requireToken(app);
    const name = String(fullName ?? '').trim();
    if (!name.includes('/')) throw new Error('Enter a repo as owner/name');
    if (!getRepoByFullName(name)) addRepo(name);
    const repo = getRepoByFullName(name)!;
    await syncRepo(token, repo);
    return buildState(app);
  },

  removeRepo: async ({ id }, app) => {
    removeRepo(Number(id));
    return buildState(app);
  },

  sync: async ({ repoIds }, app): Promise<SyncResult[]> => {
    const token = await requireToken(app);
    const repos = listRepos().filter(
      (r) => !repoIds || !repoIds.length || repoIds.includes(r.id)
    );
    const results: SyncResult[] = [];
    for (const repo of repos) {
      try {
        await syncRepo(token, repo);
        results.push({ repoId: repo.id, fullName: repo.fullName, count: repo.issueCount });
      } catch (e) {
        results.push({
          repoId: repo.id,
          fullName: repo.fullName,
          count: 0,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return results;
  },

  // board -------------------------------------------------------------------
  getBoard: async ({ repoIds }) => ({
    repos: listRepos(),
    issues: listIssues(repoIds?.length ? repoIds : undefined),
  }),

  // issues (CRUD to GitHub) -------------------------------------------------
  createIssue: async ({ repoFullName, title, body, labels, assignees }, app) => {
    const token = await requireToken(app);
    const t = String(title ?? '').trim();
    if (!t) throw new Error('Title is required');
    const [owner, repoName] = splitRepo(String(repoFullName ?? ''));
    const ghIssue = await gh.createIssue(token, owner, repoName, {
      title: t,
      body: body ? String(body) : undefined,
      labels: Array.isArray(labels) ? labels : [],
      assignees: Array.isArray(assignees) ? assignees : [],
    });
    let repo = getRepoByFullName(String(repoFullName));
    if (!repo) repo = addRepo(String(repoFullName));
    const id = upsertIssue(repo.id, ghIssue);
    return getIssueById(id);
  },

  updateIssue: async ({ issueId, patch }, app) => {
    const token = await requireToken(app);
    const issue = getIssueById(Number(issueId));
    if (!issue) throw new Error('Issue not found');
    const [owner, repoName] = splitRepo(issue.repoFullName);
    const ghIssue = await gh.updateIssue(token, owner, repoName, issue.number, {
      title: patch?.title !== undefined ? String(patch.title) : undefined,
      body: patch?.body !== undefined ? String(patch.body) : undefined,
      labels: Array.isArray(patch?.labels) ? patch.labels : undefined,
      assignees: Array.isArray(patch?.assignees) ? patch.assignees : undefined,
    });
    upsertIssue(issue.repoId, ghIssue);
    return getIssueById(issue.id);
  },

  setIssueState: async ({ issueId, state }, app) => {
    const token = await requireToken(app);
    const issue = getIssueById(Number(issueId));
    if (!issue) throw new Error('Issue not found');
    const s = state === 'closed' ? 'closed' : 'open';
    const [owner, repoName] = splitRepo(issue.repoFullName);
    const ghIssue = await gh.setIssueState(token, owner, repoName, issue.number, s);
    upsertIssue(issue.repoId, ghIssue);
    return getIssueById(issue.id);
  },

  getIssue: async ({ issueId }, app) => {
    const token = await requireToken(app);
    const issue = getIssueById(Number(issueId));
    if (!issue) throw new Error('Issue not found');
    const [owner, repoName] = splitRepo(issue.repoFullName);
    const comments = (await gh.listComments(token, owner, repoName, issue.number)).map(
      (c) => ({
        id: c.id,
        author: c.user?.login ?? 'unknown',
        body: c.body,
        createdAt: c.created_at,
        htmlUrl: c.html_url,
      })
    );
    return { issue, comments };
  },

  // local kanban status / ownership ----------------------------------------
  setStatus: async ({ issueId, status }) => {
    const id = Number(issueId);
    const s = String(status ?? '') as KanbanStatus;
    setIssueStatus(id, s);
    return getIssueById(id);
  },

  claim: async ({ issueId, name }) => {
    claimIssue(Number(issueId), String(name ?? '').trim());
    return getIssueById(Number(issueId));
  },

  // AI done-check -----------------------------------------------------------
  analyze: async ({ issueId, provider }, app) => {
    const token = await requireToken(app);
    const issue = getIssueById(Number(issueId));
    if (!issue) throw new Error('Issue not found');
    const p = String(provider || getMeta('defaultProvider') || 'openai');
    const cfg = await getLlmConfig(app, p);
    if (!cfg.apiKey) throw new Error(`No API key for ${p}. Add one in Settings.`);
    if (!cfg.baseUrl || !cfg.model) {
      throw new Error(`Provider ${p} needs a base URL and model. Set them in Settings.`);
    }
    const result = await runDoneCheck(token, issue, cfg);
    saveAnalysis({
      issueId: issue.id,
      provider: p,
      model: cfg.model,
      ...result,
    });
    return getIssueById(issue.id)?.lastAnalysis ?? null;
  },
};

export async function init(app: TinyApp) {
  // Never let a local-database failure take the whole window down — the UI
  // still renders and API calls that need storage surface a clear error.
  try {
    await initDb(app.paths.data);
  } catch (e) {
    console.error(
      'issue-kanban: failed to open local database:',
      e instanceof Error ? e.message : e
    );
  }
  app.setTitle('Issue Kanban');
}
