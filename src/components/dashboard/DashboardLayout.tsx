import {useState, type ReactNode} from 'react';
import {
  CheckSquare,
  FilePlus2,
  FileText,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import type {BnccEvent, UserAccount} from '../../types/database';
import {getRolePermissions} from '../../utils/auth';

export type DashboardTabId =
  | 'overview'
  | 'sponsorships'
  | 'proposal'
  | 'mou'
  | 'approvals'
  | 'import'
  | 'logs';

interface DashboardLayoutProps {
  currentUser: UserAccount;
  events: BnccEvent[];
  activeEventId: string;
  onChangeEvent: (eventId: string) => void;
  activeTab: DashboardTabId;
  onSelectTab: (tab: DashboardTabId) => void;
  pendingApprovalCount: number;
  onLogout: () => void;
  onResetDatabase: () => void;
  children: ReactNode;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'EE';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function DashboardLayout({
  currentUser,
  events,
  activeEventId,
  onChangeEvent,
  activeTab,
  onSelectTab,
  pendingApprovalCount,
  onLogout,
  onResetDatabase,
  children,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const permissions = getRolePermissions(currentUser);
  const isManager = currentUser.role === 'admin';
  const activeEvent = events.find((e) => e.id === activeEventId) ?? events[0];

  const navItems: Array<{
    id: DashboardTabId;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
    visible: boolean;
  }> = [
    {
      id: 'overview',
      label: isManager ? 'Dashboard Manager' : 'Dashboard Staff',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: 'sponsorships',
      label: 'Daftar Sponsorship',
      icon: ListChecks,
      visible: true,
    },
    {
      id: 'proposal',
      label: '+ Proposal Baru',
      icon: FilePlus2,
      visible: true,
    },
    {
      id: 'mou',
      label: 'Template MoU Event',
      icon: FileText,
      visible: true,
    },
    {
      id: 'approvals',
      label: 'Persetujuan Edit',
      icon: CheckSquare,
      badge: pendingApprovalCount,
      visible: permissions.canApproveEditRequests,
    },
    {
      id: 'import',
      label: 'Impor Spreadsheet',
      icon: Upload,
      visible: true,
    },
    {
      id: 'logs',
      label: 'Log Aktivitas',
      icon: History,
      visible: true,
    },
  ];

  const handleNavClick = (tab: DashboardTabId) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-[#83B1EC]/50 lg:border-r-0">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[22px] font-extrabold tracking-tight text-[#2454AB]">
              Gather.in
            </p>
            <p className="text-xs font-medium text-[#64748B]">
              BNCC Sponsorship Hub
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu navigasi"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#434242] hover:bg-[#E6F0FD] lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Active Event Switcher */}
        <div className="mt-5 rounded-xl border border-[#83B1EC]/50 bg-[#F8FBFF] p-3">
          <label
            htmlFor="sidebar-event-select"
            className="block text-[10px] font-extrabold tracking-wider uppercase text-[#2454AB]"
          >
            EVENT AKTIF DIKELOLA
          </label>
          <select
            id="sidebar-event-select"
            value={activeEvent?.id ?? ''}
            onChange={(e) => onChangeEvent(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-[#83B1EC]/60 bg-white px-2.5 text-xs font-semibold text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none focus:ring-2 focus:ring-[#83B1EC]/40"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <p className="px-2 pb-2 text-[10px] font-bold tracking-wider uppercase text-[#878787]">
          MENU UTAMA
        </p>
        <nav aria-label="Menu Utama Dashboard" className="space-y-1.5">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  data-testid={`nav-${item.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#0F52BA] text-white shadow-[0_4px_12px_rgba(15,82,186,0.25)]'
                      : 'text-[#334155] hover:bg-[#E6F0FD]/70 hover:text-[#2454AB]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[#5587CE]'}`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      data-testid="nav-approvals-badge"
                      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                        isActive
                          ? 'bg-white text-[#DC2626]'
                          : 'bg-[#DC2626] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>
      </div>

      {/* Bottom User Card */}
      <div className="border-t border-[#E6F0FD] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2454AB] text-xs font-extrabold text-white">
            {getInitials(currentUser.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#1E1E1E]">
              {currentUser.name} ({isManager ? 'Manager' : 'Staff'})
            </p>
            <p className="truncate text-[11px] font-medium text-[#2454AB]">
              {isManager ? 'Akun Pengurus/Bendahara' : 'Akun Staff'}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onResetDatabase}
            title="Reset data prototype ke kondisi awal JSON"
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:border-[#83B1EC] hover:text-[#2454AB] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Reset Data</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            data-testid="logout-button"
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F9FF] text-[#1E1E1E] flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#83B1EC]/50 bg-white px-4 py-2.5 lg:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Buka menu navigasi"
            data-testid="mobile-menu-toggle"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#83B1EC]/60 bg-[#F8FBFF] text-[#2454AB] cursor-pointer"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="text-base font-extrabold text-[#2454AB] leading-tight">
              Gather.in
            </p>
            <p className="truncate text-[11px] font-medium text-[#64748B]">
              {activeEvent?.name ?? 'BNCC Event'} · {isManager ? 'Manager' : 'Staff EEO'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Keluar</span>
        </button>
      </header>

      {/* Desktop Sticky Sidebar inside full-height white rail */}
      <aside className="hidden lg:block lg:w-[272px] lg:shrink-0 lg:bg-white lg:border-r lg:border-[#83B1EC]/50">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full w-[280px] max-w-[85vw] shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-[1140px]">{children}</div>
      </main>
    </div>
  );
}
