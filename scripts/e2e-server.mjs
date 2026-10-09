// Test the same bundled application that is released, with synthetic provider
// configuration. Always rebuild: an existing dist or dev server is not evidence.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.env.VITE_SUPABASE_URL = 'https://fixture.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'fixture-anon-key';
const child = spawn(process.execPath, [
  fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
  'build', '--mode', 'test',
], { cwd: root, env: process.env, stdio: 'inherit' });
const code = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', value => resolve(value ?? 1));
});
if (code !== 0) process.exit(code);

const { preview } = await import('vite');
const server = await preview({
  root, mode: 'test',
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
});
server.printUrls();
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.httpServer.close(() => process.exit(0)));
}
