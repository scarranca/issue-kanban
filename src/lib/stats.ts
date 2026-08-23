import { KANBAN_STATUSES } from './kanban';
import type { Issue, KanbanStatus } from './types';

export interface Count {
  label: string;
  value: number;
}

export const STATUS_HEX: Record<KanbanStatus, string> = {
  Backlog: '#94a3b8',
  Todo: '#0ea5e9',
  'In Progress': '#f59e0b',
  'In Review': '#8b5cf6',
  Done: '#10b981',
};

export function countByStatus(issues: Issue[]): Count[] {
  return KANBAN_STATUSES.map((s) => ({
    label: s,
    value: issues.filter((i) => i.status === s).length,
  }));
}

export function countByRepo(issues: Issue[]): Count[] {
  const m = new Map<string, number>();
  for (const i of issues) {
    m.set(i.repoFullName, (m.get(i.repoFullName) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function countByAssignee(issues: Issue[]): Count[] {
  const m = new Map<string, number>();
  for (const i of issues) {
    if (i.assignees.length === 0) {
      m.set('Unassigned', (m.get('Unassigned') ?? 0) + 1);
      continue;
    }
    for (const a of i.assignees) {
      m.set(a, (m.get(a) ?? 0) + 1);
    }
  }
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function openClosed(issues: Issue[]): { open: number; closed: number } {
  let open = 0;
  let closed = 0;
  for (const i of issues) {
    if (i.state === 'closed') closed++;
    else open++;
  }
  return { open, closed };
}

export function topActiveRepos(issues: Issue[], limit = 5): Count[] {
  return countByRepo(issues).slice(0, limit);
}
