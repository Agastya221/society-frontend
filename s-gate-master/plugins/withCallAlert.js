const { withAndroidManifest, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Build settings for the call-style gate alert (a full-screen "visitor at the gate" screen over the lock screen):
 *  - the notification library keeps its Android core in node_modules, so Gradle needs to look there
 *  - the full-screen permission
 *  - the main screen may show over the lock screen and switch the display on
 */
const MAVEN = `maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }`;

module.exports = function withCallAlert(config) {
  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy' && !cfg.modResults.contents.includes('@notifee/react-native/android/libs')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        (match) => `${match}\n        ${MAVEN}`,
      );
    }
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? [];
    for (const name of ['android.permission.USE_FULL_SCREEN_INTENT', 'android.permission.WAKE_LOCK']) {
      if (!permissions.some((p) => p.$['android:name'] === name)) {
        permissions.push({ $: { 'android:name': name } });
      }
    }
    manifest['uses-permission'] = permissions;

    const app = manifest.application?.[0];
    const main = app?.activity?.find((a) => a.$['android:name'] === '.MainActivity');
    if (main) {
      main.$['android:showWhenLocked'] = 'true';
      main.$['android:turnScreenOn'] = 'true';
    }
    return cfg;
  });

  return config;
};
