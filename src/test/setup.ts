import { beforeAll, afterAll } from 'vitest'
import { config } from 'dotenv'

// Load environment variables for testing
config({ path: '.env.example' })

// Set test environment variables
Object.assign(process.env, {
  NODE_ENV: 'test',
  NEXT_PHASE: 'test',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-test-project',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
})

beforeAll(async () => {
  // Any global test setup can go here
})

afterAll(async () => {
  // Any global test cleanup can go here
})