/**
 * Auth store unit tests — supabase mocked as a default export to match
 * `import supabase from '../lib/supabase'` in authStore.js.
 */

const mockChain = () => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
  update: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
});

jest.mock('../../app/lib/supabase', () => ({
  __esModule: true,
  default: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(),
  },
}));

// Also mock heavy native deps the store imports at the top level
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: jest.fn(() => 'exp://test') }));
jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { signIn: jest.fn(), configure: jest.fn() },
}), { virtual: true });

import supabase from '../../app/lib/supabase';
import useAuthStore from '../../app/store/authStore';

beforeEach(() => {
  jest.clearAllMocks();
  supabase.from.mockReturnValue(mockChain());
  useAuthStore.setState({
    user: null,
    session: null,
    profile: null,
    loading: false,
    error: null,
  });
});

describe('authStore — signIn', () => {
  it('sets user and session on successful sign in', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockSession = { access_token: 'token-abc' };
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const result = await useAuthStore.getState().signIn('test@example.com', 'password123');

    expect(result.success).toBe(true);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.session).toEqual(mockSession);
    expect(state.loading).toBe(false);
  });

  it('returns error and keeps user null on wrong credentials', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const result = await useAuthStore.getState().signIn('wrong@example.com', 'bad');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('authStore — signUp', () => {
  const userData = {
    firstname: 'New', lastname: 'User', username: 'newuser',
    email: 'new@example.com', cellphone_no: '0812345678', role: 'buyer',
  };

  it('returns success when Supabase creates the user', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'new-1', email: 'new@example.com' }, session: null },
      error: null,
    });

    const result = await useAuthStore.getState().signUp('new@example.com', 'password123', userData);

    expect(result.success).toBe(true);
  });

  it('returns a friendly rate-limit message', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'email rate limit exceeded' },
    });

    const result = await useAuthStore.getState().signUp('test@example.com', 'pass123', userData);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/wait a few minutes/i);
  });

  it('returns an error when email is already registered', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    });

    const result = await useAuthStore.getState().signUp('existing@example.com', 'pass123', userData);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already exists/i);
  });
});

describe('authStore — signOut', () => {
  it('clears user, session, and profile', async () => {
    useAuthStore.setState({
      user: { id: 'user-1' },
      session: { access_token: 'token' },
      profile: { firstname: 'John' },
    });

    await useAuthStore.getState().signOut();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
  });
});
