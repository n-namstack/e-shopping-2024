import { create } from "zustand";
import supabase from "../lib/supabase";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

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
        // const { access_token, refresh_token } = extractTokensFromUrl(
        //   result.url
        // );

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

          // 6. Update store
          set({
            user,
            session,
            loading: false,
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

          // 6. Update store
          set({
            user,
            session,
            loading: false,
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

      set({
        user: data.user,
        session: data.session,
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
        // Insert profile with explicit setting of ID
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
          // We'll proceed anyway as the auth user was created
        }
      }

      set({
        user: data.user,
        session: data.session,
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
      set({ user: null, session: null, loading: false });
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

      set({
        user: data.session?.user || null,
        session: data.session,
        loading: false,
      });

      return { success: true, session: data.session };
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

      set({
        user: data.user,
        session: data.session,
        loading: false,
      });

      return { success: true, user: data.user };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
}));

export default useAuthStore;
