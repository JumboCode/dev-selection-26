import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import type { Provider } from "@supabase/supabase-js";

export const POST: APIRoute = async ({ redirect }) => {
  const provider = "google"; // Hard coded for now, change later if we add additional sign in methods

  const validProviders = ["google"];

  if (provider && validProviders.includes(provider)) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: "https://dev-selection.vercel.app/api/auth/callback",
        queryParams: {
          hd: "tufts.edu"
        }
      },
    });

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return redirect(data.url);
  }

  return new Response("Invalid Provider", { status: 400 });
};