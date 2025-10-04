import { NextRequest, NextResponse } from "next/server";
import { verifyAuthSession } from "@/lib/auth-utils";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebase.server";
import { CreatePositionRequestSchema } from "@/lib/types";
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
    const validatedData = CreatePositionRequestSchema.parse(body);

    const {
      zoneId,
      venueId,
      orgId,
      name,
      description,
      requiredCertifications,
      isActive,
    } = validatedData;

    // Check if user is admin or manager of the organization
    const customClaims = user.customClaims || {};
    const userOrgRole = customClaims.orgRoles?.[orgId];

    if (!["admin", "manager"].includes(userOrgRole || "")) {
      return NextResponse.json(
        {
          success: false,
          error: "Only organization admins or managers can create positions",
        },
        { status: 403 },
      );
    }

    // Create position
    const db = getFirestore(adminApp);
    const positionId = db.collection("_").doc().id;

    const now = new Date();
    const positionData = {
      id: positionId,
      zoneId,
      venueId,
      orgId,
      name,
      description: description || null,
      requiredCertifications: requiredCertifications || [],
      isActive: isActive !== undefined ? isActive : true,
      createdAt: now,
      updatedAt: now,
    };

    await db.doc(`orgs/${orgId}/positions/${positionId}`).set(positionData);

    return NextResponse.json({
      success: true,
      data: positionData,
    });
  } catch (error) {
    console.error("Error creating position:", error);

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

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthSession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get orgId and optional filters from query params
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const venueId = searchParams.get("venueId");
    const zoneId = searchParams.get("zoneId");

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "orgId is required" },
        { status: 400 },
      );
    }

    // Check if user has membership in the organization
    const customClaims = user.customClaims || {};
    const userOrgIds = customClaims.orgIds || [];

    if (!userOrgIds.includes(orgId)) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have access to this organization",
        },
        { status: 403 },
      );
    }

    // Get positions
    const db = getFirestore(adminApp);
    let query = db
      .collection(`orgs/${orgId}/positions`)
      .where("isActive", "==", true);

    if (venueId) {
      query = query.where("venueId", "==", venueId);
    }

    if (zoneId) {
      query = query.where("zoneId", "==", zoneId);
    }

    const positionsSnapshot = await query.get();
    const positions = positionsSnapshot.docs.map((doc) => doc.data());

    return NextResponse.json({
      success: true,
      data: positions,
    });
  } catch (error) {
    console.error("Error fetching positions:", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
