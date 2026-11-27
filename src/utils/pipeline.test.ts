import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToIsoDate,
  computeAutoDeadlines,
  computeEventStats,
  isPartnerOverdue,
  parseSpreadsheetInput,
  renderMouDocument,
} from './pipeline';
import type {BnccEvent, MouTemplate, PartnerRecord} from '../types/database';

test('computeAutoDeadlines accurately adds 3 and 7 days', () => {
  assert.equal(addDaysToIsoDate('2026-11-28', 3), '2026-12-01');
  const deadlines = computeAutoDeadlines('2026-11-20');
  assert.equal(deadlines.deadlineD3, '2026-11-23');
  assert.equal(deadlines.deadlineD7, '2026-11-27');
});

test('isPartnerOverdue detects overdue Pending proposals and ignores Accept/Decline/Done', () => {
  const base: PartnerRecord = {
    id: 'p1',
    companyName: 'Test Corp',
    category: 'Sponsor',
    eventId: 'evt-1',
    picInternal: 'Staff',
    contactPerson: {
      name: 'Budi',
      role: 'Lead',
      contact: '0812',
      isAvailable: true,
      notes: '',
      lastUpdated: '2026-11-20',
    },
    currentStep: 1,
    pipelineStatus: 'Follow Up H+3',
    result: 'Pending',
    proposalSentAt: '2026-11-18',
    deadlineD3: '2026-11-21',
    deadlineD7: '2026-11-25',
    followUpStage: 'Follow Up H+3',
    isFollowUpDone: false,
    grade: 'None',
    sponsorshipValue: 10000000,
    declineReason: '',
    mouStatus: 'Belum Dibuat',
    mouTemplateId: '',
    meetingSummary: '',
    benefits: [],
    meetings: [],
    history: [],
  };

  assert.equal(isPartnerOverdue(base, '2026-11-22'), true);
  assert.equal(isPartnerOverdue(base, '2026-11-20'), false);
  assert.equal(isPartnerOverdue({...base, isFollowUpDone: true}, '2026-11-22'), false);
  assert.equal(isPartnerOverdue({...base, result: 'Accept'}, '2026-11-22'), false);
});

test('computeEventStats aggregates pending, accept, decline, and deal value', () => {
  const sample: PartnerRecord[] = [
    {
      id: '1',
      companyName: 'A',
      category: 'Sponsor',
      eventId: 'e1',
      picInternal: 'X',
      contactPerson: {name: 'N', role: 'R', contact: 'C', isAvailable: true, notes: '', lastUpdated: ''},
      currentStep: 9,
      pipelineStatus: 'Done',
      result: 'Accept',
      proposalSentAt: '2026-11-01',
      deadlineD3: '2026-11-04',
      deadlineD7: '2026-11-08',
      followUpStage: 'Done',
      isFollowUpDone: true,
      grade: 'Gold',
      sponsorshipValue: 5000000,
      declineReason: '',
      mouStatus: 'Selesai',
      mouTemplateId: '',
      meetingSummary: '',
      benefits: [],
      meetings: [],
      history: [],
    },
    {
      id: '2',
      companyName: 'B',
      category: 'Media Partner',
      eventId: 'e1',
      picInternal: 'Y',
      contactPerson: {name: 'N', role: 'R', contact: 'C', isAvailable: true, notes: '', lastUpdated: ''},
      currentStep: 1,
      pipelineStatus: 'Follow Up H+3',
      result: 'Pending',
      proposalSentAt: '2026-11-18',
      deadlineD3: '2026-11-21',
      deadlineD7: '2026-11-25',
      followUpStage: 'Follow Up H+3',
      isFollowUpDone: false,
      grade: 'None',
      sponsorshipValue: 0,
      declineReason: '',
      mouStatus: 'Belum Dibuat',
      mouTemplateId: '',
      meetingSummary: '',
      benefits: [],
      meetings: [],
      history: [],
    },
  ];

  const stats = computeEventStats(sample, '2026-11-27');
  assert.equal(stats.acceptCount, 1);
  assert.equal(stats.pendingCount, 1);
  assert.equal(stats.declineCount, 0);
  assert.equal(stats.totalDealValue, 5000000);
  assert.equal(stats.overdueCount, 1);
});

test('renderMouDocument masks sponsorship value for Staff and shows it for Manager', () => {
  const tpl: MouTemplate = {
    id: 't1',
    eventId: 'e1',
    title: 'Template',
    type: 'Sponsorship',
    updatedAt: '2026-11-01',
    content: 'Event: {{event}} | PT: {{nama_company}} | CP: {{cp}} | Grade: {{grade}} | Nilai: {{nilai}}',
  };
  const evt: BnccEvent = {id: 'e1', name: 'BNCC TechSpire 2026', period: 'Nov', targetSponsors: 10, status: 'Aktif'};
  const prt: PartnerRecord = {
    id: 'p1',
    companyName: 'Dicoding Indonesia',
    category: 'Sponsor',
    eventId: 'e1',
    picInternal: 'Budi',
    contactPerson: {name: 'Sari Wijaya', role: 'Lead', contact: '0812', isAvailable: true, notes: '', lastUpdated: ''},
    currentStep: 9,
    pipelineStatus: 'Done',
    result: 'Accept',
    proposalSentAt: '2026-11-01',
    deadlineD3: '2026-11-04',
    deadlineD7: '2026-11-08',
    followUpStage: 'Done',
    isFollowUpDone: true,
    grade: 'Gold',
    sponsorshipValue: 4000000,
    declineReason: '',
    mouStatus: 'Siap Dibuat',
    mouTemplateId: '',
    meetingSummary: '',
    benefits: [],
    meetings: [],
    history: [],
  };

  const mgrDoc = renderMouDocument(tpl, prt, evt, true);
  assert.match(mgrDoc, /Dicoding Indonesia/);
  assert.match(mgrDoc, /4\.000\.000/);

  const staffDoc = renderMouDocument(tpl, prt, evt, false);
  assert.match(staffDoc, /Nominal Dibatasi/);
  assert.doesNotMatch(staffDoc, /4\.000\.000/);
});

test('parseSpreadsheetInput parses TSV and CSV rows and flags invalid lines', () => {
  const raw = [
    'PT Bukalapak.com, Beby Wijaya, 0812-111-222, Sponsor, Nadia Putri, 2026-11-20',
    'Tech In Asia Indonesia\tSinta Dewi\tsinta@techinasia.com\tMedia Partner\tRizky Pratama\t2026-11-22',
    'Invalid Row, , , Sponsor, , bad-date',
  ].join('\n');

  const rows = parseSpreadsheetInput(raw);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].valid, true);
  assert.equal(rows[0].deadlineD3, '2026-11-23');
  assert.equal(rows[1].valid, true);
  assert.equal(rows[1].category, 'Media Partner');
  assert.equal(rows[2].valid, false);
  assert.ok(rows[2].error);
});
