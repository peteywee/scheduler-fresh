import { NextRequest, NextResponse } from "next/server";
import { verifyAuthSession } from "@/lib/auth-utils";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebase.server";
import { GenerateTokenRequestSchema } from "@/lib/types";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthSession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Parse request body
    const body = await req.json();
    const validatedData = GenerateTokenRequestSchema.parse(body);

    const { type, orgId, metadata, expiresIn, maxUses } = validatedData;

    // Check if user is admin of the organization
    const customClaims = user.customClaims || {};
    const userOrgRole = customClaims.orgRoles?.[orgId];

    if (userOrgRole !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Only organization admins can generate tokens",
        },
        { status: 403 },
      );
    }

    // Generate token
    const db = getFirestore(adminApp);
    const tokenId = db.collection("_").doc().id; // Generate random ID

    const now = new Date();
    const expiresAt = expiresIn
      ? new Date(now.getTime() + expiresIn * 24 * 60 * 60 * 1000)
      : undefined;

    const tokenData = {
      id: tokenId,
      type,
      orgId,
      createdBy: user.uid,
      metadata: metadata || {},
      expiresAt,
      maxUses: maxUses || null,
      currentUses: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.doc(`orgs/${orgId}/tokens/${tokenId}`).set(tokenData);

    // Generate formatted token code
    const tokenCode = `${type}-${orgId}-${tokenId}`;

    return NextResponse.json({
      success: true,
      token: {
        id: tokenId,
        code: tokenCode,
        type,
        expiresAt: expiresAt?.toISOString(),
        maxUses,
      },
    });
  } catch (error) {
    console.error("Error generating token:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
