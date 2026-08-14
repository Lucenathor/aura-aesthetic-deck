import fs from 'node:fs';

const sourcePath = '/home/ubuntu/aura-presentation/mvp/dashboard.html';
const targetPath = '/home/ubuntu/aura-presentation/audit/dashboard_inline_scripts.js';
const html = fs.readFileSync(sourcePath, 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((script) => script.trim().length > 0);

fs.mkdirSync('/home/ubuntu/aura-presentation/audit', { recursive: true });
fs.writeFileSync(targetPath, scripts.join('\n\n'), 'utf8');
console.log(`Extraídos ${scripts.length} scripts inline en ${targetPath}`);
