const GH_API = 'https://api.github.com';

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
  }
}

export interface GhUser {
  login: string;
  name?: string | null;
  avatar_url?: string;
}

export interface GhRepo {
  id: number;
  full_name: string;
  owner: { login: string };
  name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  updated_at: string;
}

export interface GhIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: { login: string } | null;
  assignees: Array<{ login: string }> | null;
  labels: Array<{ name: string }>;
  milestone: { title: string } | null;
  comments: number;
  html_url: string;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
}

export interface GhComment {
  id: number;
  user: { login: string } | null;
  body: string;
  created_at: string;
  html_url: string;
}

export interface GhPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  merged: boolean | null;
  user: { login: string } | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface GhCommit {
  sha: string;
  commit: { message: string; author?: { date?: string } | null };
  html_url: string;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'issue-kanban',
  };
}

interface GhOptions {
  searchParams?: Record<string, string | number | undefined>;
  maxPages?: number;
}

async function githubFetch<T>(
  token: string,
  path: string,
  opts: GhOptions = {}
): Promise<T[]> {
  const maxPages = opts.maxPages ?? 20;
  const results: T[] = [];
  let url: string | null = `${GH_API}${path}`;

  if (opts.searchParams) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.searchParams)) {
      if (v !== undefined && v !== '') sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) url += (path.includes('?') ? '&' : '?') + qs;
  }

  let pages = 0;
  while (url && pages < maxPages) {
    const res = await fetch(url, { headers: authHeaders(token) });

    if (res.status === 401) {
      throw new GitHubError('Invalid or expired GitHub token (401).', 401);
    }
    if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
      throw new GitHubError('GitHub rate limit exceeded (403). Try again later.', 403);
    }
    if (res.status === 404) {
      throw new GitHubError(`Not found on GitHub (404): ${path}`, 404);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new GitHubError(
        `GitHub API error ${res.status} for ${path}: ${text.slice(0, 300)}`,
        res.status
      );
    }

    const data = (await res.json()) as T[];
    if (Array.isArray(data)) results.push(...data);

    const link: string | null = res.headers.get('link');
    const next = link ? link.match(/<([^>]+)>;\s*rel="next"/) : null;
    url = next ? next[1] : null;
    pages += 1;
  }

  return results;
}

export async function whoami(token: string): Promise<GhUser> {
  const res = await fetch(`${GH_API}/user`, { headers: authHeaders(token) });
  if (res.status === 401) throw new GitHubError('Invalid GitHub token.', 401);
  if (!res.ok) {
    throw new GitHubError(`GitHub API error ${res.status} for /user`, res.status);
  }
  return (await res.json()) as GhUser;
}

export async function listRepos(token: string): Promise<GhRepo[]> {
  return githubFetch<GhRepo>(token, '/user/repos', {
    searchParams: { per_page: 100, sort: 'updated' },
    maxPages: 10,
  });
}

export async function listIssues(
  token: string,
  owner: string,
  repo: string
): Promise<GhIssue[]> {
  const all = await githubFetch<GhIssue>(
    token,
    `/repos/${owner}/${repo}/issues`,
    { searchParams: { state: 'all', per_page: 100 }, maxPages: 20 }
  );
  return all.filter((i) => !i.pull_request);
}

export async function listComments(
  token: string,
  owner: string,
  repo: string,
  number: number
): Promise<GhComment[]> {
  return githubFetch<GhComment>(
    token,
    `/repos/${owner}/${repo}/issues/${number}/comments`,
    { searchParams: { per_page: 100 }, maxPages: 5 }
  );
}

export async function listPullRequests(
  token: string,
  owner: string,
  repo: string
): Promise<GhPullRequest[]> {
  return githubFetch<GhPullRequest>(
    token,
    `/repos/${owner}/${repo}/pulls`,
    {
      searchParams: { state: 'all', per_page: 100, sort: 'updated', direction: 'desc' },
      maxPages: 5,
    }
  );
}

export async function listCommits(
  token: string,
  owner: string,
  repo: string,
  since: string
): Promise<GhCommit[]> {
  return githubFetch<GhCommit>(token, `/repos/${owner}/${repo}/commits`, {
    searchParams: { per_page: 100, since },
    maxPages: 3,
  });
}

export interface IssueInput {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

async function writeIssue(
  token: string,
  owner: string,
  repo: string,
  method: string,
  path: string,
  body: unknown
): Promise<GhIssue> {
  const res = await fetch(`${GH_API}${path}`, {
    method,
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new GitHubError(
      `GitHub API error ${res.status} for ${path}: ${text.slice(0, 300)}`,
      res.status
    );
  }
  return (await res.json()) as GhIssue;
}

export function createIssue(
  token: string,
  owner: string,
  repo: string,
  input: IssueInput
): Promise<GhIssue> {
  return writeIssue(token, owner, repo, 'POST', `/repos/${owner}/${repo}/issues`, {
    title: input.title,
    body: input.body ?? '',
    labels: input.labels ?? [],
    assignees: input.assignees ?? [],
  });
}

export function updateIssue(
  token: string,
  owner: string,
  repo: string,
  number: number,
  patch: { title?: string; body?: string; labels?: string[]; assignees?: string[] }
): Promise<GhIssue> {
  return writeIssue(
    token,
    owner,
    repo,
    'PATCH',
    `/repos/${owner}/${repo}/issues/${number}`,
    patch
  );
}

export function setIssueState(
  token: string,
  owner: string,
  repo: string,
  number: number,
  state: 'open' | 'closed'
): Promise<GhIssue> {
  return writeIssue(
    token,
    owner,
    repo,
    'PATCH',
    `/repos/${owner}/${repo}/issues/${number}`,
    { state }
  );
}
