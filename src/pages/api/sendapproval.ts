import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");

  if (!accessToken || !refreshToken) {
    return redirect("/");
  }

  const { data: userData, error: authError } = await supabase.auth.setSession({
    refresh_token: refreshToken.value,
    access_token: accessToken.value,
  });

  if (authError) {
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    return redirect("/");
  }

  const { data: userRole, error: userRoleError } = await supabase
    .from("user_roles")
    .select("*")
    .eq("email", userData.user?.email)
    .maybeSingle();

  if (userRoleError || !userRole) {
    console.error(userRoleError || "Unauthorized access.");
    return redirect("/unauthorized");
  }

  console.log(userRole.team_name)
  await supabase
    .from("team_status")
    .update({ status: "Under Review" })
    .eq("team_name", userRole.team_name);

  return redirect("/dashboard");
};