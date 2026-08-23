import type { KanbanStatus, Verdict } from './types';

export const KANBAN_STATUSES: KanbanStatus[] = [
  'Backlog',
  'Todo',
  'In Progress',
  'In Review',
  'Done',
];

export const STATUS_META: Record<
  KanbanStatus,
  { dot: string; text: string }
> = {
  Backlog: { dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
  Todo: { dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400' },
  'In Progress': { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  'In Review': { dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400' },
  Done: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
};

export const VERDICT_META: Record<
  Verdict,
  { label: string; badge: string }
> = {
  done: {
    label: 'Done',
    badge:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  partially_done: {
    label: 'Partially done',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  not_done: {
    label: 'Not done',
    badge: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  },
  insufficient_info: {
    label: 'Insufficient info',
    badge: 'bg-muted text-muted-foreground border-border',
  },
};

export function confidencePct(confidence: number): number {
  return Math.round(confidence * 100);
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
