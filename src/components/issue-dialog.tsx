import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ExternalLink,
  Loader2,
  Pencil,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { errMsg } from '@/lib/errors';
import {
  KANBAN_STATUSES,
  STATUS_META,
  VERDICT_META,
  confidencePct,
  timeAgo,
} from '@/lib/kanban';
import type { Issue, IssueComment, KanbanStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Markdown } from './markdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Detail {
  issue: Issue;
  comments: IssueComment[];
}

export function IssueDialog({
  issueId,
  name,
  onClose,
  onChanged,
}: {
  issueId: number | null;
  name: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ title: '', body: '', labels: '' });

  useEffect(() => {
    if (issueId == null) {
      setData(null);
      setError(null);
      setEditing(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    setEditing(false);
    api
      .getIssue(issueId)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(errMsg(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [issueId]);

  function patch(updated: Issue) {
    setData((prev) => (prev ? { ...prev, issue: updated } : prev));
    onChanged();
  }

  function startEdit() {
    if (!data) return;
    setDraft({
      title: data.issue.title,
      body: data.issue.body ?? '',
      labels: data.issue.labels.join(', '),
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!data) return;
    setBusy(true);
    try {
      const labels = draft.labels
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = await api.updateIssue(data.issue.id, {
        title: draft.title,
        body: draft.body,
        labels,
      });
      patch(updated);
      setEditing(false);
      toast.success('Issue updated');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function setState(state: 'open' | 'closed') {
    if (!data) return;
    setBusy(true);
    try {
      const updated = await api.setIssueState(data.issue.id, state);
      patch(updated);
      toast.success(state === 'closed' ? 'Issue closed' : 'Issue reopened');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: KanbanStatus) {
    if (!data) return;
    try {
      const updated = await api.setStatus(data.issue.id, status);
      patch(updated);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function claim() {
    if (!data || !name) return;
    try {
      const updated = await api.claim(data.issue.id, name);
      patch(updated);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function analyze() {
    if (!data) return;
    setAnalyzing(true);
    try {
      const analysis = await api.analyze(data.issue.id);
      patch({ ...data.issue, lastAnalysis: analysis });
      toast.success('Done-check complete');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setAnalyzing(false);
    }
  }

  const issue = data?.issue;

  return (
    <Dialog
      open={issueId != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-2xl"
      >
        {loading && (
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {error && (
          <div className="p-5 text-sm text-destructive">{error}</div>
        )}

        {issue && (
          <>
            <DialogHeader className="gap-3 border-b px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">
                  {issue.repoFullName}#{issue.number}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    issue.state === 'open'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'
                  )}
                >
                  {issue.state}
                </Badge>
                <Select
                  value={issue.status}
                  onValueChange={(v) => setStatus(v as KanbanStatus)}
                >
                  <SelectTrigger className="h-6 gap-1 text-xs">
                    <span className={cn('size-1.5 rounded-full', STATUS_META[issue.status].dot)} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editing ? (
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="text-base font-medium"
                />
              ) : (
                <DialogTitle className="text-base leading-snug">
                  {issue.title}
                </DialogTitle>
              )}

              <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span>by {issue.author ?? 'unknown'}</span>
                {issue.assignees.length > 0 && (
                  <span>assigned to {issue.assignees.join(', ')}</span>
                )}
                {issue.milestone && <span>milestone: {issue.milestone}</span>}
                <span>updated {timeAgo(issue.updatedAt)}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 px-5 py-4">
                {issue.labels.length > 0 && !editing && (
                  <div className="flex flex-wrap gap-1">
                    {issue.labels.map((l) => (
                      <Badge key={l} variant="secondary">
                        {l}
                      </Badge>
                    ))}
                  </div>
                )}

                {editing ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-labels">Labels (comma-separated)</Label>
                      <Input
                        id="edit-labels"
                        value={draft.labels}
                        onChange={(e) =>
                          setDraft({ ...draft, labels: e.target.value })
                        }
                        placeholder="bug, enhancement"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-body">Description</Label>
                      <Textarea
                        id="edit-body"
                        value={draft.body}
                        onChange={(e) =>
                          setDraft({ ...draft, body: e.target.value })
                        }
                        rows={8}
                      />
                    </div>
                  </div>
                ) : issue.body ? (
                  <Markdown>{issue.body}</Markdown>
                ) : (
                  <p className="text-sm text-muted-foreground">No description.</p>
                )}

                <AnalysisSection
                  analysis={issue.lastAnalysis}
                  onApply={(status) => setStatus(status)}
                />

                <Separator />

                <div>
                  <h4 className="mb-2 text-sm font-medium">
                    Comments ({issue.commentsCount})
                  </h4>
                  <div className="space-y-3">
                    {data.comments.length === 0 && (
                      <p className="text-xs text-muted-foreground">No comments.</p>
                    )}
                    {data.comments.map((c) => (
                      <div key={c.id} className="rounded-lg border p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="size-3" />
                          <span className="font-medium text-foreground">
                            {c.author}
                          </span>
                          <span>{timeAgo(c.createdAt)}</span>
                        </div>
                        <Markdown>{c.body}</Markdown>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mx-0 mb-0 flex-row items-center justify-between border-t px-4 py-3 sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => tiny.app.shell.open(issue.htmlUrl)}
                >
                  <ExternalLink className="size-3.5" />
                  GitHub
                </Button>
                {name && issue.owner !== name && (
                  <Button variant="ghost" size="sm" onClick={claim}>
                    <User className="size-3.5" />
                    Claim
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" disabled={busy} onClick={saveEdit}>
                      {busy && <Loader2 className="size-3.5 animate-spin" />}
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => analyze()}
                      disabled={analyzing}
                    >
                      {analyzing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      Check if done
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startEdit}
                      disabled={busy}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    {issue.state === 'open' ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={() => setState('closed')}
                      >
                        <X className="size-3.5" />
                        Close
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => setState('open')}
                      >
                        Reopen
                      </Button>
                    )}
                  </>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AnalysisSection({
  analysis,
  onApply,
}: {
  analysis: Issue['lastAnalysis'];
  onApply: (status: KanbanStatus) => void;
}) {
  if (!analysis) return null;
  const v = VERDICT_META[analysis.verdict];

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="size-4 text-violet-500" />
        <span className="text-sm font-medium">Done-check</span>
        <Badge variant="outline" className={cn('text-[11px]', v.badge)}>
          {v.label}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {confidencePct(analysis.confidence)}% confidence
        </span>
      </div>

      {analysis.summary && (
        <p className="mb-2 text-sm text-foreground/90">{analysis.summary}</p>
      )}

      {analysis.criteriaMet.length > 0 && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Met: {analysis.criteriaMet.join('; ')}
        </p>
      )}
      {analysis.criteriaMissing.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Missing: {analysis.criteriaMissing.join('; ')}
        </p>
      )}

      {analysis.evidence.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {analysis.evidence.slice(0, 5).map((e, i) => (
            <li key={i}>
              <span className="font-mono text-foreground/70">[{e.source}]</span>{' '}
              {e.detail}
            </li>
          ))}
        </ul>
      )}

      {analysis.suggestedStatus && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => onApply(analysis.suggestedStatus!)}
        >
          Move to {analysis.suggestedStatus}
        </Button>
      )}
    </div>
  );
}
