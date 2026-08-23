import { Bell, Moon, Search, Sun } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function AppTopbar({
  search,
  onSearch,
  dark,
  onToggleDark,
  user,
}: {
  search: string;
  onSearch: (v: string) => void;
  dark: boolean;
  onToggleDark: () => void;
  user: string;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card/60 px-6">
      <div className="relative w-72 max-w-[40vw]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search projects…"
          className="h-9 rounded-lg pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={onToggleDark}
          aria-label="Toggle theme"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <button
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-4" />
        </button>

        <div className="ml-2 flex items-center gap-2">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white',
              'bg-gradient-to-br from-blue-500 to-indigo-600'
            )}
          >
            {user.slice(0, 2).toUpperCase() || 'GH'}
          </div>
          <span className="text-sm font-medium">{user || 'Guest'}</span>
        </div>
      </div>
    </header>
  );
}
