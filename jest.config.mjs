/** @type {import('@jest/types').Config.InitialOptions} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
}
