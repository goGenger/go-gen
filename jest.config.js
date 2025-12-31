module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'core/**/*.js',
    'bin/**/*.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/coverage/**',
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 30,
      lines: 30,
      statements: 30
    }
  },
  verbose: true,
  testTimeout: 5000,
};