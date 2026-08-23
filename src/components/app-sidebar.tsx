import {
  BarChart3,
  ChevronDown,
  Columns3,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewId =
  | 'dashboard'
  | 'mailbox'
  | 'analytics'
  | 'board'
  | 'overview'
  | 'report';

function initials(s: string) {
  return s.slice(0, 2).toUpperCase() || '?';
}

export function AppSidebar({
  active,
  name,
  onNavigate,
  onOpenSettings,
  onCreateProject,
}: {
  active: ViewId;
  name: string;
  onNavigate: (v: ViewId) => void;
  onOpenSettings: () => void;
  onCreateProject: () => void;
}) {
  const projectsActive = active === 'board' || active === 'overview';

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-card/60">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Columns3 className="size-4" />
        </div>
        <span className="font-heading text-sm font-semibold">Issue Kanban</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        <NavItem
          icon={LayoutDashboard}
          label="Dashboard"
          active={active === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
        />
        <NavItem
          icon={Mail}
          label="Mailbox"
          active={active === 'mailbox'}
          onClick={() => onNavigate('mailbox')}
        />
        <NavItem
          icon={BarChart3}
          label="Analytics"
          active={active === 'analytics'}
          onClick={() => onNavigate('analytics')}
        />

        {/* Projects (expanded) */}
        <div className="mt-2">
          <div
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium',
              projectsActive
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground'
            )}
          >
            <Columns3 className="size-4" />
            Projects
            <ChevronDown className="ml-auto size-4" />
          </div>
          <div className="ml-4 mt-1 space-y-0.5 border-l pl-3">
            <button
              onClick={() => onNavigate('board')}
              className={cn(
                'block w-full rounded-md px-2 py-1.5 text-left text-sm',
                active === 'board'
                  ? 'font-medium text-primary'
                  : 'text-muted-foreground'
              )}
            >
              Project List
            </button>
            <button
              onClick={() => onNavigate('overview')}
              className={cn(
                'block w-full rounded-md px-2 py-1.5 text-left text-sm',
                active === 'overview'
                  ? 'font-medium text-primary'
                  : 'text-muted-foreground'
              )}
            >
              Overview
            </button>
            <button
              onClick={onCreateProject}
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground"
            >
              Create Project
            </button>
          </div>
        </div>

        <NavItem
          icon={FileText}
          label="Report"
          active={active === 'report'}
          onClick={() => onNavigate('report')}
        />
        <NavItem icon={Settings} label="Setting" onClick={onOpenSettings} />
      </nav>

      {/* Bottom user */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{name || 'Guest'}</div>
          </div>
          <LogOut className="ml-auto size-4 shrink-0 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
