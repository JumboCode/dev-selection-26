/* empty css                                     */
import { c as createComponent, r as renderTemplate, m as maybeRenderHead, a as renderComponent, b as createAstro } from '../chunks/astro/server_COe9q8-E.mjs';
import 'kleur/colors';
import 'html-escaper';
import { $ as $$Layout } from '../chunks/Layout_oqJkmgKu.mjs';
import { $ as $$Image } from '../chunks/_astro_assets_DvsDZwzn.mjs';
import { Button } from 'antd';
export { renderers } from '../renderers.mjs';

const $$Login = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<h1 class="text-center text-3xl md:text-4xl lg:text-5xl font-semibold my-4">
Welcome to JAM!
</h1> <h2 class="text-center text-xl">JumboCode Application Management</h2> <div class="flex justify-center my-1"> ${renderComponent($$result, "Image", $$Image, { "src": "/jam-logo-new.png", "width": 256, "height": 256, "alt": "JAM Logo", "loading": "eager" })} </div> <form action="/api/auth/signin" method="post" class="mx-auto flex flex-col items-center"> <p class="text-center text-xl">
Please sign in with your <span class="font-semibold underline">Tufts Account</span> </p> ${renderComponent($$result, "Button", Button, { "client:load": true, "value": "google", "name": "provider", "htmlType": "submit", "type": "primary", "color": "primary", "shape": "round", "size": "large", "className": "my-4", "client:component-hydration": "load", "client:component-path": "antd", "client:component-export": "Button" }, { "default": ($$result2) => renderTemplate`
Sign in with Tufts SSO
` })}</form>`;
}, "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/components/Login.astro", void 0);

const $$Astro = createAstro();
const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const { cookies, redirect } = Astro2;
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");
  if (accessToken && refreshToken) {
    console.log(accessToken, refreshToken);
    return redirect("/dashboard");
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "JumboCode Application Management" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main> ${renderComponent($$result2, "Login", $$Login, {})} </main> ` })}`;
}, "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/pages/index.astro", void 0);

const $$file = "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
