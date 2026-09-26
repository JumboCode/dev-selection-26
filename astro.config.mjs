import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

import vercel from "@astrojs/vercel";

// Vercel forwards the public host to its serverless function. Astro must trust
// these exact deployment hosts to reconstruct the URL used by origin checks.
const deploymentHosts = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
].filter(Boolean);

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), react()],
  output: "server",
  adapter: vercel(),
  security: {
    checkOrigin: true,
    allowedDomains: [
      ...new Set(deploymentHosts),
    ].map((hostname) => ({ hostname, protocol: 'https' })),
  },
});
