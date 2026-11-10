// One preview server for all suites. Set E2E_URL to reuse the already running dev/preview server.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
let server;
const base = process.env.E2E_URL ?? 'http://127.0.0.1:4199/';
try {
  if (!process.env.E2E_URL) {
    server = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'preview', '--port', '4199', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolveReady, reject) => {
      const timeout = setTimeout(() => reject(new Error('Preview startup timeout')), 15000);
      server.stdout.on('data', data => { if (String(data).includes('127.0.0.1')) { clearTimeout(timeout); resolveReady(); } });
      server.on('exit', code => { clearTimeout(timeout); reject(new Error(`Preview exited ${code}`)); });
    });
  }
  let failed = false;
  for (const script of ['smoke.mjs', 'phase1.mjs', 'phase2.mjs']) {
    const code = await new Promise((resolveExit, reject) => {
      const child = spawn(process.execPath, [resolve('tests/e2e', script)], { stdio: 'inherit', env: { ...process.env, E2E_URL: base } });
      child.on('exit', resolveExit); child.on('error', reject);
    });
    if (code !== 0) failed = true;
  }
  process.exitCode = failed ? 1 : 0;
} finally { server?.kill(); }
