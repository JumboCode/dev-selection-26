// With `output: 'hybrid'` configured:
// export const prerender = false;
import type { APIRoute } from "astro";
import { clearAuthCookies, isSameOriginRequest } from "../../../lib/supabase";

export const POST: APIRoute = async ({ cookies, redirect, request, url }) => {
  if (!isSameOriginRequest(request, url)) {
    return new Response("Invalid request origin", { status: 403 });
  }

  clearAuthCookies(cookies);
  return redirect("/");
};
