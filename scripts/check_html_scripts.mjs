import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const pages = [
  '/home/ubuntu/aura-presentation/mvp/index.html',
  '/home/ubuntu/aura-presentation/mvp/dashboard.html',
  '/home/ubuntu/aura-presentation/mvp/_t/index.html',
  '/home/ubuntu/aura-presentation/mvp/login.html',
  '/home/ubuntu/aura-presentation/mvp/portal.html',
];
const outputDir = '/home/ubuntu/aura-presentation/audit/syntax';
fs.mkdirSync(outputDir, { recursive: true });

for (const page of pages) {
  if (!fs.existsSync(page)) {
    console.log(`OMITIDA\t${page}\tno existe`);
    continue;
  }
  const html = fs.readFileSync(page, 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((script) => script.trim().length > 0);
  const target = path.join(outputDir, `${path.basename(path.dirname(page))}_${path.basename(page)}.js`);
  fs.writeFileSync(target, scripts.join('\n\n'), 'utf8');
  try {
    execFileSync('node', ['--check', target], { stdio: 'pipe' });
    console.log(`OK\t${page}\t${scripts.length} scripts inline`);
  } catch (error) {
    const message = error.stderr?.toString().split('\n').slice(-4).join(' ') || 'error de sintaxis';
    console.log(`ERROR\t${page}\t${message}`);
    process.exitCode = 1;
  }
}
