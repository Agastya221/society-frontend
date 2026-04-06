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
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[guard-test]' })),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
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
  useFocusEffect: (cb) => {
    // Use React.useEffect so async state updates run inside act() properly
    require('react').useEffect(() => { cb(); }, []);
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  Link: ({ children }) => children,
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  Stack: { Screen: ({ children }) => children },
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
}));

// ── expo-status-bar ───────────────────────────────────────────────────────────
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

// ── expo-camera ───────────────────────────────────────────────────────────────
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  },
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
}));

// ── expo-constants ────────────────────────────────────────────────────────────
jest.mock('expo-constants', () => ({
  default: { expoConfig: { name: 's-gate-guard', slug: 's-gate-guard' } },
}));

// ── expo-blur ─────────────────────────────────────────────────────────────────
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
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
