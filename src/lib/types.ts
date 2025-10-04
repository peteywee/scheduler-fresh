import { z } from "zod";

// ============================================================================
// MULTI-TENANT UNIVERSAL DATA MODELS
// ============================================================================
// These schemas define the single source of truth for the multi-tenant
// contractor/subcontractor architecture with Hub-and-Spoke data isolation.

// ============================================================================
// CORPORATE ACCOUNT (Parent/Hub)
// ============================================================================

export const CorporateAccountSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Corporate account name is required"),
  description: z.string().optional(),
  settings: z
    .object({
      defaultBillRate: z.number().optional(),
      defaultRoundingMinutes: z.number().optional(),
      payPeriodType: z.enum(["weekly", "biweekly", "monthly"]).optional(),
    })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CorporateAccount = z.infer<typeof CorporateAccountSchema>;

// ============================================================================
// ORGANIZATION (Sub-Organization/Spoke)
// ============================================================================

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
  ownerUid: z.string(), // Firebase Auth UID of organization owner
  partnerOf: z.array(z.string()).optional(), // Array of corporate account IDs
  settings: z
    .object({
      allowStaffRegistration: z.boolean().default(true),
      requireApprovalForAttendance: z.boolean().default(true),
    })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// ============================================================================
// STAFF MEMBER
// ============================================================================

