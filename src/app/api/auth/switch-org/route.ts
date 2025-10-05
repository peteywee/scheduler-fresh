import { NextRequest } from "next/server";
import { SwitchOrgRequestSchema, sanitizeOrgId } from "@/lib/types";
import { createApiRoute, authorize, validate } from "@/lib/api/utils";
import { switchUserPrimaryOrg } from "@/lib/auth-utils";
import { adminAuth } from "@/lib/firebase.server";

interface SwitchOrgContext {
  uid: string;
  data: { orgId: string };
}

const rawHandler = async (_req: NextRequest, context: SwitchOrgContext) => {
  const orgId = sanitizeOrgId(context.data.orgId);
  await switchUserPrimaryOrg(context.uid, orgId);
  await adminAuth().revokeRefreshTokens(context.uid);
  return { orgId };
};

function isSwitchOrgContext(context: unknown): context is SwitchOrgContext {
  if (typeof context !== "object" || context === null) return false;
  const c = context as Record<string, unknown>;
  return typeof c.uid === "string" && typeof (c.data as Record<string, unknown> | undefined)?.orgId === "string";
}

export const POST = createApiRoute(async (req, ctx) => {
  if (!isSwitchOrgContext(ctx)) {
    return { orgId: "" }; // validate middleware will have already rejected bad input
  }
  return rawHandler(req as NextRequest, ctx);
}, authorize(), validate(SwitchOrgRequestSchema));
