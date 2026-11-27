import {useState, type FormEvent} from 'react';
import {Check, Plus, X} from 'lucide-react';
import type {
  ContactPersonInfo,
  PartnerBenefit,
  PartnerGrade,
  PartnerMeeting,
  PartnerRecord,
  PartnerResult,
  UserAccount,
} from '../../types/database';
import {getRolePermissions} from '../../utils/auth';
import {PIPELINE_STEPS} from '../../utils/pipeline';

interface CompanyDetailModalProps {
  partner: PartnerRecord;
  currentUser: UserAccount;
  onClose: () => void;
  onSaveFollowUpProgress: (payload: {
    partnerId: string;
    nextStep: number;
    deadline: string;
    notes: string;
    markDone: boolean;
  }) => void;
  onAddMeetingSchedule: (payload: {
    partnerId: string;
    meeting: PartnerMeeting;
  }) => void;
  onSavePitchingGrading: (payload: {
    partnerId: string;
    meetingSummary: string;
    grade: PartnerGrade;
    sponsorshipValue: number;
    result: PartnerResult;
    declineReason: string;
    benefits: PartnerBenefit[];
  }) => void;
  onSubmitCpUpdate: (payload: {
    partnerId: string;
    newValue: Omit<ContactPersonInfo, 'lastUpdated'>;
  }) => {mode: 'direct' | 'approval-requested'; message: string};
}

type DetailTabId = 'followup' | 'meeting' | 'pitching';

