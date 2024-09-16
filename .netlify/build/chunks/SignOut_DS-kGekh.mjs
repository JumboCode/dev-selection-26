import { c as createComponent, r as renderTemplate, m as maybeRenderHead, a as renderComponent } from './astro/server_COe9q8-E.mjs';
import 'kleur/colors';
import 'html-escaper';
import { Button } from 'antd';

const $$SignOut = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<form action="/api/auth/signout"> ${renderComponent($$result, "Button", Button, { "client:load": true, "danger": true, "type": "primary", "size": "large", "shape": "round", "color": "primary", "htmlType": "submit", "client:component-hydration": "load", "client:component-path": "antd", "client:component-export": "Button" }, { "default": ($$result2) => renderTemplate`
Sign Out
` })} </form>`;
}, "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/components/SignOut.astro", void 0);

export { $$SignOut as $ };
