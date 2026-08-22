import fs from 'node:fs';

const sourcePath = new URL('../worker/src/index.ts', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');

function stringsInsideSet(name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*new Set<[^>]+>\\(\\[([\\s\\S]*?)\\]\\)`));
  if (!match) return [];
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
}

const guarded = new Set(stringsInsideSet('TENANT_GUARDED'));
const guardedGet = new Set(stringsInsideSet('TENANT_GUARDED_GET'));
const publicWrites = new Set(
  [...(source.match(/const\s+PUBLIC_WRITE_ENDPOINTS\s*=\s*\[([\s\S]*?)\]/)?.[1] || '').matchAll(/['"]([^'"]+)['"]/g)]
    .map((item) => item[1]),
);

const explicitPublic = new Set([
  '/', '/chat', '/api/quiz-token', '/api/auth/request-code', '/api/auth/verify-code',
  '/api/confirm-link', '/api/wa-webhook', '/api/wa-webhook-360', '/api/wa-media',
  '/api/wa-avatar', '/api/call-twiml', '/api/call-status', '/api/call-recording',
]);

const routes = new Map();
for (const match of source.matchAll(/p\s*===\s*['"]([^'"]+)['"][\s\S]{0,180}?req\.method\s*===\s*['"](GET|POST|PUT|DELETE|PATCH)['"]/g)) {
  const [, path, method] = match;
  const key = `${method} ${path}`;
  routes.set(key, { method, path });
}

const rows = [...routes.values()]
  .filter(({ path }) => path.startsWith('/api/'))
  .map(({ method, path }) => {
    let classification = 'review';
    if (guarded.has(path)) classification = 'tenant_guarded';
    else if (method === 'GET' && guardedGet.has(path)) classification = 'tenant_guarded_get';
    else if (method === 'POST' && publicWrites.has(path)) classification = 'public_write_limited';
    else if (explicitPublic.has(path)) classification = 'explicit_public';
    else if (path.startsWith('/api/dashboard/')) classification = 'tenant_guarded_prefix';
    else if (path.startsWith('/api/wa-') && !explicitPublic.has(path)) classification = 'tenant_guarded_prefix';
    else if (path.startsWith('/api/call-') && !explicitPublic.has(path)) classification = 'tenant_guarded_prefix';
    else if (path.startsWith('/api/inv-')) classification = 'tenant_guarded_prefix';
    return { method, path, classification };
  })
  .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

const summary = rows.reduce((acc, row) => {
  acc[row.classification] = (acc[row.classification] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ summary, review: rows.filter((row) => row.classification === 'review'), routes: rows }, null, 2));
