module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect', './jest.setup.js'],
  testMatch: ['<rootDir>/src/__tests__/**/*.test.{ts,tsx}'],
};
