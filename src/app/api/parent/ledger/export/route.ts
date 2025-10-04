import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase.server";

export const dynamic = "force-dynamic";

function bad(status: number, msg: string) {
  return new NextResponse(msg, { status });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");
  const periodId = searchParams.get("periodId");

  if (!parentId || !periodId)
    return bad(400, "parentId and periodId are required");

  // Expect an ID token (Authorization: Bearer <token>) from client
  const authz = req.headers.get("authorization") || "";
  const m = authz.match(/^Bearer\s+(.+)$/i);
  if (!m) return bad(401, "Missing Bearer token");

  let token;
  try {
    token = await adminAuth().verifyIdToken(m[1], true);
  } catch (err) {
    console.error("Token verification failed:", err);
    return bad(401, "Invalid token");
  }

  if (!(token.parentAdmin === true && token.parentId === parentId)) {
    return bad(403, "Not a parent admin for this parentId");
  }

  const db = adminDb();
  const snap = await db
    .collection("parents")
    .doc(parentId)
    .collection("ledgers")
    .doc(periodId)
    .collection("lines")
    .get();

  const rows = [
    [
      "parentId",
      "subOrgId",
      "staffRef",
      "venueId",
      "periodId",
      "hours",
      "billRate",
      "amount",
      "sourceAttendanceId",
      "createdAt",
    ],
  ];
  snap.forEach((d) => {
    const x = d.data();
    rows.push([
      x.parentId,
      x.subOrgId,
      x.staffRef,
      x.venueId,
      x.periodId,
      String(x.hours ?? ""),
      String(x.billRate ?? ""),
      String(x.amount ?? ""),
      x.sourceAttendanceId ?? "",
      String(x.createdAt ?? ""),
    ]);
  });

  const csv = rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v ?? "");
          return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ledger_${parentId}_${periodId}.csv"`,
    },
  });
}
