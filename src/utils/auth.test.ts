import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateUser,
  getRoleConfig,
  getRolePermissions,
  validateLoginInput,
} from './auth';
import type {UserAccount} from '../types/database';

const SAMPLE_USERS: UserAccount[] = [
  {
    id: 'usr-c5-mgr',
    name: 'Hugo Mahesa',
    email: 'cluster5@bncc.net',
    password: 'cluster5gacor',
    role: 'admin',
    title: 'Manager EEO',
    division: 'External Event Organizer',
    generation: 'BNCC 2026/2027',
    canViewSponsorshipValue: true,
  },
  {
    id: 'usr-c5-stf',
    name: 'Ahmad Fauzi',
    email: 'cluster5@bncc.net',
    password: 'cluster5gacor',
    role: 'member',
    title: 'Staff EEO',
    division: 'External Event Organizer',
    generation: 'BNCC 2026/2027',
    canViewSponsorshipValue: false,
  },
  {
    id: 'usr-mgr-01',
    name: 'Hugo Mahesa',
    email: 'hugo.manager@bncc.net',
    password: 'eeo2026',
    role: 'admin',
    title: 'Manager EEO',
    division: 'External Event Organizer',
    generation: 'BNCC 2026/2027',
    canViewSponsorshipValue: true,
  },
  {
    id: 'usr-stf-01',
    name: 'Ahmad Fauzi',
    email: 'ahmad.staff@bncc.net',
    password: 'eeo2026',
    role: 'member',
    title: 'Staff EEO',
    division: 'External Event Organizer',
    generation: 'BNCC 2026/2027',
    canViewSponsorshipValue: false,
  },
];

test('validateLoginInput rejects empty inputs and non-@bncc.net emails', () => {
  const empty = validateLoginInput('', '');
  assert.equal(empty.valid, false);
  assert.ok(empty.emailError);
  assert.ok(empty.passwordError);

  const wrongDomain = validateLoginInput('ahmad@gmail.com', 'cluster5gacor');
  assert.equal(wrongDomain.valid, false);
  assert.match(wrongDomain.emailError ?? '', /@bncc\.net/);

  const valid = validateLoginInput('  cluster5@bncc.net ', 'cluster5gacor');
  assert.equal(valid.valid, true);
});

test('authenticateUser succeeds for shared email across both Manager and Staff roles', () => {
  const managerResult = authenticateUser(
    SAMPLE_USERS,
    'admin',
    'cluster5@bncc.net',
    'cluster5gacor'
  );
  assert.equal(managerResult.ok, true);
  assert.equal(managerResult.user?.role, 'admin');
  assert.equal(managerResult.user?.canViewSponsorshipValue, true);

  const staffResult = authenticateUser(
    SAMPLE_USERS,
    'member',
    'cluster5@bncc.net',
    'cluster5gacor'
  );
  assert.equal(staffResult.ok, true);
  assert.equal(staffResult.user?.role, 'member');
  assert.equal(staffResult.user?.canViewSponsorshipValue, false);
});

test('authenticateUser rejects mismatched role selection for single-role accounts', () => {
  const result = authenticateUser(SAMPLE_USERS, 'member', 'hugo.manager@bncc.net', 'eeo2026');
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /ADMIN \(Manager\)/);
});

test('getRolePermissions enforces RBAC boundaries between Manager and Staff', () => {
  const managerPerms = getRolePermissions(SAMPLE_USERS[0]);
  assert.equal(managerPerms.canViewSponsorshipValue, true);
  assert.equal(managerPerms.canEditPitchingGrading, true);
  assert.equal(managerPerms.canApproveEditRequests, true);
  assert.equal(managerPerms.canManageMouTemplates, true);
  assert.equal(managerPerms.canDirectEditCp, true);

  const staffPerms = getRolePermissions(SAMPLE_USERS[1]);
  assert.equal(staffPerms.canViewSponsorshipValue, false);
  assert.equal(staffPerms.canEditPitchingGrading, false);
  assert.equal(staffPerms.canApproveEditRequests, false);
  assert.equal(staffPerms.canManageMouTemplates, false);
  assert.equal(staffPerms.canDirectEditCp, false);
});

test('getRoleConfig returns accurate button labels', () => {
  assert.equal(getRoleConfig('admin').buttonLabel, 'Masuk ke Dashboard Manager EEO');
  assert.equal(getRoleConfig('member').buttonLabel, 'Masuk ke Dashboard Staff EEO');
});
