import { beforeAll, afterAll } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnvLocal: RulesTestEnvironment;

beforeAll(async () => {
  // Load the actual Firestore rules
  const rulesPath = resolve(__dirname, '../../firestore.rules');
  const rulesContent = readFileSync(rulesPath, 'utf8');

  testEnvLocal = await initializeTestEnvironment({
    projectId: 'demo-test-project',
    firestore: {
      rules: rulesContent,
      host: '127.0.0.1',
      port: 8080,
    },
  });

  // Make the test environment available globally
  (globalThis as unknown as { testEnv: RulesTestEnvironment }).testEnv = testEnvLocal;
});

afterAll(async () => {
  if (testEnvLocal) {
    await testEnvLocal.cleanup();
  }
});

// Type declaration for global test environment
declare global {
  // Augment globalThis with testEnv (assigned at runtime)
  // Using interface merge avoids var/let redeclaration issues.

  // Provide typing for testEnv on globalThis
  // (consumer files cast through (globalThis as any).testEnv)

  interface GlobalThis {
    testEnv: RulesTestEnvironment;
  }
}
