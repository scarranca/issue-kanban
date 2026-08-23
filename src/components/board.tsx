import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { KANBAN_STATUSES, STATUS_META } from '@/lib/kanban';
import type { Issue, KanbanStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { IssueCard, IssueCardView } from './issue-card';

export function Board({
  issues,
  onOpenIssue,
  onMoveIssue,
}: {
  issues: Issue[];
  onOpenIssue: (id: number) => void;
  onMoveIssue: (id: number, status: KanbanStatus) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  function handleDragStart(e: DragStartEvent) {
    const id = Number(e.active.id);
    setActiveIssue(issues.find((i) => i.id === id) ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveIssue(null);
    const { active, over } = e;
    if (!over) return;
    const issueId = Number(active.id);
    const status = over.id as KanbanStatus;
    if (Number.isFinite(issueId) && KANBAN_STATUSES.includes(status)) {
      onMoveIssue(issueId, status);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveIssue(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {KANBAN_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            issues={issues.filter((i) => i.status === status)}
            onOpenIssue={onOpenIssue}
          />
        ))}
      </div>

      <DragOverlay>
        {activeIssue ? <IssueCardView issue={activeIssue} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  issues,
  onOpenIssue,
}: {
  status: KanbanStatus;
  issues: Issue[];
  onOpenIssue: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[300px] shrink-0 flex-col rounded-2xl border bg-card/60',
        isOver && 'bg-muted/60 ring-2 ring-ring/40'
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3.5">
        <span className={cn('size-2 rounded-full', meta.dot)} />
        <span className="text-sm font-semibold">{status}</span>
        <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {issues.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        {issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            onClick={() => onOpenIssue(issue.id)}
          />
        ))}
        {issues.length === 0 && (
          <div className="rounded-xl border border-dashed py-10 text-center text-xs text-muted-foreground">
            Drag an issue here
          </div>
        )}
      </div>
    </div>
  );
}
