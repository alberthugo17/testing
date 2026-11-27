import {useMemo, useState} from 'react';
import {Lock, Search} from 'lucide-react';
import type {ActivityCategory, ActivityLogRecord, BnccEvent, UserAccount} from '../../types/database';
import {getRolePermissions} from '../../utils/auth';

interface ActivityLogViewProps {
  currentUser: UserAccount;
  activeEvent: BnccEvent;
  logs: ActivityLogRecord[];
}

const CATEGORIES: Array<'Semua Kategori' | ActivityCategory> = [
  'Semua Kategori',
  'Proposal & Pipeline',
  'Contact Person',
  'Pitching & MoU',
  'Impor & Handover',
];

function getCategoryBadgeStyle(category: ActivityCategory): string {
  switch (category) {
    case 'Proposal & Pipeline':
      return 'bg-blue-100 text-[#2454AB]';
    case 'Contact Person':
      return 'bg-amber-100 text-amber-800';
    case 'Pitching & MoU':
      return 'bg-emerald-100 text-emerald-800';
    case 'Impor & Handover':
      return 'bg-purple-100 text-purple-800';
  }
}

export function ActivityLogView({
  currentUser,
  activeEvent,
  logs,
}: ActivityLogViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<'Semua Kategori' | ActivityCategory>(
    'Semua Kategori'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const permissions = getRolePermissions(currentUser);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (selectedCategory !== 'Semua Kategori' && log.category !== selectedCategory) {
        return false;
      }
      if (!query) return true;
      return (
        log.title.toLowerCase().includes(query) ||
        log.description.toLowerCase().includes(query) ||
        log.actor.toLowerCase().includes(query)
      );
    });
  }, [logs, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header + Filter Bar */}
      <section className="rounded-2xl border border-[#83B1EC]/70 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0755B1]">
              Log Aktivitas &amp; Audit Trail — {activeEvent.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
              Merekam setiap perubahan status proposal, update CP, keputusan pitching/grading, MoU, impor, dan handover pengurus.
            </p>
          </div>
          <span className="rounded-lg bg-[#E6F0FD] px-3 py-1.5 text-xs font-bold text-[#0755B1] tabular-nums">
            {logs.length} Aktivitas Tercatat
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#0F52BA] text-white shadow-xs'
                      : 'border border-[#CBD5E1] bg-white text-[#475569] hover:border-[#2454AB] hover:text-[#2454AB]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-64">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari aksi / perusahaan..."
              aria-label="Cari log aktivitas"
              className="h-9 w-full rounded-full border border-[#CBD5E1] bg-white pr-3 pl-8 text-xs text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Log Entries */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-[#CBD5E1] bg-white px-6 py-10 text-center text-sm font-medium text-[#64748B]">
          Tidak ada log aktivitas yang cocok dengan filter saat ini.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <article
              key={log.id}
              className="rounded-2xl border border-[#CBD5E1] bg-white p-4 sm:p-5 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold ${getCategoryBadgeStyle(
                      log.category
                    )}`}
                  >
                    {log.category}
                  </span>
                  <h2 className="text-sm font-extrabold text-[#1E1E1E]">{log.title}</h2>
                </div>
                <span className="text-xs font-medium tabular-nums text-[#64748B]">
                  {log.timestamp}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-[#334155]">
                {log.description}
              </p>

              {log.sensitive && log.sensitiveDetail && (
                <div className="mt-2">
                  {permissions.canViewSponsorshipValue ? (
                    <p
                      data-testid={`sensitive-log-detail-${log.id}`}
                      className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800"
                    >
                      {log.sensitiveDetail}
                    </p>
                  ) : (
                    <p
                      data-testid={`masked-log-detail-${log.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-[#64748B]"
                    >
                      <Lock className="h-3 w-3 text-[#2454AB]" aria-hidden="true" />
                      <span>Detail nominal dibatasi (Manager / Bendahara)</span>
                    </p>
                  )}
                </div>
              )}

              <p className="mt-2 text-[11px] text-[#64748B]">
                Oleh: <span className="font-semibold text-[#1E1E1E]">{log.actor}</span>
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
