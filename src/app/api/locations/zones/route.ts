import { NextRequest, NextResponse } from "next/server";
import { verifyAuthSession } from "@/lib/auth-utils";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebase.server";
import { CreateZoneRequestSchema } from "@/lib/types";
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
    const validatedData = CreateZoneRequestSchema.parse(body);

    const { venueId, orgId, name, description, isActive } = validatedData;

    // Check if user is admin or manager of the organization
    const customClaims = user.customClaims || {};
    const userOrgRole = customClaims.orgRoles?.[orgId];

    if (!["admin", "manager"].includes(userOrgRole || "")) {
      return NextResponse.json(
        {
          success: false,
          error: "Only organization admins or managers can create zones",
        },
        { status: 403 },
      );
    }

    // Create zone
    const db = getFirestore(adminApp);
    const zoneId = db.collection("_").doc().id;

    const now = new Date();
    const zoneData = {
      id: zoneId,
      venueId,
      orgId,
      name,
      description: description || null,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: now,
      updatedAt: now,
    };

    await db.doc(`orgs/${orgId}/zones/${zoneId}`).set(zoneData);

    return NextResponse.json({
      success: true,
      data: zoneData,
    });
  } catch (error) {
    console.error("Error creating zone:", error);

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

    // Get orgId and optional venueId from query params
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const venueId = searchParams.get("venueId");

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

    // Get zones
    const db = getFirestore(adminApp);
    let query = db
      .collection(`orgs/${orgId}/zones`)
      .where("isActive", "==", true);

    if (venueId) {
      query = query.where("venueId", "==", venueId);
    }

    const zonesSnapshot = await query.get();
    const zones = zonesSnapshot.docs.map((doc) => doc.data());

    return NextResponse.json({
      success: true,
      data: zones,
    });
  } catch (error) {
    console.error("Error fetching zones:", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
