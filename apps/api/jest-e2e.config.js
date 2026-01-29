/**
 * Jest configuration for API e2e tests.
 */
module.exports = {
  displayName: 'api-e2e',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  testTimeout: 30000,
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-reports',
        filename: 'e2e-report.html',
        expand: true,
      },
    ],
  ],
  moduleNameMapper: {
    '^@junta-tribo/shared$': '<rootDir>/../../packages/shared/src',
    '^@junta-tribo/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
};
