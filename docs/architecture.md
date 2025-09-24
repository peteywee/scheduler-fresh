# Architecture Overview · Scheduler Fresh

## Tech Stack

- **Frontend:** Next.js 15 with React 18, Tailwind CSS, shadcn/ui components
- **Backend:** Next.js API Routes (no Cloud Functions), Firebase Admin SDK
- **Database:** Firestore with security rules and emulator support
- **Storage:** Firebase Storage with access rules
- **AI:** Google Genkit flows for conflict detection using Gemini 2.5 Flash
- **Auth:** Firebase Authentication with session cookies and CSRF protection

## Application Structure

### Route Groups

- **`src/app/(app)/**`\*\* - Protected authenticated app pages (dashboard, conflict-detector, requests, settings)
- **`src/app/(auth)/**`\*\* - Public authentication pages (login, signup)
- **`src/app/api/**`\*\* - API route handlers (no Cloud Functions)

### Authentication & Session Management

- **Client SDK:** `src/lib/firebase.ts` - Firebase Auth/Firestore/Storage initialization with emulator connections
- **Admin SDK:** `src/lib/firebase.server.ts` - Server-side Firebase Admin using `FIREBASE_SERVICE_ACCOUNT_JSON`
- **Session Endpoints:**
  - `POST /api/auth/session` - Creates Firebase session cookie from ID token
  - `DELETE /api/auth/session` - Clears session cookie
  - `GET /api/auth/me` - Returns current user from session cookie
  - `POST /api/auth/csrf` - CSRF token generation and validation
- **Security:** CSRF double-submit protection, origin validation against `NEXT_PUBLIC_BASE_URL`, session cookie revocation support

### AI Integration (Genkit)

- **Configuration:** `src/ai/genkit.ts` - Genkit setup with Google AI plugin
- **Flows:** `src/ai/flows/conflict-flagging.ts` - AI flow with zod input/output schemas for schedule conflict detection
- **Bridge:** `src/app/actions/conflict-actions.ts` - Server actions that connect forms to AI flows
- **Pattern:** zod validation → AI flow execution → structured response

### Component Architecture

- **UI Primitives:** `src/components/ui/**` - shadcn/ui base components (buttons, forms, dialogs)
- **Business Components:** `src/components/**` - Application-specific components
  - `conflict-detector/` - AI conflict detection interface
  - `layout/` - App shell, navigation, headers
  - `schedule/` - Schedule management components
  - `auth/` - Authentication forms and flows

### Firebase Configuration

- **Emulators:** Auth (9099), Firestore (8080), Storage (9199), UI (4000)
- **Rules:** `firestore.rules` and `storage.rules` with security rules and tenancy patterns
- **Indexes:** `firestore.indexes.json` for query optimization

## Development Workflow

- **Package Manager:** pnpm-only (no npm/yarn)
- **Dev Servers:** `pnpm run dev` (both Next.js on 3000 + Firebase emulators)
- **Quality Gates:** TypeScript, ESLint (max-warnings=0), build validation, gitleaks security scanning
- **Security:** Husky pre-commit hooks with lint-staged and secret scanning

## Import Aliases

- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`
- `@/ai` → `src/ai`
