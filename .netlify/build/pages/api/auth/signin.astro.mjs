import { s as supabase } from '../../../chunks/supabase_DSWR63II.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async ({ redirect }) => {
  const provider = "google";
  const validProviders = ["google"];
  if (validProviders.includes(provider)) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: "http://localhost:4321/api/auth/callback",
        queryParams: {
          hd: "tufts.edu"
        }
      }
    });
    if (error) {
      return new Response(error.message, { status: 500 });
    }
    return redirect(data.url);
  }
  return new Response("Invalid Provider", { status: 400 });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
