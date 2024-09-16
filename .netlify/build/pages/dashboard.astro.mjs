/* empty css                                     */
import { c as createComponent, r as renderTemplate, m as maybeRenderHead, a as renderComponent, b as createAstro } from '../chunks/astro/server_COe9q8-E.mjs';
import 'kleur/colors';
import 'html-escaper';
import { $ as $$Layout } from '../chunks/Layout_oqJkmgKu.mjs';
import { s as supabase } from '../chunks/supabase_DSWR63II.mjs';
import { $ as $$SignOut } from '../chunks/SignOut_DS-kGekh.mjs';
import { Table, Tag, Space, Button, Card } from 'antd';
import { jsx } from 'react/jsx-runtime';
import 'react';
export { renderers } from '../renderers.mjs';

const $$Astro$1 = createAstro();
const $$TeamTable = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$TeamTable;
  const { rows } = Astro2.props;
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name"
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email"
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role"
    }
  ];
  return renderTemplate`${maybeRenderHead()}<div class="bg-white rounded-xl"> ${renderComponent($$result, "Table", Table, { "dataSource": rows, "columns": columns, "client:load": true, "scroll": { x: "max-content" }, "client:component-hydration": "load", "client:component-path": "antd", "client:component-export": "Table" })} </div>`;
}, "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/components/TeamTable.astro", void 0);

const columns = [
  {
    title: "Project Name",
    dataIndex: "team_name",
    key: "team_name"
  },
  {
    title: "Dev Selection Status",
    key: "status",
    dataIndex: "status",
    render: (_, { status }) => {
      let color = "";
      switch (status) {
        case "In Progress":
          color = "geekblue";
          break;
        case "Complete":
          color = "green";
          break;
        case "Under Review":
          color = "orange";
          break;
        default:
          color = "red";
      }
      return /* @__PURE__ */ jsx(Tag, { color, children: status.toUpperCase() }, status);
    }
  },
  {
    title: "View Dev Selections",
    key: "dev_selections",
    render: (_, { status, team_name }) => /* @__PURE__ */ jsx(Space, { size: "middle", children: /* @__PURE__ */ jsx(Button, { type: "primary", href: "/dev-selection/" + team_name, disabled: status !== "In Progress", children: "View/Select Developers" }) })
  }
];
const StatusTable = (props) => /* @__PURE__ */ jsx(Table, { columns, dataSource: props.rows, scroll: { x: "max-content" } });

const $$Astro = createAstro();
const $$Dashboard = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Dashboard;
  const { cookies, redirect } = Astro2;
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");
  if (!accessToken || !refreshToken) {
    return redirect("/");
  }
  const { data: userData, error: authError } = await supabase.auth.setSession({
    refresh_token: refreshToken.value,
    access_token: accessToken.value
  });
  if (authError) {
    cookies.delete("sb-access-token", {
      path: "/"
    });
    cookies.delete("sb-refresh-token", {
      path: "/"
    });
    return redirect("/api/auth/signin");
  }
  const { data: userRole, error: userRoleError } = await supabase.from("user_roles").select("*").eq("email", userData.user?.email).maybeSingle();
  if (userRoleError) {
    console.error(userRoleError);
  }
  if (!userRole) {
    return redirect("/unauthorized");
  }
  let selectionStatus = void 0;
  if (userRole.team_name === "Board") {
    const { data: teamSelectStatus, error: teamSelectStatusError } = await supabase.from("team-status").select("*");
    if (teamSelectStatusError) {
      console.error(teamSelectStatusError);
    }
    selectionStatus = teamSelectStatus;
  } else {
    const { data: teamSelectStatus, error: teamSelectStatusError } = await supabase.from("team-status").select("*").eq("team_name", userRole.team_name);
    selectionStatus = teamSelectStatus;
    if (teamSelectStatusError) {
      console.error(teamSelectStatusError);
    }
  }
  const { data: teamLeadersQuery, error: teamLeadersError } = await supabase.from("user_roles").select("email, role, first_name").eq("team_name", userRole.team_name);
  if (teamLeadersError) {
    console.error(teamLeadersError);
  }
  const { data: confirmedDevsQuery, error: devsQueryError } = await supabase.from("pmtl_application_data").select(`sensitive_application_data(*)`).eq("confirmed_team", userRole.team_name);
  if (devsQueryError) {
    console.error(devsQueryError);
  }
  const fullRoster = [];
  teamLeadersQuery?.forEach((leader, index) => {
    fullRoster.push({
      key: index.toString(),
      email: leader.email,
      name: leader.first_name,
      role: leader.role
    });
  });
  if (confirmedDevsQuery && confirmedDevsQuery.length > 0) {
    confirmedDevsQuery.forEach((dev) => {
      if (dev.sensitive_application_data) {
        fullRoster.push({
          key: fullRoster.length.toString(),
          email: dev.sensitive_application_data.email,
          name: dev.sensitive_application_data.full_name,
          role: "Developer"
        });
      }
    });
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "JAM - Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="text-center text-4xl my-4 font-semibold mx-2">
Hello ${userRole.first_name}!
</h1> <h2 class="text-center text-2xl my-2 mx-2">
Team: ${userRole.team_name} (${userRole.role})
</h2> <div class="flex justify-center mt-8"> ${renderComponent($$result2, "SignOut", $$SignOut, {})} </div> <div class="mx-4 lg:mx-8 xl:mx-16 my-8"> ${renderComponent($$result2, "Card", Card, { "title": "My Dev Selection Status", "client:visible": true, "client:component-hydration": "visible", "client:component-path": "antd", "client:component-export": "Card" }, { "default": ($$result3) => renderTemplate` ${renderComponent($$result3, "StatusTable", StatusTable, { "rows": selectionStatus, "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/components/StatusTable.tsx", "client:component-export": "default" })} ` })} </div> <div class="mx-4 lg:mx-8 xl:mx-16 my-8"> ${renderComponent($$result2, "Card", Card, { "title": "My Team", "client:visible": true, "client:component-hydration": "visible", "client:component-path": "antd", "client:component-export": "Card" }, { "default": ($$result3) => renderTemplate` ${renderComponent($$result3, "TeamTable", $$TeamTable, { "rows": fullRoster })} ` })} </div> ` })}`;
}, "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/pages/dashboard.astro", void 0);

const $$file = "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/pages/dashboard.astro";
const $$url = "/dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Dashboard,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
