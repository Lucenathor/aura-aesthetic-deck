import { spawn } from 'node:child_process';
import fs from 'node:fs';

const [url, outputPath, profilePath] = process.argv.slice(2);
if (!url || !outputPath || !profilePath) {
  console.error('Uso: node dump_aura_module_dom.mjs <url> <outputPath> <profilePath>');
  process.exit(2);
}

fs.mkdirSync(profilePath, { recursive: true });
const output = fs.openSync(outputPath, 'w');
const error = fs.openSync(`${outputPath}.stderr`, 'w');
const args = [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-sync',
  '--no-first-run',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--window-size=1440,1200',
  '--virtual-time-budget=7000',
  `--user-data-dir=${profilePath}`,
  '--dump-dom',
  url,
];

const child = spawn('/usr/bin/chromium', args, { stdio: ['ignore', output, error] });
const timer = setTimeout(() => child.kill('SIGKILL'), 40000);
child.on('exit', (code, signal) => {
  clearTimeout(timer);
  if (code === 0 && !signal) process.exit(0);
  process.exit(1);
});
