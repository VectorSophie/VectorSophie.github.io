// Keep the local Genkit console compatible with Next.js server-only markers.
const { spawn } = require('node:child_process');
const path = require('node:path');
const cli = path.join(path.dirname(require.resolve('genkit-cli/package.json')), 'dist/bin/genkit.js');
const watch = process.argv.includes('--watch');
const child = spawn(process.execPath, [cli, 'start', '--', 'tsx', ...(watch ? ['--watch'] : []), 'src/ai/dev.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --conditions=react-server`.trim() },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
