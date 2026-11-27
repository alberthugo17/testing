import {useState, type FormEvent} from 'react';
import {Check, Copy, FileText, Lock, Plus, X} from 'lucide-react';
import type {BnccEvent, MouTemplate, PartnerRecord, UserAccount} from '../../types/database';
import {getRolePermissions} from '../../utils/auth';
import {renderMouDocument} from '../../utils/pipeline';

interface MouTemplatesViewProps {
  currentUser: UserAccount;
  activeEvent: BnccEvent;
  templates: MouTemplate[];
  acceptedPartners: PartnerRecord[];
  onCreateTemplate: (template: MouTemplate) => void;
  onUpdateTemplate: (template: MouTemplate) => void;
  onFinalizeMou: (partnerId: string, templateId: string) => void;
}

const DEFAULT_MOU_SKELETON = `PERJANJIAN KERJA SAMA {{event}}

Tanggal: {{tanggal}}
Perusahaan: {{nama_company}}
Contact Person: {{cp}} ({{jabatan_cp}})
Paket & Nilai: {{nilai}}

Daftar Benefit:
{{benefit}}`;

export function MouTemplatesView({
  currentUser,
  activeEvent,
  templates,
  acceptedPartners,
  onCreateTemplate,
  onUpdateTemplate,
  onFinalizeMou,
}: MouTemplatesViewProps) {
  const permissions = getRolePermissions(currentUser);

  const [editingTemplate, setEditingTemplate] = useState<MouTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<MouTemplate['type']>('Sponsorship');
  const [formContent, setFormContent] = useState(DEFAULT_MOU_SKELETON);
  const [formError, setFormError] = useState<string | null>(null);

  const [docPartner, setDocPartner] = useState<PartnerRecord | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [copiedDoc, setCopiedDoc] = useState(false);

  const openCreateModal = () => {
    setFormTitle('');
    setFormType('Sponsorship');
    setFormContent(DEFAULT_MOU_SKELETON);
    setFormError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (tpl: MouTemplate) => {
    setEditingTemplate(tpl);
    setFormTitle(tpl.title);
    setFormType(tpl.type);
    setFormContent(tpl.content);
    setFormError(null);
  };

  const openDocumentModal = (partner: PartnerRecord) => {
    const preferredTemplate =
      templates.find((t) => t.id === partner.mouTemplateId) ??
      templates.find((t) =>
        partner.category === 'Sponsor'
          ? t.type === 'Sponsorship'
          : t.type === 'Media Partner / Komunitas'
      ) ??
      templates[0];
    setDocPartner(partner);
    setSelectedTemplateId(preferredTemplate?.id ?? '');
    setCopiedDoc(false);
  };

  const handleSaveTemplate = (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      setFormError('Judul dan isi template MoU wajib diisi.');
      return;
    }

    const updatedStamp = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date());

    if (editingTemplate) {
      onUpdateTemplate({
        ...editingTemplate,
        title: formTitle.trim(),
        type: formType,
        content: formContent,
        updatedAt: updatedStamp,
      });
      setEditingTemplate(null);
    } else {
      onCreateTemplate({
        id: `mou-${Date.now()}`,
        eventId: activeEvent.id,
        title: formTitle.trim(),
        type: formType,
        updatedAt: updatedStamp,
        content: formContent,
      });
      setShowCreateModal(false);
    }
  };

  const activeDocTemplate =
    templates.find((t) => t.id === selectedTemplateId) ?? templates[0];

  const renderedDocumentText =
    docPartner && activeDocTemplate
      ? renderMouDocument(
          activeDocTemplate,
          docPartner,
          activeEvent,
          permissions.canViewSponsorshipValue
        )
      : '';

  const handleCopyDocument = async () => {
    if (!renderedDocumentText) return;
    try {
      await navigator.clipboard.writeText(renderedDocumentText);
      setCopiedDoc(true);
      setTimeout(() => setCopiedDoc(false), 2000);
    } catch {
      // Ignore clipboard permission errors in sandboxed iframes
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-2xl border border-[#83B1EC]/70 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0755B1]">
              Template MoU Event — {activeEvent.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
              Kelola naskah MoU per event dengan placeholder otomatis
            </p>
          </div>

          {permissions.canManageMouTemplates && (
            <button
              type="button"
              onClick={openCreateModal}
              data-testid="create-mou-template-button"
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#0F52BA] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#2454AB] cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Template MoU Baru</span>
            </button>
          )}
        </div>
      </section>

      {/* Auto-Generate MoU for Accepted Partners */}
      <section className="rounded-2xl border border-[#83B1EC]/70 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#1E1E1E]">
              Generate MoU Otomatis (Partner Accepted)
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Isikan data nama company, CP, grade, dan daftar benefit secara otomatis ke template
            </p>
          </div>
          <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 tabular-nums">
            {acceptedPartners.length} Partner Accepted
          </span>
        </div>

        {acceptedPartners.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FBFF] px-4 py-6 text-center text-xs font-medium text-[#64748B]">
            Belum ada perusahaan berstatus Accepted pada event ini.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {acceptedPartners.map((partner) => (
              <div
                key={partner.id}
                className="flex flex-col gap-3 rounded-xl border border-[#CBD5E1] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1E1E1E]">
                    {partner.companyName}
                  </p>
                  <p className="mt-0.5 text-xs text-[#64748B]">
                    CP: <span className="font-semibold text-[#1E1E1E]">{partner.contactPerson.name}</span>
                    <span className="mx-1.5">•</span>
                    Status MoU:{' '}
                    <span
                      className={`font-bold ${
                        partner.mouStatus === 'Selesai'
                          ? 'text-emerald-700'
                          : 'text-[#2454AB]'
                      }`}
                    >
                      {partner.mouStatus}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openDocumentModal(partner)}
                  data-testid={`generate-mou-${partner.id}`}
                  className="inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-lg bg-[#16A34A] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#15803D] cursor-pointer"
                >
                  {partner.mouStatus === 'Selesai' ? 'Lihat MoU' : 'Buat MoU'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Template List */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {templates.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-[#83B1EC] bg-white p-8 text-center text-sm text-[#64748B]">
            Belum ada template MoU untuk event {activeEvent.name}.
            {permissions.canManageMouTemplates &&
              ' Klik "+ Template MoU Baru" untuk menambahkan template pertama.'}
          </div>
        ) : (
          templates.map((tpl) => (
            <article
              key={tpl.id}
              className="flex flex-col rounded-2xl border border-[#83B1EC]/70 bg-white p-5 sm:p-6 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex rounded-md bg-[#E6F0FD] px-2.5 py-0.5 text-[11px] font-bold text-[#2454AB]">
                    {tpl.type}
                  </span>
                  <h3 className="mt-2 text-base font-extrabold text-[#1E1E1E]">
                    {tpl.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#64748B]">
                    Diperbarui: {tpl.updatedAt}
                  </p>
                </div>

                {permissions.canManageMouTemplates && (
                  <button
                    type="button"
                    onClick={() => openEditModal(tpl)}
                    className="inline-flex min-h-[36px] shrink-0 items-center rounded-lg border border-[#83B1EC] bg-white px-3 py-1 text-xs font-bold text-[#2454AB] hover:bg-[#E6F0FD] cursor-pointer"
                  >
                    Edit Template
                  </button>
                )}
              </div>

              <pre className="mt-4 flex-1 overflow-x-auto whitespace-pre-wrap rounded-xl border border-[#E2E8F0] bg-[#F8FBFF] p-4 font-mono text-[11px] leading-relaxed text-[#334155]">
                {tpl.content}
              </pre>
            </article>
          ))
        )}
      </section>

      {/* Modal: Create / Edit Template (Manager Only) */}
      {(showCreateModal || editingTemplate) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mou-template-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#83B1EC] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 id="mou-template-modal-title" className="text-lg font-extrabold text-[#2454AB]">
                {editingTemplate ? 'Edit Template MoU' : 'Buat Template MoU Baru'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                }}
                aria-label="Tutup modal"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#E6F0FD] cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="mt-4 space-y-4">
              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="mou-title" className="block text-xs font-bold text-[#1E1E1E]">
                    Judul Template <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    id="mou-title"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Template MoU Sponsorship Utama"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#CBD5E1] px-3 text-sm focus:border-[#2454AB] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="mou-type" className="block text-xs font-bold text-[#1E1E1E]">
                    Tipe
                  </label>
                  <select
                    id="mou-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as MouTemplate['type'])}
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm focus:border-[#2454AB] focus:outline-none"
                  >
                    <option value="Sponsorship">Sponsorship</option>
                    <option value="Media Partner / Komunitas">Media Partner / Komunitas</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="mou-content" className="block text-xs font-bold text-[#1E1E1E]">
                  Isi Naskah Template (Placeholder: {'{{event}}'}, {'{{nama_company}}'}, {'{{cp}}'}, {'{{nilai}}'}, {'{{benefit}}'})
                </label>
                <textarea
                  id="mou-content"
                  rows={11}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#CBD5E1] p-3.5 font-mono text-xs leading-relaxed text-[#1E1E1E] focus:border-[#2454AB] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="min-h-[40px] rounded-xl border border-[#CBD5E1] px-4 text-xs font-bold text-[#475569] hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-[#0F52BA] px-5 text-xs font-bold text-white hover:bg-[#2454AB] cursor-pointer"
                >
                  Simpan Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dokumen MoU — [Company] */}
      {docPartner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-mou-title"
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#83B1EC] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[#E6F0FD] pb-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-[#2454AB]" aria-hidden="true" />
                <h3 id="doc-mou-title" className="text-lg font-extrabold text-[#2454AB]">
                  Dokumen MoU — {docPartner.companyName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDocPartner(null)}
                aria-label="Tutup dokumen MoU"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#E6F0FD] cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* Left Sidebar Info */}
              <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-[#F8FBFF] p-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    Pilih Template Event
                  </p>
                  <div className="mt-2 space-y-2">
                    {templates.length === 0 ? (
                      <p className="text-xs text-[#64748B]">Tidak ada template pada event ini.</p>
                    ) : (
                      templates.map((tpl) => {
                        const isSelected = tpl.id === activeDocTemplate?.id;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(tpl.id)}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-[#2454AB] bg-[#E6F0FD] text-[#0755B1]'
                                : 'border-[#CBD5E1] bg-white text-[#475569] hover:border-[#83B1EC]'
                            }`}
                          >
                            {tpl.title}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-[#E2E8F0] pt-3 text-xs">
                  <div>
                    <p className="text-[#64748B]">Perusahaan:</p>
                    <p className="font-bold text-[#1E1E1E]">{docPartner.companyName}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Contact Person:</p>
                    <p className="font-bold text-[#1E1E1E]">{docPartner.contactPerson.name}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Paket / Grade:</p>
                    <p className="font-bold text-[#1E1E1E]">{docPartner.grade}</p>
                  </div>
                  {!permissions.canViewSponsorshipValue && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] font-semibold text-amber-800 flex items-start gap-1.5">
                      <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Nominal MoU disamarkan untuk akun Staff EEO.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Naskah MoU */}
              <div className="md:col-span-2 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-extrabold text-[#1E1E1E]">Naskah MoU</p>
                  <button
                    type="button"
                    onClick={handleCopyDocument}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] px-2.5 py-1 text-[11px] font-bold text-[#2454AB] hover:bg-[#E6F0FD] cursor-pointer"
                  >
                    {copiedDoc ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Salin Naskah</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="flex-1 whitespace-pre-wrap rounded-xl border border-[#CBD5E1] bg-white p-4 font-mono text-xs leading-relaxed text-[#1E1E1E] max-h-[420px] overflow-y-auto">
                  {renderedDocumentText || 'Pilih atau buat template MoU terlebih dahulu.'}
                </pre>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6F0FD] pt-4">
              <button
                type="button"
                onClick={() => setDocPartner(null)}
                className="min-h-[40px] rounded-xl border border-[#CBD5E1] px-4 text-xs font-bold text-[#475569] hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>

              {permissions.canFinalizeMou && activeDocTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    onFinalizeMou(docPartner.id, activeDocTemplate.id);
                    setDocPartner(null);
                  }}
                  data-testid="finalize-mou-button"
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#16A34A] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#15803D] cursor-pointer"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>Tandai MoU Selesai</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
