/** @type {import('jest').Config} */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testRegex: '.spec.ts$',
    transform: { '^.+\\.(t|j)s$': 'ts-jest' },
    collectCoverageFrom: ['**/src/**/*.ts'],
    coverageDirectory: './coverage',
    testEnvironment: 'node',
    maxWorkers: 2,
    detectOpenHandles: true,
    setupFiles: ['dotenv/config'],
  };
  