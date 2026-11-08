/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', moduleResolution: 'node', esModuleInterop: true, strict: true, types: ['jest'] } }] },
  testMatch: ['**/test/**/*.test.ts'],
};
