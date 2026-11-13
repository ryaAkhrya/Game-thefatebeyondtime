import { spawnSync } from 'node:child_process';
import { loadPrivateContent, privateOut } from './ending-build.ts';
if (!process.argv.includes('--confirm-private-local')) throw new Error('Explicit local action required: npm run build:private -- --confirm-private-local');
loadPrivateContent(); // fail before invoking Vite or touching any output
console.log('PRIVATE LOCAL BUILD. Browser files include personal content. Never upload this directory: ' + privateOut);
const env = { ...process.env, TFBT_PRIVATE_BUILD_CONFIRM: 'LOCAL_ONLY' };
for (const args of [['node_modules/typescript/bin/tsc', '--noEmit'], ['node_modules/vite/bin/vite.js', 'build', '--mode', 'anniversary']]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
