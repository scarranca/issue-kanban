import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { errMsg } from '@/lib/errors';
import type { Repo } from '@/lib/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function NewIssueDialog({
  open,
  repos,
  onClose,
  onCreated,
}: {
  open: boolean;
  repos: Repo[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [repoFullName, setRepoFullName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labels, setLabels] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!repoFullName) {
      toast.error('Pick a repository first');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setBusy(true);
    try {
      await api.createIssue({
        repoFullName,
        title: title.trim(),
        body: body || undefined,
        labels: labels
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success('Issue created');
      setTitle('');
      setBody('');
      setLabels('');
      onCreated();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New issue</DialogTitle>
          <DialogDescription>
            Creates an issue on GitHub and adds it to the board.
          </DialogDescription>
        </DialogHeader>

        {repos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a repository in Settings before creating issues.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Repository</Label>
              <Select value={repoFullName} onValueChange={(v) => setRepoFullName(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a repository" />
                </SelectTrigger>
                <SelectContent>
                  {repos.map((r) => (
                    <SelectItem key={r.id} value={r.fullName}>
                      {r.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-title">Title</Label>
              <Input
                id="new-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Issue title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-labels">Labels (comma-separated)</Label>
              <Input
                id="new-labels"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                placeholder="bug, enhancement"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-body">Description</Label>
              <Textarea
                id="new-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Describe the issue…"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={create} disabled={busy || repos.length === 0}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
