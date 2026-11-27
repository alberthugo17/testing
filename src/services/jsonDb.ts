import type {
  ActivityLogRecord,
  BnccEvent,
  DatabaseState,
  EditRequestRecord,
  MouTemplate,
  PartnerRecord,
  UserAccount,
} from '../types/database';

const SESSION_STORAGE_KEY = 'gatherin_eeo_session_v2';
const DB_STORAGE_KEY = 'gatherin_eeo_db_v2';

async function fetchJsonFile<T>(relativePath: string): Promise<T> {
  const response = await fetch(relativePath, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal memuat database ${relativePath} (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function loadSeedDatabaseFromRepo(): Promise<DatabaseState> {
  const [users, events, partners, mouTemplates, editRequests, activityLogs] = await Promise.all([
    fetchJsonFile<UserAccount[]>('./data/users.json'),
    fetchJsonFile<BnccEvent[]>('./data/events.json'),
    fetchJsonFile<PartnerRecord[]>('./data/partners.json'),
    fetchJsonFile<MouTemplate[]>('./data/mou_templates.json'),
    fetchJsonFile<EditRequestRecord[]>('./data/edit_requests.json'),
    fetchJsonFile<ActivityLogRecord[]>('./data/activity_logs.json'),
  ]);

  return {
    users,
    events,
    partners,
    mouTemplates,
    editRequests,
    activityLogs,
  };
}

export async function loadDatabaseState(): Promise<DatabaseState> {
  const seed = await loadSeedDatabaseFromRepo();

  try {
    const cachedRaw = localStorage.getItem(DB_STORAGE_KEY);
    if (!cachedRaw) {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }

    const parsed = JSON.parse(cachedRaw) as Partial<DatabaseState>;
    return {
      users: seed.users,
      events: Array.isArray(parsed.events) && parsed.events.length > 0 ? parsed.events : seed.events,
      partners: Array.isArray(parsed.partners) ? parsed.partners : seed.partners,
      mouTemplates: Array.isArray(parsed.mouTemplates) ? parsed.mouTemplates : seed.mouTemplates,
      editRequests: Array.isArray(parsed.editRequests) ? parsed.editRequests : seed.editRequests,
      activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : seed.activityLogs,
    };
  } catch {
    return seed;
  }
}

export function saveDatabaseState(state: DatabaseState): void {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export async function resetDatabaseToSeed(): Promise<DatabaseState> {
  try {
    localStorage.removeItem(DB_STORAGE_KEY);
  } catch {
    // Ignore
  }
  const seed = await loadSeedDatabaseFromRepo();
  saveDatabaseState(seed);
  return seed;
}

export function saveSessionUser(user: UserAccount): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Ignore
  }
}

export function loadSessionUser(): UserAccount | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

export function clearSessionUser(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