export const StaffSchema = z.object({
  id: z.string(), // Firebase Auth UID
  orgId: z.string(), // Belongs to one organization
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  role: z.enum(["admin", "manager", "employee"]).default("employee"),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  hireDate: z.date().optional(),
  terminationDate: z.date().optional(),
  certifications: z.array(z.string()).optional(), // Array of certification IDs
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Staff = z.infer<typeof StaffSchema>;

// ============================================================================
// CERTIFICATION
// ============================================================================

export const CertificationSchema = z.object({
  id: z.string(),
  staffId: z.string(), // Owner of certification
  orgId: z.string(), // Organization context
  type: z.string(), // e.g., "Food Handler", "CPR", "Security License"
  issuer: z.string().optional(),
  issueDate: z.date(),
  expiryDate: z.date().optional(),
  documentUrl: z.string().optional(), // Firebase Storage URL
  status: z.enum(["valid", "expired", "pending"]).default("valid"),
  verifiedBy: z.string().optional(), // Admin UID who verified
  verifiedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Certification = z.infer<typeof CertificationSchema>;

// ============================================================================
// LOCATION HIERARCHY: Venue → Zone → Position
// ============================================================================

export const VenueSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string().min(1, "Venue name is required"),
  description: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Venue = z.infer<typeof VenueSchema>;

export const ZoneSchema = z.object({
  id: z.string(),
  venueId: z.string(), // Parent venue
  orgId: z.string(),
  name: z.string().min(1, "Zone name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Zone = z.infer<typeof ZoneSchema>;

export const PositionSchema = z.object({
  id: z.string(),
  zoneId: z.string(), // Parent zone
  venueId: z.string(), // Reference to venue for easier querying
  orgId: z.string(),
  name: z.string().min(1, "Position name is required"),
  description: z.string().optional(),
  requiredCertifications: z.array(z.string()).optional(), // Array of cert types
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Position = z.infer<typeof PositionSchema>;

// ============================================================================
// SHIFTS & ATTENDANCE
// ============================================================================

export const ShiftSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  venueId: z.string().optional(),
  zoneId: z.string().optional(),
  positionId: z.string().optional(),
  start: z.date(),
  end: z.date(),
  title: z.string().optional(),
  assignedTo: z.array(z.string()).optional(), // Array of staff IDs
  notes: z.string().optional(),
  status: z
    .enum(["scheduled", "in-progress", "completed", "cancelled"])
    .default("scheduled"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Shift = z.infer<typeof ShiftSchema>;

export const AttendanceSchema = z.object({
  id: z.string(),
  tenantId: z.string(), // orgId for isolation
  staffId: z.string(),
  venueId: z.string().optional(),
  zoneId: z.string().optional(),
  positionId: z.string().optional(),
  clockIn: z.number(), // Unix timestamp milliseconds
  clockOut: z.number().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  approvedBy: z.string().optional(),
  approvedAt: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Attendance = z.infer<typeof AttendanceSchema>;

// ============================================================================
// TOKEN SYSTEM (for onboarding & partnerships)
// ============================================================================

export const TokenTypeEnum = z.enum(["STAFF_JOIN", "ORG_PARTNER"]);

export const TokenSchema = z.object({
  id: z.string(),
  type: TokenTypeEnum,
  orgId: z.string(), // Organization that created the token
  createdBy: z.string(), // User UID who created
  metadata: z
    .object({
      role: z.string().optional(), // For STAFF_JOIN
      targetCorporateAccountId: z.string().optional(), // For ORG_PARTNER
      notes: z.string().optional(),
    })
    .optional(),
  expiresAt: z.date().optional(),
  maxUses: z.number().optional(),
  currentUses: z.number().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Token = z.infer<typeof TokenSchema>;
export type TokenType = z.infer<typeof TokenTypeEnum>;

// ============================================================================
// CONTRACTS (Parent ↔ Sub-Organization Agreements)
// ============================================================================

export const ContractSchema = z.object({
  id: z.string(),
  parentId: z.string(), // Corporate account ID
  subOrgId: z.string(), // Organization ID
  billRate: z.number(), // Rate per hour
  roundingMinutes: z.number().default(15), // e.g., round to nearest 15 min
  payPeriodType: z.enum(["weekly", "biweekly", "monthly"]).default("weekly"),
  startDate: z.date(),
  endDate: z.date().optional(),
  status: z.enum(["active", "suspended", "terminated"]).default("active"),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Contract = z.infer<typeof ContractSchema>;

// ============================================================================
// LEDGER (Parent's view of billed hours - APPEND-ONLY, SERVER-SIDE ONLY)
// ============================================================================

export const LedgerLineSchema = z.object({
  id: z.string(),
  parentId: z.string(), // Corporate account ID
  periodId: z.string(), // e.g., "2024-W12" for week 12 of 2024
  subOrgId: z.string(),
  staffRef: z.string(), // Staff ID (NO PII)
  venueId: z.string().optional(),
  zoneId: z.string().optional(),
  positionId: z.string().optional(),
  date: z.number(), // Unix timestamp for the work date
  hoursWorked: z.number(),
  billRate: z.number(),
  amountBilled: z.number(),
  attendanceRef: z.string(), // Reference to attendance document
  isReversal: z.boolean().default(false), // True for correction entries
  notes: z.string().optional(),
  createdAt: z.number(), // Server timestamp when line was written
});

export type LedgerLine = z.infer<typeof LedgerLineSchema>;

// ============================================================================
// CUSTOM CLAIMS (Firebase Auth)
// ============================================================================

export const CustomClaimsSchema = z.object({
  orgId: z.string().optional(), // Primary organization
  orgIds: z.array(z.string()).optional(), // All organizations user belongs to
  orgRole: z.string().optional(), // Role in primary org
  orgRoles: z.record(z.string(), z.string()).optional(), // { orgId: role }
  parentAdmin: z.boolean().optional(), // True if user is parent/corporate admin
  parentId: z.string().optional(), // Corporate account ID if parentAdmin
});

export type CustomClaims = z.infer<typeof CustomClaimsSchema>;

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

// Token generation
export const GenerateTokenRequestSchema = z.object({
  type: TokenTypeEnum,
  orgId: z.string(),
  metadata: z
    .object({
      role: z.string().optional(),
      targetCorporateAccountId: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  expiresIn: z.number().optional(), // Days from now
  maxUses: z.number().optional(),
});

export type GenerateTokenRequest = z.infer<typeof GenerateTokenRequestSchema>;

// Location hierarchy API requests
export const CreateVenueRequestSchema = VenueSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateZoneRequestSchema = ZoneSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreatePositionRequestSchema = PositionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Organization switching
export const SwitchOrgRequestSchema = z.object({
  orgId: z.string(),
});

// API Response types
export interface AuthMeResponse {
  authenticated: boolean;
  uid?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoURL?: string;
  customClaims?: CustomClaims;
  primaryOrg?: Organization;
  organizations?: Organization[];
}

export interface TokenGenerationResponse {
  success: boolean;
  token?: {
    id: string;
    code: string; // Formatted token string
    type: TokenType;
    expiresAt?: string;
    maxUses?: number;
  };
  error?: string;
}

export interface LocationResponse {
  success: boolean;
  data?: Venue | Zone | Position;
  error?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function sanitizeOrgId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 20);
}

export function formatPeriodId(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function calculateBillableHours(
  clockIn: number,
  clockOut: number,
  roundingMinutes: number = 15,
): number {
  const milliseconds = clockOut - clockIn;
  const minutes = milliseconds / 1000 / 60;
  const roundedMinutes = Math.ceil(minutes / roundingMinutes) * roundingMinutes;
  return roundedMinutes / 60;
}
