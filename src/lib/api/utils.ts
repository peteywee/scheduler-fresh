import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { adminAuth } from '@/lib/firebase.server';

// ---- Types -----------------------------------------------------------------

export interface ApiContextBase {
  uid?: string; // set by authorize()
  data?: unknown; // set by validate()
  [key: string]: unknown; // extensible for future middlewares
}

export type MiddlewareResult = ApiContextBase | NextResponse;
export type Middleware = (
  req: NextRequest & { context: ApiContextBase },
) => Promise<MiddlewareResult> | MiddlewareResult;

export type ApiHandler<Body extends Record<string, unknown> = Record<string, unknown>> = (
  req: NextRequest & { context: ApiContextBase },
  context: ApiContextBase,
) => Promise<Body> | Body;

interface ApiErrorShape {
  success: false;
  error: string;
  details?: unknown;
}

type ApiSuccessShape<T extends Record<string, unknown>> = T & { success: true };
type ApiResponseShape<T extends Record<string, unknown>> = ApiSuccessShape<T> | ApiErrorShape;

// ---- Helpers ----------------------------------------------------------------

const apiResponse = <T extends Record<string, unknown>>(
  status: number,
  data: ApiResponseShape<T>,
) => NextResponse.json(data, { status });

// Higher-order function to create API routes with error handling and middleware
export const createApiRoute = <T extends Record<string, unknown> = Record<string, unknown>>(
  handler: ApiHandler<T>,
  ...middlewares: Middleware[]
) => {
  return async (req: NextRequest) => {
    // Initialize a stable context container (no any casts)
    const enrichedReq = req as NextRequest & { context: ApiContextBase };
    if (!enrichedReq.context) {
      enrichedReq.context = {} as ApiContextBase;
    }
    try {
      for (const middleware of middlewares) {
        const result = await middleware(enrichedReq);
        if (result instanceof NextResponse) {
          return result; // Short-circuit response
        }
        Object.assign(enrichedReq.context, result);
      }

      const body = await handler(enrichedReq, enrichedReq.context);
      return apiResponse<T>(200, { success: true, ...(body as T) } as ApiSuccessShape<T>);
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      const errorMessage = error?.message || 'An unexpected error occurred.';
      const statusCode = error?.statusCode || 500;
      // Avoid logging potentially sensitive data
      console.error('API Error:', errorMessage);
      return apiResponse<T>(statusCode, { success: false, error: errorMessage });
    }
  };
};

// Middleware to authorize requests based on session cookie
export const authorize = (): Middleware => {
  return async (req) => {
    const session = req.cookies.get('__session')?.value;
    if (!session) {
      return apiResponse(401, { success: false, error: 'Authentication required' });
    }
    try {
      const decoded = await adminAuth().verifySessionCookie(session, true);
      return { uid: decoded.uid };
    } catch {
      return apiResponse(401, { success: false, error: 'Invalid session' });
    }
  };
};

// Middleware to validate JSON body against a Zod schema
export const validate = <S extends ZodSchema<unknown>>(schema: S): Middleware => {
  return async (req) => {
    try {
      const body = await req.json();
      const data = schema.parse(body);
      return { data };
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        return apiResponse(400, {
          success: false,
          error: 'Invalid request data',
          details: (err as ZodError).issues,
        });
      }
      return apiResponse(400, { success: false, error: 'Invalid JSON format' });
    }
  };
};
