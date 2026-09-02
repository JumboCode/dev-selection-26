import type { APIRoute } from "astro";
import {
  createAuthenticatedSupabaseClient,
  isSameOriginRequest,
} from "../../lib/supabase";

export const POST: APIRoute = async ({ request, url, cookies, redirect }) => {
  if (!isSameOriginRequest(request, url)) {
    return new Response("Invalid request origin", { status: 403 });
  }

  const auth = await createAuthenticatedSupabaseClient(cookies);
  if (!auth) {
    return redirect("/");
  }

  const { data: userRole, error: userRoleError } = await auth.supabase
    .from("user_roles")
    .select("*")
    .ilike("email", auth.user.email ?? "")
    .maybeSingle();

  if (userRoleError || !userRole || userRole.team_name === "Board") {
    console.error(userRoleError || "Unauthorized access.");
    return redirect("/unauthorized");
  }

  const { error } = await auth.supabase.rpc("submit_team_selections");
  if (error) {
    const message = encodeURIComponent(error.message);
    const teamPath = encodeURIComponent(userRole.team_name);
    return redirect(`/dev-selection/${teamPath}?error=${message}`);
  }

  return redirect("/dashboard");
};
