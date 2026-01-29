/**
 * Root Jest configuration for the monorepo.
 * 
 * Uses Jest's projects feature to run tests across all apps.
 * Each project references its own jest.config.js for app-specific settings.
 * 
 * Usage:
 *   npm test              - Run all tests
 *   npm run test:api      - Run API tests only
 *   npm run test:web      - Run Web tests only
 */
module.exports = {
  projects: [
    '<rootDir>/apps/api/jest.config.js',
    '<rootDir>/apps/web/jest.config.js',
  ],
  coveragePathIgnorePatterns: [
    '\\.dto\\.(t|j)sx?$',
    '\\.entity\\.(t|j)sx?$',
  ],
};
