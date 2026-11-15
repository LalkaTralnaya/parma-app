import { defineConfig } from '@playwright/test';

const host = '127.0.0.1';
const port = 4175;
const baseURL = `http://${host}:${port}`;

export default defineConfig({
 testDir: './tests/browser',
 timeout: 30_000,
 use: {
  baseURL,
  channel: process.env.PARMA_BROWSER_CHANNEL,
  trace: 'retain-on-failure'
 },
 webServer: {
  command: 'node server.mjs',
  url: baseURL,
  reuseExistingServer: false,
  env: {
   NODE_ENV: 'production',
   HOST: host,
   PORT: String(port),
   PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
   PUBLIC_SUPABASE_ANON_KEY: 'parma-browser-test'
  }
 }
});
