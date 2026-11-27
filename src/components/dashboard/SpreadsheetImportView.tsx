import {useState, type ChangeEvent} from 'react';
import {CheckCircle2, FileSpreadsheet, Upload} from 'lucide-react';
import type {BnccEvent, PartnerRecord} from '../../types/database';
import {parseSpreadsheetInput, type ParsedImportRow} from '../../utils/pipeline';

interface SpreadsheetImportViewProps {
  activeEvent: BnccEvent;
  defaultPic: string;
  onImportPartners: (partners: PartnerRecord[]) => void;
}

const SAMPLE_SHEET_DATA = `PT Bukalapak.com\tSandy Wijaya\t0811-2233-4455 / sandy@bukalapak.com\tSponsor\tNadia Putri\t2026-11-28
Tech in Asia Indonesia\tSinta Dewi\t0822-3344-5566 / sinta@techinasia.com\tMedia Partner\tAlyssa Rahma\t2026-11-28
Google Developer Group Jakarta\tBimo Sakti\t0813-4455-6677 / bimo@gdgjakarta.org\tKomunitas\tRizky Pratama\t2026-11-29`;

export function SpreadsheetImportView({
  activeEvent,
  defaultPic,
  onImportPartners,
}: SpreadsheetImportViewProps) {
  const [rawInput, setRawInput] = useState(SAMPLE_SHEET_DATA);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>(() =>
    parseSpreadsheetInput(SAMPLE_SHEET_DATA)
  );
  const [importedNotice, setImportedNotice] = useState<string | null>(null);

  const validRows = parsedRows.filter((r) => r.valid);

  const handleProcess = () => {
    setImportedNotice(null);
    setParsedRows(parseSpreadsheetInput(rawInput));
  };

  const handleReset = () => {
    setRawInput('');
    setParsedRows([]);
    setImportedNotice(null);
  };

  const handleLoadSample = () => {
    setRawInput(SAMPLE_SHEET_DATA);
    setParsedRows(parseSpreadsheetInput(SAMPLE_SHEET_DATA));
    setImportedNotice(null);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setRawInput(content);
      setParsedRows(parseSpreadsheetInput(content));
      setImportedNotice(null);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleCommitImport = () => {
    if (validRows.length === 0) return;

    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const created: PartnerRecord[] = validRows.map((row, idx) => ({
      id: `ptr-imp-${Date.now()}-${idx}`,
      companyName: row.companyName,
      category: row.category,
      eventId: activeEvent.id,
      picInternal: row.picInternal || defaultPic,
      contactPerson: {
        name: row.contactName,
        role: 'PIC Partnership',
        contact: row.contactDetail,
        isAvailable: true,
        notes: 'Diimpor via Spreadsheet / CSV.',
        lastUpdated: nowStamp,
      },
      currentStep: 1,
      pipelineStatus: 'Follow up H+3',
      result: 'Pending',
      proposalSentAt: row.proposalSentAt,
      deadlineD3: row.deadlineD3,
      deadlineD7: row.deadlineD7,
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
          id: `hist-imp-${Date.now()}-${idx}`,
          title: 'Impor Proposal Massal',
          detail: `Diimpor ke ${activeEvent.name} dengan reminder otomatis D+3 (${row.deadlineD3}) & D+7 (${row.deadlineD7}).`,
          timestamp: `${nowStamp} WIB`,
        },
      ],
    }));

    onImportPartners(created);
    setImportedNotice(
      `Berhasil mengimpor ${created.length} proposal ke event ${activeEvent.name}.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-2xl border border-[#83B1EC]/70 bg-white p-5 sm:p-6 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0755B1]">
          Impor Spreadsheet — {activeEvent.name}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
          Impor daftar target company &amp; proposal dari file CSV atau salin langsung dari Google Sheets / Excel. Reminder D+3 &amp; D+7 otomatis dibuat.
        </p>
      </section>

      {importedNotice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{importedNotice}</span>
        </div>
      )}

      {/* Paste / Upload Card */}
      <section className="rounded-2xl border border-[#83B1EC]/70 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-lg bg-[#E6F0FD] px-3 py-1.5 text-xs font-bold text-[#0755B1]">
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span>Paste dari Google Sheets / Excel</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="min-h-[36px] rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#475569] hover:border-[#2454AB] hover:text-[#2454AB] cursor-pointer"
            >
              Muat Contoh Data
            </button>
            <label className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#83B1EC] bg-[#F8FBFF] px-3 text-xs font-bold text-[#2454AB] hover:bg-[#E6F0FD] cursor-pointer">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Unggah File .CSV</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold text-[#475569]">
          Tempel (Ctrl+V) baris data dari Google Sheets atau CSV di bawah ini:
        </p>
        <p className="mt-1 font-mono text-[11px] text-[#64748B]">
          Format kolom: Nama Company &lt;TAB/Koma&gt; Contact Person &lt;TAB/Koma&gt; No WA/Email &lt;TAB/Koma&gt; Kategori &lt;TAB/Koma&gt; PIC Internal &lt;TAB/Koma&gt; Tgl Kirim (YYYY-MM-DD)
        </p>

        <textarea
          rows={5}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="Tempel baris spreadsheet di sini..."
          className="mt-3 w-full rounded-xl border border-[#CBD5E1] bg-[#F8FBFF] p-3.5 font-mono text-xs leading-relaxed text-[#1E1E1E] focus:border-[#2454AB] focus:bg-white focus:outline-none"
        />

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleProcess}
            className="min-h-[40px] rounded-xl bg-[#0F52BA] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#2454AB] cursor-pointer"
          >
            Proses &amp; Validasi Data
          </button>
        </div>
      </section>

      {/* Preview Table */}
      <section className="rounded-2xl border border-[#83B1EC]/70 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#1E1E1E]">
              Preview Hasil Validasi ({validRows.length} dari {parsedRows.length} Baris Valid)
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Cek jadwal otomatis D+3 &amp; D+7 sebelum menyimpan ke database
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[38px] rounded-lg border border-[#CBD5E1] px-3.5 text-xs font-bold text-[#475569] hover:bg-slate-50 cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              disabled={validRows.length === 0}
              onClick={handleCommitImport}
              data-testid="commit-import-button"
              className="min-h-[38px] rounded-lg bg-[#16A34A] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#15803D] disabled:opacity-50 cursor-pointer"
            >
              Impor {validRows.length} Proposal ke Event Aktif
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[10px] font-extrabold tracking-wider uppercase text-[#64748B]">
                <th className="py-2.5 pr-3">STATUS</th>
                <th className="py-2.5 px-3">NAMA COMPANY</th>
                <th className="py-2.5 px-3">CONTACT PERSON</th>
                <th className="py-2.5 px-3">KATEGORI</th>
                <th className="py-2.5 px-3">PIC INTERNAL</th>
                <th className="py-2.5 pl-3">AUTO D+3 / D+7</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {parsedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#64748B]">
                    Belum ada baris data yang diproses. Tempel data di atas lalu klik Proses &amp; Validasi Data.
                  </td>
                </tr>
              ) : (
                parsedRows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="py-3 pr-3 align-top">
                      {row.valid ? (
                        <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Valid
                        </span>
                      ) : (
                        <span
                          title={row.error ?? 'Error'}
                          className="inline-flex rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700"
                        >
                          Error
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top font-bold text-[#1E1E1E]">
                      {row.companyName || '-'}
                      {row.error && (
                        <p className="mt-0.5 text-[10px] font-medium text-[#DC2626]">
                          {row.error}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <p className="font-semibold text-[#1E1E1E]">{row.contactName || '-'}</p>
                      <p className="text-[11px] text-[#64748B]">{row.contactDetail}</p>
                    </td>
                    <td className="py-3 px-3 align-top font-semibold text-[#2454AB]">
                      {row.category}
                    </td>
                    <td className="py-3 px-3 align-top text-[#1E1E1E]">
                      {row.picInternal || '-'}
                    </td>
                    <td className="py-3 pl-3 align-top font-mono text-[11px] tabular-nums text-[#334155]">
                      {row.valid ? `D+3: ${row.deadlineD3} / D+7: ${row.deadlineD7}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
