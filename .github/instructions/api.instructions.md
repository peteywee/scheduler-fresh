---
applyTo: "src/app/api/**/*.ts"
description: "Next.js API routes and server actions guidelines"
---

# API Routes & Server Actions Guidelines

## Authentication & Authorization

```typescript
// ✅ Always verify Firebase ID token
import { verifyIdToken } from "@/lib/auth-utils";

export async function POST(request: Request) {
  const token = request.headers.get("Authorization")?.split("Bearer ")[1];

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decodedToken = await verifyIdToken(token);
    const userId = decodedToken.uid;

    // Check custom claims
    if (!decodedToken.parentAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Proceed with authorized request
  } catch (error) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
}
```

## Input Validation

```typescript
// ✅ Always validate with Zod
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(["admin", "staff", "viewer"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validData = createUserSchema.parse(body);

    // Use validData (typed and validated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }
    // Handle other errors
  }
}
```

## Error Handling

```typescript
// ✅ Consistent error responses
export async function GET(request: Request) {
  try {
    // Your logic here
    return Response.json({ data: result });
  } catch (error) {
    console.error("API error:", error);

    // Don't leak sensitive error details
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## HTTP Status Codes

```typescript
// ✅ Use appropriate status codes
// 200 - Success
// 201 - Created
// 204 - No Content
// 400 - Bad Request (validation errors)
// 401 - Unauthorized (no/invalid auth)
// 403 - Forbidden (no permission)
// 404 - Not Found
// 409 - Conflict (duplicate resource)
// 500 - Internal Server Error
```

## Server Actions

```typescript
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

const updateProfileSchema = z.object({
  name: z.string().min(2),
  bio: z.string().max(500).optional(),
});

export async function updateProfile(formData: FormData) {
  // Always validate on server
  const data = updateProfileSchema.parse({
    name: formData.get("name"),
    bio: formData.get("bio"),
  });

  // Verify auth from cookies/session
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Update database
  await db.collection("users").doc(session.userId).update(data);

  // Revalidate relevant paths
  revalidatePath("/profile");

  return { success: true };
}
```

## Rate Limiting

```typescript
// ✅ Implement rate limiting for sensitive endpoints
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  try {
    await limiter.check(ip, 10); // 10 requests per minute
  } catch {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Proceed with request
}
```

## CORS Headers

```typescript
// ✅ Set CORS headers when needed
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN ?? "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
```

## Response Formatting

```typescript
// ✅ Consistent response structure
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
};

export async function GET() {
  const users = await fetchUsers();

  return Response.json<ApiResponse<User[]>>({
    success: true,
    data: users,
  });
}
```

## Security Best Practices

1. **Never trust client input** - Always validate
2. **No secrets in responses** - Sanitize data
3. **No PII in logs** - Redact sensitive info
4. **CSRF protection** - Use Next.js built-in
5. **SQL injection prevention** - Use parameterized queries (Firestore safe by default)
6. **XSS prevention** - Sanitize user content
7. **Authentication on every request** - No session state assumptions

## Performance

```typescript
// ✅ Use streaming for large responses
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of largeDataset) {
        controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
```

## Caching

```typescript
// ✅ Cache responses when appropriate
export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}

// ✅ Or use Next.js cache options
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = "force-dynamic"; // Or 'force-static'
```
