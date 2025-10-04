---
applyTo: "**/*.ts"
description: "TypeScript coding standards and best practices"
---

# TypeScript Guidelines

## Type Safety

1. **Strict mode enabled** - Never disable strict checks
2. **No `any` types** unless absolutely necessary (document with comment)
3. **Explicit return types** on exported functions
4. **Interface over type** for object shapes
5. **Type over interface** for unions, intersections, and mapped types

## Imports & Exports

```typescript
// ✅ Good: Named exports
export function calculateTotal(items: Item[]): number { ... }
export interface User { ... }

// ❌ Bad: Default exports (except React components)
export default function foo() { ... }

// ✅ Good: Grouped imports
import { useState, useEffect } from 'react';
import { z } from 'zod';

import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';

import { Button } from './Button';
```

## Type Annotations

```typescript
// ✅ Good: Explicit parameter and return types
function processData(input: string, options: Options): Result {
  return { ... };
}

// ✅ Good: Type inference for simple cases
const numbers = [1, 2, 3]; // number[]
const config = { timeout: 5000 }; // { timeout: number }

// ❌ Bad: Redundant annotations
const name: string = "John"; // Remove annotation
```

## Generics

```typescript
// ✅ Good: Descriptive generic names
function map<TInput, TOutput>(
  items: TInput[],
  transform: (item: TInput) => TOutput
): TOutput[] { ... }

// ✅ Good: Constrained generics
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

## Null Safety

```typescript
// ✅ Good: Optional chaining
const userName = user?.profile?.name;

// ✅ Good: Nullish coalescing
const displayName = userName ?? "Anonymous";

// ✅ Good: Type guards
if (user && user.profile) {
  console.log(user.profile.name);
}
```

## Enums vs Union Types

```typescript
// ✅ Prefer: Union types (tree-shakeable)
type Status = "pending" | "approved" | "rejected";

// ⚠️ Use sparingly: Enums (generate runtime code)
enum Role {
  Admin = "admin",
  Staff = "staff",
  Viewer = "viewer",
}
```

## Type Utilities

```typescript
// ✅ Good: Built-in utilities
type PartialUser = Partial<User>;
type ReadonlyConfig = Readonly<Config>;
type UserKeys = keyof User;
type UserName = Pick<User, "firstName" | "lastName">;
type UserWithoutId = Omit<User, "id">;
```

## Runtime Validation

```typescript
// ✅ Good: Zod schemas for runtime validation
import { z } from "zod";

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().positive(),
});

type User = z.infer<typeof userSchema>;

// Validate at runtime
const user = userSchema.parse(data);
```

## Error Handling

```typescript
// ✅ Good: Typed errors
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// ✅ Good: Result types for expected failures
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

## Module Declarations

```typescript
// For third-party modules without types
declare module "some-package" {
  export function doSomething(input: string): number;
}

// For global augmentation
declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
  }
}
```

## Best Practices

1. **Use const assertions** for literal types: `as const`
2. **Avoid type assertions** (`as Type`) unless necessary
3. **Use discriminated unions** for complex state
4. **Document complex types** with JSDoc comments
5. **Keep types DRY** - extract and reuse
6. **Co-locate types** with related code
7. **Use satisfies operator** (TS 4.9+) to validate types without widening
