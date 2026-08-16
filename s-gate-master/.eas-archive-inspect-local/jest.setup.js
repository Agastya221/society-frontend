// ── expo-secure-store ─────────────────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// ── expo-haptics ──────────────────────────────────────────────────────────────
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// ── expo-notifications ────────────────────────────────────────────────────────
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
  setNotificationChannelAsync: jest.fn(),
}));

// ── expo-router ───────────────────────────────────────────────────────────────
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
  useFocusEffect: (cb) => { cb(); },
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  Link: ({ children }) => children,
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  },
  Stack: {
    Screen: ({ children }) => children,
  },
  Tabs: {
    Screen: ({ children }) => children,
  },
}));

// ── react-native-reanimated ───────────────────────────────────────────────────
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// ── react-native-safe-area-context ────────────────────────────────────────────
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
    SafeAreaInsetsContext: { Consumer: ({ children }) => children({ top: 44, bottom: 34, left: 0, right: 0 }) },
  };
});

// ── @msg91comm/sendotp-react-native ───────────────────────────────────────────
jest.mock('@msg91comm/sendotp-react-native', () => ({
  OTPWidget: {
    initializeWidget: jest.fn(),
    sendOTP: jest.fn(),
    verifyOTP: jest.fn(),
    retryOTP: jest.fn(),
  },
}));

// ── expo-linear-gradient ──────────────────────────────────────────────────────
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

// ── @expo/vector-icons ────────────────────────────────────────────────────────
jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  AntDesign: 'AntDesign',
  FontAwesome: 'FontAwesome',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

// ── expo-status-bar ───────────────────────────────────────────────────────────
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

// ── expo-av ───────────────────────────────────────────────────────────────────
jest.mock('expo-av', () => ({
  Audio: {
    Sound: { createAsync: jest.fn(() => Promise.resolve({ sound: { playAsync: jest.fn(), unloadAsync: jest.fn() } })) },
    setAudioModeAsync: jest.fn(),
  },
}));

// ── expo-image-picker ─────────────────────────────────────────────────────────
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  MediaTypeOptions: { Images: 'Images', All: 'All', Videos: 'Videos' },
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

// ── expo-location ─────────────────────────────────────────────────────────────
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } })),
}));

// ── expo-contacts ─────────────────────────────────────────────────────────────
jest.mock('expo-contacts', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getContactsAsync: jest.fn(() => Promise.resolve({ data: [] })),
}));

// ── expo-constants ────────────────────────────────────────────────────────────
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { name: 's-gate', slug: 's-gate' },
    manifest: {},
  },
}));

// ── expo-blur ─────────────────────────────────────────────────────────────────
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});

// ── react-native-svg ─────────────────────────────────────────────────────────
jest.mock('react-native-svg', () => {
  const React = require('react');
  const svgComponent = (name) => {
    const C = ({ children }) => React.createElement(React.Fragment, null, children ?? null);
    C.displayName = name;
    return C;
  };
  return {
    __esModule: true,
    default: svgComponent('Svg'),
    Svg: svgComponent('Svg'),
    Path: svgComponent('Path'),
    Circle: svgComponent('Circle'),
    Ellipse: svgComponent('Ellipse'),
    G: svgComponent('G'),
    Rect: svgComponent('Rect'),
    Line: svgComponent('Line'),
    Defs: svgComponent('Defs'),
    Stop: svgComponent('Stop'),
    LinearGradient: svgComponent('LinearGradient'),
    RadialGradient: svgComponent('RadialGradient'),
    ClipPath: svgComponent('ClipPath'),
    Text: svgComponent('SvgText'),
    TSpan: svgComponent('TSpan'),
    Polygon: svgComponent('Polygon'),
    Polyline: svgComponent('Polyline'),
    Symbol: svgComponent('Symbol'),
    Use: svgComponent('Use'),
    Mask: svgComponent('Mask'),
    Pattern: svgComponent('Pattern'),
    Image: svgComponent('SvgImage'),
    ForeignObject: svgComponent('ForeignObject'),
  };
});


// ── API service ───────────────────────────────────────────────────────────────
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

// ── Global fetch ──────────────────────────────────────────────────────────────
global.fetch = jest.fn();

// ── Suppress noisy logs ───────────────────────────────────────────────────────
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};
