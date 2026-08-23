import { Inbox } from 'lucide-react';
import { STATUS_META, timeAgo } from '@/lib/kanban';
import type { Issue } from '@/lib/types';
import { cn } from '@/lib/utils';

export function Mailbox({
  issues,
  name,
  githubLogin,
  onOpenIssue,
}: {
  issues: Issue[];
  name: string;
  githubLogin: string | null;
  onOpenIssue: (id: number) => void;
}) {
  const mine = issues
    .filter(
      (i) =>
        (githubLogin && i.assignees.includes(githubLogin)) ||
        (name && i.owner === name)
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (mine.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Inbox className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nothing assigned to you. Claim an issue on the board and it'll show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {mine.map((i) => (
        <button
          key={i.id}
          onClick={() => onOpenIssue(i.id)}
          className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50"
        >
          <span className={cn('size-2 shrink-0 rounded-full', STATUS_META[i.status].dot)} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{i.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              {i.repoFullName}#{i.number}
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {timeAgo(i.updatedAt)}
          </span>
        </button>
      ))}
    </div>
  );
}
