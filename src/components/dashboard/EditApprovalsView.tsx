import {useState, type FormEvent} from 'react';
import {Check, X} from 'lucide-react';
import type {EditRequestRecord} from '../../types/database';

interface EditApprovalsViewProps {
  editRequests: EditRequestRecord[];
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string, reason: string) => void;
}

export function EditApprovalsView({
  editRequests,
  onApproveRequest,
  onRejectRequest,
}: EditApprovalsViewProps) {
  const [rejectingRequest, setRejectingRequest] = useState<EditRequestRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const pendingRequests = editRequests.filter((r) => r.status === 'Pending');
  const historyRequests = editRequests.filter((r) => r.status !== 'Pending');

  const handleConfirmReject = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = rejectionReason.trim();
    if (!cleaned) {
      setReasonError('Alasan penolakan wajib diisi untuk disampaikan ke Staff EEO.');
      return;
    }
    if (!rejectingRequest) return;
    onRejectRequest(rejectingRequest.id, cleaned);
    setRejectingRequest(null);
    setRejectionReason('');
    setReasonError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-2xl border border-[#83B1EC]/70 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0755B1]">
            Persetujuan Edit Data Staff
          </h1>
          <span
            data-testid="approvals-pending-pill"
            className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 tabular-nums"
          >
            {pendingRequests.length} Menunggu
          </span>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
          Bandingkan perubahan data Contact Person yang diajukan Staff sebelum diterapkan ke database utama.
        </p>
      </section>

      {/* Pending List */}
      {pendingRequests.length === 0 ? (
        <div className="rounded-2xl border border-[#CBD5E1] bg-white px-6 py-10 text-center text-sm font-medium text-[#64748B]">
          Tidak ada permintaan edit yang menunggu persetujuan pada event ini.
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((req) => (
            <article
              key={req.id}
              data-testid={`approval-card-${req.id}`}
              className="rounded-2xl border border-amber-300 bg-white p-5 sm:p-6 shadow-xs"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                      Pending
                    </span>
                    <span className="text-xs text-[#64748B] tabular-nums">
                      {req.submittedAt}
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-extrabold text-[#1E1E1E]">
                    <span className="text-[#0755B1]">{req.companyName}</span> — {req.requestTitle}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#64748B]">
                    Diajukan oleh: <span className="font-semibold text-[#1E1E1E]">{req.submittedBy}</span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingRequest(req);
                      setRejectionReason('');
                      setReasonError(null);
                    }}
                    data-testid={`reject-btn-${req.id}`}
                    className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-1.5 text-xs font-bold text-[#DC2626] transition-colors hover:bg-red-50 cursor-pointer"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => onApproveRequest(req.id)}
                    data-testid={`approve-btn-${req.id}`}
                    className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-lg bg-[#16A34A] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#15803D] cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Setujui &amp; Terapkan</span>
                  </button>
                </div>
              </div>

              {/* Side-by-side comparison */}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-red-200 bg-red-50/35 p-4">
                  <p className="text-[11px] font-extrabold tracking-wider uppercase text-[#DC2626]">
                    NILAI LAMA (SAAT INI)
                  </p>
                  <dl className="mt-2.5 space-y-1.5 text-xs">
                    <div>
                      <dt className="inline text-[#64748B]">Nama CP: </dt>
                      <dd className="inline font-semibold text-[#1E1E1E]">{req.oldValue.name}</dd>
                    </div>
                    <div>
                      <dt className="inline text-[#64748B]">Jabatan: </dt>
                      <dd className="inline font-semibold text-[#1E1E1E]">{req.oldValue.role}</dd>
                    </div>
                    <div>
                      <dt className="inline text-[#64748B]">Kontak: </dt>
                      <dd className="inline font-semibold text-[#1E1E1E]">{req.oldValue.contact}</dd>
                    </div>
                    <div>
                      <dt className="inline text-[#64748B]">Status: </dt>
                      <dd className="inline font-semibold text-[#1E1E1E]">
                        {req.oldValue.isAvailable ? 'Available' : 'Tidak Aktif'}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-[#64748B]">Catatan: </dt>
                      <dd className="inline text-[#475569]">{req.oldValue.notes || '-'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/45 p-4">
                  <p className="text-[11px] font-extrabold tracking-wider uppercase text-[#16A34A]">
                    NILAI BARU (DIAJUKAN STAFF)
                  </p>
                  <dl className="mt-2.5 space-y-1.5 text-xs">
                    <div>
                      <dt className="inline text-[#64748B]">Nama CP: </dt>
                      <dd className="inline font-semibold text-[#1E1E1E]">{req.newValue.name}</dd>
                    </div>
                    <div>
                      <dt className="inline text-[#64748B]">Jabatan: </dt>
                      <dd className="inline font-semibold text-[#1E1E1E]">{req.newValue.role}</dd>
                    </div>
                    <div>
                      <dt className="inline text-[#64748B]">Kontak: </dt>
                      <dd className="inline font-semibold text-[#1E1E1E]">{req.newValue.contact}</dd>
                    </div>
                    <div>
                      <dt className="inline text-[#64748B]">Status: </dt>
                      <dd className="inline font-semibold text-[#1E1E1E]">
                        {req.newValue.isAvailable ? 'Available' : 'Tidak Aktif'}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-[#64748B]">Catatan: </dt>
                      <dd className="inline text-[#475569]">{req.newValue.notes || '-'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Decision History */}
      <section className="rounded-2xl border border-[#CBD5E1] bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="text-xs font-extrabold tracking-wider uppercase text-[#64748B]">
          RIWAYAT KEPUTUSAN MANAGER
        </h2>

        {historyRequests.length === 0 ? (
          <p className="mt-3 text-xs text-[#64748B]">
            Belum ada riwayat keputusan persetujuan edit pada event ini.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {historyRequests.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FBFF] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1E1E1E]">
                    {item.companyName} — {item.requestTitle}{' '}
                    <span className="font-normal text-[#64748B]">
                      ({item.submittedBy})
                    </span>
                  </p>
                  {item.status === 'Rejected' && item.rejectionReason && (
                    <p className="mt-0.5 text-[11px] font-medium text-[#DC2626]">
                      Alasan ditolak: {item.rejectionReason}
                    </p>
                  )}
                </div>

                <span
                  className={`self-start sm:self-auto shrink-0 rounded-md px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                    item.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {item.status === 'Approved' ? 'DISETUJUI' : 'DITOLAK'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reject Reason Modal (matching Tombol Desktop 11.svg) */}
      {rejectingRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="reject-modal-title" className="text-base font-extrabold text-[#DC2626]">
                  Tolak Permintaan Edit
                </h3>
                <p className="mt-1 text-xs text-[#64748B]">
                  Alasan penolakan untuk{' '}
                  <span className="font-bold text-[#1E1E1E]">
                    {rejectingRequest.companyName}
                  </span>{' '}
                  akan dikirim ke Staff EEO.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                aria-label="Tutup modal penolakan"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="mt-4 space-y-4">
              <div>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (reasonError) setReasonError(null);
                  }}
                  placeholder="Tuliskan alasan penolakan..."
                  className="w-full rounded-xl border border-[#CBD5E1] p-3 text-xs text-[#1E1E1E] focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-red-200"
                />
                {reasonError && (
                  <p className="mt-1 text-xs font-semibold text-[#DC2626]">{reasonError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="min-h-[38px] rounded-xl border border-[#CBD5E1] px-4 text-xs font-bold text-[#475569] hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="confirm-reject-button"
                  className="min-h-[38px] rounded-xl bg-[#DC2626] px-4 text-xs font-bold text-white hover:bg-[#B91C1C] cursor-pointer"
                >
                  Tolak Permintaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
