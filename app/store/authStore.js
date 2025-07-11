import { create } from "zustand";
import supabase from "../lib/supabase";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from 'expo-apple-authentication';
import * as TrackingTransparency from 'expo-tracking-transparency';

const useAuthStore = create((set) => ({
  user: null,
  session: null,
  profile: null, // Add profile data to store
  loading: false,
  error: null,
  trackingPermissionGranted: false,
  needsProfileCompletion: false,
  socialUserData: null,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setNeedsProfileCompletion: (needs) => set({ needsProfileCompletion: needs }),
  setSocialUserData: (data) => set({ socialUserData: data }),

  // ===== PROFILE MANAGEMENT HELPERS =====
  checkAndCreateProfile: async (user, socialData = null) => {
    try {
          // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .limit(1);

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError;
    }

    // If profile exists, return it
    if (existingProfile && existingProfile.length > 0) {
      return { success: true, profile: existingProfile[0] };
    }

      // Profile doesn't exist - for social logins, don't create yet, just flag for completion
      console.log('No profile found - flagging for completion');
      
      return { 
        success: true, 
        profile: null,
        needsCompletion: true,
        socialData: socialData || {
          firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
          lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          email: user.email,
        }
      };

    } catch (error) {
      console.error('Error checking profile:', error);
      return { success: false, error: error.message };
    }
  },

  // ===== APP TRACKING TRANSPARENCY =====
  requestTrackingPermission: async () => {
    try {
      const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
      const isGranted = status === TrackingTransparency.PermissionStatus.GRANTED;
      set({ trackingPermissionGranted: isGranted });
      return isGranted;
    } catch (error) {
      console.error('Error requesting tracking permission:', error);
      set({ trackingPermissionGranted: false });
      return false;
    }
  },

  // ===== SIGN IN WITH APPLE =====
  signInWithApple: async () => {
    set({ loading: true, error: null });
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Sign in with Supabase using Apple credentials
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;

      // Prepare social data from Apple
      const socialData = {
        firstName: credential.fullName?.givenName || '',
        lastName: credential.fullName?.familyName || '',
        email: credential.email || data.user.email,
      };

      // Check and create profile if needed
      const profileResult = await useAuthStore.getState().checkAndCreateProfile(data.user, socialData);
      
      if (!profileResult.success) {
        throw new Error(profileResult.error);
      }

                // Update store
          set({
            user: data.user,
            session: data.session,
            profile: profileResult.profile,
            loading: false,
            needsProfileCompletion: profileResult.needsCompletion || false,
            socialUserData: profileResult.needsCompletion ? (profileResult.socialData || socialData) : null,
          });

      return { success: true };
    } catch (error) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in flow
        set({ loading: false });
        return { success: false, error: 'Apple sign-in was cancelled' };
      }

      set({
        error: error.message,
        loading: false,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  },

  // ===== GOOGLE AUTH =====
  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      // 1. Generate redirect URL
      const redirectUrl = Linking.createURL("/auth/callback").replace(
        "/--/auth/callback",
        ""
      );

      console.log("Re-direct url: ", redirectUrl);

      // 2. Start OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      // 3. Open browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      // 4. Handle callback
      if (result.type === "success") {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token) {
          // 5. Set session
          const {
            data: { session, user },
            error: sessionError,
          } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) throw sessionError;

          // Prepare social data from Google
          const socialData = {
            firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
            lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            email: user.email,
          };

          // Check and create profile if needed
          const profileResult = await useAuthStore.getState().checkAndCreateProfile(user, socialData);
          
          if (!profileResult.success) {
            throw new Error(profileResult.error);
          }

          // 6. Update store
          set({
            user,
            session,
            profile: profileResult.profile,
            loading: false,
            needsProfileCompletion: profileResult.needsCompletion || false,
            socialUserData: profileResult.needsCompletion ? (profileResult.socialData || socialData) : null,
          });

          return { success: true };
        }
      }

      throw new Error("Google authentication was cancelled");
    } catch (error) {
      set({
        error: error.message,
        loading: false,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  },

  // ==========FACEBOOK AUTH==========
  signInWithFacebook: async () => {
    set({ loading: true, error: null });
    try {
      // 1. Generate redirect URL
      const redirectUrl = Linking.createURL("/auth/callback").replace(
        "/--/auth/callback",
        ""
      );

      console.log("Re-direct url: ", redirectUrl);

      // 2. Start OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      // 3. Open browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      // 4. Handle callback
      if (result.type === "success") {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token) {
          // 5. Set session
          const {
            data: { session, user },
            error: sessionError,
          } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) throw sessionError;

          // Prepare social data from Facebook
          const socialData = {
            firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
            lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            email: user.email,
          };

          // Check and create profile if needed
          const profileResult = await useAuthStore.getState().checkAndCreateProfile(user, socialData);
          
          if (!profileResult.success) {
            throw new Error(profileResult.error);
          }

          // 6. Update store
          set({
            user,
            session,
            profile: profileResult.profile,
            loading: false,
            needsProfileCompletion: profileResult.needsCompletion || false,
            socialUserData: profileResult.needsCompletion ? (profileResult.socialData || socialData) : null,
          });

          return { success: true };
        }
      }

      throw new Error("Facebook authentication was cancelled");
    } catch (error) {
      set({
        error: error.message,
        loading: false,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  },

  // ===== COMPLETE SOCIAL PROFILE =====
  completeSocialProfile: async (profileData) => {
    set({ loading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create profile with complete information including role
      const newProfileData = {
        id: user.id,
        firstname: profileData.firstName,
        lastname: profileData.lastName,
        cellphone_no: profileData.phone,
        username: profileData.username || `${profileData.firstName.toLowerCase()}${profileData.lastName.toLowerCase()}`,
        email: user.email,
        role: profileData.role || 'buyer',
        is_verified: true,
      };

      // Create the profile
      let createdProfile = null;
      let createError = null;

      try {
        const result = await supabase
          .from('profiles')
          .insert([newProfileData])
          .select('*')
          .single();

        createdProfile = result.data;
        createError = result.error;
      } catch (error) {
        createError = error;
      }

      if (createError) {
        throw createError;
      }

      // Update user metadata with role
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { role: profileData.role || 'buyer' },
      });

      if (metadataError) throw metadataError;

      // Clear completion flags and update profile
      set({
        profile: createdProfile,
        loading: false,
        needsProfileCompletion: false,
        socialUserData: null,
      });

      return { success: true, profile: createdProfile };
    } catch (error) {
      set({
        error: error.message,
        loading: false,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  },

  // =========== EXISTING AUTH ========
  // Sign in with email and password
  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch profile data
      let profile = null;
      if (data.user) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .limit(1);

          if (!profileError && profileData && profileData.length > 0) {
            profile = profileData[0];
          }
        } catch (profileError) {
          console.log('Error fetching profile during sign in:', profileError);
        }
      }

      set({
        user: data.user,
        session: data.session,
        profile,
        loading: false,
      });

      return { success: true };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Sign up with email and password
  signUp: async (email, password, userData) => {
    set({ loading: true, error: null });
    try {
      // Register the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: userData.role || "buyer",
          },
        },
      });

      if (error) throw error;

      // If registration successful, add user profile data
      if (data.user) {
        // Create profile with basic data
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: data.user.id,
            firstname: userData.firstname,
            lastname: userData.lastname,
            username: userData.username,
            email: userData.email,
            cellphone_no: userData.cellphone_no,
            role: userData.role || "buyer",
            is_verified: userData.role === "buyer", // Buyers are auto-verified
          },
        ]);
        
        if (profileError) {
          console.error("Profile creation error:", profileError.message);
        }
      }

      // Fetch the created profile data
      let profile = null;
      if (data.user) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .limit(1);

          if (!profileError && profileData && profileData.length > 0) {
            profile = profileData[0];
          }
        } catch (profileError) {
          console.log('Error fetching profile after signup:', profileError);
        }
      }

      set({
        user: data.user,
        session: data.session,
        profile,
        loading: false,
      });

      return { success: true };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Sign out
  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, session: null, profile: null, loading: false });
      return { success: true };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Check current session and set user
  checkSession: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const user = data.session?.user || null;
      let profile = null;

      // If user exists, fetch their profile data
      if (user) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .limit(1);

          if (!profileError && profileData && profileData.length > 0) {
            profile = profileData[0];
          }
        } catch (profileError) {
          console.log('Error fetching profile during session check:', profileError);
          // Don't throw error, just continue without profile
        }
      }

      set({
        user,
        session: data.session,
        profile,
        loading: false,
      });

      return { success: true, session: data.session, profile };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Refresh user session to get updated metadata (e.g., after role change)
  refreshSession: async () => {
    set({ loading: true, error: null });
    try {
      // Get the current session
      const { data: currentSession } = await supabase.auth.getSession();

      if (!currentSession.session) {
        throw new Error("No active session to refresh");
      }

      // Refresh the session to get updated user data
      const { data, error } = await supabase.auth.refreshSession();

      if (error) throw error;

      // Also refresh the profile data
      let profile = null;
      if (data.user) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .limit(1);

          if (!profileError && profileData && profileData.length > 0) {
            profile = profileData[0];
          }
        } catch (profileError) {
          console.log('Error fetching profile during refresh:', profileError);
        }
      }

      set({
        user: data.user,
        session: data.session,
        profile,
        loading: false,
      });

      return { success: true, user: data.user, profile };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Delete user account and all associated data
  deleteAccount: async () => {
    set({ loading: true, error: null });
    try {
      // Get current session and user
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      const session = sessionData.session;
      
      if (!user || !session) {
        throw new Error("No authenticated user found");
      }

      console.log('Starting account deletion process for user:', user.id);

      // Call the server-side function to properly delete the Auth user
      const { data, error } = await supabase.functions.invoke('delete-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error calling delete-user function:', error);
        throw new Error(error.message || 'Failed to delete account');
      }

      if (data?.success === false) {
        console.error('Error from delete-user function:', data.error);
        throw new Error(data.error || 'Failed to delete account');
      }

      console.log('Account deletion completed successfully');

      // Clear local state immediately (user is effectively logged out)
      set({
        user: null,
        session: null,
        profile: null,
        loading: false,
      });

      // Sign out to clear the session
      await supabase.auth.signOut();

      return { success: true };
    } catch (error) {
      console.error('Account deletion failed:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
}));

export default useAuthStore;
