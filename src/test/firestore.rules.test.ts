import { describe, it, beforeEach } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment, RulesTestContext } from '@firebase/rules-unit-testing'

declare global {
  var testEnv: RulesTestEnvironment
}

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment
  let alice: RulesTestContext
  let bob: RulesTestContext
  let unauthenticated: RulesTestContext

  beforeEach(async () => {
    testEnv = global.testEnv
    
    // Clear all data
    await testEnv.clearFirestore()

    // Create test users with custom claims
    alice = testEnv.authenticatedContext('alice', {
      orgId: 'org-1',
      orgRole: 'admin',
      admin: true,
      orgIds: ['org-1'],
      orgRoles: { 'org-1': 'admin' },
    })

    bob = testEnv.authenticatedContext('bob', {
      orgId: 'org-1', 
      orgRole: 'employee',
      admin: false,
      orgIds: ['org-1'],
      orgRoles: { 'org-1': 'employee' },
    })

    unauthenticated = testEnv.unauthenticatedContext()

    // Create required user documents to satisfy claimMatchesUserDoc validation
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('users/alice').set({
        uid: 'alice',
        primaryOrgId: 'org-1',
        orgIds: ['org-1'],
        createdAt: new Date(),
      })

      await context.firestore().doc('users/bob').set({
        uid: 'bob',
        primaryOrgId: 'org-1',
        orgIds: ['org-1'],
        createdAt: new Date(),
      })

      // Create org document
      await context.firestore().doc('orgs/org-1').set({
        name: 'Test Organization',
        ownerUid: 'alice',
        createdBy: 'alice',
        createdAt: new Date(),
      })
    })
  })

  describe('User Documents', () => {
    it('allows users to read their own document', async () => {
      await assertSucceeds(alice.firestore().doc('users/alice').get())
    })

    it('denies users from reading other users documents', async () => {
      await assertFails(alice.firestore().doc('users/bob').get())
    })

    it('allows users to create their own document', async () => {
      const charlie = testEnv.authenticatedContext('charlie', {})
      
      await assertSucceeds(
        charlie.firestore().doc('users/charlie').set({
          uid: 'charlie',
          createdAt: new Date(),
        })
      )
    })

    it('denies users from creating documents for other users', async () => {
      await assertFails(
        alice.firestore().doc('users/charlie').set({
          uid: 'alice', // Wrong UID
          createdAt: new Date(),
        })
      )
    })
  })

  describe('Organization Documents', () => {
    it('allows org members to read org document', async () => {
      await assertSucceeds(alice.firestore().doc('orgs/org-1').get())
      await assertSucceeds(bob.firestore().doc('orgs/org-1').get())
    })

    it('denies non-members from reading org document', async () => {
      const charlie = testEnv.authenticatedContext('charlie', {
        orgId: 'org-2',
        orgIds: ['org-2'],
      })
      
      await assertFails(charlie.firestore().doc('orgs/org-1').get())
    })

    it('allows admins to update org document', async () => {
      await assertSucceeds(
        alice.firestore().doc('orgs/org-1').update({
          name: 'Updated Organization Name',
          updatedAt: new Date(),
        })
      )
    })

    it('denies non-admins from updating org document', async () => {
      await assertFails(
        bob.firestore().doc('orgs/org-1').update({
          name: 'Updated Organization Name',
          updatedAt: new Date(),
        })
      )
    })

    it('denies updating protected fields', async () => {
      await assertFails(
        alice.firestore().doc('orgs/org-1').update({
          ownerUid: 'bob', // Protected field
          updatedAt: new Date(),
        })
      )
    })
  })

  describe('claimMatchesUserDoc Validation', () => {
    it('allows operations when claim matches user document', async () => {
      // Alice's claims match her user document
      await assertSucceeds(
        alice.firestore().doc('orgs/org-1').update({
          name: 'Valid Update',	
          updatedAt: new Date(),
        })
      )
    })

    it('denies operations when user document does not exist', async () => {
      const charlie = testEnv.authenticatedContext('charlie', {
        orgId: 'org-1',
        orgRole: 'admin',
        admin: true,
        orgIds: ['org-1'],
        orgRoles: { 'org-1': 'admin' },
      })

      // Charlie has claims but no user document
      await assertFails(
        charlie.firestore().doc('orgs/org-1').update({
          name: 'Invalid Update',
          updatedAt: new Date(),
        })
      )
    })

    it('denies operations when claim does not match user document', async () => {
      // Create user with different org in document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('users/eve').set({
          uid: 'eve',
          primaryOrgId: 'org-2', // Different from claim
          orgIds: ['org-2'],
          createdAt: new Date(),
        })
      })

      const eve = testEnv.authenticatedContext('eve', {
        orgId: 'org-1', // Claims org-1 but document has org-2
        orgRole: 'admin',
        admin: true,
        orgIds: ['org-1'],
        orgRoles: { 'org-1': 'admin' },
      })

      await assertFails(
        eve.firestore().doc('orgs/org-1').update({
          name: 'Invalid Update',
          updatedAt: new Date(),
        })
      )
    })
  })

  describe('Organization Members', () => {
    it('allows admins to add members', async () => {
      await assertSucceeds(
        alice.firestore().doc('orgs/org-1/members/charlie').set({
          uid: 'charlie',
          orgId: 'org-1',
          role: 'employee',
          addedBy: 'alice',
          joinedAt: new Date(),
        })
      )
    })

    it('denies non-admins from adding members', async () => {
      await assertFails(
        bob.firestore().doc('orgs/org-1/members/charlie').set({
          uid: 'charlie',
          orgId: 'org-1',
          role: 'employee',
          addedBy: 'bob',
          joinedAt: new Date(),
        })
      )
    })

    it('allows members to read their own membership', async () => {
      // First create the membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('orgs/org-1/members/bob').set({
          uid: 'bob',
          orgId: 'org-1',
          role: 'employee',
          addedBy: 'alice',
          joinedAt: new Date(),
        })
      })

      await assertSucceeds(bob.firestore().doc('orgs/org-1/members/bob').get())
    })

    it('allows admins to read all memberships', async () => {
      // First create the membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('orgs/org-1/members/bob').set({
          uid: 'bob',
          orgId: 'org-1',
          role: 'employee',
          addedBy: 'alice',
          joinedAt: new Date(),
        })
      })

      await assertSucceeds(alice.firestore().doc('orgs/org-1/members/bob').get())
    })
  })

  describe('Unauthenticated Access', () => {
    it('denies unauthenticated access to all documents', async () => {
      await assertFails(unauthenticated.firestore().doc('users/alice').get())
      await assertFails(unauthenticated.firestore().doc('orgs/org-1').get())
      await assertFails(unauthenticated.firestore().doc('orgs/org-1/members/alice').get())
    })

    it('allows public read access to directory', async () => {
      // Create a public directory entry
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('directory/orgs/org-1').set({
          name: 'Test Organization',
          isPublic: true,
        })
      })

      await assertSucceeds(unauthenticated.firestore().doc('directory/orgs/org-1').get())
    })
  })
})