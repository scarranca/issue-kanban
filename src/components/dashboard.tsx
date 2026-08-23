import { STATUS_META, timeAgo } from '@/lib/kanban';
import { countByStatus, openClosed } from '@/lib/stats';
import type { Issue } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BarList, StatCard } from './charts';

export function Dashboard({
  issues,
  onOpenIssue,
}: {
  issues: Issue[];
  onOpenIssue: (id: number) => void;
}) {
  const { open, closed } = openClosed(issues);
  const statuses = countByStatus(issues);
  const inProgress = statuses.find((s) => s.label === 'In Progress')?.value ?? 0;
  const recent = [...issues]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total issues" value={issues.length} />
        <StatCard label="Open" value={open} accent="bg-emerald-500" />
        <StatCard label="Closed" value={closed} accent="bg-slate-400" />
        <StatCard label="In progress" value={inProgress} accent="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Issues by status</h3>
          <BarList data={statuses} color="bg-primary" />
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Recent activity</h3>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No issues yet.
            </p>
          ) : (
            <div className="space-y-0.5">
              {recent.map((i) => (
                <button
                  key={i.id}
                  onClick={() => onOpenIssue(i.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                >
                  <span
                    className={cn('size-2 shrink-0 rounded-full', STATUS_META[i.status].dot)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{i.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(i.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
