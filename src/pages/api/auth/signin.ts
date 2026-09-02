import type { APIRoute } from "astro";
import {
  createRequestSupabaseClient,
  isSameOriginRequest,
  setAuthCookies,
} from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  if (!isSameOriginRequest(request, url)) {
    return new Response("Invalid request origin", { status: 403 });
  }

  const formData = (await request.formData()) as unknown as {
    get(name: string): string | File | null;
  };
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return new Response("Email and password are required", { status: 400 });
  }
  
  const supabase = createRequestSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(error.message, { status: 400 });
  }

  if (!data.session) {
    return new Response("No session created", { status: 400 });
  }

  setAuthCookies(
    cookies,
    data.session.access_token,
    data.session.refresh_token,
  );

  return redirect("/dashboard");
};
