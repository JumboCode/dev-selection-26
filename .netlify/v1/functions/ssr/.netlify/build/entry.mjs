import { renderers } from './renderers.mjs';
import { s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_CvSoi7hX.mjs';
import { manifest } from './manifest_Te_i7IzR.mjs';
import { createExports } from '@astrojs/netlify/ssr-function.js';

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/auth/callback.astro.mjs');
const _page2 = () => import('./pages/api/auth/signin.astro.mjs');
const _page3 = () => import('./pages/api/auth/signout.astro.mjs');
const _page4 = () => import('./pages/dashboard.astro.mjs');
const _page5 = () => import('./pages/dev-selection/_team_.astro.mjs');
const _page6 = () => import('./pages/unauthorized.astro.mjs');
const _page7 = () => import('./pages/index.astro.mjs');


const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/auth/callback.ts", _page1],
    ["src/pages/api/auth/signin.ts", _page2],
    ["src/pages/api/auth/signout.ts", _page3],
    ["src/pages/dashboard.astro", _page4],
    ["src/pages/dev-selection/[team].astro", _page5],
    ["src/pages/unauthorized.astro", _page6],
    ["src/pages/index.astro", _page7]
]);
const serverIslandMap = new Map();
const middleware = (_, next) => next();
const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    middleware
});
const _args = {
    "middlewareSecret": "ad66cd34-7a6d-4bc5-abc2-9320d0c17671"
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (_start in serverEntrypointModule) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
