import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { countByRepo, countByStatus, openClosed } from '@/lib/stats';
import type { Issue } from '@/lib/types';

export function Report({ issues }: { issues: Issue[] }) {
  const { open, closed } = openClosed(issues);
  const statuses = countByStatus(issues);
  const repos = countByRepo(issues);

  const lines = [
    '# Issue Kanban — Report',
    '',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    `Total issues: ${issues.length}`,
    `Open: ${open}`,
    `Closed: ${closed}`,
    '',
    '## By status',
    ...statuses.map((s) => `- ${s.label}: ${s.value}`),
    '',
    '## By repository',
    ...repos.map((r) => `- ${r.label}: ${r.value}`),
    '',
  ];
  const report = lines.join('\n');

  async function copy() {
    try {
      await tiny.clipboard.write({ text: report });
      toast.success('Report copied to clipboard');
    } catch {
      toast.error('Failed to copy report');
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Report summary</h3>
          <Button size="sm" variant="outline" onClick={copy}>
            <Copy className="size-3.5" />
            Copy report
          </Button>
        </div>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-xs leading-relaxed">
          {report}
        </pre>
      </div>

      <p className="text-xs text-muted-foreground">
        The report summarizes issues across all tracked repositories. Use the
        board or Analytics for an interactive view.
      </p>
    </div>
  );
}
