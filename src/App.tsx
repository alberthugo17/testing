/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useEffect, useState} from 'react';
import {Footer} from './components/Footer';
import {HeroSection} from './components/HeroSection';
import {LoginSection} from './components/LoginSection';
import {ActivityLogView} from './components/dashboard/ActivityLogView';
import {CompanyDetailModal} from './components/dashboard/CompanyDetailModal';
import {DashboardLayout, type DashboardTabId} from './components/dashboard/DashboardLayout';
import {EditApprovalsView} from './components/dashboard/EditApprovalsView';
import {MouTemplatesView} from './components/dashboard/MouTemplatesView';
import {OverviewView} from './components/dashboard/OverviewView';
import {ProposalFormView} from './components/dashboard/ProposalFormView';
import {SponsorshipListView} from './components/dashboard/SponsorshipListView';
import {SpreadsheetImportView} from './components/dashboard/SpreadsheetImportView';
import {
  clearSessionUser,
  loadDatabaseState,
  loadSessionUser,
  resetDatabaseToSeed,
  saveDatabaseState,
  saveSessionUser,
} from './services/jsonDb';
import type {
  ActivityCategory,
  ActivityLogRecord,
  ContactPersonInfo,
  DatabaseState,
  EditRequestRecord,
  MouTemplate,
  PartnerBenefit,
  PartnerGrade,
  PartnerMeeting,
  PartnerRecord,
  PartnerResult,
  UserAccount,
  UserRole,
} from './types/database';
import {getRolePermissions} from './utils/auth';
import {formatRupiah, PIPELINE_STEPS} from './utils/pipeline';

