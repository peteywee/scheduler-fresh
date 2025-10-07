import { z } from 'zod';

/**
 * Canonical Multi-Tenant Domain Schemas
 * NOTE: All persistence layers must validate with these before writes.
 * Legacy types moved to types.legacy.ts
 */

// Reusable primitives
export const IdSchema = z.string().min(1).brand<'Id'>();
export const OrgIdSchema = IdSchema.brand<'OrgId'>();
export const ParentIdSchema = IdSchema.brand<'ParentId'>();
export const TimestampSchema = z.date();
export const NonEmptyString = z.string().min(1);

// ISO8601 interval sanity (start < end enforced in refinement helpers externally)
export const DateTimeSchema = z.date();

// Corporate Account (Parent / Billing Root)
export const CorporateAccountSchema = z.object({
  id: ParentIdSchema,
  displayName: NonEmptyString,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  // minimal PII – avoid storing staff names here
  orgIds: z.array(OrgIdSchema).default([]),
  active: z.boolean().default(true),
});
export type CorporateAccount = z.infer<typeof CorporateAccountSchema>;

// Organization (Tenant)
export const OrganizationSchema = z.object({
  id: OrgIdSchema,
  parentId: ParentIdSchema.optional(), // optional if standalone
  name: NonEmptyString,
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: IdSchema, // staff uid
  settings: z
    .object({
      publicDirectory: z.boolean().default(false),
      allowStaffSelfJoin: z.boolean().default(false),
      requireApprovalForAttendance: z.boolean().default(true),
    })
    .default(() => ({
      publicDirectory: false,
      allowStaffSelfJoin: false,
      requireApprovalForAttendance: true,
    })),
  status: z.enum(['active', 'suspended']).default('active'),
});
export type Organization = z.infer<typeof OrganizationSchema>;

// Staff (per org) – stored at orgs/{orgId}/staff/{staffId}
export const StaffSchema = z.object({
  id: IdSchema, // staff uid (matches auth uid)
  orgId: OrgIdSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  roles: z.array(z.enum(['admin', 'manager', 'staff'])).min(1),
  active: z.boolean().default(true),
  certifications: z.array(IdSchema).default([]), // references to certifications/{id}
});
export type Staff = z.infer<typeof StaffSchema>;

// Certification
export const CertificationSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  name: NonEmptyString,
  description: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  expiresAfterDays: z.number().int().positive().optional(),
});
export type Certification = z.infer<typeof CertificationSchema>;

// Venue
export const VenueSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  name: NonEmptyString,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  address: z.string().optional(),
  description: z.string().optional(),
});
export type Venue = z.infer<typeof VenueSchema>;

// Zone (child of venue)
export const ZoneSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  venueId: IdSchema,
  name: NonEmptyString,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  capacity: z.number().int().positive().optional(),
});
export type Zone = z.infer<typeof ZoneSchema>;

// Position (role assignable to a staff member during a shift)
export const PositionSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  name: NonEmptyString,
  description: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  requiredCertificationIds: z.array(IdSchema).default([]),
});
export type Position = z.infer<typeof PositionSchema>;

// Event
export const EventSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  name: NonEmptyString,
  start: DateTimeSchema,
  end: DateTimeSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  venueId: IdSchema.optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});
export type Event = z.infer<typeof EventSchema>;

// Shift (under event)
export const ShiftSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  eventId: IdSchema,
  start: DateTimeSchema,
  end: DateTimeSchema,
  positions: z
    .array(
      z.object({
        positionId: IdSchema,
        required: z.number().int().positive(),
      }),
    )
    .default([]),
  zoneId: IdSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  status: z.enum(['open', 'locked', 'completed', 'cancelled']).default('open'),
});
export type Shift = z.infer<typeof ShiftSchema>;

// Attendance (one staff claiming/completing shift)
export const AttendanceSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  shiftId: IdSchema,
  staffId: IdSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).default('pending'),
  approvedAt: TimestampSchema.optional(),
  approvedBy: IdSchema.optional(),
  minutesWorked: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});
export type Attendance = z.infer<typeof AttendanceSchema>;

// Tokens (generic base)
export const BaseTokenSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  type: z.enum(['staffJoin', 'orgPartner']),
  createdAt: TimestampSchema,
  createdBy: IdSchema,
  expiresAt: TimestampSchema.optional(),
  maxUses: z.number().int().positive().optional(),
  uses: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
});
export const StaffJoinTokenSchema = BaseTokenSchema.extend({
  type: z.literal('staffJoin'),
  roles: z.array(z.enum(['admin', 'manager', 'staff']).default('staff')).default(['staff']),
});
export const OrgPartnerTokenSchema = BaseTokenSchema.extend({
  type: z.literal('orgPartner'),
  partnerOrgId: OrgIdSchema,
});
export type StaffJoinToken = z.infer<typeof StaffJoinTokenSchema>;
export type OrgPartnerToken = z.infer<typeof OrgPartnerTokenSchema>;

// Ledger Line (parent scope) – append-only
export const LedgerLineSchema = z.object({
  id: IdSchema,
  parentId: ParentIdSchema,
  periodId: IdSchema, // e.g. YYYYMM or custom
  createdAt: TimestampSchema,
  orgId: OrgIdSchema,
  staffRef: IdSchema, // staffId only; no PII
  attendanceId: IdSchema.optional(),
  shiftId: IdSchema.optional(),
  minutes: z.number().int(),
  rateCents: z.number().int().nonnegative(),
  amountCents: z.number().int(), // minutes * rate or derived
  kind: z.enum(['work', 'correction', 'adjustment']).default('work'),
  reversalOf: IdSchema.optional(), // links to previous line if correction
});
export type LedgerLine = z.infer<typeof LedgerLineSchema>;

