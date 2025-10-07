import { beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestContext, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { seedOrgWithMembers } from './seed';

// Global testEnv typing provided via rules-setup.ts (globalThis augmentation)

// Explicitly assert globalThis has testEnv (set in rules-setup before tests run)
const getEnv = (): RulesTestEnvironment => (globalThis as any).testEnv as RulesTestEnvironment;

const ORG_ID = 'org-1';

describe('Firestore security rules', () => {
  // Use global.testEnv provided by rules-setup.ts
  let adminCtx: RulesTestContext;
  let memberCtx: RulesTestContext;
  let outsiderCtx: RulesTestContext;
  let unauthCtx: RulesTestContext;

  let orgSeed: {
    orgId: string;
    name: string;
    ownerUid: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
  };

  beforeEach(async () => {
    const env = getEnv();
    await env.clearFirestore();

    const { now } = await seedOrgWithMembers(env, {
      orgId: ORG_ID,
      adminUid: 'alice',
      memberUids: ['bob'],
      orgData: { name: 'Test Organization' },
    });

    orgSeed = {
      orgId: ORG_ID,
      name: 'Test Organization',
      ownerUid: 'alice',
      createdBy: 'alice',
      createdAt: now,
      updatedAt: now,
      updatedBy: 'alice',
    };

    adminCtx = env.authenticatedContext('alice', {
      orgId: ORG_ID,
      orgIds: [ORG_ID],
      orgRole: 'admin',
      orgRoles: { [ORG_ID]: 'admin' },
      admin: true,
    });

    memberCtx = env.authenticatedContext('bob', {
      orgId: ORG_ID,
      orgIds: [ORG_ID],
      orgRole: 'employee',
      orgRoles: { [ORG_ID]: 'employee' },
      admin: false,
    });

    outsiderCtx = env.authenticatedContext('eve', {
      orgId: 'org-2',
      orgIds: ['org-2'],
      orgRole: 'employee',
      orgRoles: { 'org-2': 'employee' },
      admin: false,
    });

    unauthCtx = env.unauthenticatedContext();
  });

  describe('organization documents', () => {
    it('allows members to read their organization', async () => {
      await assertSucceeds(memberCtx.firestore().doc(`orgs/${ORG_ID}`).get());
    });

    it('denies access to non-members', async () => {
      await assertFails(outsiderCtx.firestore().doc(`orgs/${ORG_ID}`).get());
    });

    it('allows admins to update when claim matches user doc', async () => {
      await assertSucceeds(
        adminCtx.firestore().doc(`orgs/${ORG_ID}`).update({
          orgId: orgSeed.orgId,
          name: 'Updated Organization',
          updatedAt: new Date().toISOString(),
        }),
      );
    });

    it('denies admins when user document orgId mismatches claim', async () => {
      const env = getEnv();
      await env.withSecurityRulesDisabled(async (context: any) => {
        await context.firestore().doc(`users/alice`).update({ orgId: 'org-2' });
      });
      // Recreate context to avoid any cached state
      const staleAdminCtx = env.authenticatedContext('alice', {
        orgId: ORG_ID,
        orgIds: [ORG_ID],
        orgRole: 'admin',
        orgRoles: { [ORG_ID]: 'admin' },
        admin: true,
      });
      await assertFails(
        staleAdminCtx.firestore().doc(`orgs/${ORG_ID}`).update({
          orgId: orgSeed.orgId,
          name: 'Should fail',
          updatedAt: new Date().toISOString(),
        }),
      );
    });
  });

  describe('organization members', () => {
    it('allows admins to add members', async () => {
      await assertSucceeds(
        adminCtx.firestore().doc(`orgs/${ORG_ID}/members/charlie`).set({
          uid: 'charlie',
          orgId: ORG_ID,
          role: 'member',
          addedBy: 'alice',
          createdAt: new Date().toISOString(),
        }),
      );
    });

    it('blocks non-admins from adding members', async () => {
      await assertFails(
        memberCtx.firestore().doc(`orgs/${ORG_ID}/members/charlie`).set({
          uid: 'charlie',
          orgId: ORG_ID,
          role: 'member',
          addedBy: 'bob',
          createdAt: new Date().toISOString(),
        }),
      );
    });

    it('allows members to read their membership', async () => {
      await assertSucceeds(memberCtx.firestore().doc(`orgs/${ORG_ID}/members/bob`).get());
    });
  });

  describe('unauthenticated users', () => {
    it('cannot access org documents', async () => {
      await assertFails(unauthCtx.firestore().doc(`orgs/${ORG_ID}`).get());
    });
  });
});
