import type {UserAccount, UserRole} from '../types/database';

export interface LoginValidationResult {
  valid: boolean;
  emailError: string | null;
  passwordError: string | null;
}

export interface AuthAttemptResult {
  ok: boolean;
  user?: UserAccount;
  error?: string;
}

export interface RoleConfig {
  role: UserRole;
  kicker: string;
  label: string;
  buttonLabel: string;
  emailPlaceholder: string;
  demoEmail: string;
  demoPassword: string;
  accessSummary: string;
}

export interface RolePermissions {
  canViewSponsorshipValue: boolean;
  canEditPitchingGrading: boolean;
  canApproveEditRequests: boolean;
  canManageMouTemplates: boolean;
  canFinalizeMou: boolean;
  canCreateEvent: boolean;
  canDirectEditCp: boolean;
}

export function getRolePermissions(user: UserAccount): RolePermissions {
  const isManager = user.role === 'admin';
  return {
    canViewSponsorshipValue: isManager || user.canViewSponsorshipValue,
    canEditPitchingGrading: isManager,
    canApproveEditRequests: isManager,
    canManageMouTemplates: isManager,
    canFinalizeMou: isManager,
    canCreateEvent: isManager,
    canDirectEditCp: isManager,
  };
}

export function getRoleConfig(role: UserRole): RoleConfig {
  if (role === 'admin') {
    return {
      role: 'admin',
      kicker: 'ADMIN',
      label: 'Manager',
      buttonLabel: 'Masuk ke Dashboard Manager EEO',
      emailPlaceholder: 'cluster5@bncc.net',
      demoEmail: 'cluster5@bncc.net',
      demoPassword: 'cluster5gacor',
      accessSummary:
        'Akses penuh hasil pitching, nominal sponsorship, persetujuan edit staff, dan template MoU per event.',
    };
  }

  return {
    role: 'member',
    kicker: 'MEMBER',
    label: 'Staff EEO',
    buttonLabel: 'Masuk ke Dashboard Staff EEO',
    emailPlaceholder: 'cluster5@bncc.net',
    demoEmail: 'cluster5@bncc.net',
    demoPassword: 'cluster5gacor',
    accessSummary:
      'Akses input cepat partner, pembaruan Contact Person (via persetujuan Manager), jadwal meeting, dan pipeline proposal tanpa nominal sponsorship.',
  };
}

export function validateLoginInput(
  rawEmail: string,
  rawPassword: string
): LoginValidationResult {
  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword.trim();

  let emailError: string | null = null;
  let passwordError: string | null = null;

  if (!email) {
    emailError = 'Email pengurus wajib diisi.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailError = 'Format email tidak valid.';
  } else if (!email.endsWith('@bncc.net')) {
    emailError = 'Gunakan email resmi pengurus berdomain @bncc.net.';
  }

  if (!password) {
    passwordError = 'Password wajib diisi.';
  } else if (password.length < 4) {
    passwordError = 'Password minimal 4 karakter.';
  }

  return {
    valid: emailError === null && passwordError === null,
    emailError,
    passwordError,
  };
}

export function authenticateUser(
  users: UserAccount[],
  selectedRole: UserRole,
  rawEmail: string,
  rawPassword: string
): AuthAttemptResult {
  const validation = validateLoginInput(rawEmail, rawPassword);
  if (!validation.valid) {
    return {
      ok: false,
      error: validation.emailError ?? validation.passwordError ?? 'Input tidak valid.',
    };
  }

  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword;

  const emailMatches = users.filter((u) => u.email.toLowerCase() === email);
  if (emailMatches.length === 0) {
    return {
      ok: false,
      error: 'Email pengurus tidak terdaftar pada database prototype.',
    };
  }

  const matchedForRole = emailMatches.find((u) => u.role === selectedRole);
  if (!matchedForRole) {
    const fallbackUser = emailMatches[0];
    const expectedLabel =
      fallbackUser.role === 'admin' ? 'ADMIN (Manager)' : 'MEMBER (Staff EEO)';
    return {
      ok: false,
      error: `Akun ini terdaftar sebagai ${expectedLabel}. Silakan pilih role ${expectedLabel} di atas.`,
    };
  }

  if (matchedForRole.password !== password) {
    return {
      ok: false,
      error: 'Password yang dimasukkan salah. Periksa kembali kredensial Anda.',
    };
  }

  return {
    ok: true,
    user: matchedForRole,
  };
}
