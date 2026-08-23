import { GitBranch } from 'lucide-react';
import { timeAgo } from '@/lib/kanban';
import type { Issue, Repo } from '@/lib/types';

export function Overview({
  issues,
  repos,
}: {
  issues: Issue[];
  repos: Repo[];
}) {
  if (repos.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No repositories yet. Add one in Settings.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {repos.map((r) => {
        const count = issues.filter((i) => i.repoId === r.id).length;
        const open = issues.filter(
          (i) => i.repoId === r.id && i.state === 'open'
        ).length;
        return (
          <div key={r.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GitBranch className="size-4" />
              </span>
              <span className="min-w-0 truncate text-sm font-semibold">
                {r.fullName}
              </span>
            </div>

            <div className="mt-4 flex gap-6">
              <div>
                <div className="font-heading text-2xl font-semibold">{count}</div>
                <div className="text-xs text-muted-foreground">issues</div>
              </div>
              <div>
                <div className="font-heading text-2xl font-semibold text-emerald-600">
                  {open}
                </div>
                <div className="text-xs text-muted-foreground">open</div>
              </div>
              <div>
                <div className="font-heading text-2xl font-semibold text-slate-500">
                  {count - open}
                </div>
                <div className="text-xs text-muted-foreground">closed</div>
              </div>
            </div>

            {r.syncedAt && (
              <div className="mt-3 text-xs text-muted-foreground">
                Synced {timeAgo(r.syncedAt)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
