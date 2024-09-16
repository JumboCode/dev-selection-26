/* empty css                                        */
import { c as createComponent, r as renderTemplate, a as renderComponent, b as createAstro, m as maybeRenderHead } from '../../chunks/astro/server_COe9q8-E.mjs';
import 'kleur/colors';
import 'html-escaper';
import { $ as $$Layout } from '../../chunks/Layout_oqJkmgKu.mjs';
import { s as supabase } from '../../chunks/supabase_DSWR63II.mjs';
import { Button, Card } from 'antd';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$team = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$team;
  const { cookies, redirect } = Astro2;
  const { team } = Astro2.params;
  if (!team) {
    return redirect("/dashboard");
  }
  const projectNameReadable = team.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");
  if (!accessToken || !refreshToken) {
    return redirect("/", { message: "Session expired. Please log in again." });
  }
  const { data: userData, error: authError } = await supabase.auth.setSession({
    refresh_token: refreshToken.value,
    access_token: accessToken.value
  });
  if (authError) {
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    return redirect("/");
  }
  const { data: userRole, error: userRoleError } = await supabase.from("user_roles").select("*").eq("email", userData.user?.email).or("team_name.eq.Board,team_name.eq." + team).maybeSingle();
  if (userRoleError || !userRole) {
    console.error(userRoleError || "Unauthorized access.");
    return redirect("/unauthorized");
  }
  const { data: devSelectionData, error: devSelectionFetchError } = await supabase.from("pmtl_application_data").select(`*, dev_selections(selected_by)`).order("rank_" + team, { ascending: true });
  if (devSelectionFetchError) {
    console.error(devSelectionFetchError);
  }
  const devData = devSelectionData?.map((entry, index) => {
    return {
      ...entry,
      key: index
    };
  });
  devSelectionData?.filter(
    (row) => row.dev_selections.selected_by.includes(team)
  );
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "JAM - " + projectNameReadable + " Dev Selection" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="text-center text-4xl my-4 font-semibold mx-2"> ${projectNameReadable} Developer Selection
</h1> <h2 class="text-center text-2xl my-2 mx-2"> ${userRole.first_name} (${userRole.role})
</h2> <div class="flex justify-center my-8"> ${renderComponent($$result2, "Button", Button, { "type": "primary", "size": "large", "shape": "round", "href": "/dashboard", "client:load": true, "client:component-hydration": "load", "client:component-path": "antd", "client:component-export": "Button" }, { "default": ($$result3) => renderTemplate`
Back to Dashboard
` })} </div> <div class="mx-4 lg:mx-8 xl:mx-16 my-8"> ${renderComponent($$result2, "Card", Card, { "title": projectNameReadable + " Selected Developers", "client:load": true, "client:component-hydration": "load", "client:component-path": "antd", "client:component-export": "Card" }, {})} </div> <div class="mx-4 lg:mx-8 xl:mx-16 my-8"> ${renderComponent($$result2, "Card", Card, { "title": "All Developers", "client:load": true, "client:component-hydration": "load", "client:component-path": "antd", "client:component-export": "Card" }, { "default": ($$result3) => renderTemplate` ${renderComponent($$result3, "DeveloperSelectionTable", null, { "data": devData, "team": team, "accessToken": accessToken, "refreshToken": refreshToken, "client:only": "react", "client:component-hydration": "only", "client:component-path": "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/components/DeveloperSelectionTable.tsx", "client:component-export": "default" })} ` })} </div> ` })}`;
}, "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/pages/dev-selection/[team].astro", void 0);

const $$file = "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/pages/dev-selection/[team].astro";
const $$url = "/dev-selection/[team]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$team,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
