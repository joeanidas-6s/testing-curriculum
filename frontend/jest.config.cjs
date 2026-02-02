/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test/setupTests.ts"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  testMatch: ["**/?(*.)+(spec|test).(ts|tsx)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot|svg|png|jpg|jpeg|webp|avif)$":
      "<rootDir>/src/test/__mocks__/fileMock.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      { useESM: true, tsconfig: "<rootDir>/tsconfig.jest.json" },
    ],
  },
};

