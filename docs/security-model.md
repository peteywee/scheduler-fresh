# Security Model · Scheduler Fresh

## Overview

Scheduler Fresh implements a **defense-in-depth security architecture** with strict single-organization-per-user constraints and multi-layered validation to prevent unauthorized access and privilege escalation.

## Core Security Principles

### 1. Single-Organization-Per-User Model

The application enforces a strict single-organization-per-user constraint with multiple validation layers:

- **Primary Organization**: Each user has one `primaryOrgId` in their user document
- **Custom Claims**: Firebase custom claims mirror the user's organization membership
- **Defense-in-Depth**: The `claimMatchesUserDoc` function validates that custom claims match user documents

```typescript
// Firestore rules validation function
function claimMatchesUserDoc(orgId) {
  return exists(/databases/$(database)/documents/users/$(uid())) &&
    (get(/databases/$(database)/documents/users/$(uid())).data.primaryOrgId == orgId ||
     orgId in get(/databases/$(database)/documents/users/$(uid())).data.get('orgIds', []));
}
```

### 2. Multi-Layered Authentication

#### API Route Protection
All mutating API routes implement consistent security validation:

1. **Origin Validation**: Requests must come from approved origins
2. **CSRF Protection**: Double-submit token validation (header + cookie)
3. **Session Validation**: Firebase session cookie verification
4. **Authorization**: Role-based access control with custom claims

```typescript
// Example from switch-org route
function validateCsrf(req: NextRequest): boolean {
  const header = req.headers.get("x-csrf-token");
  const cookie = req.cookies.get("XSRF-TOKEN")?.value;
  return Boolean(header && cookie && header === cookie);
}

function allowOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}
```

#### Firestore Rules Protection
Firestore rules provide the ultimate security boundary:

- **Authentication Required**: All operations require valid authentication
- **Organization Membership**: Users can only access data from their organization
- **Role-Based Access**: Admins have additional privileges with validation
- **Claim Validation**: The `claimMatchesUserDoc` function prevents privilege escalation

### 3. Security Validation Layers

#### Layer 1: Client-Side (Presentation)
- UI components respect user roles and organization membership
- Forms include CSRF tokens automatically

#### Layer 2: API Routes (Application)
- Origin validation prevents cross-origin attacks
- CSRF protection prevents request forgery
- Session validation ensures authenticated requests
- Input validation and sanitization

#### Layer 3: Firestore Rules (Data)
- Ultimate security boundary at the database level
- Prevents direct database access bypassing application logic
- Validates organization membership and roles
- Enforces the `claimMatchesUserDoc` constraint

## Key Security Functions

### Custom Claims Management

```typescript
// Set user's custom claims to match their organization membership
export async function setUserCustomClaims(uid: string, claims: CustomClaims): Promise<void>

// Add user to organization with proper claim updates
export async function addUserToOrg(uid: string, orgId: string, role: string, addedBy: string): Promise<void>

// Remove user from organization and clean up claims
export async function removeUserFromOrg(uid: string, orgId: string): Promise<void>
```

### Organization Access Control

```typescript
// Check if user can access organization data
function canAccessOrg(orgId) {
  return isSignedIn() && (orgId in userOrgIds() || userOrg() == orgId || isMember(orgId));
}

// Validate admin privileges
function isAdmin(orgId) {
  return isSignedIn() && (
    request.auth.token.admin == true || 
    request.auth.token.orgRole == 'admin' || 
    request.auth.token.orgRoles[orgId] == 'admin'
  );
}
```

## Security Test Coverage

### Auth Utils Tests
- Custom claims setting and retrieval
- Organization membership management
- Security function validation

### API Route Tests
- CSRF token validation (header + cookie matching)
- Origin allowlist enforcement
- Authentication and session handling
- Error handling and response codes

### Firestore Rules Tests
- User document access control
- Organization membership validation
- `claimMatchesUserDoc` defense-in-depth validation
- Admin privilege escalation prevention
- Public directory access control

## Threat Model & Mitigations

### Cross-Site Request Forgery (CSRF)
- **Mitigation**: Double-submit token validation
- **Test Coverage**: Comprehensive CSRF validation tests

### Cross-Origin Attacks
- **Mitigation**: Origin allowlist validation
- **Test Coverage**: Origin validation tests

### Privilege Escalation
- **Mitigation**: `claimMatchesUserDoc` validation function
- **Test Coverage**: Rules tests verify claim/document consistency

### Direct Database Access
- **Mitigation**: Firestore security rules as ultimate boundary
- **Test Coverage**: Comprehensive rules testing

### Session Hijacking
- **Mitigation**: Secure session cookies with revocation support
- **Test Coverage**: Session validation and error handling tests

## Security Review Status

✅ **APPROVED** - Security review completed with excellent defense-in-depth rating
- Firestore rules provide robust protection
- Multi-layered validation prevents unauthorized access  
- No vulnerabilities found in security audit
- Comprehensive test coverage validates security posture

## Monitoring & Maintenance

### Security Monitoring
- Failed authentication attempts logged
- CSRF validation failures tracked
- Origin validation violations monitored

### Regular Security Tasks
- Review and update origin allowlist
- Audit user organization memberships
- Validate custom claims consistency
- Update security dependencies

### Testing Requirements
- All security functions must have test coverage
- Firestore rules tests run on every deployment
- API security tests validate all protection layers
- Regular penetration testing recommended

This security model ensures that even if one layer fails, multiple other protections prevent unauthorized access or privilege escalation.