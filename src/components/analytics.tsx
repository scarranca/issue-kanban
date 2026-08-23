import { KANBAN_STATUSES } from '@/lib/kanban';
import {
  countByAssignee,
  countByStatus,
  openClosed,
  STATUS_HEX,
  topActiveRepos,
} from '@/lib/stats';
import type { Issue } from '@/lib/types';
import { BarList, Donut, StatCard } from './charts';

export function Analytics({ issues }: { issues: Issue[] }) {
  const { open, closed } = openClosed(issues);
  const statuses = countByStatus(issues);
  const repos = topActiveRepos(issues);
  const assignees = countByAssignee(issues).slice(0, 6);
  const colors = KANBAN_STATUSES.map((s) => STATUS_HEX[s]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total issues" value={issues.length} />
        <StatCard label="Open" value={open} accent="bg-emerald-500" />
        <StatCard label="Closed" value={closed} accent="bg-slate-400" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold">Issues by status</h3>
          <Donut data={statuses} colors={colors} />
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">By repository</h3>
            <BarList data={repos} />
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">By assignee</h3>
            <BarList data={assignees} color="bg-indigo-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
