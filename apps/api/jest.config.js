/**
 * Jest configuration for the API (NestJS) app.
 * 
 * Can be run standalone: cd apps/api && npx jest
 * Or from root: npx jest --selectProjects api
 */
module.exports = {
  displayName: 'api',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
  ],
  coverageDirectory: '<rootDir>/../../coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '\\.dto\\.(t|j)s$',
    '\\.entity\\.(t|j)s$',
  ],
  moduleNameMapper: {
    '^@junta-tribo/shared$': '<rootDir>/../../packages/shared/src',
    '^@junta-tribo/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
};
