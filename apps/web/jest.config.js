/**
 * Jest configuration for the Web (Next.js) app.
 * 
 * Uses next/jest for automatic Next.js compatibility:
 * - Transforms next/image, next/link, etc.
 * - Handles CSS modules and static assets
 * - Sets up proper module resolution
 * 
 * Can be run standalone: cd apps/web && npx jest
 * Or from root: npx jest --selectProjects web
 */
const nextJest = require('next/jest');

// Use __dirname to ensure next/jest finds the app directory
// regardless of where Jest is invoked from
const createJestConfig = nextJest({
  dir: __dirname,
});

const customJestConfig = {
  displayName: 'web',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.dto.{ts,tsx}',
    '!src/**/*.entity.{ts,tsx}',
  ],
  coverageDirectory: '<rootDir>/../../coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
    '/coverage/',
    '\\.dto\\.(t|j)sx?$',
    '\\.entity\\.(t|j)sx?$',
  ],
};

module.exports = createJestConfig(customJestConfig);
