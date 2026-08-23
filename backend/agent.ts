import { chatCompletion, extractJson, type LlmConfig } from './ai';
import {
  listComments,
  listCommits,
  listPullRequests,
  type GhComment,
  type GhCommit,
  type GhPullRequest,
} from './github';
import {
  KANBAN_STATUSES,
  type Issue,
  type KanbanStatus,
  type Verdict,
} from './types';

export interface DoneCheckResult {
  verdict: Verdict;
  confidence: number;
  summary: string;
  evidence: Array<{ source: string; detail: string }>;
  criteriaMet: string[];
  criteriaMissing: string[];
  suggestedStatus: KanbanStatus | null;
}

interface RawVerdict {
  verdict?: string;
  confidence?: number;
  summary?: string;
  evidence?: Array<{ source?: string; detail?: string }>;
  criteria_met?: string[];
  criteria_missing?: string[];
  suggested_status?: string;
}

const VALID_VERDICTS: Verdict[] = [
  'done',
  'partially_done',
  'not_done',
  'insufficient_info',
];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

export async function runDoneCheck(
  token: string,
  issue: Issue,
  cfg: LlmConfig
): Promise<DoneCheckResult> {
  const [owner, repo] = issue.repoFullName.split('/');

  const [comments, prs, commits] = await Promise.all([
    listComments(token, owner, repo, issue.number),
    listPullRequests(token, owner, repo),
    listCommits(token, owner, repo, daysAgo(120)),
  ]);

  const ref = `#${issue.number}`;
  const relatedPrs = prs.filter((p) =>
    `${p.title} ${p.body ?? ''}`.includes(ref)
  );
  const relatedCommits = commits.filter((c) =>
    c.commit.message.includes(ref)
  );

  const prompt = buildPrompt(issue, comments, relatedPrs, relatedCommits);

  const raw = await chatCompletion(cfg, [
    {
      role: 'system',
      content:
        'You are a careful software-engineering reviewer. You assess whether a ' +
        'GitHub issue is genuinely complete by inspecting real repository ' +
        'evidence (merged pull requests, commits, comments). You never trust the ' +
        'issue "closed" state on its own — it may be closed as duplicate, wontfix, ' +
        'or stale. Answer ONLY with a single JSON object.',
    },
    { role: 'user', content: prompt },
  ]);

  return parseVerdict(raw);
}

function buildPrompt(
  issue: Issue,
  comments: GhComment[],
  prs: GhPullRequest[],
  commits: GhCommit[]
): string {
  const lines: string[] = [];
  lines.push(`Repository: ${issue.repoFullName}`);
  lines.push(`Issue #${issue.number}: ${issue.title}`);
  lines.push(`State on GitHub: ${issue.state}`);
  lines.push(`Labels: ${issue.labels.join(', ') || '(none)'}`);
  lines.push(`Body:\n${issue.body ?? '(empty)'}`);

  lines.push('\n--- Comments ---');
  if (comments.length === 0) lines.push('(none)');
  for (const c of comments.slice(0, 20)) {
    lines.push(`[${c.user?.login ?? 'unknown'}] ${c.body.slice(0, 600)}`);
  }

  lines.push('\n--- Pull requests referencing this issue ---');
  if (prs.length === 0) lines.push('(none)');
  for (const p of prs.slice(0, 15)) {
    lines.push(
      `#${p.number} ${p.title} [state=${p.state}, merged=${p.merged ?? false}] ` +
        `by ${p.user?.login ?? 'unknown'}`
    );
  }

  lines.push('\n--- Commits referencing this issue ---');
  if (commits.length === 0) lines.push('(none)');
  for (const c of commits.slice(0, 30)) {
    lines.push(`${c.sha.slice(0, 8)} ${c.commit.message.split('\n')[0]}`);
  }

  lines.push(`
Decide whether this issue is actually done. Consider:
- Does a merged pull request or commit fully implement what the issue asks?
- Are any acceptance criteria only partially met?
- Is the issue closed for a non-completion reason (duplicate, wontfix, stale)?

Return a single JSON object with EXACTLY these keys:
{
  "verdict": "done" | "partially_done" | "not_done" | "insufficient_info",
  "confidence": 0..1,
  "summary": "one or two sentences of reasoning",
  "evidence": [ { "source": "pr|commit|comment|body", "detail": "..." } ],
  "criteria_met": [ "..." ],
  "criteria_missing": [ "..." ],
  "suggested_status": "Backlog" | "Todo" | "In Progress" | "In Review" | "Done" | null
}`);

  return lines.join('\n');
}

function parseVerdict(raw: string): DoneCheckResult {
  const data = extractJson<RawVerdict>(raw);

  const verdict: Verdict = VALID_VERDICTS.includes(data.verdict as Verdict)
    ? (data.verdict as Verdict)
    : 'insufficient_info';

  const confidence =
    typeof data.confidence === 'number'
      ? Math.max(0, Math.min(1, data.confidence))
      : 0.5;

  const suggested: KanbanStatus | null = KANBAN_STATUSES.includes(
    data.suggested_status as KanbanStatus
  )
    ? (data.suggested_status as KanbanStatus)
    : null;

  return {
    verdict,
    confidence,
    summary: data.summary ?? '',
    evidence: (data.evidence ?? [])
      .filter((e) => e && typeof e.source === 'string')
      .map((e) => ({ source: e.source!, detail: e.detail ?? '' })),
    criteriaMet: data.criteria_met ?? [],
    criteriaMissing: data.criteria_missing ?? [],
    suggestedStatus: suggested,
  };
}
