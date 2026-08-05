module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/e2e/'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text-summary', 'lcov'],
};
