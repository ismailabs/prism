import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
let providerOrigin = '';

export default defineConfig({
  plugins: [react(), {
    name: 'prism-public-pwa',
    configResolved(config) {
      const endpoint = config.env.VITE_SUPABASE_URL?.trim();
      if (config.command === 'build' && (!endpoint || !config.env.VITE_SUPABASE_ANON_KEY?.trim())) throw new Error('Build requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      if (endpoint) {
        const url = new URL(endpoint);
        if (config.command === 'build' && (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)) throw new Error('Build requires a clean HTTPS Supabase URL.');
        providerOrigin = url.origin;
      }
    },
    transformIndexHtml() {
      // A second policy intersects the hosting policy, narrowing the wildcard
      // to this build's public provider origin without hardcoding staging URLs.
      return providerOrigin ? [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: `connect-src 'self' ${providerOrigin} ${providerOrigin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')}` }, injectTo: 'head-prepend' as const }] : [];
    },
    generateBundle(_options, bundle) {
      const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
      const offline = ['html', 'css', 'js'].map(ext => read(`./src/pwa/offline.${ext}`));
      const template = read('./src/pwa/service-worker.js');
      const version = createHash('sha256').update(JSON.stringify(Object.keys(bundle).sort())).update(offline.join('')).update(template).digest('hex').slice(0, 20);
      const names = ['html', 'css', 'js'].map(ext => `/offline-${version}.${ext}`);
      for (let index = 0; index < names.length; index++) this.emitFile({ type: 'asset', fileName: names[index].slice(1), source: index === 0 ? offline[0].replace('__CSS__', names[1]).replace('__JS__', names[2]) : offline[index] });
      const assets = [...Object.keys(bundle).filter(path => path.startsWith('assets/')).map(path => `/${path}`), ...names];
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: template.replaceAll('__CACHE_NAME__', JSON.stringify(`prism-public-${version}`)).replaceAll('__ASSETS__', JSON.stringify(assets)).replaceAll('__OFFLINE_URL__', JSON.stringify(names[0])) });
      this.emitFile({ type: 'asset', fileName: 'pwa-build.json', source: JSON.stringify({ version, assets, offline: names[0] }) });
    },
  }],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173, strictPort: true,
    // Test binaries and reports are generated while local QA runs. On Windows,
    // trying to watch a locked executable can terminate the development server.
    watch: { ignored: ['**/.cache/**', '**/artifacts/**', '**/test-results/**'] },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'ui', test: /[\\/]node_modules[\\/](@radix-ui|radix-ui)[\\/]/ },
            { name: 'validation', test: /[\\/]node_modules[\\/]zod[\\/]/ },
            { name: 'supabase', test: /[\\/]node_modules[\\/]@supabase[\\/]/ },
            { name: 'charts', test: /[\\/]node_modules[\\/]recharts[\\/]/ },
            { name: 'motion', test: /[\\/]node_modules[\\/]framer-motion[\\/]/ },
          ],
        },
      },
    },
  }
});