export function CompanyDetailModal({
  partner,
  currentUser,
  onClose,
  onSaveFollowUpProgress,
  onAddMeetingSchedule,
  onSavePitchingGrading,
  onSubmitCpUpdate,
}: CompanyDetailModalProps) {
  const permissions = getRolePermissions(currentUser);
  const [activeTab, setActiveTab] = useState<DetailTabId>('followup');

  // Tab 1: Follow up state
  const [nextStep, setNextStep] = useState<number>(
    Math.min(partner.currentStep + 1, 9)
  );
  const [deadline, setDeadline] = useState<string>(
    partner.deadlineD7 || partner.deadlineD3 || new Date().toISOString().slice(0, 10)
  );
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [markDone, setMarkDone] = useState(partner.isFollowUpDone);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  // Tab 2: Meeting Schedule state
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingTime, setMeetingTime] = useState('13:00');
  const [meetingMethod, setMeetingMethod] = useState<'Online' | 'Offline'>('Online');
  const [meetingAddress, setMeetingAddress] = useState('https://meet.google.com/');
  const [meetingParticipants, setMeetingParticipants] = useState('');
  const [meetingError, setMeetingError] = useState<string | null>(null);

  // Tab 3: Pitching & Grading state (Manager Only)
  const [meetingSummary, setMeetingSummary] = useState(partner.meetingSummary);
  const [grade, setGrade] = useState<PartnerGrade>(partner.grade);
  const [sponsorshipValue, setSponsorshipValue] = useState(
    String(partner.sponsorshipValue || 0)
  );
  const [result, setResult] = useState<PartnerResult>(partner.result);
  const [declineReason, setDeclineReason] = useState(partner.declineReason);
  const [benefits, setBenefits] = useState<PartnerBenefit[]>(partner.benefits);
  const [newBenefitLabel, setNewBenefitLabel] = useState('');
  const [pitchingError, setPitchingError] = useState<string | null>(null);

  // CP Modal / Inline Editor
  const [showCpForm, setShowCpForm] = useState(false);
  const [cpName, setCpName] = useState(partner.contactPerson.name);
  const [cpRole, setCpRole] = useState(partner.contactPerson.role);
  const [cpContact, setCpContact] = useState(partner.contactPerson.contact);
  const [cpAvailable, setCpAvailable] = useState(partner.contactPerson.isAvailable);
  const [cpNotes, setCpNotes] = useState(partner.contactPerson.notes);
  const [cpFeedback, setCpFeedback] = useState<string | null>(null);

  const activeStepMeta =
    PIPELINE_STEPS.find((s) => s.step === partner.currentStep) ?? PIPELINE_STEPS[0];

  const handleFollowUpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!followUpNotes.trim()) {
      setFollowUpError('Catatan progress follow-up wajib diisi.');
      return;
    }
    onSaveFollowUpProgress({
      partnerId: partner.id,
      nextStep,
      deadline,
      notes: followUpNotes.trim(),
      markDone,
    });
    setFollowUpNotes('');
    setFollowUpError(null);
  };

  const handleMeetingSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!meetingDate || !meetingTime || !meetingAddress.trim()) {
      setMeetingError('Tanggal, jam, dan alamat/link meeting wajib diisi.');
      return;
    }
    onAddMeetingSchedule({
      partnerId: partner.id,
      meeting: {
        id: `mtg-${Date.now()}`,
        date: meetingDate,
        time: meetingTime,
        method: meetingMethod,
        address: meetingAddress.trim(),
        participants: meetingParticipants.trim() || `${partner.picInternal}, ${partner.contactPerson.name}`,
      },
    });
    setMeetingParticipants('');
    setMeetingError(null);
  };

  const handleAddBenefit = () => {
    const label = newBenefitLabel.trim();
    if (!label) return;
    setBenefits((prev) => [
      ...prev,
      {id: `ben-${Date.now()}`, label, fulfilled: false},
    ]);
    setNewBenefitLabel('');
  };

  const handlePitchingSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (result === 'Decline' && !declineReason.trim()) {
      setPitchingError('Alasan penolakan wajib dicatat jika hasil adalah Decline.');
      return;
    }
    const numericVal = Number(sponsorshipValue.replace(/[^\d]/g, '')) || 0;
    onSavePitchingGrading({
      partnerId: partner.id,
      meetingSummary: meetingSummary.trim(),
      grade,
      sponsorshipValue: numericVal,
      result,
      declineReason: result === 'Decline' ? declineReason.trim() : '',
      benefits,
    });
    setPitchingError(null);
  };

  const handleCpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!cpName.trim() || !cpContact.trim()) return;
    const response = onSubmitCpUpdate({
      partnerId: partner.id,
      newValue: {
        name: cpName.trim(),
        role: cpRole.trim() || 'PIC Partnership',
        contact: cpContact.trim(),
        isAvailable: cpAvailable,
        notes: cpNotes.trim(),
      },
    });
    setCpFeedback(response.message);
    setShowCpForm(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 sm:p-5 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-detail-title"
      data-testid="company-detail-modal"
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#83B1EC] bg-[#EEF5FF] shadow-2xl">
        {/* Top Blue Banner Header */}
        <div className="bg-[#0755B1] px-5 py-5 sm:px-7 text-white flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 id="company-detail-title" className="text-xl sm:text-2xl font-extrabold">
                {partner.companyName}
              </h2>
              <span className="rounded-md bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                {partner.category}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-blue-100">
              {partner.pipelineStatus} · PIC EEO: {partner.picInternal}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail perusahaan"
            data-testid="close-company-detail"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {/* 9-Step Timeline Progress */}
          <section className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-[#83B1EC]/50">
            <p className="text-xs font-extrabold tracking-wider uppercase text-[#0755B1]">
              TIMELINE PROGRESS
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
              {PIPELINE_STEPS.map((item) => {
                const isCurrent = item.step === partner.currentStep;
                const isDone = item.step < partner.currentStep;
                return (
                  <div
                    key={item.step}
                    className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center transition-colors ${
                      isCurrent
                        ? 'border-[#1D56B3] bg-[#1D56B3] text-white shadow-sm'
                        : isDone
                        ? 'border-[#83B1EC] bg-[#E6F0FD] text-[#0755B1]'
                        : 'border-[#E2E8F0] bg-[#F8FBFF] text-[#475569]'
                    }`}
                  >
                    <span className="text-sm font-extrabold tabular-nums">{item.step}</span>
                    <span className="mt-1 text-[10px] font-semibold leading-tight">
                      {item.shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tabs Navigation (RBAC: Manager sees 3 tabs, Staff sees 2 tabs) */}
          <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-xs border border-[#83B1EC]/50">
            <div
              role="tablist"
              aria-label="Detail Pipeline Perusahaan"
              className="flex flex-wrap border-b border-[#E2E8F0] gap-2 sm:gap-6"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'followup'}
                onClick={() => setActiveTab('followup')}
                data-testid="tab-followup"
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'followup'
                    ? 'border-[#0755B1] text-[#0755B1]'
                    : 'border-transparent text-[#64748B] hover:text-[#1E1E1E]'
                }`}
              >
                1. Follow Up &amp; Progres
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'meeting'}
                onClick={() => setActiveTab('meeting')}
                data-testid="tab-meeting"
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'meeting'
                    ? 'border-[#0755B1] text-[#0755B1]'
                    : 'border-transparent text-[#64748B] hover:text-[#1E1E1E]'
                }`}
              >
                2. Meeting Schedule ({partner.meetings.length})
              </button>

              {permissions.canEditPitchingGrading && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'pitching'}
                  onClick={() => setActiveTab('pitching')}
                  data-testid="tab-pitching"
                  className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'pitching'
                      ? 'border-[#0755B1] text-[#0755B1]'
                      : 'border-transparent text-[#64748B] hover:text-[#1E1E1E]'
                  }`}
                >
                  3. Pitching &amp; Grading
                </button>
              )}
            </div>

            {/* Tab 1: Follow Up & Progres */}
            {activeTab === 'followup' && (
              <div className="mt-5 space-y-5">
                <form
                  onSubmit={handleFollowUpSubmit}
                  className="rounded-xl border border-[#83B1EC]/70 bg-[#E6F0FD]/55 p-4 sm:p-5 space-y-4"
                >
                  <h3 className="text-sm font-extrabold text-[#0755B1]">
                    Update Progress
                  </h3>

                  <label className="flex items-center gap-2.5 rounded-xl border border-[#83B1EC]/60 bg-white px-3.5 py-2.5 text-xs font-bold text-[#0755B1] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={markDone}
                      onChange={(e) => setMarkDone(e.target.checked)}
                      className="h-4 w-4 accent-[#2454AB]"
                    />
                    <span>
                      Current Progres : {activeStepMeta.fullLabel} ({markDone ? 'Done' : 'On Progress'})
                    </span>
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="followup-next-step" className="block text-xs font-bold text-[#1E1E1E]">
                        Next Step
                      </label>
                      <select
                        id="followup-next-step"
                        value={nextStep}
                        onChange={(e) => setNextStep(Number(e.target.value))}
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none"
                      >
                        {PIPELINE_STEPS.map((s) => (
                          <option key={s.step} value={s.step}>
                            {s.step}. {s.fullLabel}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="followup-deadline" className="block text-xs font-bold text-[#1E1E1E]">
                        Deadline
                      </label>
                      <input
                        id="followup-deadline"
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs tabular-nums text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="followup-notes" className="block text-xs font-bold text-[#1E1E1E]">
                      Catatan Progress Follow Up <span className="text-[#DC2626]">*</span>
                    </label>
                    <textarea
                      id="followup-notes"
                      rows={3}
                      value={followUpNotes}
                      onChange={(e) => {
                        setFollowUpNotes(e.target.value);
                        if (followUpError) setFollowUpError(null);
                      }}
                      placeholder="Catatan hasil follow up terakhir...."
                      className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] bg-white p-3 text-xs text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none"
                    />
                    {followUpError && (
                      <p className="mt-1 text-xs font-semibold text-[#DC2626]">
                        {followUpError}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="min-h-[38px] rounded-xl bg-[#0F52BA] px-5 py-2 text-xs font-bold text-white hover:bg-[#2454AB] cursor-pointer"
                    >
                      Simpan Progress
                    </button>
                  </div>
                </form>

                {/* Activity History */}
                <div>
                  <h4 className="text-[11px] font-extrabold tracking-wider uppercase text-[#64748B]">
                    RIWAYAT AKTIVITAS
                  </h4>
                  <div className="mt-2.5 space-y-2">
                    {partner.history.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-xl border border-[#83B1EC]/50 bg-[#E6F0FD]/55 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-extrabold text-[#0755B1]">{h.title}</p>
                          <span className="text-[11px] tabular-nums text-[#64748B]">
                            {h.timestamp}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#334155]">{h.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Meeting Schedule */}
            {activeTab === 'meeting' && (
              <div className="mt-5 space-y-5">
                <form
                  onSubmit={handleMeetingSubmit}
                  className="rounded-xl border border-[#83B1EC]/70 bg-[#E6F0FD]/55 p-4 sm:p-5 space-y-4"
                >
                  <h3 className="text-sm font-extrabold text-[#0755B1]">
                    New Schedule
                  </h3>

                  {meetingError && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-[#DC2626]">
                      {meetingError}
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="mtg-date" className="block text-xs font-bold text-[#1E1E1E]">
                        Date <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="mtg-date"
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs tabular-nums focus:border-[#2454AB] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="mtg-time" className="block text-xs font-bold text-[#1E1E1E]">
                        Time <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="mtg-time"
                        type="text"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        placeholder="13:00"
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs tabular-nums focus:border-[#2454AB] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <span className="block text-xs font-bold text-[#1E1E1E]">
                        Method <span className="text-[#DC2626]">*</span>
                      </span>
                      <div className="mt-1.5 grid grid-cols-2 overflow-hidden rounded-xl border border-[#CBD5E1] bg-white">
                        <label className="flex h-10 items-center justify-center gap-2 text-xs font-semibold cursor-pointer border-r border-[#CBD5E1]">
                          <input
                            type="radio"
                            name="meeting-method"
                            checked={meetingMethod === 'Online'}
                            onChange={() => setMeetingMethod('Online')}
                            className="accent-[#2454AB]"
                          />
                          <span>Online</span>
                        </label>
                        <label className="flex h-10 items-center justify-center gap-2 text-xs font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name="meeting-method"
                            checked={meetingMethod === 'Offline'}
                            onChange={() => setMeetingMethod('Offline')}
                            className="accent-[#2454AB]"
                          />
                          <span>Offline</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="mtg-address" className="block text-xs font-bold text-[#1E1E1E]">
                        Address <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="mtg-address"
                        type="text"
                        value={meetingAddress}
                        onChange={(e) => setMeetingAddress(e.target.value)}
                        placeholder="https://meet.google.com/..."
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs focus:border-[#2454AB] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="mtg-participants" className="block text-xs font-bold text-[#1E1E1E]">
                      Participants
                    </label>
                    <textarea
                      id="mtg-participants"
                      rows={2}
                      value={meetingParticipants}
                      onChange={(e) => setMeetingParticipants(e.target.value)}
                      placeholder="Daftar peserta meeting dari EEO & partner..."
                      className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] bg-white p-3 text-xs focus:border-[#2454AB] focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="min-h-[38px] rounded-xl bg-[#0F52BA] px-5 py-2 text-xs font-bold text-white hover:bg-[#2454AB] cursor-pointer"
                    >
                      Simpan Progress
                    </button>
                  </div>
                </form>

                <div>
                  <h4 className="text-[11px] font-extrabold tracking-wider uppercase text-[#64748B]">
                    MEETING LIST
                  </h4>
                  {partner.meetings.length === 0 ? (
                    <div className="mt-2.5 rounded-xl border border-[#83B1EC]/50 bg-[#E6F0FD]/55 px-4 py-4 text-xs text-[#64748B]">
                      No meeting has been conduct or planned yet..
                    </div>
                  ) : (
                    <div className="mt-2.5 space-y-2.5">
                      {partner.meetings.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-xl border border-[#83B1EC]/60 bg-[#F8FBFF] p-3.5 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-[#0755B1] tabular-nums">
                              {m.date} · {m.time} WIB
                            </span>
                            <span className="rounded-md bg-[#E6F0FD] px-2 py-0.5 text-[10px] font-bold text-[#2454AB]">
                              {m.method}
                            </span>
                          </div>
                          <p className="mt-1 text-[#1E1E1E]">{m.address}</p>
                          <p className="mt-0.5 text-[11px] text-[#64748B]">
                            Peserta: {m.participants}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Pitching & Grading (Manager Only) */}
            {activeTab === 'pitching' && permissions.canEditPitchingGrading && (
              <form
                onSubmit={handlePitchingSubmit}
                className="mt-5 rounded-xl border border-[#83B1EC]/70 bg-[#E6F0FD]/55 p-4 sm:p-5 space-y-4"
              >
                <h3 className="text-sm font-extrabold text-[#0755B1]">
                  Summary &amp; Grading
                </h3>

                {pitchingError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-[#DC2626]">
                    {pitchingError}
                  </p>
                )}

                <div>
                  <label htmlFor="pitch-summary" className="block text-xs font-bold text-[#1E1E1E]">
                    Meeting Summary
                  </label>
                  <textarea
                    id="pitch-summary"
                    rows={3}
                    value={meetingSummary}
                    onChange={(e) => setMeetingSummary(e.target.value)}
                    placeholder="Catatan hasil meeting terakhir...."
                    className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] bg-white p-3 text-xs focus:border-[#2454AB] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="pitch-grade" className="block text-xs font-bold text-[#1E1E1E]">
                      Grade
                    </label>
                    <select
                      id="pitch-grade"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value as PartnerGrade)}
                      className="mt-1.5 h-10 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-semibold focus:border-[#2454AB] focus:outline-none"
                    >
                      <option value="None">None</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                      <option value="Platinum">Platinum</option>
                      <option value="Media Partner">Media Partner</option>
                      <option value="Komunitas">Komunitas</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="pitch-value" className="block text-xs font-bold text-[#1E1E1E]">
                      Nominal Sponsorship (Rp)
                    </label>
                    <input
                      id="pitch-value"
                      type="number"
                      min={0}
                      step={500000}
                      value={sponsorshipValue}
                      onChange={(e) => setSponsorshipValue(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs tabular-nums focus:border-[#2454AB] focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-[#1E1E1E]">Result</span>
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      {(['Pending', 'Accept', 'Decline'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setResult(r)}
                          className={`h-10 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                            result === r
                              ? r === 'Accept'
                                ? 'border-[#16A34A] bg-[#16A34A] text-white'
                                : r === 'Decline'
                                ? 'border-[#DC2626] bg-[#DC2626] text-white'
                                : 'border-[#0F52BA] bg-[#0F52BA] text-white'
                              : 'border-[#CBD5E1] bg-white text-[#475569] hover:border-[#83B1EC]'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {result === 'Decline' && (
                  <div>
                    <label htmlFor="pitch-decline-reason" className="block text-xs font-bold text-[#DC2626]">
                      Alasan Penolakan (Wajib dicatat) *
                    </label>
                    <input
                      id="pitch-decline-reason"
                      type="text"
                      value={declineReason}
                      onChange={(e) => {
                        setDeclineReason(e.target.value);
                        if (pitchingError) setPitchingError(null);
                      }}
                      placeholder="Contoh: Budget kuartal belum tersedia / tidak sesuai target audiens"
                      className="mt-1.5 h-10 w-full rounded-xl border border-red-300 bg-white px-3 text-xs focus:border-[#DC2626] focus:outline-none"
                    />
                  </div>
                )}

                {/* Benefit Checklist */}
                <div className="rounded-xl border border-[#83B1EC]/60 bg-white p-3.5">
                  <p className="text-xs font-bold text-[#1E1E1E]">
                    Checklist Benefit Sponsorship
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {benefits.map((b) => (
                      <label
                        key={b.id}
                        className="flex items-center gap-2 text-xs text-[#334155] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={b.fulfilled}
                          onChange={() =>
                            setBenefits((prev) =>
                              prev.map((item) =>
                                item.id === b.id
                                  ? {...item, fulfilled: !item.fulfilled}
                                  : item
                              )
                            )
                          }
                          className="h-4 w-4 accent-[#16A34A]"
                        />
                        <span className={b.fulfilled ? 'line-through text-[#64748B]' : ''}>
                          {b.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={newBenefitLabel}
                      onChange={(e) => setNewBenefitLabel(e.target.value)}
                      placeholder="Tambah poin benefit baru..."
                      className="h-9 flex-1 rounded-lg border border-[#CBD5E1] px-3 text-xs focus:border-[#2454AB] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddBenefit}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#83B1EC] bg-[#F8FBFF] px-3 text-xs font-bold text-[#2454AB] hover:bg-[#E6F0FD] cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="min-h-[38px] rounded-xl bg-[#0F52BA] px-5 py-2 text-xs font-bold text-white hover:bg-[#2454AB] cursor-pointer"
                  >
                    Simpan Progress
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Contact Person (CP) Card */}
          <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-xs border border-[#83B1EC]/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-[#0755B1]">
                Contact Person (CP)
              </h3>
              <button
                type="button"
                onClick={() => setShowCpForm((prev) => !prev)}
                data-testid="toggle-edit-cp-button"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-[#0F52BA] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#2454AB] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tambah/ edit CP</span>
              </button>
            </div>

            {cpFeedback && (
              <div
                data-testid="cp-feedback-banner"
                className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800"
              >
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{cpFeedback}</span>
              </div>
            )}

            {!showCpForm ? (
              <div className="mt-3 rounded-xl border border-[#83B1EC]/50 bg-[#E6F0FD]/55 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-[#0755B1]">
                      {partner.contactPerson.name}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      {partner.contactPerson.role}
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      partner.contactPerson.isAvailable
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {partner.contactPerson.isAvailable ? 'Available' : 'Tidak Aktif'}
                  </span>
                </div>
                <div className="mt-3 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-medium text-[#1E1E1E]">
                  {partner.contactPerson.contact}
                </div>
                {partner.contactPerson.notes && (
                  <p className="mt-2 text-[11px] text-[#475569]">
                    Catatan: {partner.contactPerson.notes}
                  </p>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleCpSubmit}
                className="mt-3 rounded-xl border border-[#83B1EC] bg-[#F8FBFF] p-4 space-y-3"
              >
                <p className="text-xs font-bold text-[#2454AB]">
                  {permissions.canDirectEditCp
                    ? 'Mode Manager: Perubahan CP langsung tersimpan ke database utama.'
                    : 'Mode Staff EEO: Perubahan CP akan dikirim ke antrean Persetujuan Edit Manager.'}
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cp-edit-name" className="block text-xs font-bold text-[#1E1E1E]">
                      Nama Contact Person *
                    </label>
                    <input
                      id="cp-edit-name"
                      type="text"
                      value={cpName}
                      onChange={(e) => setCpName(e.target.value)}
                      required
                      className="mt-1 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs focus:border-[#2454AB] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="cp-edit-role" className="block text-xs font-bold text-[#1E1E1E]">
                      Jabatan
                    </label>
                    <input
                      id="cp-edit-role"
                      type="text"
                      value={cpRole}
                      onChange={(e) => setCpRole(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs focus:border-[#2454AB] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cp-edit-contact" className="block text-xs font-bold text-[#1E1E1E]">
                      Kontak (WA / Email) *
                    </label>
                    <input
                      id="cp-edit-contact"
                      type="text"
                      value={cpContact}
                      onChange={(e) => setCpContact(e.target.value)}
                      required
                      className="mt-1 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs focus:border-[#2454AB] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="cp-edit-status" className="block text-xs font-bold text-[#1E1E1E]">
                      Ketersediaan CP
                    </label>
                    <select
                      id="cp-edit-status"
                      value={cpAvailable ? 'available' : 'inactive'}
                      onChange={(e) => setCpAvailable(e.target.value === 'available')}
                      className="mt-1 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs focus:border-[#2454AB] focus:outline-none"
                    >
                      <option value="available">Available</option>
                      <option value="inactive">Tidak Aktif</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="cp-edit-notes" className="block text-xs font-bold text-[#1E1E1E]">
                    Catatan CP
                  </label>
                  <input
                    id="cp-edit-notes"
                    type="text"
                    value={cpNotes}
                    onChange={(e) => setCpNotes(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs focus:border-[#2454AB] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCpForm(false)}
                    className="min-h-[36px] rounded-lg border border-[#CBD5E1] bg-white px-3.5 text-xs font-bold text-[#475569] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    data-testid="submit-cp-edit-button"
                    className="min-h-[36px] rounded-lg bg-[#0F52BA] px-4 text-xs font-bold text-white hover:bg-[#2454AB] cursor-pointer"
                  >
                    {permissions.canDirectEditCp
                      ? 'Simpan Perubahan CP'
                      : 'Ajukan Edit ke Manager'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
