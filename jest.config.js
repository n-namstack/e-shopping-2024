module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  setupFiles: ['./jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.{js,jsx,ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|zustand)',
  ],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
  },
  collectCoverageFrom: [
    'app/store/**/*.js',
    'app/utils/**/*.js',
    'app/screens/**/*.js',
    'app/components/**/*.js',
    '!app/**/*.backup.js',
  ],
};
