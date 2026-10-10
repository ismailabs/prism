// Isolated loopback-only production-bundle/headers fixture. No hosted resources.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const out = resolve('artifacts/phase7/pwa-dist');
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'pwa', '--outDir', out], { env: { ...process.env, VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_ANON_KEY: 'fixture-anon-key' }, stdio: 'inherit', windowsHide: true });
if (await new Promise(done => child.once('exit', done)) !== 0) process.exit(1);
const configuration = JSON.parse(await readFile('vercel.json', 'utf8'));
let release = 1;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:5174');
  for (const rule of configuration.headers) {
    if (new RegExp(`^${rule.source}$`).test(url.pathname)) for (const header of rule.headers) res.setHeader(header.key, header.value);
  }
  if (url.pathname === '/__pwa_test/update' && req.method === 'POST') { release++; res.writeHead(204); res.end(); return; }
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/exports/')) { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ marker: 'PRIVATE_FIXTURE_NOT_FOR_CACHE' })); return; }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  const path = resolve(out, `.${decodeURIComponent(url.pathname)}`);
  if (!path.startsWith(out + sep) && path !== out) { res.writeHead(403); res.end(); return; }
  try {
    let source, selected = path;
    try { source = await readFile(path); } catch {
      // Unknown static assets must be 404, never successful SPA HTML.
      if (extname(url.pathname)) { res.writeHead(404); res.end(); return; }
      selected = resolve(out, 'index.html'); source = await readFile(selected);
    }
    if (url.pathname === '/sw.js' && release > 1) source = Buffer.from(source.toString().replace(/prism-public-([a-f0-9]+)/g, `prism-public-$1-r${release}`));
    res.setHeader('Content-Type', mime[extname(selected)] || 'application/octet-stream');
    res.writeHead(200); res.end(req.method === 'HEAD' ? undefined : source);
  } catch { res.writeHead(500); res.end('Local fixture unavailable'); }
});
server.listen(5174, '127.0.0.1');
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close(() => process.exit(0)));
