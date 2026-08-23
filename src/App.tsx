import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronRight,
  Columns3,
  ListFilter,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { errMsg } from '@/lib/errors';
import type { AppState, Issue, KanbanStatus, Repo } from '@/lib/types';
import { Analytics } from '@/components/analytics';
import { AppSidebar, type ViewId } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';
import { Board } from '@/components/board';
import { Dashboard } from '@/components/dashboard';
import { IssueDialog } from '@/components/issue-dialog';
import { Mailbox } from '@/components/mailbox';
import { NewIssueDialog } from '@/components/new-issue-dialog';
import { Overview } from '@/components/overview';
import { Report } from '@/components/report';
import { SettingsDialog } from '@/components/settings-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const VIEWS: Record<ViewId, { title: string; desc: string }> = {
  dashboard: {
    title: 'Dashboard',
    desc: 'A snapshot of your issues across all repositories.',
  },
  mailbox: {
    title: 'Mailbox',
    desc: 'Issues assigned to you or that you have claimed.',
  },
  analytics: {
    title: 'Analytics',
    desc: 'How your issues break down by status, repository, and assignee.',
  },
  board: {
    title: 'Project List 🚀',
    desc: 'Here is a list of projects that you have created.',
  },
  overview: {
    title: 'Overview',
    desc: 'A per-repository summary of your tracked projects.',
  },
  report: {
    title: 'Report',
    desc: 'Generate a summary report of your issues.',
  },
};

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<number[]>([]);
  const [view, setView] = useState<ViewId>('board');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newIssueOpen, setNewIssueOpen] = useState(false);
  const [activeIssueId, setActiveIssueId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState('');

  const loadIssues = useCallback(async () => {
    try {
      const board = await api.getBoard([]);
      setIssues(board.issues);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, []);

  // Theme + initial load.
  useEffect(() => {
    tiny.theme.get().then((t) => {
      const d = t?.dark ?? false;
      setDark(d);
      document.documentElement.classList.toggle('dark', d);
    });
    tiny.theme.on((v) => {
      setDark(v);
      document.documentElement.classList.toggle('dark', v);
    });

    (async () => {
      try {
        const s = await api.getState();
        setState(s);
        await loadIssues();
      } catch (e) {
        toast.error(errMsg(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadIssues]);

  function toggleRepo(id: number) {
    if (id === -1) {
      setSelectedRepoIds([]);
      return;
    }
    setSelectedRepoIds((prev) => {
      if (prev.length === 0) {
        return (state?.repos ?? [])
          .map((r) => r.id)
          .filter((x) => x !== id);
      }
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  }

  async function sync() {
    setSyncing(true);
    try {
      const results = await api.sync(selectedRepoIds);
      const failed = results.filter((r) => r.error);
      toast.success(`Synced ${results.length - failed.length} repo(s)`);
      if (failed.length) {
        toast.error(failed.map((f) => `${f.fullName}: ${f.error}`).join(' · '));
      }
      await loadIssues();
      setState(await api.getState());
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSyncing(false);
    }
  }

  async function moveIssue(id: number, status: KanbanStatus) {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    try {
      await api.setStatus(id, status);
    } catch (e) {
      toast.error(errMsg(e));
      loadIssues();
    }
  }

  const hasRepos = (state?.repos.length ?? 0) > 0;
  const user = state?.githubLogin ?? state?.name ?? '';

  // Board-only filtering (repo filter + search).
  const boardIssues =
    selectedRepoIds.length === 0
      ? issues
      : issues.filter((i) => selectedRepoIds.includes(i.repoId));
  const q = search.trim().toLowerCase();
  const filteredIssues = q
    ? boardIssues.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.repoFullName.toLowerCase().includes(q)
      )
    : boardIssues;

  const repoLabel =
    selectedRepoIds.length === 0
      ? 'All repos'
      : selectedRepoIds.length === 1
        ? (state?.repos.find((r) => r.id === selectedRepoIds[0])?.fullName ??
          'Repo')
        : `${selectedRepoIds.length} repos`;

  const meta = VIEWS[view];

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30 text-foreground">
      <AppSidebar
        active={view}
        name={user}
        onNavigate={setView}
        onOpenSettings={() => setSettingsOpen(true)}
        onCreateProject={() => setNewIssueOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          search={search}
          onSearch={setSearch}
          dark={dark}
          onToggleDark={toggleDark}
          user={user}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1440px]">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {view === 'board' || view === 'overview' ? (
                  <>
                    <span>Projects</span>
                    <ChevronRight className="size-3" />
                    {view === 'board' && (
                      <>
                        <span>{repoLabel}</span>
                        <ChevronRight className="size-3" />
                      </>
                    )}
                    <span className="font-medium text-foreground">
                      {view === 'board' ? 'Project List' : 'Overview'}
                    </span>
                  </>
                ) : (
                  <span className="font-medium text-foreground">{meta.title}</span>
                )}
              </div>

              {/* Title header */}
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
                    {meta.title}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {meta.desc}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {hasRepos && (
                    <div className="flex -space-x-2">
                      {(state?.repos ?? []).slice(0, 4).map((r) => (
                        <div
                          key={r.id}
                          className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-semibold text-white"
                        >
                          {r.owner.slice(0, 2).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    onClick={sync}
                    disabled={syncing || !state?.hasToken || !hasRepos}
                  >
                    {syncing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Sync
                  </Button>
                </div>
              </div>

              {/* Content */}
              {view === 'board' ? (
                <>
                  <div className="mt-5 flex items-center justify-between gap-2">
                    {hasRepos && (
                      <RepoFilter
                        repos={state!.repos}
                        selected={selectedRepoIds}
                        onToggle={toggleRepo}
                      />
                    )}
                    <Button
                      onClick={() => setNewIssueOpen(true)}
                      disabled={!state?.hasToken || !hasRepos}
                    >
                      <Plus className="size-4" />
                      Add New
                    </Button>
                  </div>

                  <div className="mt-5">
                    {loading ? (
                      <div className="flex gap-4">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Skeleton
                            key={i}
                            className="h-72 w-[300px] rounded-2xl"
                          />
                        ))}
                      </div>
                    ) : !state?.hasToken ? (
                      <EmptyState
                        title="Connect GitHub"
                        description="Add a personal access token to see your issues on a kanban board."
                        actionLabel="Connect GitHub"
                        onAction={() => setSettingsOpen(true)}
                      />
                    ) : !hasRepos ? (
                      <EmptyState
                        title="Add a repository"
                        description="Pick one or more GitHub repositories to track."
                        actionLabel="Open Settings"
                        onAction={() => setSettingsOpen(true)}
                      />
                    ) : issues.length === 0 ? (
                      <EmptyState
                        title="No issues"
                        description="This repo has no issues yet, or they need syncing."
                        actionLabel="Sync now"
                        onAction={sync}
                      />
                    ) : filteredIssues.length === 0 ? (
                      <EmptyState
                        title="No matching issues"
                        description="Try a different search or repo filter."
                        actionLabel="Clear filter"
                        onAction={() => setSearch('')}
                      />
                    ) : (
                      <Board
                        issues={filteredIssues}
                        onOpenIssue={(id) => setActiveIssueId(id)}
                        onMoveIssue={moveIssue}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-6">
                  {loading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-40 w-full rounded-xl" />
                      <Skeleton className="h-40 w-full rounded-xl" />
                    </div>
                  ) : view === 'dashboard' ? (
                    <Dashboard
                      issues={issues}
                      onOpenIssue={(id) => setActiveIssueId(id)}
                    />
                  ) : view === 'mailbox' ? (
                    <Mailbox
                      issues={issues}
                      name={state?.name ?? ''}
                      githubLogin={state?.githubLogin ?? null}
                      onOpenIssue={(id) => setActiveIssueId(id)}
                    />
                  ) : view === 'analytics' ? (
                    <Analytics issues={issues} />
                  ) : view === 'overview' ? (
                    <Overview issues={issues} repos={state?.repos ?? []} />
                  ) : (
                    <Report issues={issues} />
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <IssueDialog
        issueId={activeIssueId}
        name={state?.name ?? ''}
        onClose={() => setActiveIssueId(null)}
        onChanged={loadIssues}
      />

      <NewIssueDialog
        open={newIssueOpen}
        repos={state?.repos ?? []}
        onClose={() => setNewIssueOpen(false)}
        onCreated={loadIssues}
      />

      <SettingsDialog
        open={settingsOpen}
        state={state}
        onClose={() => setSettingsOpen(false)}
        onStateChange={(s) => {
          setState(s);
          loadIssues();
        }}
      />
    </div>
  );
}

function RepoFilter({
  repos,
  selected,
  onToggle,
}: {
  repos: Repo[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isAll = selected.length === 0;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ListFilter className="size-3.5" />
        Filter &amp; Sort
        {!isAll && (
          <span className="rounded-md bg-primary/10 px-1.5 text-[11px] font-medium text-primary">
            {selected.length}
          </span>
        )}
        <ChevronDown className="size-3.5 opacity-60" />
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Show repositories
          </div>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            className="flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              onToggle(-1);
              setOpen(false);
            }}
          >
            All repositories
          </button>
          {repos.map((r) => (
            <label
              key={r.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={isAll || selected.includes(r.id)}
                onChange={() => onToggle(r.id)}
              />
              <span className="truncate">{r.fullName}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <Columns3 className="size-10 text-muted-foreground" />
      <h2 className="font-heading text-lg font-medium">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button onClick={onAction}>{actionLabel}</Button>
    </div>
  );
}
