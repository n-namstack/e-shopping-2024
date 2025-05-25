import * as AuthSession from "expo-auth-session";
import supabase from "../../../lib/supabase";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

export async function facebookAuth() {
  set({ loading: true, error: null });
  try {
    // 1. Generate redirect url
    const redirectUrl = Linking.createURL("/auth/callback").replace(
      "/--/auth/callback",
      ""
    );

    console.log("Re-direct url(facebook): ", redirectUrl);

    // 2. Start OAuth flow
    const { data, error } = supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    //4. Handle callback
    if (result.type === "success") {
      const url = URL(result.url);
      const params = URLSearchParams(url.hash.substring(1));
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

        console.log(data);

        return { success: true };
      }
    }

    throw new Error("Facebook authentication was canceled");
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
}
