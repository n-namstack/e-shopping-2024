// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo modules that have native implementations
jest.mock('expo-font', () => ({ loadAsync: jest.fn(), isLoaded: jest.fn(() => true) }));
jest.mock('expo-asset', () => ({ fromModule: jest.fn(() => ({ downloadAsync: jest.fn() })) }));
jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(), preventAutoHideAsync: jest.fn() }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Light: 'light' } }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), MediaTypeOptions: {} }));
jest.mock('expo-camera', () => ({ useCameraPermissions: jest.fn(() => [null, jest.fn()]) }));
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn() }));
jest.mock('expo-tracking-transparency', () => ({ requestTrackingPermissionsAsync: jest.fn() }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => ({ show: jest.fn(), hide: jest.fn() }));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), push: jest.fn() }),
    useRoute: () => ({ params: {} }),
  };
});
