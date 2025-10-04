---
applyTo: "src/components/**/*.tsx"
description: "React component development guidelines"
---

# React Component Guidelines

## Component Structure

```tsx
// ✅ Good component structure
"use client"; // Only if needed (state, effects, events)

import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import type { User } from "@/lib/types";

// Props schema for validation
const userCardPropsSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
  onEdit: z.function().optional(),
});

type UserCardProps = z.infer<typeof userCardPropsSchema>;

export function UserCard({ user, onEdit }: UserCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{user.name}</h3>
      <p className="text-sm text-muted-foreground">{user.email}</p>
      {onEdit && (
        <Button onClick={() => onEdit(user)} size="sm">
          Edit
        </Button>
      )}
    </div>
  );
}
```

## Server vs Client Components

```tsx
// ✅ Default: Server Component (no directive)
import { db } from "@/lib/firebase.server";

export async function UserList() {
  const users = await db.collection("users").get();

  return (
    <div>
      {users.docs.map((doc) => (
        <UserCard key={doc.id} user={doc.data()} />
      ))}
    </div>
  );
}

// ✅ Client Component (interactive)
("use client");

import { useState } from "react";

export function SearchBox() {
  const [query, setQuery] = useState("");

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

## Props & Types

```tsx
// ✅ Interface for props
interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  disabled?: boolean;
}

// ✅ Type for complex props
type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
};
```

## Hooks Best Practices

```tsx
// ✅ Custom hooks for reusable logic
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        const doc = await db.collection("users").doc(userId).get();
        if (!cancelled) {
          setUser(doc.data() as User);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { user, loading, error };
}
```

## Styling with Tailwind

```tsx
// ✅ Use cn() utility for conditional classes
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "highlighted";
  className?: string;
}

export function Card({ children, variant = "default", className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        variant === "highlighted" && "border-primary bg-primary/5",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

## Forms with React Hook Form

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    // Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} type="email" />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register("password")} type="password" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Loading..." : "Login"}
      </button>
    </form>
  );
}
```

## Accessibility

```tsx
// ✅ Semantic HTML and ARIA labels
export function DeleteButton({ onDelete, itemName }: DeleteButtonProps) {
  return (
    <button
      onClick={onDelete}
      aria-label={`Delete ${itemName}`}
      className="text-destructive hover:text-destructive/90"
    >
      <TrashIcon aria-hidden="true" />
    </button>
  );
}

// ✅ Keyboard navigation
export function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
```

## Performance Optimization

```tsx
// ✅ Memoize expensive computations
import { useMemo } from "react";

export function DataTable({ data }: DataTableProps) {
  const sortedData = useMemo(
    () => data.sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  return <table>{/* render sortedData */}</table>;
}

// ✅ Memoize components to prevent re-renders
import { memo } from "react";

export const UserCard = memo(function UserCard({ user }: UserCardProps) {
  return <div>{user.name}</div>;
});

// ✅ Use useCallback for event handlers passed as props
import { useCallback } from "react";

export function Parent() {
  const handleClick = useCallback((id: string) => {
    console.log("Clicked:", id);
  }, []);

  return <Child onClick={handleClick} />;
}
```

## Error Boundaries

```tsx
"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }

    return this.props.children;
  }
}
```

## Component Composition

```tsx
// ✅ Prefer composition over props drilling
export function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}

Card.Header = function CardHeader({ children }: { children: ReactNode }) {
  return <div className="card-header">{children}</div>;
};

Card.Body = function CardBody({ children }: { children: ReactNode }) {
  return <div className="card-body">{children}</div>;
};

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>;
```

## Best Practices Checklist

- [ ] Use Server Components by default
- [ ] Add `'use client'` only when needed
- [ ] Type all props with TypeScript
- [ ] Validate props with Zod schemas when appropriate
- [ ] Use semantic HTML
- [ ] Add ARIA labels for accessibility
- [ ] Implement keyboard navigation
- [ ] Keep components small and focused
- [ ] Extract reusable logic into hooks
- [ ] Use Tailwind classes with cn() utility
- [ ] Memoize expensive operations
- [ ] Handle loading and error states
- [ ] Write descriptive component names
- [ ] Document complex components with comments
