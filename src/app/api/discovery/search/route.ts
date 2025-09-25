import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase.server";

function getAllowedOrigins(): string[] {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  return envOrigin ? [envOrigin, ...defaults] : defaults;
}

function allowOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}

export async function GET(req: NextRequest) {
  if (!allowOrigin(req)) {
    return new NextResponse("Forbidden origin", { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase().trim() || "";

    if (!query) {
      return NextResponse.json({
        success: true,
        organizations: [],
      });
    }

    // Query public org profiles where listed=true
    const publicOrgsSnapshot = await adminDb()
      .collectionGroup("public")
      .where("listed", "==", true)
      .limit(20)
      .get();

    const organizations = [];

    for (const doc of publicOrgsSnapshot.docs) {
      const data = doc.data();
      const orgId = doc.ref.parent.parent?.id;

      if (!orgId) continue;

      // Simple text matching
      const name = data.name?.toLowerCase() || "";
      const city = data.city?.toLowerCase() || "";
      const tags = (data.tags || []).join(" ").toLowerCase();
      const searchableText = `${name} ${city} ${tags}`;

      if (searchableText.includes(query)) {
        // Get member count from org members subcollection
        const membersSnapshot = await adminDb()
          .collection(`orgs/${orgId}/members`)
          .limit(1)
          .get();

        organizations.push({
          id: orgId,
          name: data.name,
          description: data.description,
          city: data.city,
          tags: data.tags,
          memberCount: membersSnapshot.size, // Approximate
          allowsRequests: true, // Default for public orgs
        });
      }
    }

    return NextResponse.json({
      success: true,
      organizations,
    });
  } catch (error) {
    console.error("Error searching organizations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search organizations" },
      { status: 500 }
    );
  }
}
