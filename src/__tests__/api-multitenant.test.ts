import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as generateTokenPOST } from "@/app/api/tokens/generate/route";
import {
  POST as createVenuePOST,
  GET as _getVenuesGET,
} from "@/app/api/locations/venues/route";
import {
  POST as createZonePOST,
  GET as _getZonesGET,
} from "@/app/api/locations/zones/route";
import {
  POST as createPositionPOST,
  GET as _getPositionsGET,
} from "@/app/api/locations/positions/route";

// Mock the auth utils
vi.mock("@/lib/auth-utils", () => ({
  verifyAuthSession: vi.fn(),
}));

// Mock firebase admin
vi.mock("@/lib/firebase.server", () => ({
  adminApp: {},
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        id: "test-id-123",
      })),
    })),
    doc: vi.fn(() => ({
      set: vi.fn(),
    })),
  })),
}));

import { verifyAuthSession } from "@/lib/auth-utils";

describe("Token Generation API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(verifyAuthSession).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/tokens/generate", {
      method: "POST",
      body: JSON.stringify({
        type: "STAFF_JOIN",
        orgId: "org-1",
      }),
    });

    const response = await generateTokenPOST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for non-admin users", async () => {
    vi.mocked(verifyAuthSession).mockResolvedValue({
      uid: "user-1",
      customClaims: {
        orgRoles: { "org-1": "employee" },
      },
    } as any);

    const request = new NextRequest("http://localhost/api/tokens/generate", {
      method: "POST",
      body: JSON.stringify({
        type: "STAFF_JOIN",
        orgId: "org-1",
      }),
    });

    const response = await generateTokenPOST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it("should successfully generate token for admin users", async () => {
    vi.mocked(verifyAuthSession).mockResolvedValue({
      uid: "admin-1",
      customClaims: {
        orgRoles: { "org-1": "admin" },
      },
    } as any);

    const request = new NextRequest("http://localhost/api/tokens/generate", {
      method: "POST",
      body: JSON.stringify({
        type: "STAFF_JOIN",
        orgId: "org-1",
        metadata: { role: "employee" },
        expiresIn: 7,
        maxUses: 10,
      }),
    });

    const response = await generateTokenPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.token.type).toBe("STAFF_JOIN");
  });
});

describe("Venue API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 for unauthenticated create requests", async () => {
    vi.mocked(verifyAuthSession).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/locations/venues", {
      method: "POST",
      body: JSON.stringify({
        orgId: "org-1",
        name: "Test Venue",
      }),
    });

    const response = await createVenuePOST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it("should return 403 for non-admin/manager users", async () => {
    vi.mocked(verifyAuthSession).mockResolvedValue({
      uid: "user-1",
      customClaims: {
        orgRoles: { "org-1": "employee" },
      },
    } as any);

    const request = new NextRequest("http://localhost/api/locations/venues", {
      method: "POST",
      body: JSON.stringify({
        orgId: "org-1",
        name: "Test Venue",
      }),
    });

    const response = await createVenuePOST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it("should successfully create venue for admin users", async () => {
    vi.mocked(verifyAuthSession).mockResolvedValue({
      uid: "admin-1",
      customClaims: {
        orgRoles: { "org-1": "admin" },
      },
    } as any);

    const request = new NextRequest("http://localhost/api/locations/venues", {
      method: "POST",
      body: JSON.stringify({
        orgId: "org-1",
        name: "Test Venue",
        description: "A test venue",
        address: "123 Main St",
        isActive: true,
      }),
    });

    const response = await createVenuePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.name).toBe("Test Venue");
  });
});

describe("Zone API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully create zone for admin users", async () => {
    vi.mocked(verifyAuthSession).mockResolvedValue({
      uid: "admin-1",
      customClaims: {
        orgRoles: { "org-1": "admin" },
      },
    } as any);

    const request = new NextRequest("http://localhost/api/locations/zones", {
      method: "POST",
      body: JSON.stringify({
        venueId: "venue-1",
        orgId: "org-1",
        name: "Test Zone",
        description: "A test zone",
        isActive: true,
      }),
    });

    const response = await createZonePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.name).toBe("Test Zone");
  });
});

describe("Position API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully create position for manager users", async () => {
    vi.mocked(verifyAuthSession).mockResolvedValue({
      uid: "manager-1",
      customClaims: {
        orgRoles: { "org-1": "manager" },
      },
    } as any);

    const request = new NextRequest(
      "http://localhost/api/locations/positions",
      {
        method: "POST",
        body: JSON.stringify({
          zoneId: "zone-1",
          venueId: "venue-1",
          orgId: "org-1",
          name: "Test Position",
          description: "A test position",
          requiredCertifications: ["CPR", "First Aid"],
          isActive: true,
        }),
      },
    );

    const response = await createPositionPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.name).toBe("Test Position");
    expect(data.data.requiredCertifications).toEqual(["CPR", "First Aid"]);
  });
});
