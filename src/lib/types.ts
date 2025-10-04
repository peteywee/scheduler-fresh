import { z } from "zod";

// User data model
export const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  primaryOrgId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Organization data model
export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
  ownerUid: z.string(),
  isPublic: z.boolean().default(false), // For org directory
  settings: z
    .object({
      allowPublicJoinRequests: z.boolean().default(true),
      requireApprovalForJoin: z.boolean().default(true),
    })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// Organization member data model
export const OrgMemberSchema = z.object({
  uid: z.string(),
  orgId: z.string(),
  role: z.enum(["admin", "manager", "employee"]),
  joinedAt: z.date(),
  addedBy: z.string(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
});

export type OrgMember = z.infer<typeof OrgMemberSchema>;

// Invite code data model
export const InviteCodeSchema = z.object({
  code: z.string(),
  orgId: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
  maxUses: z.number().optional(), // null for unlimited
  currentUses: z.number().default(0),
  isActive: z.boolean().default(true),
  role: z.enum(["admin", "manager", "employee"]).default("employee"),
  notes: z.string().optional(),
});

export type InviteCode = z.infer<typeof InviteCodeSchema>;

// Join request data model
export const JoinRequestSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  requestedBy: z.string(),
  requestedByEmail: z.string().email(),
  requestedByName: z.string().optional(),
  message: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  createdAt: z.date(),
  reviewedAt: z.date().optional(),
  reviewedBy: z.string().optional(),
  reviewNotes: z.string().optional(),
});

export type JoinRequest = z.infer<typeof JoinRequestSchema>;

// Custom claims for Firebase Auth
export const CustomClaimsSchema = z.object({
  orgId: z.string().optional(), // Primary org
  orgIds: z.array(z.string()).optional(), // All orgs user belongs to
  admin: z.boolean().optional(), // Global admin flag
  orgRole: z.string().optional(), // Role in primary org
  orgRoles: z.record(z.string(), z.string()).optional(), // Role per org { orgId: role }
});

export type CustomClaims = z.infer<typeof CustomClaimsSchema>;

// API request/response schemas
export const CreateInviteRequestSchema = z.object({
  orgId: z.string(),
  role: z.enum(["admin", "manager", "employee"]).default("employee"),
  expiresIn: z.number().optional(), // Days from now
  maxUses: z.number().optional(),
  notes: z.string().optional(),
});

export const JoinOrgRequestSchema = z.object({
  inviteCode: z.string().optional(),
  orgId: z.string().optional(), // For direct join without invite
});

export const RequestAccessSchema = z.object({
  orgId: z.string(),
  message: z.string().optional(),
});

export const ApproveRequestSchema = z.object({
  requestId: z.string(),
  approved: z.boolean(),
  role: z.enum(["admin", "manager", "employee"]).default("employee"),
  notes: z.string().optional(),
  orgId: z.string().optional(),
});

export const SwitchOrgRequestSchema = z.object({
  orgId: z.string(),
});

// API response types
export interface CreateInviteResponse {
  success: boolean;
  invite?: {
    code: string;
    shortCode: string; // formatted as orgId-code
    qrCodeUrl: string;
    expiresAt?: string;
    maxUses?: number;
  };
  error?: string;
}

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

export interface JoinOrgResponse {
  success: boolean;
  orgId?: string;
  orgName?: string;
  role?: string;
  error?: string;
}

export interface OrgSearchResponse {
  success: boolean;
  organizations?: Array<{
    id: string;
    name: string;
    description?: string;
    memberCount: number;
    allowsRequests: boolean;
  }>;
  error?: string;
}

// Utility functions for validation
export function validateInviteCode(
  code: string,
): { orgId: string; inviteCode: string } | null {
  const match = code.match(/^([a-zA-Z0-9_-]+)-([a-zA-Z0-9]+)$/);
  if (!match) return null;

  return {
    orgId: match[1],
    inviteCode: match[2],
  };
}

export function generateShortCode(orgId: string, inviteCode: string): string {
  return `${orgId}-${inviteCode}`;
}

export function sanitizeOrgId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 20);
}

// Shift data model
export const ShiftSchema = z.object({
  id: z.string(),
  orgId: z.string(),

  venueId: z.string().optional(), // Reference to venue where shift takes place
  standId: z.string().optional(), // Reference to stand/booth/zone within venue
  start: z.date(),
  end: z.date(),
  title: z.string().optional(),
  assignedTo: z.array(z.string()).optional(), // Array of user UIDs
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Shift = z.infer<typeof ShiftSchema>;

// Venue data model
export const VenueSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string().min(1, "Venue name is required"),
  description: z.string().optional(),
  address: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Venue = z.infer<typeof VenueSchema>;

// Stand/Booth/Zone data model (child of Venue)
export const StandSchema = z.object({
  id: z.string(),
  venueId: z.string(), // Parent venue reference
  orgId: z.string(),
  name: z.string().min(1, "Stand name is required"), // e.g., "Booth 12", "Zone A"
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Stand = z.infer<typeof StandSchema>;
