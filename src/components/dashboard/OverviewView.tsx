import {useState, type FormEvent} from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileText,
  Lock,
  Plus,
  Users,
  X,
} from 'lucide-react';
import type {BnccEvent, PartnerRecord, UserAccount} from '../../types/database';
import {getRolePermissions} from '../../utils/auth';
import {
  computeEventStats,
  formatRupiah,
  getActiveDeadline,
  isPartnerOverdue,
  PIPELINE_STEPS,
} from '../../utils/pipeline';
import type {DashboardTabId} from './DashboardLayout';

interface OverviewViewProps {
  currentUser: UserAccount;
  events: BnccEvent[];
  activeEvent: BnccEvent;
  partners: PartnerRecord[];
  pendingApprovalCount: number;
  onChangeEvent: (eventId: string) => void;
  onNavigateTab: (tab: DashboardTabId) => void;
  onOpenPartnerDetail: (partnerId: string) => void;
  onMarkFollowUpDone: (partnerId: string) => void;
  onCreateEvent: (payload: {name: string; period: string; targetSponsors: number}) => void;
}

export function OverviewView({
  currentUser,
  events,
  activeEvent,
  partners,
  pendingApprovalCount,
  onChangeEvent,
  onNavigateTab,
  onOpenPartnerDetail,
  onMarkFollowUpDone,
  onCreateEvent,
}: OverviewViewProps) {
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventPeriod, setNewEventPeriod] = useState('2026');
  const [newEventTarget, setNewEventTarget] = useState('15');
  const [eventError, setEventError] = useState<string | null>(null);

  const permissions = getRolePermissions(currentUser);
  const isManager = currentUser.role === 'admin';
  const stats = computeEventStats(partners);
  const overduePartners = partners.filter((p) => isPartnerOverdue(p));

  const handleSubmitNewEvent = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = newEventName.trim();
    if (!trimmedName) {
      setEventError('Nama event wajib diisi.');
      return;
    }
    const targetNum = Number(newEventTarget);
    onCreateEvent({
      name: trimmedName,
      period: newEventPeriod.trim() || '2026',
      targetSponsors: Number.isFinite(targetNum) && targetNum > 0 ? targetNum : 10,
    });
    setNewEventName('');
    setNewEventPeriod('2026');
    setNewEventTarget('15');
    setEventError(null);
    setShowEventModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Event Header Card */}
      <section className="rounded-2xl border border-[#83B1EC]/70 bg-white p-5 sm:p-6 shadow-[0_2px_10px_rgba(36,84,171,0.05)]">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0755B1]">
              {activeEvent.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
              {isManager
                ? 'Mode Manager: Anda dapat mengatur hasil pitching, grading, nominal sponsorship, Template MoU, dan menyetujui atau menolak permintaan edit staff.'
                : 'Mode Staff EEO: Anda dapat mencatat proposal baru, memperbarui progres follow-up D+3/D+7, menjadwalkan meeting, serta mengajukan pembaruan Contact Person.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#83B1EC]/60 bg-[#E6F0FD]/55 px-3 py-1.5">
              <span className="text-xs font-bold text-[#2454AB] whitespace-nowrap">
                Pilih Event :
              </span>
              <select
                aria-label="Pilih Event Aktif"
                value={activeEvent.id}
                onChange={(e) => onChangeEvent(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0755B1] focus:outline-none cursor-pointer"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name}
                  </option>
                ))}
              </select>
            </div>

            {permissions.canCreateEvent && (
              <button
                type="button"
                onClick={() => setShowEventModal(true)}
                data-testid="create-event-button"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#83B1EC]/70 bg-white px-3.5 py-1.5 text-xs font-bold text-[#1E1E1E] transition-colors hover:border-[#2454AB] hover:text-[#2454AB] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Event Baru</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateTab('proposal')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#0F52BA] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#2454AB] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Proposal Baru</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4 Summary & Quick Access Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.45fr]">
        {/* Pending Card */}
        <div className="rounded-2xl border border-[#83B1EC]/60 bg-white p-5 shadow-xs">
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
          <p className="mt-1.5 text-xs text-[#64748B]">
            Sedang follow-up D+3 / D+7
          </p>
        </div>

        {/* Accept Card (RBAC sensitive nominal) */}
        <div
          data-testid="kpi-accept-card"
          className="rounded-2xl border border-[#83B1EC]/60 bg-white p-5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#64748B]">
              STATUS : ACCEPT
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Deal / Pitching
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-[#1E1E1E]">
            {stats.acceptCount}
          </p>
          {permissions.canViewSponsorshipValue ? (
            <p
              data-testid="kpi-total-deal"
              className="mt-1.5 text-xs font-semibold tabular-nums text-[#1E1E1E]"
            >
              Total Deal : {formatRupiah(stats.totalDealValue)}
            </p>
          ) : (
            <p
              data-testid="kpi-deal-restricted"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B]"
            >
              <Lock className="h-3 w-3 text-[#2454AB]" aria-hidden="true" />
              <span>Nominal khusus Manager/Bendahara</span>
            </p>
          )}
        </div>

        {/* Decline Card */}
        <div className="rounded-2xl border border-[#83B1EC]/60 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#64748B]">
              STATUS : DECLINE
            </span>
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
              Arsip Done
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-[#1E1E1E]">
            {stats.declineCount}
          </p>
          <p className="mt-1.5 text-xs text-[#64748B]">
            Wajib tercatat alasan penolakan
          </p>
        </div>

        {/* Quick Menu Access Card */}
        <div className="rounded-2xl border border-[#83B1EC]/60 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-bold tracking-wider uppercase text-[#64748B]">
            AKSES MENU CEPAT EVENT
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('proposal')}
              className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1E1E1E] whitespace-nowrap hover:border-[#2454AB] hover:text-[#2454AB] cursor-pointer"
            >
              <ClipboardList className="h-3.5 w-3.5 shrink-0 text-[#2454AB]" aria-hidden="true" />
              <span>Proposal Track</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('sponsorships')}
              className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1E1E1E] whitespace-nowrap hover:border-[#2454AB] hover:text-[#2454AB] cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 shrink-0 text-[#2454AB]" aria-hidden="true" />
              <span>Daftar Sponsor</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('mou')}
              className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1E1E1E] whitespace-nowrap hover:border-[#2454AB] hover:text-[#2454AB] cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-[#2454AB]" aria-hidden="true" />
              <span>Template MoU</span>
            </button>
            {permissions.canApproveEditRequests ? (
              <button
                type="button"
                onClick={() => onNavigateTab('approvals')}
                className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1E1E1E] whitespace-nowrap hover:border-[#2454AB] hover:text-[#2454AB] cursor-pointer"
              >
                <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-[#2454AB]" aria-hidden="true" />
                <span>Approve ({pendingApprovalCount})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateTab('import')}
                className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1E1E1E] whitespace-nowrap hover:border-[#2454AB] hover:text-[#2454AB] cursor-pointer"
              >
                <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#2454AB]" aria-hidden="true" />
                <span>Impor Sheet</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Overdue Follow-Up Section */}
      <section className="rounded-2xl border border-red-300 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#DC2626]" aria-hidden="true" />
            <h2 className="text-sm sm:text-base font-extrabold text-[#1E1E1E]">
              Perlu Follow-Up Segera
            </h2>
            <span className="text-xs font-bold text-[#DC2626]">
              · Melewati jadwal D+3 / D+7
            </span>
          </div>
          <span className="rounded-full bg-[#DC2626] px-3 py-1 text-xs font-bold text-white tabular-nums">
            {overduePartners.length} Proposal
          </span>
        </div>

        {overduePartners.length === 0 ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Semua jadwal follow-up D+3 / D+7 pada event ini sudah tertangani.</span>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {overduePartners.map((partner) => {
              const deadline = getActiveDeadline(partner);
              return (
                <div
                  key={partner.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#CBD5E1] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[#1E1E1E]">
                        {partner.companyName}
                      </p>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-[#2454AB]">
                        {partner.followUpStage || partner.pipelineStatus}
                      </span>
                      <span className="text-xs font-bold text-[#DC2626] tabular-nums">
                        Jatuh Tempo: {deadline}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569]">
                      <span className="font-semibold text-[#1E1E1E]">PIC EEO:</span>{' '}
                      {partner.picInternal}
                      <span className="mx-2 text-[#CBD5E1]">|</span>
                      <span className="font-semibold text-[#1E1E1E]">CP Partner:</span>{' '}
                      {partner.contactPerson.name} ({partner.contactPerson.contact})
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onMarkFollowUpDone(partner.id)}
                      className="inline-flex min-h-[38px] items-center justify-center rounded-lg bg-[#16A34A] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#15803D] cursor-pointer"
                    >
                      Selesai Follow-Up
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPartnerDetail(partner.id)}
                      className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-bold text-[#1E1E1E] transition-colors hover:border-[#2454AB] hover:text-[#2454AB] cursor-pointer"
                    >
                      <span>Detail</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pipeline Tracking Summary */}
      <section className="rounded-2xl border border-[#83B1EC]/70 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#1E1E1E]">
              Tracking Pipeline, Meeting &amp; Benefit ({activeEvent.name})
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Ringkasan tahap aktif, jadwal meeting, dan pemenuhan benefit
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('sponsorships')}
            className="self-start text-xs font-bold text-[#2454AB] hover:underline cursor-pointer"
          >
            Lihat Daftar Sponsorship Lengkap
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {partners.slice(0, 5).map((partner) => {
            const stepMeta =
              PIPELINE_STEPS.find((s) => s.step === partner.currentStep) ?? PIPELINE_STEPS[0];
            const fulfilledCount = partner.benefits.filter((b) => b.fulfilled).length;
            const totalBenefits = partner.benefits.length;
            const nextMeeting = partner.meetings[0];

            const borderClass =
              partner.result === 'Accept'
                ? 'border-emerald-300'
                : partner.result === 'Decline'
                ? 'border-red-300'
                : 'border-amber-300';

            const statusBadgeClass =
              partner.result === 'Accept'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : partner.result === 'Decline'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200';

            return (
              <div
                key={partner.id}
                className={`flex flex-col gap-3 rounded-xl border ${borderClass} bg-white p-4 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-[#1E1E1E]">
                      {partner.companyName}
                    </p>
                    <span className="text-xs font-medium text-[#64748B]">
                      {partner.category}
                    </span>
                    {partner.result === 'Accept' ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {partner.grade !== 'None' ? `${partner.grade}` : 'Accepted'}
                      </span>
                    ) : isPartnerOverdue(partner) ? (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Perlu Follow-Up
                      </span>
                    ) : (
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2454AB]">
                        Aktif
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-[#2454AB]">
                      • Tahap {partner.currentStep}/9: {stepMeta.fullLabel}
                    </span>
                    {nextMeeting && (
                      <span className="rounded-md bg-[#E6F0FD] px-2 py-0.5 text-[11px] font-semibold text-[#2454AB] tabular-nums">
                        Meeting: {nextMeeting.date}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#64748B] tabular-nums">
                    Benefit: {fulfilledCount}/{totalBenefits}
                  </p>
                  <p className="text-xs text-[#475569]">
                    <span className="font-semibold text-[#1E1E1E]">PIC EEO:</span>{' '}
                    {partner.picInternal}
                    <span className="mx-2 text-[#CBD5E1]">|</span>
                    <span className="font-semibold text-[#1E1E1E]">CP Partner:</span>{' '}
                    {partner.contactPerson.name} ({partner.contactPerson.contact})
                  </p>
                </div>

                <div className="flex shrink-0 flex-row sm:flex-col items-center sm:items-end justify-between gap-2">
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeClass}`}
                  >
                    {partner.result === 'Pending' ? 'On Progress' : partner.result}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenPartnerDetail(partner.id)}
                    className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-[#0F52BA] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#2454AB] cursor-pointer"
                  >
                    Detail &amp; Pipeline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal: + Event Baru (Manager Only) */}
      {showEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-event-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#83B1EC] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 id="create-event-title" className="text-lg font-extrabold text-[#2454AB]">
                Buat Event BNCC Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                aria-label="Tutup modal"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#E6F0FD] cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewEvent} className="mt-4 space-y-4">
              {eventError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {eventError}
                </p>
              )}
              <div>
                <label htmlFor="new-event-name" className="block text-xs font-bold text-[#434242]">
                  Nama Event *
                </label>
                <input
                  id="new-event-name"
                  type="text"
                  value={newEventName}
                  onChange={(e) => {
                    setNewEventName(e.target.value);
                    setEventError(null);
                  }}
                  placeholder="Contoh: BNCC Career Fair 2026"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#CBD5E1] px-3 text-sm focus:border-[#2454AB] focus:outline-none focus:ring-2 focus:ring-[#83B1EC]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-event-period" className="block text-xs font-bold text-[#434242]">
                    Periode / Tahun
                  </label>
                  <input
                    id="new-event-period"
                    type="text"
                    value={newEventPeriod}
                    onChange={(e) => setNewEventPeriod(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#CBD5E1] px-3 text-sm focus:border-[#2454AB] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="new-event-target" className="block text-xs font-bold text-[#434242]">
                    Target Sponsor
                  </label>
                  <input
                    id="new-event-target"
                    type="number"
                    min={1}
                    value={newEventTarget}
                    onChange={(e) => setNewEventTarget(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#CBD5E1] px-3 text-sm tabular-nums focus:border-[#2454AB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="min-h-[40px] rounded-xl border border-[#CBD5E1] px-4 text-xs font-bold text-[#475569] hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-[#2454AB] px-4 text-xs font-bold text-white hover:bg-[#1C4796] cursor-pointer"
                >
                  Simpan Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
