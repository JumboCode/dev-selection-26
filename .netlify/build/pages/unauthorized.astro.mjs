/* empty css                                     */
import { c as createComponent, r as renderTemplate, a as renderComponent, m as maybeRenderHead } from '../chunks/astro/server_COe9q8-E.mjs';
import 'kleur/colors';
import 'html-escaper';
import { $ as $$Layout } from '../chunks/Layout_oqJkmgKu.mjs';
import { $ as $$SignOut } from '../chunks/SignOut_DS-kGekh.mjs';
import { Button } from 'antd';
export { renderers } from '../renderers.mjs';

const $$Unauthorized = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Unauthorized" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="text-center mx-4 my-4"> <h1 class="text-3xl font-semibold my-4">Error: Unauthorized</h1> <h2 class="text-lg my-4">
Your account is not authorized to access this section of the JumboCode
      developer selection portal. You must be signed with an authorized @tufts.edu email address.
</h2> <div class="inline-block"> ${renderComponent($$result2, "Button", Button, { "className": "my-4 mb-8", "type": "primary", "shape": "round", "size": "large", "href": "/dashboard", "client:load": true, "client:component-hydration": "load", "client:component-path": "antd", "client:component-export": "Button" }, { "default": ($$result3) => renderTemplate` Dashboard ` })} ${renderComponent($$result2, "SignOut", $$SignOut, {})} </div> </div> ` })}`;
}, "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/pages/unauthorized.astro", void 0);

const $$file = "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/pages/unauthorized.astro";
const $$url = "/unauthorized";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Unauthorized,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
