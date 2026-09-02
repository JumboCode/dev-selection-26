import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";

const cookieOptions = {
  path: "/",
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
};

export function createRequestSupabaseClient(): SupabaseClient {
  return createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "pkce",
        persistSession: false,
      },
    },
  );
}

export interface AuthenticatedSupabase {
  supabase: SupabaseClient;
  user: User;
}

export async function createAuthenticatedSupabaseClient(
  cookies: AstroCookies,
): Promise<AuthenticatedSupabase | null> {
  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const supabase = createRequestSupabaseClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.user || !data.session) {
    clearAuthCookies(cookies);
    return null;
  }

  // setSession can refresh an expired access token. Keep this request's
  // cookies in sync without sharing mutable auth state with another request.
  if (
    data.session.access_token !== accessToken ||
    data.session.refresh_token !== refreshToken
  ) {
    setAuthCookies(
      cookies,
      data.session.access_token,
      data.session.refresh_token,
    );
  }

  return { supabase, user: data.user };
}

export function setAuthCookies(
  cookies: AstroCookies,
  accessToken: string,
  refreshToken: string,
): void {
  cookies.set("sb-access-token", accessToken, cookieOptions);
  cookies.set("sb-refresh-token", refreshToken, cookieOptions);
}

export function clearAuthCookies(cookies: AstroCookies): void {
  cookies.delete("sb-access-token", { path: "/" });
  cookies.delete("sb-refresh-token", { path: "/" });
}

export function isSameOriginRequest(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === url.origin;
}
