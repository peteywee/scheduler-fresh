import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { OrgSearchResponse } from "@/lib/types";

// Lazy initialize to avoid build-time errors
function getDb() {
  adminInit();
  return getFirestore();
}

function allowOrigin(req: NextRequest): boolean {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const allowed = envOrigin ? [envOrigin, ...defaults] : defaults;
  return allowed.includes(origin);
}

export async function GET(req: NextRequest) {
  if (!allowOrigin(req)) {
    return new NextResponse("Forbidden origin", { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // Get public organizations from directory
  const directoryQuery = getDb().collection("directory/orgs").limit(limit);
    
    // Basic text search (in production, you'd use a proper search service)
    const directorySnapshot = await directoryQuery.get();
    
    const organizations = [];
    
    for (const doc of directorySnapshot.docs) {
      const orgData = doc.data();
      const orgId = doc.id;
      
      // Filter by search query if provided
      if (query && !orgData.name?.toLowerCase().includes(query.toLowerCase()) &&
          !orgData.description?.toLowerCase().includes(query.toLowerCase())) {
        continue;
      }

      // Get member count
      const membersSnapshot = await db
        .collection(`orgs/${orgId}/members`)
        .count()
        .get();
      
      // Get organization details
      const orgDoc = await getDb().doc(`orgs/${orgId}`).get();
      const fullOrgData = orgDoc.data();

      organizations.push({
        id: orgId,
        name: orgData.name || fullOrgData?.name || "Unknown Organization",
        description: orgData.description || fullOrgData?.description,
        memberCount: membersSnapshot.data().count,
        allowsRequests: fullOrgData?.settings?.allowPublicJoinRequests !== false,
      });
    }

    return NextResponse.json<OrgSearchResponse>({
      success: true,
      organizations,
    });
  } catch (error) {
    console.error("Error searching organizations:", error);
    return NextResponse.json<OrgSearchResponse>(
      { success: false, error: "Failed to search organizations" },
      { status: 500 }
    );
  }
}