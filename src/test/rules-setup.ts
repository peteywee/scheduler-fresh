import { beforeAll, afterAll } from 'vitest'
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { resolve } from 'path'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  // Load the actual Firestore rules
  const rulesPath = resolve(__dirname, '../../firestore.rules')
  const rulesContent = readFileSync(rulesPath, 'utf8')

  testEnv = await initializeTestEnvironment({
    projectId: 'demo-test-project',
    firestore: {
      rules: rulesContent,
      host: '127.0.0.1',
      port: 8080,
    },
  })

  // Make the test environment available globally
  global.testEnv = testEnv
})

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup()
  }
})

// Type declaration for global test environment
declare global {
  var testEnv: RulesTestEnvironment
}