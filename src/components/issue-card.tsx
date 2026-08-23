import { useDraggable } from '@dnd-kit/core';
import { Calendar, GitBranch, MoreHorizontal, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { timeAgo } from '@/lib/kanban';
import { previewText, primaryTag, tagColor } from '@/lib/tag';
import type { Issue } from '@/lib/types';
import { cn } from '@/lib/utils';

function initials(s: string) {
  return s.slice(0, 2).toUpperCase() || '?';
}

function Addon({ className }: { className?: string }) {
  return <MoreHorizontal className={cn('size-4 text-muted-foreground', className)} />;
}

/** Presentational card — used both in columns and in the drag overlay. */
export function IssueCardView({
  issue,
  overlay = false,
}: {
  issue: Issue;
  overlay?: boolean;
}) {
  const tag = primaryTag(issue);
  const repoName = issue.repoFullName.split('/')[1] ?? issue.repoFullName;
  const preview = previewText(issue.body);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm',
        overlay
          ? 'rotate-2 cursor-grabbing shadow-xl ring-2 ring-ring/40'
          : 'cursor-grab transition-shadow hover:shadow-md active:cursor-grabbing'
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
            tagColor(tag)
          )}
        >
          {tag}
        </span>
        <Addon />
      </div>

      <h3 className="line-clamp-1 text-[15px] font-semibold leading-snug">
        {issue.title}
      </h3>

      {preview ? (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {preview}
        </p>
      ) : (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          No description.
        </p>
      )}

      <div className="mt-1 flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-2">
        <div className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
          <GitBranch className="size-3" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium">{repoName}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {issue.repoFullName}
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {issue.assignees.length > 0 ? (
            issue.assignees.slice(0, 3).map((a) => (
              <Avatar key={a} className="size-6 border-2 border-card">
                <AvatarFallback className="text-[9px]">{initials(a)}</AvatarFallback>
              </Avatar>
            ))
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <User className="size-3" />
              Unassigned
            </span>
          )}
        </div>

        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Calendar className="size-3" />
          {timeAgo(issue.createdAt)}
        </span>
      </div>
    </div>
  );
}

/** Draggable card for use inside a column. */
export function IssueCard({
  issue,
  onClick,
}: {
  issue: Issue;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(issue.id),
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
    >
      <IssueCardView issue={issue} />
    </div>
  );
}
