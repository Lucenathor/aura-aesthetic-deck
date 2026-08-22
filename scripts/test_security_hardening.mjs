import fs from 'node:fs';

const root='/home/ubuntu/aura-presentation';
const worker=fs.readFileSync(root+'/worker/src/index.ts','utf8');
const wrangler=fs.readFileSync(root+'/worker/wrangler.toml','utf8');
const headers=fs.readFileSync(root+'/mvp/_headers','utf8');
const login=fs.readFileSync(root+'/mvp/login.html','utf8');
const dashboard=fs.readFileSync(root+'/mvp/dashboard.html','utf8');
const auditDashboard=fs.readFileSync(root+'/scripts/audit_dashboard_browser.sh','utf8');
const auditModules=fs.readFileSync(root+'/scripts/audit_module_read_apis.sh','utf8');
const funnel=fs.readFileSync(root+'/mvp/_t/index.html','utf8');
const deploy=fs.readFileSync(root+'/deploy.sh','utf8');

const checks=[
  ['JWT secret obligatorio',worker.includes("JWT_SECRET is missing or too short")],
  ['sesiones con caducidad',worker.includes('SESSION_ABSOLUTE_MS')&&worker.includes('SESSION_IDLE_MS')],
  ['OTP almacenado con HMAC',worker.includes("'otp:'+email+':'+code")&&!worker.includes('INSERT OR REPLACE INTO login_codes')],
  ['sin token de sesión por query',!worker.includes("url.searchParams.get('token')")],
  ['iCal firmado con HMAC',worker.includes('signIcalFeed(env')&&!worker.includes('aura-ical-2026')],
  ['confirmación de cita HMAC expirable',worker.includes('signAppointmentConfirm')&&!worker.includes('aura-confirm-2026')],
  ['capacidad HMAC de lead',worker.includes('requireLeadCapability')&&funnel.includes('lead_token')],
  ['webhooks Twilio firmados',worker.includes('verifyTwilioSignature')],
  ['webhooks 360dialog firmados',worker.includes('verify360Signature')],
  ['uploads con firma binaria',worker.includes('detectSafeImage')&&worker.includes('detectSafeVideo')&&worker.includes('detectSafeDocument')],
  ['rate limiting Cloudflare',wrangler.includes('AUTH_RATE_LIMITER')&&wrangler.includes('PUBLIC_RATE_LIMITER')&&wrangler.includes('COST_RATE_LIMITER')],
  ['Turnstile backend y frontend',worker.includes('verifyTurnstile')&&login.includes('cf-turnstile')&&funnel.includes('turnstile.render')],
  ['cabeceras CSP y HSTS',headers.includes('Content-Security-Policy:')&&headers.includes('Strict-Transport-Security:')],
  ['panel profesional sin token URL',!worker.includes("url.searchParams.get('token') || ''")&&funnel.includes('lead_token')],
  ['sesión principal limitada a pestaña',login.includes("sessionStorage.setItem('aura_token'")&&dashboard.includes('__auraSessionScoped')&&!login.includes("localStorage.setItem('aura_token'")],
  ['auditorías sin sesiones hardcodeadas',auditDashboard.includes('AURA_AUDIT_TOKEN')&&auditModules.includes('AURA_AUDIT_TOKEN')&&!/TOKEN=["'][A-Za-z0-9_-]{12,}["']/.test(auditDashboard+auditModules)],
  ['despliegue GitHub sin force',!deploy.includes('git push origin main --force')&&deploy.includes('git push origin main')],
  ['Pages antes del Worker',deploy.indexOf('Desplegando Pages')<deploy.indexOf('Desplegando Worker')],
];

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'OK':'FALLO'}\t${name}`);
  if(!ok)failed++;
}
if(failed){
  console.error(`\n${failed} controles de seguridad fallaron.`);
  process.exit(1);
}
console.log(`\n${checks.length} controles de seguridad superados.`);
