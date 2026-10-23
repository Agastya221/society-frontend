// The native pieces the staff app talks to, replaced with simple stand-ins.

jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn((key) => Promise.resolve(store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn((key, value) => { store.set(key, value); return Promise.resolve(); }),
    deleteItemAsync: jest.fn((key) => { store.delete(key); return Promise.resolve(); }),
    __store: store,
  };
});

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), remove: jest.fn(), seekTo: jest.fn(), loop: false })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getDevicePushTokenAsync: jest.fn(() => Promise.resolve({ data: 'token' })),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4 },
}));

jest.mock('@msg91comm/sendotp-react-native', () => ({
  OTPWidget: { initializeWidget: jest.fn(), sendOTP: jest.fn(), verifyOTP: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  Stack: () => null,
}));
