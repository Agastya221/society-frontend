/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      // After running: expo prebuild && cd android && ./gradlew assembleDebug
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/s-gate.app',
      build: 'xcodebuild -workspace ios/s-gate.xcworkspace -scheme s-gate -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/s-gate.app',
      build: 'xcodebuild -workspace ios/s-gate.xcworkspace -scheme s-gate -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
  },
  devices: {
    'android.emu': {
      type: 'android.emulator',
      device: { avdName: 'Pixel_6_API_34' },
    },
    'ios.sim': {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'android.emu',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'android.emu',
      app: 'android.release',
    },
    'ios.sim.debug': {
      device: 'ios.sim',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'ios.sim',
      app: 'ios.release',
    },
  },
};
