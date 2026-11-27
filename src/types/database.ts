export type UserRole = 'admin' | 'member';

export type PartnerCategory = 'Sponsor' | 'Media Partner' | 'Komunitas';
export type PartnerResult = 'Pending' | 'Accept' | 'Decline';
export type PartnerGrade = 'None' | 'Silver' | 'Gold' | 'Platinum' | 'Media Partner' | 'Komunitas';
export type MouStatus = 'Belum Dibuat' | 'Siap Dibuat' | 'Selesai';
export type ActivityCategory =
  | 'Proposal & Pipeline'
  | 'Contact Person'
  | 'Pitching & MoU'
  | 'Impor & Handover';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  title: string;
  division: string;
  generation: string;
  canViewSponsorshipValue: boolean;
}

export interface BnccEvent {
  id: string;
  name: string;
  period: string;
  targetSponsors: number;
  status: string;
}

export interface ContactPersonInfo {
  name: string;
  role: string;
  contact: string;
  isAvailable: boolean;
  notes: string;
  lastUpdated: string;
}

export interface PartnerBenefit {
  id: string;
  label: string;
  fulfilled: boolean;
}

export interface PartnerMeeting {
  id: string;
  date: string;
  time: string;
  method: 'Online' | 'Offline';
  address: string;
  participants: string;
}

export interface PartnerHistoryItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
}

export interface PartnerRecord {
  id: string;
  companyName: string;
  category: PartnerCategory;
  eventId: string;
  picInternal: string;
  contactPerson: ContactPersonInfo;
  currentStep: number;
  pipelineStatus: string;
  result: PartnerResult;
  proposalSentAt: string;
  deadlineD3: string;
  deadlineD7: string;
  followUpStage: string;
  isFollowUpDone: boolean;
  grade: PartnerGrade;
  sponsorshipValue: number;
  declineReason: string;
  mouStatus: MouStatus;
  mouTemplateId: string;
  meetingSummary: string;
  benefits: PartnerBenefit[];
  meetings: PartnerMeeting[];
  history: PartnerHistoryItem[];
}

export interface MouTemplate {
  id: string;
  eventId: string;
  title: string;
  type: 'Sponsorship' | 'Media Partner / Komunitas';
  updatedAt: string;
  content: string;
}

export interface EditRequestRecord {
  id: string;
  eventId: string;
  partnerId: string;
  companyName: string;
  requestTitle: string;
  submittedBy: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason: string;
  oldValue: Omit<ContactPersonInfo, 'lastUpdated'>;
  newValue: Omit<ContactPersonInfo, 'lastUpdated'>;
}

export interface ActivityLogRecord {
  id: string;
  eventId: string;
  category: ActivityCategory;
  title: string;
  description: string;
  sensitiveDetail?: string;
  actor: string;
  timestamp: string;
  sensitive: boolean;
}

export interface DatabaseState {
  users: UserAccount[];
  events: BnccEvent[];
  partners: PartnerRecord[];
  mouTemplates: MouTemplate[];
  editRequests: EditRequestRecord[];
  activityLogs: ActivityLogRecord[];
}
