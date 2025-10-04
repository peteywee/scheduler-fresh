import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase.server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId");
    if (!orgId) return new NextResponse("Missing orgId", { status: 400 });

    const snapshot = await adminDb().collection(`orgs/${orgId}/shifts`).get();
    const shifts = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        start: data.start instanceof Date ? data.start.toISOString() : data.start,
        end: data.end instanceof Date ? data.end.toISOString() : data.end,
        createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt.toISOString() : data.updatedAt,
      };
    });

    return NextResponse.json(shifts);
  } catch (err) {
    console.error("Error fetching shifts:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
