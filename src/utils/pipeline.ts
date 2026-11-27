import type {
  BnccEvent,
  MouTemplate,
  PartnerCategory,
  PartnerRecord,
} from '../types/database';

export const PIPELINE_STEPS = [
  {step: 1, shortLabel: 'Follow-up Day +3', fullLabel: 'Follow Up H+3'},
  {step: 2, shortLabel: 'Follow-up Day +7', fullLabel: 'Follow Up H+7'},
  {step: 3, shortLabel: 'Company response', fullLabel: 'Company Response'},
  {step: 4, shortLabel: 'Get PIC', fullLabel: 'Get PIC Info'},
  {step: 5, shortLabel: 'Schedule meeting', fullLabel: 'Schedule Meeting'},
  {step: 6, shortLabel: 'Pitching', fullLabel: 'Pitching (Grade & Dealing)'},
  {step: 7, shortLabel: 'Interest follow-up', fullLabel: 'Follow Up Interest & Set Grade'},
  {step: 8, shortLabel: 'Grading', fullLabel: 'Grading & Benefit Final'},
  {step: 9, shortLabel: 'MoU', fullLabel: 'MoU'},
] as const;

export interface EventStats {
  pendingCount: number;
  acceptCount: number;
  declineCount: number;
  totalDealValue: number;
  overdueCount: number;
}

export interface ParsedImportRow {
  rowNumber: number;
  valid: boolean;
  error: string | null;
  companyName: string;
  contactName: string;
  contactDetail: string;
  category: PartnerCategory;
  picInternal: string;
  proposalSentAt: string;
  deadlineD3: string;
  deadlineD7: string;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function computeAutoDeadlines(proposalSentAt: string): {
  deadlineD3: string;
  deadlineD7: string;
} {
  return {
    deadlineD3: addDaysToIsoDate(proposalSentAt, 3),
    deadlineD7: addDaysToIsoDate(proposalSentAt, 7),
  };
}

export function isPartnerOverdue(
  partner: PartnerRecord,
  referenceDateIso: string = new Date().toISOString().slice(0, 10)
): boolean {
  if (partner.result !== 'Pending' || partner.isFollowUpDone) {
    return false;
  }
  const activeDeadline =
    partner.currentStep >= 2 ? partner.deadlineD7 || partner.deadlineD3 : partner.deadlineD3;
  if (!activeDeadline) return false;
  return activeDeadline <= referenceDateIso;
}

export function getActiveDeadline(partner: PartnerRecord): string {
  return partner.currentStep >= 2
    ? partner.deadlineD7 || partner.deadlineD3
    : partner.deadlineD3;
}

export function computeEventStats(
  partners: PartnerRecord[],
  referenceDateIso: string = new Date().toISOString().slice(0, 10)
): EventStats {
  let pendingCount = 0;
  let acceptCount = 0;
  let declineCount = 0;
  let totalDealValue = 0;
  let overdueCount = 0;

  for (const partner of partners) {
    if (partner.result === 'Accept') {
      acceptCount += 1;
      totalDealValue += partner.sponsorshipValue || 0;
    } else if (partner.result === 'Decline') {
      declineCount += 1;
    } else {
      pendingCount += 1;
    }
    if (isPartnerOverdue(partner, referenceDateIso)) {
      overdueCount += 1;
    }
  }

  return {
    pendingCount,
    acceptCount,
    declineCount,
    totalDealValue,
    overdueCount,
  };
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function renderMouDocument(
  template: MouTemplate,
  partner: PartnerRecord,
  event: BnccEvent | undefined,
  includeSponsorshipValue: boolean
): string {
  const benefitLines =
    partner.benefits.length > 0
      ? partner.benefits.map((b, idx) => `${idx + 1}. ${b.label}`).join('\n')
      : '1. Sesuai kesepakatan tertulis saat sesi pitching.';

  const nilaiText = includeSponsorshipValue
    ? partner.sponsorshipValue > 0
      ? formatRupiah(partner.sponsorshipValue)
      : 'Barter / Non-Moneter'
    : '[Nominal Dibatasi — Hanya Manager EEO & Bendahara]';

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return template.content
    .replaceAll('{{event}}', event?.name ?? 'BNCC Event')
    .replaceAll('{{tanggal}}', todayFormatted)
    .replaceAll('{{nama_company}}', partner.companyName)
    .replaceAll('{{cp}}', partner.contactPerson.name)
    .replaceAll('{{jabatan_cp}}', partner.contactPerson.role || 'PIC Partnership')
    .replaceAll('{{grade}}', partner.grade === 'None' ? 'Partner' : partner.grade)
    .replaceAll('{{nilai}}', nilaiText)
    .replaceAll('{{benefit}}', benefitLines);
}

function normalizeCategory(raw: string): PartnerCategory {
  const cleaned = raw.trim().toLowerCase();
  if (cleaned.includes('media')) return 'Media Partner';
  if (cleaned.includes('komunitas') || cleaned.includes('community')) return 'Komunitas';
  return 'Sponsor';
}

export function parseSpreadsheetInput(rawText: string): ParsedImportRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  return lines.map((line, index) => {
    const delimiter = line.includes('\t') ? '\t' : ',';
    const parts = line.split(delimiter).map((part) => part.trim());

    const companyName = parts[0] ?? '';
    const contactName = parts[1] ?? '';
    const contactDetail = parts[2] ?? '';
    const categoryRaw = parts[3] ?? 'Sponsor';
    const picInternal = parts[4] ?? '';
    const proposalSentAt = parts[5] ?? new Date().toISOString().slice(0, 10);

    const {deadlineD3, deadlineD7} = computeAutoDeadlines(proposalSentAt);

    let error: string | null = null;
    if (!companyName) {
      error = 'Nama company wajib diisi.';
    } else if (!contactName || !contactDetail) {
      error = 'Contact Person dan kontak WA/Email wajib diisi.';
    } else if (!picInternal) {
      error = 'PIC Internal EEO wajib diisi.';
    } else if (!deadlineD3 || !deadlineD7) {
      error = 'Format tanggal kirim harus YYYY-MM-DD.';
    }

    return {
      rowNumber: index + 1,
      valid: error === null,
      error,
      companyName,
      contactName,
      contactDetail,
      category: normalizeCategory(categoryRaw),
      picInternal,
      proposalSentAt,
      deadlineD3,
      deadlineD7,
    };
  });
}