// Utility: runtime guard for validating arbitrary data before writes
export function ensureValid<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return parsed.data;
}

// Aggregate export for convenience
export const Schemas = {
  CorporateAccount: CorporateAccountSchema,
  Organization: OrganizationSchema,
  Staff: StaffSchema,
  Certification: CertificationSchema,
  Venue: VenueSchema,
  Zone: ZoneSchema,
  Position: PositionSchema,
  Event: EventSchema,
  Shift: ShiftSchema,
  Attendance: AttendanceSchema,
  StaffJoinToken: StaffJoinTokenSchema,
  OrgPartnerToken: OrgPartnerTokenSchema,
  LedgerLine: LedgerLineSchema,
};

// Branded types
export type Id = z.infer<typeof IdSchema>;
export type OrgId = z.infer<typeof OrgIdSchema>;
export type ParentId = z.infer<typeof ParentIdSchema>;

// Utility: sanitize organization ID (lowercase, alphanumeric + hyphen)
// Re-export sanitizeOrgId (implementation lives in utils.ts for cohesion)
export { sanitizeOrgId } from '@/lib/utils';

// Schema for switch-org API request
export const SwitchOrgRequestSchema = z.object({
  orgId: z.string().min(1),
});
export type SwitchOrgRequest = z.infer<typeof SwitchOrgRequestSchema>;

// ------------------------------
// Auth / Invitation & Access Flows
// NOTE: These were referenced by API routes; defining here to restore type safety.

// Custom Firebase Auth claims we set on users to represent multi-org membership.
// Keep properties optional to allow incremental enrichment.
export interface CustomClaims {
  orgId?: string; // current primary org
  orgIds?: string[]; // all orgs user belongs to
  orgRole?: string; // role in primary org
  orgRoles?: Record<string, string>; // per-org role map
  admin?: boolean; // convenience flag for primary org
  [key: string]: unknown; // forward compatibility
}

// Invite code document (orgs/{orgId}/invites/{code})
export interface InviteCode {
  code: string; // raw invite code (hex)
  orgId: string;
  createdBy: string; // uid
  createdAt: Date;
  expiresAt?: Date;
  maxUses?: number;
  currentUses?: number;
  isActive: boolean;
  role: 'admin' | 'manager' | 'employee'; // role granted when consumed
  notes?: string;
  qrCodeUrl?: string;
  email?: string; // optional pre-targeted email (bulk invites)
}

// Helper: short human friendly composite code <orgId>-<code>
export function generateShortCode(orgId: string, code: string): string {
  return `${orgId}-${code}`;
}

// Parse either full invite code or short code format; returns null if invalid
export function validateInviteCode(raw: string): { orgId: string; inviteCode: string } | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  // Accept raw hex (length >= 8) OR composite orgId-code
  if (/^[a-f0-9]{8,}$/i.test(trimmed)) {
    return { orgId: '', inviteCode: trimmed }; // orgId resolved later (must accompany request)
  }
  const parts = trimmed.split('-');
  if (parts.length < 2) return null;
  const inviteCode = parts.pop();
  const orgId = parts.join('-');
  if (!inviteCode || !/^[a-f0-9]{8,}$/i.test(inviteCode)) return null;
  return { orgId, inviteCode };
}

// Join Organization (either via inviteCode or bootstrap direct orgId)
export const JoinOrgRequestSchema = z
  .object({
    inviteCode: z.string().min(8).optional(),
    orgId: z.string().min(1).optional(),
  })
  .refine((data) => !!data.inviteCode || !!data.orgId, {
    message: 'Either inviteCode or orgId is required',
    path: ['inviteCode'],
  });
export type JoinOrgRequest = z.infer<typeof JoinOrgRequestSchema>;
export interface JoinOrgResponse {
  success: boolean;
  error?: string;
  orgId?: string;
  orgName?: string;
  role?: string;
}

// Create Invite
export const CreateInviteRequestSchema = z.object({
  orgId: z.string().min(1),
  role: z.enum(['admin', 'manager', 'employee']).default('employee'),
  expiresIn: z.number().int().positive().max(30).optional(), // days
  maxUses: z.number().int().positive().max(100).optional(),
  notes: z.string().max(500).optional(),
});
export type CreateInviteRequest = z.infer<typeof CreateInviteRequestSchema>;
export interface CreateInviteResponse {
  success: boolean;
  error?: string;
  invite?: {
    code: string;
    shortCode: string;
    qrCodeUrl?: string;
    expiresAt?: string;
    maxUses?: number;
  };
}

// Request Access (user requests to join an org without invite)
export const RequestAccessSchema = z.object({
  orgId: z.string().min(1),
  message: z.string().max(500).optional(),
});
export type RequestAccess = z.infer<typeof RequestAccessSchema>;

// Approve Access Request
export const ApproveRequestSchema = z.object({
  orgId: z.string().min(1),
  requestId: z.string().min(1),
  approved: z.boolean(),
  role: z.enum(['admin', 'manager', 'employee']).default('employee'),
  notes: z.string().max(500).optional(),
});
export type ApproveRequest = z.infer<typeof ApproveRequestSchema>;

// Org Member (normalized reference for UI; not yet persisted canonical schema)
export interface OrgMember {
  uid: string;
  orgId: string;
  role: 'admin' | 'manager' | 'employee' | 'staff'; // include legacy 'staff'
  joinedAt?: Date;
  addedBy?: string;
  email?: string;
  displayName?: string;
}

// JoinRequest (stored under orgs/{orgId}/joinRequests/{requestId})
export interface JoinRequest {
  id: string;
  orgId: string;
  requestedBy: string;
  requestedByEmail: string;
  requestedByName: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string | null;
}
