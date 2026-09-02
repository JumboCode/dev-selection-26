
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

  const formData = (await request.formData()) as unknown as {
    get(name: string): string | File | null;
  };
  const teamName = formData.get("team");
  if (typeof teamName !== "string" || !teamName.trim()) {
    return new Response("Team is required", { status: 400 });
  }

  const { error } = await auth.supabase.rpc("approve_team_selections", {
    p_team_name: teamName.trim(),
  });
  if (error) {
    const message = encodeURIComponent(error.message);
    const teamPath = encodeURIComponent(teamName.trim());
    return redirect(`/dev-selection/${teamPath}?error=${message}`);
  }

  return redirect("/dashboard");
};
