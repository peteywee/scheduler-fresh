import { NextRequest, NextResponse } from "next/server";
import { verifyAuthSession } from "@/lib/auth-utils";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebase.server";
import { CreateVenueRequestSchema } from "@/lib/types";
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
    const validatedData = CreateVenueRequestSchema.parse(body);

    const { orgId, name, description, address, isActive } = validatedData;

    // Check if user is admin or manager of the organization
    const customClaims = user.customClaims || {};
    const userOrgRole = customClaims.orgRoles?.[orgId];

    if (!["admin", "manager"].includes(userOrgRole || "")) {
      return NextResponse.json(
        {
          success: false,
          error: "Only organization admins or managers can create venues",
        },
        { status: 403 },
      );
    }

    // Create venue
    const db = getFirestore(adminApp);
    const venueId = db.collection("_").doc().id;

    const now = new Date();
    const venueData = {
      id: venueId,
      orgId,
      name,
      description: description || null,
      address: address || null,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: now,
      updatedAt: now,
    };

    await db.doc(`orgs/${orgId}/venues/${venueId}`).set(venueData);

    return NextResponse.json({
      success: true,
      data: venueData,
    });
  } catch (error) {
    console.error("Error creating venue:", error);

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

    // Get orgId from query params
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

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

    // Get venues
    const db = getFirestore(adminApp);
    const venuesSnapshot = await db
      .collection(`orgs/${orgId}/venues`)
      .where("isActive", "==", true)
      .get();

    const venues = venuesSnapshot.docs.map((doc) => doc.data());

    return NextResponse.json({
      success: true,
      data: venues,
    });
  } catch (error) {
    console.error("Error fetching venues:", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
