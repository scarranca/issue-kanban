import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { errMsg } from '@/lib/errors';
import type { AppState, GhRepo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SettingsDialog({
  open,
  state,
  onClose,
  onStateChange,
}: {
  open: boolean;
  state: AppState | null;
  onClose: () => void;
  onStateChange: (s: AppState) => void;
}) {
  if (!state) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Connect GitHub, pick repositories, and configure the AI.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="account">
          <TabsList className="w-full">
            <TabsTrigger value="account" className="flex-1">
              Account
            </TabsTrigger>
            <TabsTrigger value="repos" className="flex-1">
              Repositories
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1">
              AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4 pt-2">
            <AccountTab state={state} onStateChange={onStateChange} />
          </TabsContent>

          <TabsContent value="repos" className="space-y-4 pt-2">
            <ReposTab state={state} onStateChange={onStateChange} />
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 pt-2">
            <AiTab state={state} onStateChange={onStateChange} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function AccountTab({
  state,
  onStateChange,
}: {
  state: AppState;
  onStateChange: (s: AppState) => void;
}) {
  const [name, setName] = useState(state.name);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  async function saveName() {
    try {
      const s = await api.saveIdentity(name);
      onStateChange(s);
      toast.success('Name saved');
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function connect() {
    setBusy(true);
    try {
      const s = await api.setToken(token);
      onStateChange(s);
      setToken('');
      toast.success(`Connected as ${s.githubLogin}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    try {
      const s = await api.clearToken();
      onStateChange(s);
      toast.success('Disconnected');
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">Your name (used to claim issues)</Label>
        <div className="flex gap-2">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <Button variant="outline" onClick={saveName}>
            <Save className="size-4" />
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label htmlFor="token">GitHub personal access token</Label>
        {state.hasToken ? (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="size-4 text-muted-foreground" />
              Connected as{' '}
              <span className="font-medium">{state.githubLogin}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={disconnect}>
              <LogOut className="size-3.5" />
              Disconnect
            </Button>
          </div>
        ) : (
          <>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_… (needs issues + pull requests + contents read)"
            />
            <Button onClick={connect} disabled={busy || !token.trim()}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Connect
            </Button>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Fine-grained token: read access to Issues, Pull requests, and
          Contents. To create/edit/close issues, grant write on Issues.
        </p>
      </div>
    </>
  );
}

function ReposTab({
  state,
  onStateChange,
}: {
  state: AppState;
  onStateChange: (s: AppState) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('');
  const [availableRepos, setAvailableRepos] = useState<GhRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadAvailableRepos() {
    setLoadingRepos(true);
    try {
      setAvailableRepos(await api.listRepos());
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoadingRepos(false);
    }
  }

  useEffect(() => {
    if (state.hasToken) loadAvailableRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hasToken]);

  const addedNames = new Set(state.repos.map((r) => r.fullName));
  const selectable = availableRepos.filter((r) => !addedNames.has(r.full_name));

  async function add() {
    const target = (selectedRepo || fullName.trim()).trim();
    if (!target) {
      toast.error('Pick a repository or type owner/name');
      return;
    }
    setBusy(true);
    try {
      const s = await api.addRepo(target);
      onStateChange(s);
      setFullName('');
      setSelectedRepo('');
      toast.success('Repository added and synced');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      const s = await api.removeRepo(id);
      onStateChange(s);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function syncAll() {
    setBusy(true);
    try {
      const results = await api.sync();
      const failed = results.filter((r) => r.error);
      const ok = results.length - failed.length;
      toast.success(`Synced ${ok} repo${ok === 1 ? '' : 's'}`);
      if (failed.length) {
        toast.error(failed.map((f) => `${f.fullName}: ${f.error}`).join(' · '));
      }
      const s = await api.getState();
      onStateChange(s);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {state.hasToken ? (
        <div className="space-y-1.5">
          <Label>Add repository</Label>
          <div className="flex gap-2">
            <Select
              value={selectedRepo}
              onValueChange={(v) => setSelectedRepo(v ?? '')}
            >
              <SelectTrigger className="flex-1" disabled={selectable.length === 0}>
                <SelectValue
                  placeholder={
                    selectable.length === 0
                      ? 'No available repositories'
                      : 'Select a repository…'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {selectable.map((r) => (
                  <SelectItem key={r.id} value={r.full_name}>
                    {r.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={add} disabled={busy || !selectedRepo}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="xs"
              onClick={loadAvailableRepos}
              disabled={loadingRepos}
            >
              {loadingRepos ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              {availableRepos.length === 0 ? 'Load repositories' : 'Refresh'}
            </Button>
            {availableRepos.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectable.length} available
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Connect a GitHub token to see your repositories.
        </p>
      )}

      <Separator />

      <div className="space-y-1.5">
        <Label htmlFor="repo">Or add by name (owner/name)</Label>
        <div className="flex gap-2">
          <Input
            id="repo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="octocat/Hello-World"
          />
          <Button variant="outline" onClick={add} disabled={busy}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {state.repos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No repositories yet. Add one above.
          </p>
        )}
        {state.repos.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-2 text-sm">
              <Link2 className="size-4 text-muted-foreground" />
              <span className="font-medium">{r.fullName}</span>
              <span className="text-xs text-muted-foreground">
                {r.issueCount} issues
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(r.id)}
              aria-label={`Remove ${r.fullName}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {state.repos.length > 0 && (
        <Button onClick={syncAll} disabled={busy} className="w-full">
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Sync all repositories
        </Button>
      )}
    </>
  );
}

function AiTab({
  state,
  onStateChange,
}: {
  state: AppState;
  onStateChange: (s: AppState) => void;
}) {
  const [providerKey, setProviderKey] = useState(state.defaultProvider);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = state.providers.find((p) => p.provider === providerKey);

  useEffect(() => {
    const p = state.providers.find((x) => x.provider === providerKey);
    if (p) {
      setBaseUrl(p.baseUrl);
      setModel(p.model);
      setApiKey('');
    }
  }, [providerKey, state.providers]);

  async function save() {
    setBusy(true);
    try {
      const s = await api.saveProvider({
        provider: providerKey,
        apiKey: apiKey || undefined,
        baseUrl,
        model,
      });
      onStateChange(s);
      setApiKey('');
      toast.success('Provider saved');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault() {
    try {
      const s = await api.saveProvider({ provider: providerKey, isDefault: true });
      onStateChange(s);
      toast.success(`${providerKey} is now the default`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function clearKey() {
    try {
      const s = await api.clearProvider(providerKey);
      onStateChange(s);
      setApiKey('');
      toast.success('API key cleared');
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label>Provider</Label>
        <Select value={providerKey} onValueChange={(v) => setProviderKey(v ?? '')}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {state.providers.map((p) => (
              <SelectItem key={p.provider} value={p.provider}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="api-key">API key</Label>
        <Input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={selected?.hasKey ? '•••••••• (saved)' : 'sk-…'}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="base-url">Base URL</Label>
        <Input
          id="base-url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="gpt-4o-mini"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={busy} className="flex-1">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </Button>
        {selected?.hasKey && (
          <Button variant="ghost" onClick={clearKey}>
            Clear key
          </Button>
        )}
        <Button
          variant={state.defaultProvider === providerKey ? 'secondary' : 'outline'}
          onClick={makeDefault}
          disabled={state.defaultProvider === providerKey}
        >
          {state.defaultProvider === providerKey && <Check className="size-4" />}
          Default
        </Button>
      </div>
    </>
  );
}
