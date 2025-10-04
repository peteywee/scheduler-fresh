// Minimal ambient declarations for firebase-functions used in local typechecking
// This file is intentionally small to avoid pulling in the real package during tsc in this environment.

declare module "firebase-functions" {
  export type EventContext = {
    params: Record<string, unknown>;
    auth?: unknown;
    timestamp?: string;
  };

  export type Change<T> = {
    before: T & { exists: boolean };
    after: T & { exists: boolean };
  };

  export const firestore: {
    document: (path: string) => {
      onWrite: (
        fn: (change: Change<unknown>, context: EventContext) => unknown,
      ) => unknown;
    };
  };

  const functions: unknown;
  export default functions;
}
