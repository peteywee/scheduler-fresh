// src/app/api/orgs/[orgId]/members/route.ts

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase.server";
import { OrgMember } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session?.uid) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { orgId } = params;

    // Security Check: Verify the requester is a member of the organization
    const requesterMemberDoc = await adminDb
      .collection(`orgs/${orgId}/members`)
      .doc(session.uid)
      .get();

    if (!requesterMemberDoc.exists) {
      return new NextResponse("Forbidden: You are not a member of this organization.", { status: 403 });
    }

    // Fetch all members of the organization
    const membersSnapshot = await adminDb.collection(`orgs/${orgId}/members`).get();
    const members = membersSnapshot.docs.map(doc => doc.data() as OrgMember);

    return NextResponse.json(members);
  } catch (error) {
    console.error(`Error fetching members for org ${params.orgId}:`, error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
