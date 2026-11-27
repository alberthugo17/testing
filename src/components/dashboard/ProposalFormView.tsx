import {useState, type FormEvent} from 'react';
import {AlertCircle} from 'lucide-react';
import type {PartnerCategory, PartnerRecord} from '../../types/database';
import {computeAutoDeadlines} from '../../utils/pipeline';

interface ProposalFormViewProps {
  activeEventId: string;
  activeEventName: string;
  defaultPic: string;
  onCancel: () => void;
  onSaveProposal: (partner: PartnerRecord) => void;
}

export function ProposalFormView({
  activeEventId,
  activeEventName,
  defaultPic,
  onCancel,
  onSaveProposal,
}: ProposalFormViewProps) {
  const today = new Date().toISOString().slice(0, 10);
  const initialDeadlines = computeAutoDeadlines(today);

  const [companyName, setCompanyName] = useState('');
  const [contactPersonRaw, setContactPersonRaw] = useState('');
  const [proposalSentAt, setProposalSentAt] = useState(today);
  const [picInternal, setPicInternal] = useState(defaultPic);
  const [category, setCategory] = useState<PartnerCategory>('Sponsor');
  const [cpRole, setCpRole] = useState('');
  const [cpNotes, setCpNotes] = useState('');
  const [deadlineD3, setDeadlineD3] = useState(initialDeadlines.deadlineD3);
  const [deadlineD7, setDeadlineD7] = useState(initialDeadlines.deadlineD7);
  const [error, setError] = useState<string | null>(null);

  const handleDateChange = (nextDate: string) => {
    setProposalSentAt(nextDate);
    const computed = computeAutoDeadlines(nextDate);
    if (computed.deadlineD3) setDeadlineD3(computed.deadlineD3);
    if (computed.deadlineD7) setDeadlineD7(computed.deadlineD7);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanCompany = companyName.trim();
    const cleanCp = contactPersonRaw.trim();
    const cleanPic = picInternal.trim();

    if (!cleanCompany || !cleanCp || !proposalSentAt || !cleanPic) {
      setError('Mohon lengkapi semua kolom bertanda bintang (*).');
      return;
    }

    const parts = cleanCp.split(/[-–/]/).map((s) => s.trim()).filter(Boolean);
    const cpName = parts[0] || cleanCp;
    const cpContact = parts.slice(1).join(' / ') || 'Kontak via Email/WA';

    const newPartner: PartnerRecord = {
      id: `ptr-${Date.now()}`,
      companyName: cleanCompany,
      category,
      eventId: activeEventId,
      picInternal: cleanPic,
      contactPerson: {
        name: cpName,
        role: cpRole.trim() || 'PIC Partnership',
        contact: cpContact,
        isAvailable: true,
        notes: cpNotes.trim() || 'Input melalui form cepat proposal baru.',
        lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
      },
      currentStep: 1,
      pipelineStatus: 'Follow up H+3',
      result: 'Pending',
      proposalSentAt,
      deadlineD3,
      deadlineD7,
      followUpStage: 'Follow-up H+3',
      isFollowUpDone: false,
      grade: 'None',
      sponsorshipValue: 0,
      declineReason: '',
      mouStatus: 'Belum Dibuat',
      mouTemplateId: '',
      meetingSummary: '',
      benefits: [],
      meetings: [],
      history: [
        {
          id: `hist-${Date.now()}`,
          title: 'Proposal Terkirim',
          detail: `Proposal paket ${category.toLowerCase()} ${activeEventName} dicatat oleh ${cleanPic}.`,
          timestamp: `${proposalSentAt} 09:00 WIB`,
        },
      ],
    };

    onSaveProposal(newPartner);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-2xl border border-[#83B1EC]/80 bg-white p-6 sm:p-8 shadow-[0_6px_20px_rgba(36,84,171,0.08)]">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#2454AB]">
          Input Proposal Baru
        </h1>
        <p className="mt-1 text-xs text-[#64748B]">
          Event aktif: <span className="font-bold text-[#1E1E1E]">{activeEventName}</span> · Reminder D+3 dan D+7 otomatis dihitung dari tanggal kirim proposal.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="proposal-company" className="block text-xs font-bold text-[#1E1E1E]">
              Nama Company <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="proposal-company"
              type="text"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Contoh: PT Indofood Sukses Makmur Tbk"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#83B1EC]/70 bg-white px-3.5 text-sm text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none focus:ring-2 focus:ring-[#83B1EC]/40"
            />
          </div>

          <div>
            <label htmlFor="proposal-cp" className="block text-xs font-bold text-[#1E1E1E]">
              Contact Person (CP) <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="proposal-cp"
              type="text"
              value={contactPersonRaw}
              onChange={(e) => {
                setContactPersonRaw(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Contoh: Rina Wijaya - 0812-8899-1122 / rina@company.co.id"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#83B1EC]/70 bg-white px-3.5 text-sm text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none focus:ring-2 focus:ring-[#83B1EC]/40"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="proposal-date" className="block text-xs font-bold text-[#1E1E1E]">
                Tanggal Kirim Proposal <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="proposal-date"
                type="date"
                value={proposalSentAt}
                onChange={(e) => handleDateChange(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#83B1EC]/70 bg-white px-3.5 text-sm tabular-nums text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none focus:ring-2 focus:ring-[#83B1EC]/40"
              />
            </div>

            <div>
              <label htmlFor="proposal-pic" className="block text-xs font-bold text-[#1E1E1E]">
                PIC Internal <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="proposal-pic"
                type="text"
                value={picInternal}
                onChange={(e) => {
                  setPicInternal(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Nama staf / pengurus EEO"
                className="mt-1.5 h-11 w-full rounded-xl border border-[#83B1EC]/70 bg-white px-3.5 text-sm text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none focus:ring-2 focus:ring-[#83B1EC]/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="proposal-category" className="block text-xs font-bold text-[#1E1E1E]">
                Kategori Partner
              </label>
              <select
                id="proposal-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as PartnerCategory)}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#83B1EC]/70 bg-white px-3.5 text-sm text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none focus:ring-2 focus:ring-[#83B1EC]/40"
              >
                <option value="Sponsor">Sponsor</option>
                <option value="Media Partner">Media Partner</option>
                <option value="Komunitas">Komunitas</option>
              </select>
            </div>

            <div>
              <label htmlFor="proposal-cp-role" className="block text-xs font-bold text-[#1E1E1E]">
                Jabatan CP
              </label>
              <input
                id="proposal-cp-role"
                type="text"
                value={cpRole}
                onChange={(e) => setCpRole(e.target.value)}
                placeholder="Contoh: Brand Partnership Manager"
                className="mt-1.5 h-11 w-full rounded-xl border border-[#83B1EC]/70 bg-white px-3.5 text-sm text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none focus:ring-2 focus:ring-[#83B1EC]/40"
              />
            </div>
          </div>

          <div>
            <label htmlFor="proposal-notes" className="block text-xs font-bold text-[#1E1E1E]">
              Catatan CP
            </label>
            <input
              id="proposal-notes"
              type="text"
              value={cpNotes}
              onChange={(e) => setCpNotes(e.target.value)}
              placeholder="Contoh: Prefer follow-up via email setiap Selasa/Kamis"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#83B1EC]/70 bg-white px-3.5 text-sm text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none focus:ring-2 focus:ring-[#83B1EC]/40"
            />
          </div>

          <div className="rounded-xl border border-[#83B1EC]/60 bg-[#F8FBFF] p-4">
            <p className="text-xs font-extrabold tracking-wide uppercase text-[#2454AB]">
              SET DEADLINE FOLLOW UP
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="deadline-d3" className="block text-xs font-semibold text-[#1E1E1E]">
                  Deadline Follow Up D+3
                </label>
                <input
                  id="deadline-d3"
                  type="date"
                  value={deadlineD3}
                  onChange={(e) => setDeadlineD3(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#83B1EC]/70 bg-white px-3.5 text-sm tabular-nums text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="deadline-d7" className="block text-xs font-semibold text-[#1E1E1E]">
                  Deadline Follow Up D+7
                </label>
                <input
                  id="deadline-d7"
                  type="date"
                  value={deadlineD7}
                  onChange={(e) => setDeadlineD7(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#83B1EC]/70 bg-white px-3.5 text-sm tabular-nums text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] rounded-xl border border-[#CBD5E1] bg-white px-5 py-2 text-xs font-bold text-[#475569] hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              data-testid="submit-proposal-button"
              className="min-h-[44px] rounded-xl bg-[#0F52BA] px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#2454AB] cursor-pointer"
            >
              Simpan &amp; Buat Reminder Otomatis
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
