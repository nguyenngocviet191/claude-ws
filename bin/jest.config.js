/**
 * Jest configuration for CLI unit tests
 */

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/lib/__tests__'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  verbose: true,
  testTimeout: 10000,
};
