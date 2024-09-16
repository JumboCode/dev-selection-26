import { c as createComponent, r as renderTemplate, d as addAttribute, e as renderHead, f as renderSlot, b as createAstro } from './astro/server_COe9q8-E.mjs';
import 'kleur/colors';
import 'html-escaper';
import 'clsx';

const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title } = Astro2.props;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="description" content="JumboCode Developer Selection Platform"><meta name="viewport" content="width=device-width"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="generator"${addAttribute(Astro2.generator, "content")}><title>${title}</title>${renderHead()}</head> <body class="bg-gray-800 text-white"> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "C:/Users/gsess/Documents/jumbocode-2024-25/dev-selection/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