function nowTimestampWib(): string {
  const iso = new Date().toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} WIB`;
}

export default function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => loadSessionUser());
  const [dbState, setDbState] = useState<DatabaseState | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  const [activeEventId, setActiveEventId] = useState<string>('evt-techspire-2026');
  const [activeTab, setActiveTab] = useState<DashboardTabId>('overview');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadDatabaseState()
      .then((loaded) => {
        if (!active) return;
        setDbState(loaded);
        if (loaded.events.length > 0) {
          setActiveEventId((prev) =>
            loaded.events.some((e) => e.id === prev) ? prev : loaded.events[0].id
          );
        }
        setDbError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : 'Gagal memuat database JSON prototype.';
        setDbError(message);
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingDb(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateDatabase = (updater: (prev: DatabaseState) => DatabaseState) => {
    setDbState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveDatabaseState(next);
      return next;
    });
  };

  const makeLogEntry = (params: {
    eventId: string;
    category: ActivityCategory;
    title: string;
    description: string;
    sensitive?: boolean;
    sensitiveDetail?: string;
  }): ActivityLogRecord => {
    const actorLabel = currentUser
      ? `${currentUser.name} (${currentUser.role === 'admin' ? 'Manager' : 'Staff EEO'})`
      : 'Sistem EEO';
    return {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventId: params.eventId,
      category: params.category,
      title: params.title,
      description: params.description,
      sensitiveDetail: params.sensitiveDetail,
      actor: actorLabel,
      timestamp: nowTimestampWib(),
      sensitive: Boolean(params.sensitive),
    };
  };

  const scrollToElement = (elementId: string) => {
    const target = document.getElementById(elementId);
    if (target) {
      target.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setSelectedRole(user.role);
    setActiveTab('overview');
    setSelectedPartnerId(null);
    saveSessionUser(user);
  };

  const handleLogout = () => {
    clearSessionUser();
    setCurrentUser(null);
    setActiveTab('overview');
    setSelectedPartnerId(null);
  };

  const handleResetDatabase = async () => {
    try {
      const fresh = await resetDatabaseToSeed();
      setDbState(fresh);
      if (fresh.events.length > 0) {
        setActiveEventId(fresh.events[0].id);
      }
      setSelectedPartnerId(null);
    } catch {
      // Ignore reset errors
    }
  };

  // --- Domain Mutation Handlers ---
  const handleCreateEvent = (payload: {
    name: string;
    period: string;
    targetSponsors: number;
  }) => {
    const newId = `evt-${Date.now()}`;
    updateDatabase((prev) => ({
      ...prev,
      events: [
        ...prev.events,
        {
          id: newId,
          name: payload.name,
          period: payload.period,
          targetSponsors: payload.targetSponsors,
          status: 'Active',
        },
      ],
      activityLogs: [
        makeLogEntry({
          eventId: newId,
          category: 'Proposal & Pipeline',
          title: 'Membuat Event Baru',
          description: `Event ${payload.name} (${payload.period}) dibuat dengan target ${payload.targetSponsors} partner.`,
        }),
        ...prev.activityLogs,
      ],
    }));
    setActiveEventId(newId);
  };

  const handleMarkFollowUpDone = (partnerId: string) => {
    updateDatabase((prev) => {
      const target = prev.partners.find((p) => p.id === partnerId);
      if (!target) return prev;
      const nextStep = Math.min(target.currentStep + 1, 9);
      const stepLabel =
        PIPELINE_STEPS.find((s) => s.step === nextStep)?.fullLabel ?? target.pipelineStatus;
      const stamp = nowTimestampWib();

      return {
        ...prev,
        partners: prev.partners.map((p) =>
          p.id === partnerId
            ? {
                ...p,
                isFollowUpDone: true,
                currentStep: nextStep,
                pipelineStatus: stepLabel,
                followUpStage: stepLabel,
                history: [
                  {
                    id: `hist-${Date.now()}`,
                    title: 'Follow-Up Selesai',
                    detail: `Follow-up diselesaikan oleh ${currentUser?.name ?? 'Tim EEO'} — lanjut ke tahap ${stepLabel}.`,
                    timestamp: stamp,
                  },
                  ...p.history,
                ],
              }
            : p
        ),
        activityLogs: [
          makeLogEntry({
            eventId: target.eventId,
            category: 'Proposal & Pipeline',
            title: 'Menyelesaikan Follow-Up',
            description: `${target.companyName} ditandai selesai follow-up dan berlanjut ke tahap ${stepLabel}.`,
          }),
          ...prev.activityLogs,
        ],
      };
    });
  };

  const handleSaveProposal = (partner: PartnerRecord) => {
    updateDatabase((prev) => ({
      ...prev,
      partners: [partner, ...prev.partners],
      activityLogs: [
        makeLogEntry({
          eventId: partner.eventId,
          category: 'Proposal & Pipeline',
          title: 'Menambahkan Proposal Baru',
          description: `Menambahkan proposal ${partner.companyName} (${partner.category}) dengan reminder otomatis D+3 (${partner.deadlineD3}) dan D+7 (${partner.deadlineD7}).`,
        }),
        ...prev.activityLogs,
      ],
    }));
    setActiveTab('sponsorships');
  };

  const handleImportPartners = (imported: PartnerRecord[]) => {
    if (imported.length === 0) return;
    updateDatabase((prev) => ({
      ...prev,
      partners: [...imported, ...prev.partners],
      activityLogs: [
        makeLogEntry({
          eventId: activeEventId,
          category: 'Impor & Handover',
          title: 'Impor Spreadsheet Proposal',
          description: `Mengimpor ${imported.length} target perusahaan baru beserta jadwal reminder D+3 & D+7.`,
        }),
        ...prev.activityLogs,
      ],
    }));
  };

  const handleCreateTemplate = (template: MouTemplate) => {
    updateDatabase((prev) => ({
      ...prev,
      mouTemplates: [...prev.mouTemplates, template],
      activityLogs: [
        makeLogEntry({
          eventId: template.eventId,
          category: 'Pitching & MoU',
          title: 'Membuat Template MoU Baru',
          description: `Menambahkan template "${template.title}" (${template.type}).`,
        }),
        ...prev.activityLogs,
      ],
    }));
  };

  const handleUpdateTemplate = (template: MouTemplate) => {
    updateDatabase((prev) => ({
      ...prev,
      mouTemplates: prev.mouTemplates.map((t) => (t.id === template.id ? template : t)),
      activityLogs: [
        makeLogEntry({
          eventId: template.eventId,
          category: 'Pitching & MoU',
          title: 'Memperbarui Template MoU',
          description: `Memperbarui naskah template "${template.title}".`,
        }),
        ...prev.activityLogs,
      ],
    }));
  };

  const handleFinalizeMou = (partnerId: string, templateId: string) => {
    updateDatabase((prev) => {
      const target = prev.partners.find((p) => p.id === partnerId);
      if (!target) return prev;
      const stamp = nowTimestampWib();
      return {
        ...prev,
        partners: prev.partners.map((p) =>
          p.id === partnerId
            ? {
                ...p,
                mouStatus: 'Selesai',
                mouTemplateId: templateId,
                currentStep: 9,
                pipelineStatus: 'MoU Selesai',
                history: [
                  {
                    id: `hist-${Date.now()}`,
                    title: 'MoU Difinalisasi',
                    detail: `Dokumen MoU untuk ${p.companyName} ditandai selesai oleh ${currentUser?.name ?? 'Manager EEO'}.`,
                    timestamp: stamp,
                  },
                  ...p.history,
                ],
              }
            : p
        ),
        activityLogs: [
          makeLogEntry({
            eventId: target.eventId,
            category: 'Pitching & MoU',
            title: 'MoU Selesai Difinalisasi',
            description: `Dokumen MoU ${target.grade} ${target.companyName} telah ditandai selesai dan siap diarsipkan.`,
            sensitive: target.sponsorshipValue > 0,
            sensitiveDetail:
              target.sponsorshipValue > 0
                ? `Nilai Kontrak Final: ${formatRupiah(target.sponsorshipValue)}`
                : undefined,
          }),
          ...prev.activityLogs,
        ],
      };
    });
  };

  const handleApproveEditRequest = (requestId: string) => {
    updateDatabase((prev) => {
      const req = prev.editRequests.find((r) => r.id === requestId);
      if (!req) return prev;
      const stamp = nowTimestampWib();

      return {
        ...prev,
        editRequests: prev.editRequests.map((r) =>
          r.id === requestId ? {...r, status: 'Approved'} : r
        ),
        partners: prev.partners.map((p) =>
          p.id === req.partnerId
            ? {
                ...p,
                contactPerson: {
                  ...req.newValue,
                  lastUpdated: stamp,
                },
                history: [
                  {
                    id: `hist-${Date.now()}`,
                    title: 'Pembaruan CP Disetujui',
                    detail: `Contact Person diperbarui menjadi ${req.newValue.name} (${req.newValue.contact}) setelah persetujuan Manager.`,
                    timestamp: stamp,
                  },
                  ...p.history,
                ],
              }
            : p
        ),
        activityLogs: [
          makeLogEntry({
            eventId: req.eventId,
            category: 'Contact Person',
            title: 'Menyetujui Pembaruan CP',
            description: `Pembaruan CP ${req.companyName} oleh ${req.submittedBy} disetujui dan diterapkan ke database utama.`,
          }),
          ...prev.activityLogs,
        ],
      };
    });
  };

  const handleRejectEditRequest = (requestId: string, reason: string) => {
    updateDatabase((prev) => {
      const req = prev.editRequests.find((r) => r.id === requestId);
      if (!req) return prev;

      return {
        ...prev,
        editRequests: prev.editRequests.map((r) =>
          r.id === requestId ? {...r, status: 'Rejected', rejectionReason: reason} : r
        ),
        activityLogs: [
          makeLogEntry({
            eventId: req.eventId,
            category: 'Contact Person',
            title: 'Menolak Pembaruan CP',
            description: `Permintaan edit CP ${req.companyName} ditolak dengan alasan: "${reason}".`,
          }),
          ...prev.activityLogs,
        ],
      };
    });
  };

  const handleSaveFollowUpProgress = (payload: {
    partnerId: string;
    nextStep: number;
    deadline: string;
    notes: string;
    markDone: boolean;
  }) => {
    updateDatabase((prev) => {
      const target = prev.partners.find((p) => p.id === payload.partnerId);
      if (!target) return prev;
      const stepLabel =
        PIPELINE_STEPS.find((s) => s.step === payload.nextStep)?.fullLabel ??
        target.pipelineStatus;
      const stamp = nowTimestampWib();

      return {
        ...prev,
        partners: prev.partners.map((p) =>
          p.id === payload.partnerId
            ? {
                ...p,
                currentStep: payload.nextStep,
                pipelineStatus: stepLabel,
                followUpStage: stepLabel,
                deadlineD7: payload.deadline || p.deadlineD7,
                isFollowUpDone: payload.markDone,
                history: [
                  {
                    id: `hist-${Date.now()}`,
                    title: `Update Progres — ${stepLabel}`,
                    detail: payload.notes,
                    timestamp: stamp,
                  },
                  ...p.history,
                ],
              }
            : p
        ),
        activityLogs: [
          makeLogEntry({
            eventId: target.eventId,
            category: 'Proposal & Pipeline',
            title: 'Memperbarui Progres Follow-Up',
            description: `${target.companyName} diperbarui ke tahap ${stepLabel}. Catatan: ${payload.notes}`,
          }),
          ...prev.activityLogs,
        ],
      };
    });
  };

  const handleAddMeetingSchedule = (payload: {
    partnerId: string;
    meeting: PartnerMeeting;
  }) => {
    updateDatabase((prev) => {
      const target = prev.partners.find((p) => p.id === payload.partnerId);
      if (!target) return prev;
      const stamp = nowTimestampWib();

      return {
        ...prev,
        partners: prev.partners.map((p) =>
          p.id === payload.partnerId
            ? {
                ...p,
                currentStep: Math.max(p.currentStep, 5),
                pipelineStatus:
                  p.currentStep < 5 ? 'Schedule Meeting' : p.pipelineStatus,
                meetings: [payload.meeting, ...p.meetings],
                history: [
                  {
                    id: `hist-${Date.now()}`,
                    title: 'Jadwal Meeting Ditambahkan',
                    detail: `${payload.meeting.method} pada ${payload.meeting.date} (${payload.meeting.time}) di ${payload.meeting.address}.`,
                    timestamp: stamp,
                  },
                  ...p.history,
                ],
              }
            : p
        ),
        activityLogs: [
          makeLogEntry({
            eventId: target.eventId,
            category: 'Proposal & Pipeline',
            title: 'Menjadwalkan Meeting Partner',
            description: `Meeting ${payload.meeting.method} dengan ${target.companyName} dijadwalkan pada ${payload.meeting.date} ${payload.meeting.time}.`,
          }),
          ...prev.activityLogs,
        ],
      };
    });
  };

  const handleSavePitchingGrading = (payload: {
    partnerId: string;
    meetingSummary: string;
    grade: PartnerGrade;
    sponsorshipValue: number;
    result: PartnerResult;
    declineReason: string;
    benefits: PartnerBenefit[];
  }) => {
    updateDatabase((prev) => {
      const target = prev.partners.find((p) => p.id === payload.partnerId);
      if (!target) return prev;
      const stamp = nowTimestampWib();
      const nextStep =
        payload.result === 'Accept'
          ? Math.max(target.currentStep, 8)
          : Math.max(target.currentStep, 6);

      return {
        ...prev,
        partners: prev.partners.map((p) =>
          p.id === payload.partnerId
            ? {
                ...p,
                meetingSummary: payload.meetingSummary,
                grade: payload.grade,
                sponsorshipValue: payload.sponsorshipValue,
                result: payload.result,
                declineReason: payload.declineReason,
                benefits: payload.benefits,
                currentStep: nextStep,
                isFollowUpDone: payload.result !== 'Pending' ? true : p.isFollowUpDone,
                mouStatus:
                  payload.result === 'Accept' && p.mouStatus === 'Belum Dibuat'
                    ? 'Siap Dibuat'
                    : p.mouStatus,
                pipelineStatus:
                  payload.result === 'Accept'
                    ? 'Grading & Benefit Final'
                    : payload.result === 'Decline'
                    ? 'Arsip Penolakan'
                    : 'Pitching (Grade & Dealing)',
                history: [
                  {
                    id: `hist-${Date.now()}`,
                    title: `Pitching & Grading (${payload.result})`,
                    detail:
                      payload.result === 'Decline'
                        ? `Hasil: Decline. Alasan: ${payload.declineReason}`
                        : `Hasil: ${payload.result}, Grade: ${payload.grade}, Ringkasan: ${payload.meetingSummary || '-'}`,
                    timestamp: stamp,
                  },
                  ...p.history,
                ],
              }
            : p
        ),
        activityLogs: [
          makeLogEntry({
            eventId: target.eventId,
            category: 'Pitching & MoU',
            title: `Menetapkan Grading ${payload.grade}`,
            description: `${target.companyName} ditetapkan berstatus ${payload.result} pada paket ${payload.grade} dengan ${payload.benefits.length} poin benefit.`,
            sensitive: payload.sponsorshipValue > 0,
            sensitiveDetail:
              payload.sponsorshipValue > 0
                ? `Nominal Deal: ${formatRupiah(payload.sponsorshipValue)}`
                : undefined,
          }),
          ...prev.activityLogs,
        ],
      };
    });
  };

  const handleSubmitCpUpdate = (payload: {
    partnerId: string;
    newValue: Omit<ContactPersonInfo, 'lastUpdated'>;
  }): {mode: 'direct' | 'approval-requested'; message: string} => {
    if (!currentUser || !dbState) {
      return {mode: 'approval-requested', message: 'Sesi tidak ditemukan.'};
    }

    const permissions = getRolePermissions(currentUser);
    const target = dbState.partners.find((p) => p.id === payload.partnerId);
    if (!target) {
      return {mode: 'approval-requested', message: 'Data partner tidak ditemukan.'};
    }

    const stamp = nowTimestampWib();

    if (permissions.canDirectEditCp) {
      updateDatabase((prev) => ({
        ...prev,
        partners: prev.partners.map((p) =>
          p.id === payload.partnerId
            ? {
                ...p,
                contactPerson: {
                  ...payload.newValue,
                  lastUpdated: stamp,
                },
                history: [
                  {
                    id: `hist-${Date.now()}`,
                    title: 'Contact Person Diperbarui',
                    detail: `CP diperbarui langsung oleh Manager menjadi ${payload.newValue.name} (${payload.newValue.contact}).`,
                    timestamp: stamp,
                  },
                  ...p.history,
                ],
              }
            : p
        ),
        activityLogs: [
          makeLogEntry({
            eventId: target.eventId,
            category: 'Contact Person',
            title: 'Memperbarui Contact Person',
            description: `CP ${target.companyName} diperbarui langsung menjadi ${payload.newValue.name} (${payload.newValue.contact}).`,
          }),
          ...prev.activityLogs,
        ],
      }));
      return {
        mode: 'direct',
        message: 'Perubahan Contact Person berhasil disimpan langsung.',
      };
    }

    const newRequest: EditRequestRecord = {
      id: `req-${Date.now()}`,
      eventId: target.eventId,
      partnerId: target.id,
      companyName: target.companyName,
      requestTitle: 'Pembaruan Contact Person (Staff EEO)',
      submittedBy: `${currentUser.name} (Staff EEO)`,
      submittedAt: stamp,
      status: 'Pending',
      rejectionReason: '',
      oldValue: {
        name: target.contactPerson.name,
        role: target.contactPerson.role,
        contact: target.contactPerson.contact,
        isAvailable: target.contactPerson.isAvailable,
        notes: target.contactPerson.notes,
      },
      newValue: payload.newValue,
    };

    updateDatabase((prev) => ({
      ...prev,
      editRequests: [newRequest, ...prev.editRequests],
      activityLogs: [
        makeLogEntry({
          eventId: target.eventId,
          category: 'Contact Person',
          title: 'Mengajukan Pembaruan CP',
          description: `Mengajukan perubahan CP ${target.companyName} menjadi ${payload.newValue.name} (${payload.newValue.contact}) — menunggu persetujuan Manager.`,
        }),
        ...prev.activityLogs,
      ],
    }));

    return {
      mode: 'approval-requested',
      message: 'Permintaan pembaruan CP dikirim ke antrean Persetujuan Manager.',
    };
  };

  // --- Authenticated Workspace View ---
  if (currentUser && dbState) {
    const permissions = getRolePermissions(currentUser);
    const activeEvent =
      dbState.events.find((e) => e.id === activeEventId) ?? dbState.events[0];

    const eventPartners = dbState.partners.filter(
      (p) => p.eventId === activeEvent.id
    );
    const eventTemplates = dbState.mouTemplates.filter(
      (t) => t.eventId === activeEvent.id
    );
    const eventEditRequests = dbState.editRequests.filter(
      (r) => r.eventId === activeEvent.id
    );
    const eventLogs = dbState.activityLogs.filter(
      (l) => l.eventId === activeEvent.id
    );
    const acceptedPartners = eventPartners.filter((p) => p.result === 'Accept');
    const pendingApprovalCount = eventEditRequests.filter(
      (r) => r.status === 'Pending'
    ).length;

    const effectiveTab: DashboardTabId =
      activeTab === 'approvals' && !permissions.canApproveEditRequests
        ? 'overview'
        : activeTab;

    const selectedPartner = selectedPartnerId
      ? dbState.partners.find((p) => p.id === selectedPartnerId) ?? null
      : null;

    return (
      <>
        <DashboardLayout
          currentUser={currentUser}
          events={dbState.events}
          activeEventId={activeEvent.id}
          onChangeEvent={(evtId) => {
            setActiveEventId(evtId);
            setSelectedPartnerId(null);
          }}
          activeTab={effectiveTab}
          onSelectTab={setActiveTab}
          pendingApprovalCount={pendingApprovalCount}
          onLogout={handleLogout}
          onResetDatabase={handleResetDatabase}
        >
          {effectiveTab === 'overview' && (
            <OverviewView
              currentUser={currentUser}
              events={dbState.events}
              activeEvent={activeEvent}
              partners={eventPartners}
              pendingApprovalCount={pendingApprovalCount}
              onChangeEvent={setActiveEventId}
              onNavigateTab={setActiveTab}
              onOpenPartnerDetail={setSelectedPartnerId}
              onMarkFollowUpDone={handleMarkFollowUpDone}
              onCreateEvent={handleCreateEvent}
            />
          )}

          {effectiveTab === 'sponsorships' && (
            <SponsorshipListView
              currentUser={currentUser}
              partners={eventPartners}
              onNavigateTab={setActiveTab}
              onOpenPartnerDetail={setSelectedPartnerId}
            />
          )}

          {effectiveTab === 'proposal' && (
            <ProposalFormView
              activeEventId={activeEvent.id}
              activeEventName={activeEvent.name}
              defaultPic={currentUser.name}
              onCancel={() => setActiveTab('overview')}
              onSaveProposal={handleSaveProposal}
            />
          )}

          {effectiveTab === 'mou' && (
            <MouTemplatesView
              currentUser={currentUser}
              activeEvent={activeEvent}
              templates={eventTemplates}
              acceptedPartners={acceptedPartners}
              onCreateTemplate={handleCreateTemplate}
              onUpdateTemplate={handleUpdateTemplate}
              onFinalizeMou={handleFinalizeMou}
            />
          )}

          {effectiveTab === 'approvals' && permissions.canApproveEditRequests && (
            <EditApprovalsView
              editRequests={eventEditRequests}
              onApproveRequest={handleApproveEditRequest}
              onRejectRequest={handleRejectEditRequest}
            />
          )}

          {effectiveTab === 'import' && (
            <SpreadsheetImportView
              activeEvent={activeEvent}
              defaultPic={currentUser.name}
              onImportPartners={handleImportPartners}
            />
          )}

          {effectiveTab === 'logs' && (
            <ActivityLogView
              currentUser={currentUser}
              activeEvent={activeEvent}
              logs={eventLogs}
            />
          )}
        </DashboardLayout>

        {selectedPartner && (
          <CompanyDetailModal
            partner={selectedPartner}
            currentUser={currentUser}
            onClose={() => setSelectedPartnerId(null)}
            onSaveFollowUpProgress={handleSaveFollowUpProgress}
            onAddMeetingSchedule={handleAddMeetingSchedule}
            onSavePitchingGrading={handleSavePitchingGrading}
            onSubmitCpUpdate={handleSubmitCpUpdate}
          />
        )}
      </>
    );
  }

  // --- Public Home & Login Page ---
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1E1E1E]">
      <main className="flex-1">
        <HeroSection
          onScrollToLogin={() => scrollToElement('login-section')}
          onScrollToFeatures={() => scrollToElement('fitur-utama')}
          isAuthenticated={currentUser !== null}
        />

        <LoginSection
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
          currentUser={currentUser}
          dbState={dbState}
          dbError={dbError}
          isLoadingDb={isLoadingDb}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
        />
      </main>

      <Footer />
    </div>
  );
}
