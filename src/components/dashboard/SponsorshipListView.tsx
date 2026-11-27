import {useMemo, useState} from 'react';
import {Bell, Lock, Plus, Search} from 'lucide-react';
import type {PartnerCategory, PartnerRecord, UserAccount} from '../../types/database';
import {getRolePermissions} from '../../utils/auth';
import {
  computeEventStats,
  formatRupiah,
  getActiveDeadline,
  isPartnerOverdue,
  PIPELINE_STEPS,
} from '../../utils/pipeline';
import type {DashboardTabId} from './DashboardLayout';

interface SponsorshipListViewProps {
  currentUser: UserAccount;
  partners: PartnerRecord[];
  onNavigateTab: (tab: DashboardTabId) => void;
  onOpenPartnerDetail: (partnerId: string) => void;
}

type SortKey = 'status' | 'name' | 'date';

export function SponsorshipListView({
  currentUser,
  partners,
  onNavigateTab,
  onOpenPartnerDetail,
}: SponsorshipListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('status');
  const [categoryFilter, setCategoryFilter] = useState<'All' | PartnerCategory>('All');
  const [showNotifPopover, setShowNotifPopover] = useState(false);

  const permissions = getRolePermissions(currentUser);
  const stats = computeEventStats(partners);
  const overduePartners = partners.filter((p) => isPartnerOverdue(p));

  const filteredPartners = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = partners.filter((partner) => {
      if (categoryFilter !== 'All' && partner.category !== categoryFilter) {
        return false;
      }
      if (!query) return true;
      return (
        partner.companyName.toLowerCase().includes(query) ||
        partner.picInternal.toLowerCase().includes(query) ||
        partner.contactPerson.name.toLowerCase().includes(query) ||
        partner.pipelineStatus.toLowerCase().includes(query)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return a.companyName.localeCompare(b.companyName);
      }
      if (sortBy === 'date') {
        return b.proposalSentAt.localeCompare(a.proposalSentAt);
      }
      const rank: Record<PartnerRecord['result'], number> = {
        Pending: 0,
        Accept: 1,
        Decline: 2,
      };
      if (rank[a.result] !== rank[b.result]) {
        return rank[a.result] - rank[b.result];
      }
      return a.companyName.localeCompare(b.companyName);
    });
  }, [partners, searchQuery, categoryFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Search + Bell + Proposal Baru */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#2454AB]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            aria-label="Cari perusahaan, PIC EEO, atau Contact Person"
            className="h-11 w-full rounded-full border border-[#83B1EC]/50 bg-[#CFE2FC]/65 pr-4 pl-10 text-sm text-[#1E1E1E] placeholder:text-[#2454AB]/70 focus:border-[#2454AB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#83B1EC]/40"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifPopover((prev) => !prev)}
              aria-label={`Notifikasi overdue (${overduePartners.length})`}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#83B1EC]/60 bg-white text-[#2454AB] hover:bg-[#E6F0FD] cursor-pointer"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {overduePartners.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white tabular-nums">
                  {overduePartners.length}
                </span>
              )}
            </button>

            {showNotifPopover && (
              <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-[#83B1EC] bg-white p-4 shadow-xl">
                <p className="text-xs font-extrabold text-[#1E1E1E]">
                  Reminder Follow-Up Overdue ({overduePartners.length})
                </p>
                {overduePartners.length === 0 ? (
                  <p className="mt-2 text-xs text-[#64748B]">
                    Tidak ada proposal yang melewati jadwal D+3 / D+7.
                  </p>
                ) : (
                  <div className="mt-2.5 space-y-2 max-h-60 overflow-y-auto">
                    {overduePartners.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setShowNotifPopover(false);
                          onOpenPartnerDetail(p.id);
                        }}
                        className="w-full rounded-xl border border-red-200 bg-red-50/50 p-2.5 text-left hover:bg-red-50 cursor-pointer"
                      >
                        <p className="text-xs font-bold text-[#1E1E1E]">{p.companyName}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-[#DC2626] tabular-nums">
                          Jatuh Tempo: {getActiveDeadline(p)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('proposal')}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#0F52BA] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#2454AB] cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Proposal Baru</span>
          </button>
        </div>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#83B1EC]/50 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#64748B]">
              STATUS : PENDING
            </span>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              On Progress
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-[#1E1E1E]">
            {stats.pendingCount}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Sedang follow-up D+3 / D+7</p>
        </div>

        <div className="rounded-2xl border border-[#83B1EC]/50 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#64748B]">
              STATUS : DECLINE
            </span>
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
              Decline
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-[#1E1E1E]">
            {stats.declineCount}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Wajib tercatat alasan penolakan</p>
        </div>

        <div className="rounded-2xl border border-[#83B1EC]/50 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#64748B]">
              STATUS : ACCEPT
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Accept
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-[#1E1E1E]">
            {stats.acceptCount}
          </p>
          {permissions.canViewSponsorshipValue ? (
            <p className="mt-1 text-xs font-semibold tabular-nums text-[#1E1E1E]">
              Total Deal : {formatRupiah(stats.totalDealValue)}
            </p>
          ) : (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B]">
              <Lock className="h-3 w-3 text-[#2454AB]" aria-hidden="true" />
              <span>Deal berhasil (Nominal dibatasi)</span>
            </p>
          )}
        </div>
      </div>

      {/* Partner Directory Card */}
      <section className="rounded-2xl border border-[#83B1EC]/70 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6F0FD]">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5">
              <span className="text-xs font-semibold text-[#475569]">Sort :</span>
              <select
                aria-label="Urutkan daftar partner"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="bg-transparent text-xs font-bold text-[#1E1E1E] focus:outline-none cursor-pointer"
              >
                <option value="status">Status</option>
                <option value="name">Nama Perusahaan (A-Z)</option>
                <option value="date">Tanggal Terbaru</option>
              </select>
            </div>

            <select
              aria-label="Filter kategori partner"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'All' | PartnerCategory)}
              className="h-9 rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none cursor-pointer"
            >
              <option value="All">Semua Kategori</option>
              <option value="Sponsor">Sponsor</option>
              <option value="Media Partner">Media Partner</option>
              <option value="Komunitas">Komunitas</option>
            </select>
          </div>

          <div className="hidden md:grid md:grid-cols-3 md:gap-6 md:w-[320px] text-center text-xs font-bold text-[#64748B]">
            <span>Grade</span>
            <span>Status</span>
            <span>Date</span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredPartners.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] py-10 text-center text-sm text-[#64748B]">
              Tidak ada partner yang cocok dengan pencarian Anda.
            </div>
          ) : (
            filteredPartners.map((partner) => {
              const stepMeta =
                PIPELINE_STEPS.find((s) => s.step === partner.currentStep) ?? PIPELINE_STEPS[0];
              const overdue = isPartnerOverdue(partner);
              const deadline = getActiveDeadline(partner);

              const badgeStyle =
                partner.result === 'Accept'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : partner.result === 'Decline'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200';

              return (
                <button
                  key={partner.id}
                  type="button"
                  onClick={() => onOpenPartnerDetail(partner.id)}
                  data-testid={`partner-row-${partner.id}`}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-4 text-left transition-all hover:border-[#2454AB] hover:shadow-sm cursor-pointer"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#1E1E1E]">
                          {partner.companyName}
                        </span>
                        <span className="text-xs font-medium text-[#64748B]">
                          {partner.category}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#2454AB]">
                        • {stepMeta.fullLabel}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        PIC EEO: <span className="font-medium text-[#1E1E1E]">{partner.picInternal}</span>
                        <span className="mx-2 text-[#CBD5E1]">|</span>
                        CP Partner:{' '}
                        <span className="font-medium text-[#1E1E1E]">
                          {partner.contactPerson.name} ({partner.contactPerson.contact})
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 md:grid md:grid-cols-3 md:gap-6 md:w-[320px] md:text-center shrink-0">
                      <span className="text-xs font-bold text-[#1E1E1E]">
                        {partner.grade === 'None' ? '-' : partner.grade}
                      </span>
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex rounded-md border px-2.5 py-0.5 text-[11px] font-bold ${badgeStyle}`}
                        >
                          {partner.result === 'Pending' ? 'On Progress' : partner.result}
                        </span>
                      </div>
                      <div className="text-right md:text-center">
                        <p className="text-xs font-semibold tabular-nums text-[#1E1E1E]">
                          {deadline || partner.proposalSentAt}
                        </p>
                        {overdue && (
                          <p className="text-[11px] font-bold text-[#DC2626]">
                            Overdue
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
