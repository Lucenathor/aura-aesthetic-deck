/**
 * AURA Worker · Multi-tenant SaaS API + AI Chat Proxy
 * - /chat          (legacy) chat IA
 * - /api/tenant/:id          GET tenant config
 * - /api/funnels/:tenantId   GET funnels of a tenant
 * - /api/generate            POST { url } → genera demo de tenant a partir de la URL
 * - /api/leads               POST/GET leads
 * - /api/messages            POST mensaje en thread
 * - /api/appointments        POST/GET citas
 * - /api/dashboard/:tenantId GET overview
 */

interface Env {
  AI: any;
  aura_db: D1Database;
  AURA_IMG: KVNamespace;
  OPENAI_KEY?: string;
  RESEND_KEY?: string;
  LABSMOBILE_USER?: string;
  LABSMOBILE_TOKEN?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  JWT_SECRET?: string;
  aura_r2?: R2Bucket;
  EVOLUTION_URL?: string;
  EVOLUTION_KEY?: string;
  UNIPILE_DSN?: string;
  UNIPILE_KEY?: string;
}
interface R2Bucket {
  put(key: string, value: string|ArrayBuffer|ReadableStream, opts?: any): Promise<any>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  list(opts?: any): Promise<any>;
}
interface KVNamespace {
  get(key: string, type?: 'text'|'json'|'arrayBuffer'|'stream'): Promise<any>;
  put(key: string, value: string|ArrayBuffer|ReadableStream, opts?: any): Promise<void>;
  delete(key: string): Promise<void>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<any>;
  exec(query: string): Promise<any>;
}
interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  run(): Promise<any>;
  all<T = any>(): Promise<{ results: T[] }>;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const text = (data: string, status = 200) =>
  new Response(data, { status, headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } });

// ─── Helpers ──────────────────────────────────────────────────────
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'clinica-' + Math.random().toString(36).slice(2, 8);
}
function uid() {
  return 'l_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function appId() {
  return 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
// ── Token firmado para link mágico de conversación (HMAC-SHA256) ──
function b64url(buf: ArrayBuffer){ const b=btoa(String.fromCharCode(...new Uint8Array(buf))); return b.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
async function signLead(env: Env, leadId: string){
  const secret=env.JWT_SECRET||'aura-default-secret';
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(leadId));
  return b64url(sig).slice(0,24);
}
async function verifyLead(env: Env, leadId: string, token: string){
  try{ const expected=await signLead(env,leadId); return expected===token; }catch(e){ return false; }
}
// Token FUERTE atado a un consentimiento concreto (no reutilizable entre documentos).
async function signConsent(env: Env, consentId: string, leadId: string){
  const secret=env.JWT_SECRET||'aura-default-secret';
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('consent:'+consentId+':'+leadId));
  return b64url(sig).slice(0,32);
}
async function verifyConsent(env: Env, consentId: string, leadId: string, token: string){
  try{ if(!token) return false; const expected=await signConsent(env,consentId,leadId); // comparacion en tiempo constante
    if(expected.length!==token.length) return false; let diff=0; for(let i=0;i<expected.length;i++) diff |= expected.charCodeAt(i)^token.charCodeAt(i); return diff===0; }catch(e){ return false; }
}
// Guardia multi-tenant: el token de sesion (cookie/header/query) debe pertenecer al tenant solicitado.
// Devuelve null si OK; o un objeto error para responder 403. Asi una clinica NUNCA toca datos de otra.
async function requireTenant(env: Env, req: Request, url: URL, tenantSolicitado: string|null): Promise<string|null> {
  if (!tenantSolicitado) return 'missing_tenant';
  // token desde Authorization: Bearer, header x-aura-token o query ?token=
  let tok = '';
  const auth = req.headers.get('authorization')||'';
  if (auth.toLowerCase().startsWith('bearer ')) tok = auth.slice(7).trim();
  if (!tok) tok = req.headers.get('x-aura-token') || '';
  if (!tok) tok = url.searchParams.get('token') || '';
  if (!tok) { try{ const c=req.headers.get('cookie')||''; const m=c.match(/aura_token=([^;]+)/); if(m) tok=decodeURIComponent(m[1]); }catch(e){} }
  if (!tok) return 'no_token';
  const s: any = await env.aura_db.prepare('SELECT tenant_id, email FROM sessions WHERE token=?').bind(tok).first();
  if (!s) return 'invalid_token';
  if (s.tenant_id === tenantSolicitado) return null; // OK: su propia clínica
  // El SUPER ADMIN puede acceder a cualquier clínica (selector de clínicas del panel)
  try {
    const owner: any = await env.aura_db.prepare('SELECT role FROM owners WHERE email=?').bind(s.email).first();
    if (owner?.role === 'superadmin') return null; // OK: superadmin
  } catch(e){}
  return 'tenant_mismatch';
}
// Devuelve el rol del usuario de la sesion: superadmin | owner | finance | reception | pro | null
async function getSessionRole(env: Env, req: Request, url: URL): Promise<string|null> {
  let tok = '';
  const auth = req.headers.get('authorization')||'';
  if (auth.toLowerCase().startsWith('bearer ')) tok = auth.slice(7).trim();
  if (!tok) tok = req.headers.get('x-aura-token') || '';
  if (!tok) tok = url.searchParams.get('token') || '';
  if (!tok) { try{ const c=req.headers.get('cookie')||''; const m=c.match(/aura_token=([^;]+)/); if(m) tok=decodeURIComponent(m[1]); }catch(e){} }
  if (!tok) return null;
  const s: any = await env.aura_db.prepare('SELECT email, tenant_id FROM sessions WHERE token=?').bind(tok).first();
  if (!s) return null;
  const owner: any = await env.aura_db.prepare('SELECT role FROM owners WHERE email=?').bind(s.email).first();
  if (owner?.role === 'superadmin') return 'superadmin';
  const isOwner: any = await env.aura_db.prepare('SELECT 1 FROM owners WHERE email=? AND tenant_id=?').bind(s.email, s.tenant_id).first();
  if (isOwner) return 'owner';
  const mb: any = await env.aura_db.prepare('SELECT role FROM team_members WHERE email=? AND tenant_id=?').bind(s.email, s.tenant_id).first();
  return mb?.role || 'owner';
}
// === BLINDAJE COPILOTO: deriva el tenant de la SESIÓN (no del parámetro) y verifica permiso ===
// Devuelve { tenant, role, email } si todo OK, o { error } si no.
async function resolveCopilotTenant(env: Env, req: Request, url: URL, tenantSolicitado: string|null): Promise<{tenant?:string, role?:string, email?:string, error?:string}> {
  let tok = '';
  const auth = req.headers.get('authorization')||'';
  if (auth.toLowerCase().startsWith('bearer ')) tok = auth.slice(7).trim();
  if (!tok) tok = req.headers.get('x-aura-token') || '';
  if (!tok) tok = url.searchParams.get('token') || '';
  if (!tok) { try{ const c=req.headers.get('cookie')||''; const m=c.match(/aura_token=([^;]+)/); if(m) tok=decodeURIComponent(m[1]); }catch(e){} }
  if (!tok) return { error:'no_token' };
  const s:any = await env.aura_db.prepare('SELECT email, tenant_id FROM sessions WHERE token=?').bind(tok).first();
  if (!s) return { error:'invalid_token' };
  const owner:any = await env.aura_db.prepare('SELECT role FROM owners WHERE email=?').bind(s.email).first();
  const isSuper = owner?.role === 'superadmin';
  // El tenant SIEMPRE es el de la sesión. Solo el super admin puede operar sobre otra clínica.
  let tenant = s.tenant_id;
  if (isSuper && tenantSolicitado) tenant = tenantSolicitado;
  if (!tenant) return { error:'no_tenant' };
  // Si NO es super admin y pidió otra clínica distinta de la suya -> bloqueo (defensa anti-fuga)
  if (!isSuper && tenantSolicitado && tenantSolicitado !== s.tenant_id) return { error:'tenant_mismatch' };
  // Rol efectivo en esa clínica
  let role = isSuper ? 'superadmin' : '';
  if (!role) {
    const isOwner:any = await env.aura_db.prepare('SELECT 1 FROM owners WHERE email=? AND tenant_id=?').bind(s.email, tenant).first();
    if (isOwner) role='owner';
    else { const mb:any = await env.aura_db.prepare('SELECT role, can_copilot FROM team_members WHERE email=? AND tenant_id=?').bind(s.email, tenant).first();
      role = mb?.role || '';
      // Permiso del copiloto: recepción/pro necesitan can_copilot; owner/finance/superadmin siempre
      if (role && role!=='owner' && role!=='finance' && !mb?.can_copilot) return { error:'no_copilot_permission' };
      if (!role) return { error:'not_member' };
    }
  }
  return { tenant, role, email: s.email };
}
async function magicLink(env: Env, tenantId: string, leadId: string){
  const tok=await signLead(env,leadId);
  return 'https://aura-mvp.pages.dev/c/'+tenantId+'?lead='+encodeURIComponent(leadId)+'&k='+tok;
}

// ─── SMS (LabsMobile) ───────────────────────────────────────────────
// Envía un SMS. number en formato internacional sin + (ej 34600000000). sender opcional (máx 11 chars alfanuméricos).
async function sendSMS(env: Env, number: string, message: string, sender?: string, tenantId?: string): Promise<{ ok: boolean; detail?: any; credits?: number }> {
  if (!env.LABSMOBILE_USER || !env.LABSMOBILE_TOKEN) return { ok: false, detail: 'sms no configurado' };
  const cleaned = (number || '').replace(/[^0-9]/g, '');
  if (cleaned.length < 9) return { ok: false, detail: 'número inválido' };
  // Control de créditos por clínica
  if (tenantId) {
    const t: any = await env.aura_db.prepare('SELECT sms_credits FROM tenants WHERE id=?').bind(tenantId).first();
    const credits = t?.sms_credits ?? 0;
    if (credits <= 0) return { ok: false, detail: 'sin_saldo_sms', credits: 0 };
  }
  const msisdn = cleaned.length === 9 ? '34' + cleaned : cleaned; // asume España si 9 dígitos
  // Si el emisor es el sistema de ventas (clientes de la plataforma), firmar siempre como AURA
  const senderName = (tenantId === 'focus-ventas') ? 'AURA' : (sender || 'AURA');
  const body: any = { message, tpoa: senderName.slice(0, 11), recipient: [{ msisdn }] };
  try {
    const auth = 'Basic ' + btoa(env.LABSMOBILE_USER + ':' + env.LABSMOBILE_TOKEN);
    const r = await fetch('https://api.labsmobile.com/json/send', {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(body),
    });
    const d: any = await r.json();
    const ok = String(d.code) === '0';
    // Descontar 1 crédito si se envió y hay tenant
    if (ok && tenantId) {
      await env.aura_db.prepare('UPDATE tenants SET sms_credits = MAX(0, COALESCE(sms_credits,0) - 1) WHERE id=?').bind(tenantId).run();
    }
    return { ok, detail: d };
  } catch (e: any) {
    return { ok: false, detail: String(e) };
  }
}

// ─── AI invocation (gpt-5.5-pro ó fallback Workers AI) ──────────────
async function runAI(env: Env, messages: any[], jsonOut = false, model?: string): Promise<string> {
  // Forzar Llama (Workers AI, gratis) cuando se pide explícitamente
  if (model === 'llama') {
    try {
      const r: any = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages, max_tokens: jsonOut ? 1400 : 220, temperature: jsonOut ? 0.2 : 0.7 });
      return r.response || r.result?.response || '';
    } catch (e) { return ''; }
  }
  if (env.OPENAI_KEY) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'gpt-5.5',
        messages,
        max_completion_tokens: jsonOut ? 1800 : 320,
        response_format: jsonOut ? { type: 'json_object' } : undefined,
      }),
    });
    const d: any = await r.json();
    if (d?.error) {
      // Fallback a 4o si el modelo no está disponible
      const r2 = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          temperature: jsonOut ? 0.3 : 0.85,
          max_tokens: jsonOut ? 1800 : 320,
          response_format: jsonOut ? { type: 'json_object' } : undefined,
        }),
      });
      const d2: any = await r2.json();
      return d2.choices?.[0]?.message?.content || '';
    }
    return d.choices?.[0]?.message?.content || '';
  }
  const result: any = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    max_tokens: jsonOut ? 1400 : 220,
    temperature: jsonOut ? 0.3 : 0.85,
  });
  return result.response || result.result?.response || '';
}

// ─── Image generation (gpt-image-2) + KV storage ──────────────────────
async function generateImage(env: Env, prompt: string, size: string = '1024x1024'): Promise<string | null> {
  if (!env.OPENAI_KEY) return null;
  try {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt,
        size,
        n: 1,
        quality: 'medium',
      }),
    });
    const d: any = await r.json();
    if (d?.error) { console.error('gpt-image-2 err', d.error); return null; }
    const b64 = d.data?.[0]?.b64_json;
    if (!b64) return null;
    // Decode base64 to bytes and store in KV
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const key = 'img_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.png';
    if (env.aura_r2) { try { await env.aura_r2.put('img/'+key, bytes.buffer, { httpMetadata: { contentType: 'image/png' } }); } catch(e) { await env.AURA_IMG.put(key, bytes.buffer, { metadata: { contentType: 'image/png' } }); } }
    else { await env.AURA_IMG.put(key, bytes.buffer, { metadata: { contentType: 'image/png' } }); }
    return '/img/' + key;
  } catch (e) {
    console.error('generateImage exception', e);
    return null;
  }
}

async function generateTenantImages(env: Env, tenantId: string, name: string, brandPrimary: string, brandAccent: string) {
  const tone = `warm cream walls, brushed brass details, polished marble counter, fresh peonies, hardwood herringbone floor, golden hour soft daylight`;
  const prompts = {
    hero: `Cinematic editorial photo for the landing page of an aesthetic clinic called ${name}. Mediterranean Spanish woman age 33, natural elegant beauty, looking softly to her left side off-camera (aspirational gaze, NOT at camera). Soft cream silk camisole. Background: luxurious modern clinic interior with ${tone}. She's positioned on the RIGHT side of the frame leaving the LEFT third more empty/blurred for text overlay. Subtle freckles preserved, natural makeup, photorealistic skin texture (NO over-smoothing), magazine quality 8k. NO text, NO logo, NO watermark.`,
    advisor: `Hyperrealistic square close-up profile photo of a Mediterranean Spanish male advisor age 32 for a WhatsApp-style chat avatar at aesthetic clinic ${name}. Shaved short hair, dark eyebrows, calm trustworthy expression, light beige merino sweater. Background: softly blurred warm clinic interior with ${tone}. Subtle warm half-smile, looking directly at camera. Photorealistic skin texture preserved (NO over-smoothing). Magazine quality 8k. NO text, NO logo.`,
    room: `Hyperrealistic interior photo of a luxurious aesthetic clinic treatment room at ${name}. Modern minimalist room with treatment chair upholstered in soft cream leather, ${tone}, soft natural daylight from large window, vase with fresh pink peonies, framed minimal art on wall. Empty room, no people. Editorial magazine quality photography 8k. NO text, NO logo, NO medical instruments visible.`,
  };

  // Marcar status
  await env.aura_db.prepare('UPDATE tenants SET images_status="generating" WHERE id=?').bind(tenantId).run();

  // Generar las 3 en paralelo
  const [heroUrl, advisorUrl, roomUrl] = await Promise.all([
    generateImage(env, prompts.hero, '1536x1024'),
    generateImage(env, prompts.advisor, '1024x1024'),
    generateImage(env, prompts.room, '1536x1024'),
  ]);

  await env.aura_db
    .prepare('UPDATE tenants SET hero_image_url=?, doctor_image_url=?, room_image_url=?, images_status="ready" WHERE id=?')
    .bind(heroUrl, advisorUrl, roomUrl, tenantId)
    .run();
}

// ─── DISPONIBILIDAD: horario por día + vacaciones ─────────────────
// Zona horaria Madrid con DST aproximado (CET=+1 invierno, CEST=+2 verano).
// Regla DST UE: del último domingo de marzo al último domingo de octubre = +2.
function madridOffsetHours(d: Date): number {
  const y = d.getUTCFullYear();
  // último domingo de marzo a las 01:00 UTC
  const marchLast = new Date(Date.UTC(y, 2, 31, 1, 0, 0));
  marchLast.setUTCDate(31 - marchLast.getUTCDay());
  // último domingo de octubre a las 01:00 UTC
  const octLast = new Date(Date.UTC(y, 9, 31, 1, 0, 0));
  octLast.setUTCDate(31 - octLast.getUTCDay());
  return (d >= marchLast && d < octLast) ? 2 : 1;
}
// Devuelve los componentes de fecha/hora en hora local de Madrid
function madridParts(utc: Date) {
  const off = madridOffsetHours(utc);
  const local = new Date(utc.getTime() + off * 3600000);
  return {
    y: local.getUTCFullYear(), mo: local.getUTCMonth() + 1, da: local.getUTCDate(),
    h: local.getUTCHours(), mi: local.getUTCMinutes(), dow: local.getUTCDay(),
    dateStr: local.toISOString().slice(0, 10), offset: off,
  };
}
// Construye un instante UTC a partir de fecha (YYYY-MM-DD) y hora local de Madrid
function madridToUTC(dateStr: string, hour: number, minute = 0): Date {
  const probe = new Date(dateStr + 'T12:00:00Z');
  const off = madridOffsetHours(probe);
  const asIfUTC = new Date(dateStr + 'T' + String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0') + ':00Z');
  return new Date(asIfUTC.getTime() - off * 3600000);
}

const DOW_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// Crea tablas de disponibilidad si no existen (idempotente)
let __availSchemaReady = false;
async function ensureAvailabilitySchema(env: Env) {
  if (__availSchemaReady) return;
  try {
    await env.aura_db.exec("CREATE TABLE IF NOT EXISTS schedule_by_day (tenant_id TEXT NOT NULL, dow INTEGER NOT NULL, is_open INTEGER DEFAULT 1, t1_start TEXT DEFAULT '10:00', t1_end TEXT DEFAULT '14:00', t2_start TEXT, t2_end TEXT, PRIMARY KEY (tenant_id, dow))");
    await env.aura_db.exec("CREATE TABLE IF NOT EXISTS vacations (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, reason TEXT, created_at INTEGER)");
    __availSchemaReady = true;
  } catch (e) { console.error('ensureAvailabilitySchema', e); }
}

// Horario por defecto si el tenant aún no configuró nada (migra del calendar_config global)
async function getScheduleByDay(env: Env, tenantId: string): Promise<any[]> {
  await ensureAvailabilitySchema(env);
  const rows: any = await env.aura_db.prepare('SELECT * FROM schedule_by_day WHERE tenant_id=? ORDER BY dow').bind(tenantId).all();
  let list = rows.results || [];
  if (list.length === 0) {
    // Migración: leer config global y proyectar a L-V abierto, S-D cerrado
    const cfg: any = await env.aura_db.prepare('SELECT * FROM calendar_config WHERE tenant_id=?').bind(tenantId).first();
    const openDays = cfg && cfg.days ? String(cfg.days).split(',').map((x:string)=>parseInt(x)) : [1,2,3,4,5];
    const sh = cfg?.start_hour ?? 10, eh = cfg?.end_hour ?? 19;
    const def: any[] = [];
    for (let dow = 0; dow <= 6; dow++) {
      const isOpen = openDays.includes(dow) ? 1 : 0;
      def.push({ tenant_id: tenantId, dow, is_open: isOpen, t1_start: String(sh).padStart(2,'0')+':00', t1_end: String(eh).padStart(2,'0')+':00', t2_start: null, t2_end: null });
    }
    list = def;
  }
  return list;
}

let __bcReady = false;
async function ensureBusinessCosts(env: Env) {
  if (__bcReady) return;
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS business_costs (tenant_id TEXT PRIMARY KEY, fixed_json TEXT, marketing_monthly REAL DEFAULT 0, commission_pct REAL DEFAULT 0, iva_pct REAL DEFAULT 21, price_includes_iva INTEGER DEFAULT 1, prorate_mode TEXT DEFAULT 'open_days', updated_at INTEGER)"); __bcReady = true; } catch(e){ console.error('ensureBusinessCosts', e); }
}
let __leadFlowReady = false;
async function ensureLeadFlowSchema(env: Env) {
  if (__leadFlowReady) return;
  // Columnas para la máquina de estados de llamadas del pipeline (migración segura)
  const cols = ['call_attempts INTEGER DEFAULT 0', 'last_call_at TEXT', 'pipeline_state TEXT', 'lost_reason TEXT', 'recovered_by TEXT', 'recovered_at TEXT'];
  for (const c of cols) {
    try { await env.aura_db.exec('ALTER TABLE leads ADD COLUMN ' + c); } catch(e) { /* ya existe */ }
  }
  __leadFlowReady = true;
}
let __waReady = false;
async function ensureWaSchema(env: Env) {
  if (__waReady) return;
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS wa_config (tenant_id TEXT PRIMARY KEY, instance TEXT, updated_at INTEGER)"); } catch(e){}
  // Mensajes persistidos (fuente de verdad de AURA). message_id único para dedupe (Unipile recomienda).
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS wa_messages (message_id TEXT PRIMARY KEY, tenant_id TEXT, chat_id TEXT, from_me INTEGER, text TEXT, mtype TEXT, murl TEXT, mname TEXT, ts INTEGER, created_at INTEGER)"); } catch(e){}
  try { await env.aura_db.exec("CREATE INDEX IF NOT EXISTS idx_wa_msg_chat ON wa_messages (tenant_id, chat_id, ts)"); } catch(e){}
  // Metadatos de cada chat para construir la lista sin recorrer Unipile cada vez
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS wa_chats_meta (tenant_id TEXT, chat_id TEXT, name TEXT, phone TEXT, picture TEXT, last_text TEXT, last_ts INTEGER, unread INTEGER DEFAULT 0, updated_at INTEGER, PRIMARY KEY (tenant_id, chat_id))"); } catch(e){}
  __waReady = true;
}
let __invReady = false;
async function ensureInventorySchema(env: Env) {
  if (__invReady) return;
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS inventory_products (id TEXT PRIMARY KEY, tenant_id TEXT, name TEXT, category TEXT DEFAULT 'servicio', unit TEXT DEFAULT 'unidad', stock REAL DEFAULT 0, min_stock REAL DEFAULT 0, cost_per_unit REAL DEFAULT 0, sale_price REAL DEFAULT 0, track_lots INTEGER DEFAULT 0, active INTEGER DEFAULT 1, image_url TEXT, created_at INTEGER, updated_at INTEGER)"); } catch(e){}
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS inventory_lots (id TEXT PRIMARY KEY, tenant_id TEXT, product_id TEXT, lot TEXT, qty REAL DEFAULT 0, expiry TEXT, cost_per_unit REAL DEFAULT 0, created_at INTEGER)"); } catch(e){}
  try { await env.aura_db.exec("CREATE INDEX IF NOT EXISTS idx_inv_lot_prod ON inventory_lots (tenant_id, product_id, expiry)"); } catch(e){}
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS inventory_recipes (id TEXT PRIMARY KEY, tenant_id TEXT, treatment TEXT, product_id TEXT, qty REAL DEFAULT 0, created_at INTEGER)"); } catch(e){}
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS inventory_moves (id TEXT PRIMARY KEY, tenant_id TEXT, product_id TEXT, delta REAL, reason TEXT, ref TEXT, actor TEXT, created_at INTEGER)"); } catch(e){}
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS copilot_log (id TEXT PRIMARY KEY, tenant_id TEXT, actor TEXT, prompt TEXT, action TEXT, payload TEXT, result TEXT, created_at INTEGER)"); } catch(e){}
  try { await env.aura_db.exec('ALTER TABLE professionals ADD COLUMN can_copilot INTEGER DEFAULT 0'); } catch(e){}
  try { await env.aura_db.exec('ALTER TABLE team_members ADD COLUMN can_copilot INTEGER DEFAULT 0'); } catch(e){}
  try { await env.aura_db.exec('ALTER TABLE wa_messages ADD COLUMN att_id TEXT'); } catch(e){}
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS patient_media (id TEXT PRIMARY KEY, tenant_id TEXT, lead_id TEXT, phone TEXT, url TEXT, mtype TEXT, caption TEXT, source TEXT, created_at INTEGER)"); } catch(e){}
  try { await env.aura_db.exec("CREATE INDEX IF NOT EXISTS idx_pmedia ON patient_media (tenant_id, lead_id, created_at)"); } catch(e){}
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS patient_clinical (lead_id TEXT PRIMARY KEY, tenant_id TEXT, allergies TEXT, conditions TEXT, medications TEXT, skin_type TEXT, blood_type TEXT, notes TEXT, dob TEXT, updated_at INTEGER, updated_by TEXT)"); } catch(e){}
  try { await env.aura_db.exec("CREATE TABLE IF NOT EXISTS clinical_notes (id TEXT PRIMARY KEY, tenant_id TEXT, lead_id TEXT, visit_date TEXT, professional TEXT, treatment TEXT, areas TEXT, product TEXT, lot TEXT, units TEXT, note TEXT, photo_url TEXT, created_at INTEGER, created_by TEXT)"); } catch(e){}
  try { await env.aura_db.exec("CREATE INDEX IF NOT EXISTS idx_cnotes ON clinical_notes (tenant_id, lead_id, visit_date)"); } catch(e){}
  try { await env.aura_db.exec('ALTER TABLE inventory_products ADD COLUMN image_url TEXT'); } catch(e){}
  // Oferta de caja por tratamiento (upsell producto-para-llevar + pack con descuento)
  try { await env.aura_db.exec('ALTER TABLE treatment_catalog ADD COLUMN upsell_label TEXT'); } catch(e){}
  try { await env.aura_db.exec('ALTER TABLE treatment_catalog ADD COLUMN upsell_price REAL DEFAULT 0'); } catch(e){}
  try { await env.aura_db.exec('ALTER TABLE treatment_catalog ADD COLUMN pack_label TEXT'); } catch(e){}
  try { await env.aura_db.exec('ALTER TABLE treatment_catalog ADD COLUMN pack_price REAL DEFAULT 0'); } catch(e){}
  try { await env.aura_db.exec('ALTER TABLE treatment_catalog ADD COLUMN pack_original REAL DEFAULT 0'); } catch(e){}
  try { await env.aura_db.exec('ALTER TABLE treatment_catalog ADD COLUMN next_days INTEGER DEFAULT 0'); } catch(e){}
  __invReady = true;
}

// Ejecutor central del copiloto: aplica una acción (inventario, agenda, pacientes, negocio, pendientes)
async function runCopilotAction(env: Env, tid: string, plan: any, actor: string, text: string): Promise<{ok:boolean,msg:string}> {
  const act = plan && plan.action; let result:any = { ok:false, msg:'No entendí la orden.' };
  const eur = (n:number)=> (Math.round((n||0)*100)/100).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+'\u20ac';
  const findProd = async (q:string)=>{ if(!q) return null; const all:any = await env.aura_db.prepare('SELECT * FROM inventory_products WHERE tenant_id=? AND active=1').bind(tid).all(); const ql=String(q).toLowerCase(); return (all.results||[]).find((x:any)=> (x.name||'').toLowerCase().includes(ql) || ql.includes((x.name||'').toLowerCase())) || null; };
  const _norm = (s:string)=> String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const findLead = async (q:string)=>{ if(!q) return null; const qn=_norm(q); const qDigits=String(q).replace(/\D/g,''); const all:any = await env.aura_db.prepare('SELECT * FROM leads WHERE tenant_id=? ORDER BY created_at DESC').bind(tid).all(); const rows=(all.results||[]);
    // 1) match por teléfono si la consulta es numérica
    if(qDigits.length>=6){ const byPhone=rows.find((x:any)=> String(x.phone||'').replace(/\D/g,'').includes(qDigits)); if(byPhone) return byPhone; }
    // 2) coincidencia exacta normalizada (nombre completo contiene la consulta)
    let hit=rows.find((x:any)=> _norm(x.name).includes(qn)); if(hit) return hit;
    // 3) por cualquier palabra de la consulta (nombre O apellido)
    const words=qn.split(/\s+/).filter(w=>w.length>=3);
    hit=rows.find((x:any)=>{ const nm=_norm(x.name); return words.some(w=> nm.split(/\s+/).some(part=> part.startsWith(w))); });
    return hit || null; };
  const dayToISO = (d:string)=>{ const t=new Date(); if(!d||d==='hoy') return t.toISOString().slice(0,10); if(d==='manana'||d==='ma\u00f1ana'){ t.setDate(t.getDate()+1); return t.toISOString().slice(0,10);} return d; };
  try {
    if (act==='crear_producto') {
      const id='inv_'+Math.random().toString(36).slice(2,12); const nw=Date.now();
      await env.aura_db.prepare('INSERT INTO inventory_products (id,tenant_id,name,category,unit,stock,min_stock,cost_per_unit,sale_price,track_lots,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,0,1,?,?)').bind(id,tid,plan.name||'Producto',plan.category||'servicio',plan.unit||'unidad',Number(plan.stock)||0,Number(plan.min_stock)||0,Number(plan.cost_per_unit)||0,Number(plan.sale_price)||0,nw,nw).run();
      result={ ok:true, msg:'Producto "'+(plan.name||'')+'" creado con '+(Number(plan.stock)||0)+' '+(plan.unit||'unidad')+'.' };
    } else if (act==='recargar_stock') {
      const pr=await findProd(plan.product_query||plan.name); if(!pr){ result={ok:false,msg:'No encontré el producto "'+(plan.product_query||'')+'".'}; }
      else { const qty=Number(plan.qty)||0; await env.aura_db.prepare('UPDATE inventory_products SET stock=stock+?, updated_at=? WHERE id=?').bind(qty,Date.now(),pr.id).run(); if(plan.lot||plan.expiry){ await env.aura_db.prepare('INSERT INTO inventory_lots (id,tenant_id,product_id,lot,qty,expiry,cost_per_unit,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('lot_'+Math.random().toString(36).slice(2,10),tid,pr.id,plan.lot||'',qty,plan.expiry||'',pr.cost_per_unit||0,Date.now()).run(); } await env.aura_db.prepare('INSERT INTO inventory_moves (id,tenant_id,product_id,delta,reason,actor,created_at) VALUES (?,?,?,?,?,?,?)').bind('mv_'+Math.random().toString(36).slice(2,10),tid,pr.id,qty,'recarga-copiloto',actor,Date.now()).run(); result={ ok:true, msg:'Cargadas '+qty+' '+(pr.unit||'')+' de "'+pr.name+'". Stock ahora: '+((pr.stock||0)+qty)+'.' }; }
    } else if (act==='crear_receta') {
      const pr=await findProd(plan.product_query||plan.name); if(!pr){ result={ok:false,msg:'No encontré el producto para la receta.'}; }
      else { await env.aura_db.prepare('INSERT INTO inventory_recipes (id,tenant_id,treatment,product_id,qty,created_at) VALUES (?,?,?,?,?,?)').bind('rcp_'+Math.random().toString(36).slice(2,10),tid,plan.treatment||'',pr.id,Number(plan.qty)||0,Date.now()).run(); result={ ok:true, msg:'Cuando se haga "'+(plan.treatment||'')+'" se descontarán '+(Number(plan.qty)||0)+' '+(pr.unit||'')+' de "'+pr.name+'".' }; }
    } else if (act==='crear_contacto') {
      const lid='l_'+Math.random().toString(36).slice(2,12); const nw=Date.now();
      await env.aura_db.prepare('INSERT INTO leads (id,tenant_id,name,phone,treatment,status,source,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(lid,tid,plan.name||'Contacto',plan.phone||'',plan.treatment||'','new','copiloto',nw).run(); result={ ok:true, msg:'Contacto "'+(plan.name||'')+'" creado.' };
    } else if (act==='crear_empleado') {
      // Da de alta un empleado en el equipo (tabla professionals). El sueldo entra en el cálculo de beneficio real.
      try { await env.aura_db.exec('ALTER TABLE professionals ADD COLUMN can_copilot INTEGER DEFAULT 0'); } catch(e){}
      const eid='pro_'+Math.random().toString(36).slice(2,12); const nw=Date.now();
      const colors=['#C8745A','#C9A86A','#7FA8A0','#A88FB0','#8FA8C9','#C98F8F'];
      const rol = (plan.role||'pro');
      const ssPct = plan.ss_pct!=null? Number(plan.ss_pct) : 30;
      const salary = Number(plan.salary_gross)||0;
      const comm = Number(plan.commission_pct)||0;
      const canCo = (plan.can_copilot===true||plan.can_copilot==='true'||plan.can_copilot===1)?1:0;
      await env.aura_db.prepare('INSERT INTO professionals (id,tenant_id,name,color,role,salary_gross,ss_pct,commission_pct,active,can_copilot,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .bind(eid, tid, plan.name||'Empleado', colors[Math.floor(Math.random()*colors.length)], rol, salary, ssPct, comm, 1, canCo, nw).run();
      const costeTotal = salary>0 ? (' Coste con seguridad social (~'+ssPct+'%): '+eur(Math.round(salary*(1+ssPct/100)))+'/mes, ya contemplado en tu Beneficio real.') : '';
      result={ ok:true, msg:'Empleado "'+(plan.name||'Empleado')+'" dado de alta'+(salary>0?(' con sueldo de '+eur(salary)+' netos/mes.'):'.')+costeTotal+' Lo ves en Equipo.' };
    } else if (act==='consultar') {
      if (plan.query_type==='caducidad') { const soon=new Date(Date.now()+30*864e5).toISOString().slice(0,10); const exp:any=await env.aura_db.prepare("SELECT l.expiry,l.qty,pr.name FROM inventory_lots l LEFT JOIN inventory_products pr ON pr.id=l.product_id WHERE l.tenant_id=? AND l.qty>0 AND l.expiry!='' AND l.expiry<=? ORDER BY l.expiry").bind(tid,soon).all(); const rows=(exp.results||[]); result={ ok:true, msg: rows.length? ('Caduca pronto: '+rows.map((r:any)=>r.name+' ('+r.qty+' uds, '+r.expiry+')').join('; ')) : 'No hay productos que caduquen en los próximos 30 días.' }; }
      else { const all:any=await env.aura_db.prepare('SELECT name,stock,unit,min_stock FROM inventory_products WHERE tenant_id=? AND active=1 ORDER BY name').bind(tid).all(); const rows=(all.results||[]); result={ ok:true, msg: rows.length? ('Stock actual: '+rows.map((r:any)=>r.name+' '+r.stock+' '+r.unit+(r.min_stock>0&&r.stock<=r.min_stock?' (BAJO)':'')).join('; ')) : 'Aún no tienes productos en inventario.' }; }
    } else if (act==='consultar_agenda') {
      const iso=dayToISO(plan.day); const aps:any=await env.aura_db.prepare("SELECT a.date_iso d, a.treatment, a.status, l.name FROM appointments a LEFT JOIN leads l ON l.id=a.lead_id WHERE a.tenant_id=? AND substr(a.date_iso,1,10)=? AND a.status!='cancelled' ORDER BY a.date_iso").bind(tid,iso).all(); const hhmm=(x)=>{ const m=String(x||'').match(/T(\d{2}:\d{2})/); return m?m[1]:''; }; const rows=(aps.results||[]); const etiqueta = plan.day==='manana'||plan.day==='ma\u00f1ana'?'ma\u00f1ana':(plan.day&&plan.day!=='hoy'?('el '+iso):'hoy'); result={ ok:true, msg: rows.length? ('Tienes '+rows.length+' citas '+etiqueta+': '+rows.map((r:any)=>(hhmm(r.d)+' '+(r.name||'')+(r.treatment?(' · '+r.treatment):'')).trim()).join('; ')) : ('No hay citas '+etiqueta+'.') };
    } else if (act==='consultar_pacientes') {
      if (plan.info==='sin_venir' && !plan.patient_query) { const ini=new Date(); ini.setDate(1); const all:any=await env.aura_db.prepare("SELECT name FROM leads WHERE tenant_id=? AND status IN ('client','attended') ORDER BY name").bind(tid).all(); result={ ok:true, msg:'Para ver quién no ha venido, míralo en Pacientes/Pipeline. Clientes registrados: '+((all.results||[]).length)+'.' }; }
      else { const ld:any=await findLead(plan.patient_query); if(!ld){ result={ok:false,msg:'No encontré a "'+(plan.patient_query||'')+'".'}; }
        else if (plan.info==='telefono') { result={ ok:true, msg:(ld.name||'')+': '+(ld.phone||'sin teléfono')+'.' }; }
        else if (plan.info==='gasto') { const sp:any=await env.aura_db.prepare("SELECT COALESCE(SUM(amount),0) g, COUNT(*) c FROM treatments_log WHERE tenant_id=? AND lead_id=? AND pay_status='paid'").bind(tid,ld.id).first(); result={ ok:true, msg:(ld.name||'')+' se ha gastado '+eur(sp?sp.g:0)+' en '+((sp&&sp.c)||0)+' visitas.' }; }
        else if (plan.info==='ultima_visita') { const lv:any=await env.aura_db.prepare("SELECT date_iso FROM appointments WHERE tenant_id=? AND lead_id=? AND status='attended' ORDER BY date_iso DESC LIMIT 1").bind(tid,ld.id).first(); result={ ok:true, msg:(ld.name||'')+(lv?(' vino por \u00faltima vez el '+lv.date_iso+'.'):' a\u00fan no tiene visitas registradas.') }; }
        else { result={ ok:true, msg:(ld.name||'')+' — tel\u00e9fono '+(ld.phone||'-')+', estado '+(ld.status||'-')+(ld.treatment?(', interesada en '+ld.treatment):'')+'.' }; }
      }
    } else if (act==='consultar_negocio') {
      const per=plan.period||'hoy'; const t=new Date(); const hoyISO=t.toISOString().slice(0,10); const mesPrefix=hoyISO.slice(0,7);
      const periodCond = per==='mes' ? "substr(date_iso,1,7)='"+mesPrefix+"'" : "substr(date_iso,1,10)='"+hoyISO+"'";
      if (plan.metric==='top_tratamiento') { const tp:any=await env.aura_db.prepare("SELECT name, COUNT(*) c, COALESCE(SUM(amount),0) v FROM treatments_log WHERE tenant_id=? AND pay_status='paid' AND "+periodCond+" GROUP BY name ORDER BY v DESC LIMIT 1").bind(tid).first(); result={ ok:true, msg: tp&&tp.name? ('Lo que más factura ('+(per==='mes'?'este mes':'hoy')+'): '+tp.name+' con '+eur(tp.v)+' en '+tp.c+' ventas.') : 'Aún no hay ventas en el periodo.' }; }
      else { const sm:any=await env.aura_db.prepare("SELECT COALESCE(SUM(amount),0) g, COUNT(*) c FROM treatments_log WHERE tenant_id=? AND pay_status='paid' AND "+periodCond).bind(tid).first(); const facturado=(sm&&sm.g)||0; const cobros=(sm&&sm.c)||0;
        if(plan.metric==='beneficio'){
          // Beneficio estimado del MES: facturado - personal(con SS) - gastos fijos - marketing. (El detalle exacto con IVA está en Caja)
          const pros:any=await env.aura_db.prepare('SELECT COALESCE(SUM(salary_gross*(1+COALESCE(ss_pct,30)/100.0)),0) p FROM professionals WHERE tenant_id=? AND active=1').bind(tid).first();
          const personalMes=(pros&&pros.p)||0;
          const bc:any=await env.aura_db.prepare('SELECT * FROM business_costs WHERE tenant_id=?').bind(tid).first();
          let fijos=0, marketing=0; try{ if(bc){ const fx=JSON.parse(bc.fixed_json||'[]'); fijos=(Array.isArray(fx)?fx:[]).reduce((a:any,x:any)=>a+(Number(x.amount)||0),0); marketing=Number(bc.marketing_monthly||0); } }catch(e){}
          const benef = facturado - personalMes - fijos - marketing;
          result={ ok:true, msg:'Este mes has facturado '+eur(facturado)+'. Beneficio estimado (tras personal, gastos fijos y marketing): '+eur(benef)+'. El desglose exacto con IVA lo tienes en Caja → Beneficio real.' };
        } else {
          result={ ok:true, msg:'Has facturado '+eur(facturado)+' en '+cobros+' cobros '+(per==='mes'?'este mes':'hoy')+'.' };
        } }
    } else if (act==='consultar_pendientes') {
      const leads:any=await env.aura_db.prepare("SELECT status, recover_state, chatted FROM leads WHERE tenant_id=?").bind(tid).all(); const L=(leads.results||[]);
      const llamar=L.filter((l:any)=>l.chatted && l.status!=='client' && l.status!=='booked' && l.status!=='lost').length;
      const noshow=L.filter((l:any)=>l.recover_state==='noshow').length;
      const hoy=new Date().toISOString().slice(0,10);
      const conf:any=await env.aura_db.prepare("SELECT COUNT(*) c FROM appointments WHERE tenant_id=? AND date_iso=? AND status='booked'").bind(tid,hoy).first();
      const confirmar=conf?conf.c:0;
      if (plan.kind==='noshow') result={ ok:true, msg: noshow? ('Tienes '+noshow+' personas que no vinieron por recuperar.') : 'No tienes no-shows pendientes.' };
      else if (plan.kind==='confirmar') result={ ok:true, msg: confirmar? ('Hay '+confirmar+' citas de hoy sin confirmar.') : 'Todas las citas de hoy est\u00e1n confirmadas.' };
      else if (plan.kind==='llamar') result={ ok:true, msg: llamar? ('Hoy toca llamar a '+llamar+' personas (hablaron y no reservaron).') : 'No tienes llamadas pendientes.' };
      else result={ ok:true, msg:'Hoy: '+llamar+' por llamar, '+noshow+' por recuperar, '+confirmar+' citas por confirmar.' };
    } else if (act==='reservar_cita') {
      let ld:any=await findLead(plan.patient_name); const nw=Date.now();
      if(!ld){ const lid='l_'+Math.random().toString(36).slice(2,12); await env.aura_db.prepare('INSERT INTO leads (id,tenant_id,name,phone,treatment,status,source,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(lid,tid,plan.patient_name||'Paciente',plan.phone||'',plan.treatment||'','booked','copiloto',nw).run(); ld={id:lid,name:plan.patient_name}; }
      const iso=dayToISO(plan.date); const ap='ap_'+Math.random().toString(36).slice(2,12);
      const hhmm=(plan.time||'10:00'); await env.aura_db.prepare('INSERT INTO appointments (id,tenant_id,lead_id,date_iso,treatment,status,created_at) VALUES (?,?,?,?,?,?,?)').bind(ap,tid,ld.id,iso+'T'+hhmm,plan.treatment||'','booked',nw).run();
      await env.aura_db.prepare("UPDATE leads SET status='booked' WHERE id=?").bind(ld.id).run();
      result={ ok:true, msg:'Cita reservada para '+(plan.patient_name||ld.name||'')+' el '+iso+' a las '+hhmm+(plan.treatment?(' ('+plan.treatment+')'):'')+'.' };
    } else if (act==='anular_cita') {
      const ld:any=await findLead(plan.patient_name); if(!ld){ result={ok:false,msg:'No encontré a "'+(plan.patient_name||'')+'".'}; }
      else { const iso=dayToISO(plan.date); await env.aura_db.prepare("UPDATE appointments SET status='cancelled' WHERE tenant_id=? AND lead_id=? AND substr(date_iso,1,10)=?").bind(tid,ld.id,iso).run(); result={ ok:true, msg:'Cita de '+(plan.patient_name||'')+' del '+iso+' anulada.' }; }
    } else { result={ ok:false, msg: (plan&&plan.summary)||'No entend\u00ed la orden.' }; }
  } catch(e:any) { result={ ok:false, msg:'Hubo un problema al ejecutar la orden.' }; }
  try { await env.aura_db.prepare('INSERT INTO copilot_log (id,tenant_id,actor,prompt,action,payload,result,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('cl_'+Math.random().toString(36).slice(2,10),tid,actor,text,act||'',JSON.stringify(plan),JSON.stringify(result),Date.now()).run(); } catch(e){}
  return result;
}
let __packsReady = false;
async function ensurePacksSchema(env: Env) {
  if (__packsReady) return;
  // Añade columnas nuevas a packs si no existen (migración segura, idempotente)
  const cols = ['tagline TEXT', 'badge TEXT', 'featured INTEGER DEFAULT 0', 'valid_until TEXT', 'image_url TEXT'];
  for (const c of cols) {
    try { await env.aura_db.exec('ALTER TABLE packs ADD COLUMN ' + c); } catch(e) { /* ya existe */ }
  }
  __packsReady = true;
}
async function getVacations(env: Env, tenantId: string): Promise<any[]> {
  await ensureAvailabilitySchema(env);
  const rows: any = await env.aura_db.prepare('SELECT * FROM vacations WHERE tenant_id=? ORDER BY start_date').bind(tenantId).all();
  return rows.results || [];
}

// ¿Está cerrado ese día (YYYY-MM-DD)? por horario semanal o por vacaciones
function isDateClosed(dateStr: string, schedule: any[], vacations: any[]): { closed: boolean; reason?: string } {
  for (const v of vacations) {
    if (dateStr >= String(v.start_date) && dateStr <= String(v.end_date)) return { closed: true, reason: v.reason || 'Vacaciones' };
  }
  const dow = new Date(dateStr + 'T12:00:00Z').getUTCDay();
  const row = schedule.find((s:any)=>s.dow === dow);
  if (!row || !row.is_open) return { closed: true, reason: 'Cerrado' };
  return { closed: false };
}

// Devuelve el siguiente día abierto (YYYY-MM-DD) a partir de una fecha dada (inclusive)
function nextOpenDate(dateStr: string, schedule: any[], vacations: any[], maxDays = 120): string {
  let cur = dateStr;
  for (let i = 0; i < maxDays; i++) {
    if (!isDateClosed(cur, schedule, vacations).closed) return cur;
    const d = new Date(cur + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1);
    cur = d.toISOString().slice(0, 10);
  }
  return cur;
}

// Texto legible y persuasivo del próximo día abierto, relativo a hoy (hora Madrid).
// Devuelve cosas como 'hoy', 'mañana', 'el lunes', 'el lunes 15'. Nunca dice 'cerrado'.
function proximoDiaTexto(dateStr: string, todayStr: string): string {
  const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const d = new Date(dateStr + 'T12:00:00Z');
  const today = new Date(todayStr + 'T12:00:00Z');
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff <= 0) return 'hoy';
  if (diff === 1) return 'mañana';
  const nombre = DIAS[d.getUTCDay()];
  // dentro de la semana próxima usamos 'el lunes'; más lejos añadimos el día del mes
  if (diff <= 6) return 'el ' + nombre;
  return 'el ' + nombre + ' ' + d.getUTCDate();
}

const SALES_DEMO_PROMPT = `Eres el asistente de IA de AURA, el sistema operativo para clínicas estéticas. Estás hablando con la DUEÑA o GERENTE de una clínica que acaba de probar el embudo en su propia piel (el mismo que verían sus pacientes). Tu objetivo NO es venderle un tratamiento: es enseñarle lo que AURA puede hacer por su clínica y que agende una consultoría gratuita con el equipo de AURA.

ESTILO: cercano, profesional, en minúsculas, frases cortas, sin signos de apertura (¿¡), sin emojis decorativos. Hablas como un comercial experto y humano por mensaje.

PRIMER MENSAJE (preséntate así): "buenas, soy el asistente que verían tus pacientes. acabas de vivir el embudo igual que lo viviría una clienta tuya. pero en vez de agendarte un aumento de labios, deja que te enseñe lo que este sistema puede hacer por tu clínica. ¿te enseño cómo te llenaría la agenda?"

QUÉ VENDER (beneficios de AURA, mencionar según la conversación):
- capta pacientes con un embudo + chat de ia 24/7 que responde en menos de 1 minuto
- recupera a los que no reservan, no confirman o no vienen (sms automáticos por fases: 20min, 5h, día 3, 7, 21)
- agenda con horarios, vacaciones y recordatorios automáticos
- caja, bonos, inventario y BENEFICIO REAL (lo que ganas de verdad tras gastos, nóminas e iva)
- panel "recuperado gracias a aura": le enseña en euros lo que el sistema le ha hecho ganar
- consentimientos firmados en el móvil con validez legal

REBATE OBJECIONES con naturalidad:
- "ya tengo fresha/flowww": perfecto, aura no te quita tu agenda; te trae pacientes nuevos y persigue a los que se escapan, que es lo que ese software no hace
- "es caro": una sola paciente recuperada al mes ya lo paga; te enseñamos el roi en euros dentro del panel
- "no tengo tiempo": justo por eso, aura trabaja solo 24/7, también sábados y domingos

OBJETIVO FINAL: que agende una CONSULTORÍA GRATUITA con el equipo de aura. cuando muestre interés, dile: "te va genial una llamada de 20 min con nuestro equipo para enseñártelo con tus números. te paso el calendario para que elijas hueco". Sé persuasiva pero nunca agresiva. Mantén los mensajes breves y haz una pregunta cada vez para avanzar la conversación.`;

const SYSTEM_BASE = `Eres un asesor real de la clínica. Hablas desde tu móvil:
- TODO en minúsculas. Sin signos de apertura (¿¡).
- Frases de máximo 12 palabras.
- Cero emojis decorativos. Solo 1 si refuerza algo concreto.
- Sin jerga corporativa.
- Una respuesta por turno, aunque el lead mande varios mensajes.
- NUNCA das diagnóstico médico. La doctora resuelve eso en la valoración.
- Tu objetivo es agendar la valoración gratuita.
- NUNCA repitas frases anteriores. Si ya respondiste algo similar, varía.`;

// ─── Routing ──────────────────────────────────────────────────────
const CONSENT_DEFAULTS = [
  { key:'labios', title:'Consentimiento · Aumento de labios (ácido hialurónico)', body:'Declaro que he sido informado/a del procedimiento de aumento de labios con ácido hialurónico, sus beneficios y sus posibles riesgos (inflamación, hematomas, asimetría, reacción al producto y, en casos raros, oclusión vascular). He podido preguntar mis dudas y entiendo los cuidados posteriores. Autorizo a la clínica a realizar el tratamiento y, salvo que indique lo contrario, al uso de fotos antes/después con fines clínicos.' },
  { key:'botox', title:'Consentimiento · Tóxina botulínica (Botox)', body:'Declaro que he sido informado/a del tratamiento con tóxina botulínica, sus beneficios y posibles riesgos (hematoma, asimetría, caída temporal del párpado, dolor de cabeza). Confirmo no estar embarazada ni en lactancia y haber informado de mi medicación. Entiendo los cuidados posteriores y autorizo el tratamiento.' },
  { key:'laser', title:'Consentimiento · Tratamiento láser', body:'Declaro que he sido informado/a del tratamiento láser, sus beneficios y posibles riesgos (enrojecimiento, quemaduras, cambios de pigmentación). Confirmo no haber tomado el sol recientemente ni medicación fotosensibilizante sin informarlo. Entiendo los cuidados posteriores y autorizo el tratamiento.' },
  { key:'peeling', title:'Consentimiento · Peeling / tratamiento de piel', body:'Declaro que he sido informado/a del tratamiento de peeling, sus beneficios y posibles riesgos (enrojecimiento, descamación, cambios de pigmentación). He informado de mi medicación y condición de la piel. Entiendo los cuidados posteriores y autorizo el tratamiento.' },
  { key:'generico', title:'Consentimiento informado · Tratamiento estético', body:'Declaro que he sido informado/a del tratamiento que voy a recibir, sus beneficios, alternativas y posibles riesgos. He podido resolver mis dudas, he facilitado mi historial y medicación relevantes, y entiendo los cuidados posteriores. Autorizo a la clínica a realizar el tratamiento.' }
];
export default {
  async fetch(req: Request, env: Env, ctx?: any): Promise<Response> {
    if (ctx) (globalThis as any).__execCtx = ctx;
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    const p = url.pathname;

    try {
      // Chat IA original (solo POST a raíz o /chat)
      if ((p === '/' || p === '/chat') && req.method === 'POST') return await handleChat(req, env);
      if (p === '/' || p === '/chat') return text('AURA worker · POST a este endpoint para chat IA');

      // ───────────────── BLINDAJE MULTI-TENANT ─────────────────
      // Endpoints de GESTIÓN (panel del dueño) que exigen que el token de sesión pertenezca al tenant.
      // El embudo público del paciente y el chat NO están aquí (deben funcionar sin sesión).
      // Siempre protegidos (cualquier método): datos sensibles del panel.
      const TENANT_GUARDED = new Set<string>([
        '/api/lead-stage','/api/lead-meta','/api/lead-search',
        '/api/treatments','/api/close-visit','/api/professionals','/api/blocks',
        '/api/waitlist','/api/pipeline','/api/products','/api/bonos','/api/cashbox','/api/profit',
        '/api/recovered','/api/business-costs','/api/schedule-by-day','/api/vacations',
        '/api/sms-templates','/api/team','/api/funnel-save','/api/funnel-edit',
        '/api/consent-templates','/api/consent-send','/api/consents','/api/treatment-catalog','/api/tenant-meta',
        '/api/loyalty-adjust','/api/loyalty-balance',
        '/api/clinical','/api/clinical-note'
      ]);
      // Protegidos SOLO en GET (listado del panel); su POST es público (el paciente crea lead / reserva cita).
      const TENANT_GUARDED_GET = new Set<string>(['/api/leads','/api/appointments','/api/calendar','/api/portal-clients']);
      const mustGuard = TENANT_GUARDED.has(p) || (req.method==='GET' && TENANT_GUARDED_GET.has(p)) || (p==='/api/packs' && req.method==='POST') || (p.startsWith('/api/wa-') && p!=='/api/wa-webhook' && p!=='/api/wa-media') || p.startsWith('/api/inv-') || p==='/api/copilot';
      if (mustGuard) {
        // tenant solicitado: de query (?tenant=) o del body para POST
        let tenantReq = url.searchParams.get('tenant') || url.searchParams.get('tenant_id');
        if (!tenantReq && (req.method==='POST'||req.method==='PUT'||req.method==='DELETE')) {
          try { const cloned = req.clone(); const body:any = await cloned.json(); tenantReq = body.tenant_id || body.tenant || null; } catch(e){}
        }
        const err = await requireTenant(env, req, url, tenantReq);
        if (err) return json({ error:'forbidden', reason: err }, 403);
      }

      // Restriccion por ROL: datos financieros sensibles solo owner/finance/superadmin
      const FINANCE_ONLY = new Set<string>(['/api/profit','/api/business-costs','/api/recovered']);
      if (FINANCE_ONLY.has(p)) {
        const role = await getSessionRole(env, req, url);
        if (!(role==='owner'||role==='finance'||role==='superadmin')) return json({ error:'forbidden', reason:'role' }, 403);
      }

      // Servir imágenes: primero R2, fallback a KV (compatibilidad con imágenes antiguas)
      if (p.startsWith('/img/')) {
        const k = p.slice(5);
        // PROTECCION: las firmas de consentimiento (sig_*) son datos sensibles.
        // Solo se sirven con el token del consentimiento (k= o consent=) o con sesion valida del propietario.
        if (k.startsWith('sig_')) {
          const consentId = url.searchParams.get('consent') || '';
          const leadId = url.searchParams.get('lead') || '';
          const ktok = url.searchParams.get('k') || '';
          let allowed = false;
          if (consentId && leadId && (await verifyConsent(env, consentId, leadId, ktok))) allowed = true;
          if (!allowed) {
            // sesion del duenno: el token debe pertenecer a la clinica duena de esta firma
            const stok = (req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'') || url.searchParams.get('token') || '';
            if (stok) {
              try {
                const sess:any = await env.aura_db.prepare('SELECT tenant_id FROM sessions WHERE token=?').bind(stok).first();
                if (sess?.tenant_id) {
                  const owner:any = await env.aura_db.prepare('SELECT tenant_id FROM consents_signed WHERE signature_key=?').bind(k).first();
                  if (owner && owner.tenant_id === sess.tenant_id) allowed = true;
                }
              } catch(e) {}
            }
          }
          if (!allowed) return new Response('forbidden', { status: 403, headers: CORS });
        }
        if (env.aura_r2) {
          try {
            const obj: any = await env.aura_r2.get('img/'+k);
            if (obj) { const ct = obj.httpMetadata?.contentType || 'image/png'; return new Response(obj.body, { headers: { ...CORS, 'Content-Type': ct, 'Cache-Control': 'public, max-age=31536000, immutable' } }); }
          } catch(e) {}
        }
        const res: any = (env.AURA_IMG as any).getWithMetadata ? await (env.AURA_IMG as any).getWithMetadata(k, 'arrayBuffer') : { value: await env.AURA_IMG.get(k, 'arrayBuffer'), metadata: null };
        const data = res?.value || await env.AURA_IMG.get(k, 'arrayBuffer');
        if (!data) return new Response('not found', { status: 404, headers: CORS });
        const ct = res?.metadata?.contentType || 'image/png';
        return new Response(data, { headers: { ...CORS, 'Content-Type': ct, 'Cache-Control': 'public, max-age=31536000, immutable' } });
      }

      // Subir imagen propia de la clínica (multipart) y asignarla a un slot
      if (p === '/api/upload-image' && req.method === 'POST') {
        try {
          const fd = await req.formData();
          const file: any = fd.get('file');
          const tenant = String(fd.get('tenant_id') || '');
          const slot = String(fd.get('slot') || 'hero');
          if (!file || !tenant) return json({ error: 'faltan datos' }, 400);
          const ct = file.type || 'image/jpeg';
          const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
          const key = 'up_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8) + '.' + ext;
          const buf = await file.arrayBuffer();
          if (env.aura_r2) { try { await env.aura_r2.put('img/'+key, buf, { httpMetadata: { contentType: ct } }); } catch(e) { await env.AURA_IMG.put(key, buf, { metadata: { contentType: ct } }); } }
          else { await env.AURA_IMG.put(key, buf, { metadata: { contentType: ct } }); }
          const imgUrl = '/img/' + key;
          if (slot==='hero'||slot==='doctor'||slot==='room') {
            const col = slot==='doctor' ? 'doctor_image_url' : slot==='room' ? 'room_image_url' : 'hero_image_url';
            await env.aura_db.prepare(`UPDATE tenants SET ${col}=? WHERE id=?`).bind(imgUrl, tenant).run();
          } else {
            const t: any = await env.aura_db.prepare('SELECT content FROM tenants WHERE id=?').bind(tenant).first();
            let cur: any = {}; try { cur = t?.content ? JSON.parse(t.content) : {}; } catch(e){}
            cur['img_'+slot] = imgUrl;
            await env.aura_db.prepare('UPDATE tenants SET content=? WHERE id=?').bind(JSON.stringify(cur), tenant).run();
          }
          return json({ ok: true, url: imgUrl });
        } catch (e: any) { return json({ error: String(e) }, 400); }
      }

      // Regenerar imágenes (foreground, espera hasta 5 min)
      if (p.startsWith('/api/regenerate-images/') && req.method === 'POST') {
        const id = p.split('/').pop()!;
        const t = await env.aura_db.prepare('SELECT * FROM tenants WHERE id=?').bind(id).first<any>();
        if (!t) return json({ error: 'not_found' }, 404);
        await generateTenantImages(env, id, t.name, t.brand_primary || '#5e1a2a', t.brand_accent || '#D4A574');
        const t2 = await env.aura_db.prepare('SELECT hero_image_url, doctor_image_url, room_image_url FROM tenants WHERE id=?').bind(id).first<any>();
        return json({ ok: true, status: 'ready', ...t2 });
      }

      // Generar UNA imagen (granular para que el cliente lo llame en paralelo)
      if (p === '/api/generate-image' && req.method === 'POST') {
        const b: any = await req.json();
        const url = await generateImage(env, b.prompt || 'luxury aesthetic clinic interior', b.size || '1024x1024');
        if (!url) return json({ error: 'generation_failed' }, 500);
        // Si viene tenant_id + slot, actualiza
        if (b.tenant_id && b.slot) {
          const col = b.slot === 'hero' ? 'hero_image_url' : b.slot === 'advisor' ? 'doctor_image_url' : b.slot === 'room' ? 'room_image_url' : null;
          if (col) {
            await env.aura_db.prepare(`UPDATE tenants SET ${col}=? WHERE id=?`).bind(url, b.tenant_id).run();
          }
        }
        return json({ ok: true, url });
      }

      // Tenant config (público)
      if (p.startsWith('/api/tenant/') && req.method === 'GET') {
        const id = p.split('/').pop()!;
        const t = await env.aura_db
          .prepare('SELECT * FROM tenants WHERE id=?')
          .bind(id)
          .first();
        if (!t) return json({ error: 'not_found' }, 404);
        const funnels = await env.aura_db
          .prepare('SELECT * FROM funnels WHERE tenant_id=?')
          .bind(id)
          .all();
        return json({ tenant: t, funnels: funnels.results });
      }

      // ===== ALTA DE CLINICA (self-service desde la homepage) =====
      if (p === '/api/tenant-meta' && req.method === 'POST') {
        const b:any = await req.json();
        if (!b.tenant_id) return json({ error:'missing_tenant' }, 400);
        const sets:string[]=[]; const vals:any[]=[];
        const map:any={ google_review_url:'google_review_url', logo_url:'logo_url', address:'address', city:'city', whatsapp:'whatsapp', email:'email', brand_primary:'brand_primary', brand_accent:'brand_accent', name:'name' };
        for(const k in map){ if(b[k]!==undefined){ sets.push(map[k]+'=?'); vals.push(typeof b[k]==='string'?b[k].trim():b[k]); } }
        if(sets.length){ vals.push(b.tenant_id); await env.aura_db.prepare('UPDATE tenants SET '+sets.join(',')+' WHERE id=?').bind(...vals).run(); }
        return json({ ok:true });
      }
      if (p === '/api/tenant-meta' && req.method === 'GET') {
        const tid = url.searchParams.get('tenant');
        const r:any = await env.aura_db.prepare('SELECT google_review_url,logo_url,address,city,whatsapp,email,brand_primary,brand_accent,name FROM tenants WHERE id=?').bind(tid).first();
        return json(r||{});
      }
      // Datos de marca de la clinica para el portal del cliente (publico)
      if (p === '/api/portal-info' && req.method === 'GET') {
        const tid = url.searchParams.get('tenant');
        const r:any = await env.aura_db.prepare('SELECT name,logo_url,address,city,whatsapp,email,brand_primary,brand_accent FROM tenants WHERE id=?').bind(tid).first();
        if(!r) return json({ error:'not_found' },404);
        return json({ name:r.name||'', logo_url:r.logo_url||'', address:r.address||'', city:r.city||'', whatsapp:r.whatsapp||'', email:r.email||'', brand_primary:r.brand_primary||'#b05d44', brand_accent:r.brand_accent||'#c8a86a' });
      }
      // ===== FIDELIZACIÓN (puntos / recompensas) =====
      // Config (GET público para la tarjeta del paciente; POST protegido por guardia)
      if (p === '/api/loyalty-config' && req.method === 'GET') {
        const tid = url.searchParams.get('tenant');
        let c:any = await env.aura_db.prepare('SELECT * FROM loyalty_config WHERE tenant_id=?').bind(tid).first();
        if (!c) c = { tenant_id: tid, enabled:1, pts_per_eur:1, pts_checkin:25, pts_welcome:100, pts_birthday:200, pts_referral:250, eur_per_100pts:10, rewards: JSON.stringify([{name:'Descuento 10€',pts:100},{name:'Producto de regalo',pts:250},{name:'Limpieza facial',pts:500}]) };
        return json({ config: c });
      }
      if (p === '/api/loyalty-config' && req.method === 'POST') {
        const b:any = await req.json();
        const tid = b.tenant_id; if(!tid) return json({error:'missing_tenant'},400);
        const rw = b.rewards ? (typeof b.rewards==='string'? b.rewards : JSON.stringify(b.rewards)) : null;
        await env.aura_db.prepare(`INSERT INTO loyalty_config (tenant_id,enabled,pts_per_eur,pts_checkin,pts_welcome,pts_birthday,pts_referral,eur_per_100pts,rewards) VALUES (?,?,?,?,?,?,?,?,?)
          ON CONFLICT(tenant_id) DO UPDATE SET enabled=excluded.enabled,pts_per_eur=excluded.pts_per_eur,pts_checkin=excluded.pts_checkin,pts_welcome=excluded.pts_welcome,pts_birthday=excluded.pts_birthday,pts_referral=excluded.pts_referral,eur_per_100pts=excluded.eur_per_100pts,rewards=COALESCE(excluded.rewards,loyalty_config.rewards)`)
          .bind(tid, b.enabled?1:0, Number(b.pts_per_eur)||1, Number(b.pts_checkin)||0, Number(b.pts_welcome)||0, Number(b.pts_birthday)||0, Number(b.pts_referral)||0, Number(b.eur_per_100pts)||10, rw).run();
        return json({ ok:true });
      }
      // Saldo de un lead (protegido vía guardia cuando lleva tenant del panel; el paciente usa loyalty-card)
      if (p === '/api/loyalty-balance' && req.method === 'GET') {
        const lid = url.searchParams.get('lead');
        const bal:any = await env.aura_db.prepare('SELECT COALESCE(SUM(delta),0) as b FROM points_ledger WHERE lead_id=?').bind(lid).first();
        return json({ points: Number(bal?.b)||0 });
      }
      // Tarjeta pública del paciente (al escanear QR): saldo + config, identificado por lead
      if (p === '/api/loyalty-card' && req.method === 'GET') {
        const lid = url.searchParams.get('lead'); const tid = url.searchParams.get('tenant');
        const bal:any = await env.aura_db.prepare('SELECT COALESCE(SUM(delta),0) as b FROM points_ledger WHERE lead_id=?').bind(lid).first();
        const ld:any = await env.aura_db.prepare('SELECT name FROM leads WHERE id=?').bind(lid).first();
        const tn:any = await env.aura_db.prepare('SELECT name,brand_primary FROM tenants WHERE id=?').bind(tid).first();
        let c:any = await env.aura_db.prepare('SELECT * FROM loyalty_config WHERE tenant_id=?').bind(tid).first();
        return json({ points: Number(bal?.b)||0, name: ld?.name||'', clinic: tn?.name||'', brand: tn?.brand_primary||'#5e1a2a', config: c||null });
      }
      // Check-in público (escaneo del QR): suma puntos por venir, máx 1/día
      if (p === '/api/loyalty-checkin' && req.method === 'POST') {
        const b:any = await req.json(); const lid=b.lead_id; const tid=b.tenant_id;
        if(!lid||!tid) return json({error:'missing'},400);
        const lc:any = await env.aura_db.prepare('SELECT * FROM loyalty_config WHERE tenant_id=?').bind(tid).first();
        if(!lc||!lc.enabled) return json({error:'disabled'},400);
        const today = new Date().toISOString().slice(0,10);
        const dup:any = await env.aura_db.prepare("SELECT id FROM points_ledger WHERE lead_id=? AND reason='checkin' AND substr(created_at,1,10)=?").bind(lid,today).first();
        if(dup) { const bal:any = await env.aura_db.prepare('SELECT COALESCE(SUM(delta),0) as b FROM points_ledger WHERE lead_id=?').bind(lid).first(); return json({ ok:true, already:true, points:Number(bal?.b)||0 }); }
        const pts = Number(lc.pts_checkin)||0;
        if(pts>0) await env.aura_db.prepare("INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES (?,?,?,?,?,?)").bind('pt_'+uid(),tid,lid,pts,'checkin',new Date().toISOString()).run();
        const bal:any = await env.aura_db.prepare('SELECT COALESCE(SUM(delta),0) as b FROM points_ledger WHERE lead_id=?').bind(lid).first();
        return json({ ok:true, earned:pts, points:Number(bal?.b)||0 });
      }
      // Buscar tarjeta del paciente por teléfono (público, al escanear QR e identificarse)
      if (p === '/api/loyalty-find' && req.method === 'POST') {
        const b:any = await req.json(); const tid=b.tenant_id; const phone=(b.phone||'').replace(/[^0-9]/g,'');
        if(!tid||phone.length<9) return json({error:'missing'},400);
        const ld:any = await env.aura_db.prepare("SELECT id,name FROM leads WHERE tenant_id=? AND replace(replace(phone,' ',''),'+','') LIKE ? LIMIT 1").bind(tid,'%'+phone.slice(-9)).first();
        if(!ld){
          // crear lead nuevo (cliente que se da de alta en el programa) + puntos de bienvenida
          const lc:any = await env.aura_db.prepare('SELECT * FROM loyalty_config WHERE tenant_id=?').bind(tid).first();
          const nid=uid();
          await env.aura_db.prepare("INSERT INTO leads (id,tenant_id,name,phone,temperature,status,source,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(nid,tid,(b.name||'Cliente'),phone,'warm','client','programa-puntos',new Date().toISOString()).run();
          const w=Number(lc?.pts_welcome)||0;
          if(w>0) await env.aura_db.prepare("INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES (?,?,?,?,?,?)").bind('pt_'+uid(),tid,nid,w,'bienvenida',new Date().toISOString()).run();
          return json({ ok:true, lead_id:nid, name:(b.name||'Cliente'), welcome:w });
        }
        return json({ ok:true, lead_id:ld.id, name:ld.name });
      }

      // ===== PORTAL DEL CLIENTE (web app) =====
      // Catálogo de packs (GET público para el portal; POST protegido para el panel)
      if (p === '/api/packs' && req.method === 'GET') {
        await ensurePacksSchema(env);
        const tid = url.searchParams.get('tenant');
        const r = await env.aura_db.prepare("SELECT * FROM packs WHERE tenant_id=? AND active=1 ORDER BY featured DESC, sort_order, created_at").bind(tid).all();
        return json({ packs: r.results||[] });
      }
      if (p === '/api/packs' && req.method === 'POST') {
        await ensurePacksSchema(env);
        const b:any = await req.json(); const tid=b.tenant_id; if(!tid) return json({error:'missing_tenant'},400);
        if (b.delete && b.id) { await env.aura_db.prepare('DELETE FROM packs WHERE id=? AND tenant_id=?').bind(b.id,tid).run(); return json({ok:true}); }
        const id = b.id || ('pk_'+uid());
        await env.aura_db.prepare(`INSERT INTO packs (id,tenant_id,name,description,sessions,price,original_price,kind,recurring,active,sort_order,tagline,badge,featured,valid_until,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,sessions=excluded.sessions,price=excluded.price,original_price=excluded.original_price,kind=excluded.kind,recurring=excluded.recurring,active=excluded.active,sort_order=excluded.sort_order,tagline=excluded.tagline,badge=excluded.badge,featured=excluded.featured,valid_until=excluded.valid_until`)
          .bind(id,tid,b.name||'Pack',b.description||'',Number(b.sessions)||1,Number(b.price)||0,Number(b.original_price)||0,b.kind||'pack',b.recurring?1:0,b.active===0?0:1,Number(b.sort_order)||0,b.tagline||null,b.badge||null,b.featured?1:0,b.valid_until||null,new Date().toISOString()).run();
        return json({ ok:true, id });
      }
      // Comprar/reservar un pack desde el portal (público, identificado por lead). Sin Stripe => queda 'reserved' y entra al CRM.
      if (p === '/api/pack-buy' && req.method === 'POST') {
        const b:any = await req.json(); const tid=b.tenant_id; const lid=b.lead_id; const pid=b.pack_id;
        if(!tid||!lid||!pid) return json({error:'missing'},400);
        const pk:any = await env.aura_db.prepare('SELECT * FROM packs WHERE id=? AND tenant_id=?').bind(pid,tid).first();
        if(!pk) return json({error:'pack_not_found'},404);
        const oid='po_'+uid(); const ts=new Date().toISOString();
        await env.aura_db.prepare("INSERT INTO pack_orders (id,tenant_id,lead_id,pack_id,pack_name,amount,status,method,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(oid,tid,lid,pid,pk.name,pk.price,'reserved','portal',ts).run();
        // CRM: si es bono con sesiones, crear bono activo; subir temperatura del lead; marcar interes
        if ((pk.sessions||1) > 1) {
          await env.aura_db.prepare("INSERT INTO bonos (id,tenant_id,lead_id,name,total_sessions,used_sessions,amount,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind('b_'+uid(),tid,lid,pk.name,pk.sessions,0,pk.price,'active',ts).run();
        }
        await env.aura_db.prepare("UPDATE leads SET temperature='hot', call_priority='urgent', notes=COALESCE(notes,'')||? WHERE id=?").bind('\n[Portal] Reservó '+pk.name+' ('+pk.price+'€) - pendiente de cobro en clínica', lid).run();
        // aviso al dueño
        try { const tn:any = await env.aura_db.prepare('SELECT name FROM tenants WHERE id=?').bind(tid).first(); } catch(e){}
        return json({ ok:true, order_id:oid, pack:pk.name, amount:pk.price, status:'reserved' });
      }
      // Mis citas (del lead) para el portal
      if (p === '/api/my-appointments' && req.method === 'GET') {
        const tid=url.searchParams.get('tenant'); const lid=url.searchParams.get('lead');
        if(!tid||!lid) return json({error:'missing'},400);
        const r = await env.aura_db.prepare("SELECT id,treatment,date_iso,status,duration_min FROM appointments WHERE tenant_id=? AND lead_id=? ORDER BY date_iso DESC LIMIT 20").bind(tid,lid).all();
        return json({ appointments: r.results||[] });
      }
      // Mis bonos (del lead) para el portal
      if (p === '/api/my-bonos' && req.method === 'GET') {
        const tid=url.searchParams.get('tenant'); const lid=url.searchParams.get('lead');
        if(!tid||!lid) return json({error:'missing'},400);
        const r = await env.aura_db.prepare("SELECT id,name,total_sessions,used_sessions,status FROM bonos WHERE tenant_id=? AND lead_id=? ORDER BY created_at DESC").bind(tid,lid).all();
        return json({ bonos: r.results||[] });
      }
      // Referir a una amiga desde el portal (crea lead nuevo + puntos al que refiere)
      if (p === '/api/refer' && req.method === 'POST') {
        const b:any = await req.json(); const tid=b.tenant_id; const lid=b.lead_id;
        const fname=(b.friend_name||'').trim(); const fphone=(b.friend_phone||'').replace(/[^0-9]/g,'');
        if(!tid||!lid||fphone.length<9) return json({error:'missing'},400);
        const exist:any = await env.aura_db.prepare("SELECT id FROM leads WHERE tenant_id=? AND replace(replace(phone,' ',''),'+','') LIKE ? LIMIT 1").bind(tid,'%'+fphone.slice(-9)).first();
        if(exist) return json({ ok:true, already:true });
        const nid=uid(); const ts=new Date().toISOString();
        await env.aura_db.prepare("INSERT INTO leads (id,tenant_id,name,phone,temperature,status,source,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(nid,tid,(fname||'Referida'),fphone,'warm','new','referido','Referida por un cliente del portal',ts).run();
        const lc:any = await env.aura_db.prepare('SELECT pts_referral FROM loyalty_config WHERE tenant_id=?').bind(tid).first();
        const rp=Number(lc?.pts_referral)||0;
        if(rp>0) await env.aura_db.prepare("INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES (?,?,?,?,?,?)").bind('pt_'+uid(),tid,lid,rp,'referido',ts).run();
        return json({ ok:true, earned:rp });
      }

      // Clientes del portal (panel): registrados en el programa, con puntos y compras
      if (p === '/api/portal-clients' && req.method === 'GET') {
        const tid = url.searchParams.get('tenant'); if(!tid) return json({error:'missing_tenant'},400);
        const r = await env.aura_db.prepare(`
          SELECT l.id, l.name, l.phone, l.created_at,
            COALESCE((SELECT SUM(delta) FROM points_ledger pl WHERE pl.lead_id=l.id),0) as points,
            COALESCE((SELECT COUNT(*) FROM pack_orders po WHERE po.lead_id=l.id),0) as orders,
            COALESCE((SELECT SUM(amount) FROM pack_orders po WHERE po.lead_id=l.id),0) as spent
          FROM leads l
          WHERE l.tenant_id=? AND (l.id IN (SELECT DISTINCT lead_id FROM points_ledger WHERE tenant_id=?) OR l.id IN (SELECT DISTINCT lead_id FROM pack_orders WHERE tenant_id=?))
          ORDER BY points DESC LIMIT 200`).bind(tid,tid,tid).all();
        return json({ clients: r.results||[] });
      }

      // Ajuste manual de puntos desde el panel (protegido)
      if (p === '/api/loyalty-adjust' && req.method === 'POST') {
        const b:any = await req.json();
        if(!b.lead_id||!b.tenant_id) return json({error:'missing'},400);
        const d = Math.round(Number(b.delta)||0);
        if(d!==0) await env.aura_db.prepare("INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES (?,?,?,?,?,?)").bind('pt_'+uid(),b.tenant_id,b.lead_id,d,(b.reason||'ajuste'),new Date().toISOString()).run();
        const bal:any = await env.aura_db.prepare('SELECT COALESCE(SUM(delta),0) as b FROM points_ledger WHERE lead_id=?').bind(b.lead_id).first();
        return json({ ok:true, points:Number(bal?.b)||0 });
      }
      if (p === '/api/clinic-signup' && req.method === 'POST') {
        const b:any = await req.json();
        const rawName = (b.clinic_name||'').trim();
        if (!rawName) return json({ error:'missing_name' }, 400);
        // slug a partir del nombre
        let base = rawName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40) || 'clinica';
        let slug = base; let n=1;
        while (true) {
          const ex:any = await env.aura_db.prepare('SELECT id FROM tenants WHERE id=?').bind(slug).first();
          if (!ex) break; n++; slug = base+'-'+n;
        }
        const city = (b.city||'').trim();
        const wa = (b.whatsapp||'').replace(/[^0-9]/g,'');
        const email = (b.email||'').trim();
        const owner = (b.owner_name||'').trim();
        // Si dan URL, intentar extraer logo (favicon hi-res como respaldo fiable)
        let logoUrl = '';
        const rawUrl = (b.url||'').trim();
        if (rawUrl) {
          try {
            const u = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
            logoUrl = 'https://www.google.com/s2/favicons?sz=128&domain=' + u.hostname;
          } catch(e){}
        }
        // Crear el tenant en modo demo (su embudo de labios queda vivo en /c/{slug})
        const trialEnds = new Date(Date.now()+30*86400000).toISOString();
        await env.aura_db.prepare(`INSERT INTO tenants (id,name,city,whatsapp,email,owner_name,advisor_name,brand_primary,brand_accent,status,plan,trial_ends_at,google_rating,google_reviews,treatments_done,sms_credits,logo_url,url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(slug, rawName, city, wa, email, owner, 'Adrián', '#5e1a2a', '#D4A574', 'demo', 'trial', trialEnds, 4.9, 120, 5000, 100, logoUrl, rawUrl).run();
        // Registrar la clínica como LEAD en el tenant interno de ventas (trazabilidad)
        try {
          const lid = 'l_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
          await env.aura_db.prepare(`INSERT INTO leads (id,tenant_id,name,phone,email,treatment,temperature,status,source,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
            .bind(lid, 'focus-ventas', rawName+(city?' ('+city+')':''), wa, email, 'Demo AURA', 'hot', 'new', 'embudo-demo', 'Alta automática desde homepage. Slug: '+slug+(owner?' · Dueño: '+owner:'')).run();
        } catch(e){ console.error('lead focus-ventas', e); }
        return json({ ok:true, slug, funnel_url:'/c/'+slug });
      }

      // Generador IA desde URL
      if (p === '/api/generate' && req.method === 'POST') {
        return await handleGenerate(req, env);
      }

      // EDITOR: guardar campos directos del embudo (gratis, sin IA)
      if (p === '/api/funnel-save' && req.method === 'POST') {
        const b: any = await req.json();
        const tenant = b.tenant_id; const treatment = b.treatment || 'labios';
        const sets: string[] = []; const vals: any[] = [];
        if (b.headline !== undefined) { sets.push('headline=?'); vals.push(b.headline); }
        if (b.subheadline !== undefined) { sets.push('subheadline=?'); vals.push(b.subheadline); }
        if (b.lead_magnet !== undefined) { sets.push('lead_magnet=?'); vals.push(b.lead_magnet); }
        if (b.price_from !== undefined) { sets.push('price_from=?'); vals.push(b.price_from); }
        if (sets.length) { vals.push(tenant, treatment); await env.aura_db.prepare(`UPDATE funnels SET ${sets.join(',')} WHERE tenant_id=? AND treatment=?`).bind(...vals).run(); }
        const tsets: string[] = []; const tvals: any[] = [];
        if (b.brand_primary !== undefined) { tsets.push('brand_primary=?'); tvals.push(b.brand_primary); }
        if (b.brand_accent !== undefined) { tsets.push('brand_accent=?'); tvals.push(b.brand_accent); }
        if (b.name !== undefined) { tsets.push('name=?'); tvals.push(b.name); }
        if (b.whatsapp !== undefined) { tsets.push('whatsapp=?'); tvals.push(b.whatsapp); }
        if (tsets.length) { tvals.push(tenant); try { await env.aura_db.prepare(`UPDATE tenants SET ${tsets.join(',')} WHERE id=?`).bind(...tvals).run(); } catch(e){} }
        return json({ ok: true });
      }

      // EDITOR estilo Manus: orden en lenguaje natural -> cambios (Llama de Workers AI, gratis)
      if (p === '/api/funnel-edit' && req.method === 'POST') {
        const b: any = await req.json();
        const tenant = b.tenant_id; const treatment = b.treatment || 'labios';
        const f: any = await env.aura_db.prepare('SELECT * FROM funnels WHERE tenant_id=? AND treatment=?').bind(tenant, treatment).first();
        const t: any = await env.aura_db.prepare('SELECT name,brand_primary,brand_accent,whatsapp FROM tenants WHERE id=?').bind(tenant).first();
        const current = { headline: f?.headline || '', subheadline: f?.subheadline || '', lead_magnet: f?.lead_magnet || '', price_from: f?.price_from || '', name: t?.name || '', brand_primary: t?.brand_primary || '', brand_accent: t?.brand_accent || '' };
        const sys = 'Eres un editor de embudos. Recibes la configuracion actual y una orden del cliente en espanol. Devuelve SOLO un JSON con los campos que cambian (headline, subheadline, lead_magnet, price_from, name, brand_primary, brand_accent). brand_primary y brand_accent son colores hex. No incluyas campos que no cambian. Devuelve JSON valido sin texto adicional.';
        const usr = 'CONFIG ACTUAL:\n' + JSON.stringify(current) + '\n\nORDEN DEL CLIENTE: ' + (b.message || '');
        let raw = '{}';
        try { raw = await runAI(env, [{ role:'system', content: sys }, { role:'user', content: usr }], true); } catch(e){ raw = '{}'; }
        let changes: any = {};
        try { const m = raw.match(/\{[\s\S]*\}/); changes = m ? JSON.parse(m[0]) : {}; } catch(e){ changes = {}; }
        const fs: string[] = []; const fv: any[] = [];
        ['headline','subheadline','lead_magnet','price_from'].forEach(k=>{ if(changes[k]!==undefined){ fs.push(k+'=?'); fv.push(changes[k]); } });
        if (fs.length){ fv.push(tenant, treatment); await env.aura_db.prepare(`UPDATE funnels SET ${fs.join(',')} WHERE tenant_id=? AND treatment=?`).bind(...fv).run(); }
        const ts: string[] = []; const tv: any[] = [];
        ['name','brand_primary','brand_accent'].forEach(k=>{ if(changes[k]!==undefined){ ts.push(k+'=?'); tv.push(changes[k]); } });
        if (ts.length){ tv.push(tenant); try{ await env.aura_db.prepare(`UPDATE tenants SET ${ts.join(',')} WHERE id=?`).bind(...tv).run(); }catch(e){} }
        return json({ ok: true, changes, applied: Object.keys(changes) });
      }

      // CONTENT: leer el contenido editable del embudo del tenant
      if (p === '/api/content' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        const t: any = await env.aura_db.prepare('SELECT content,name,brand_primary,brand_accent,whatsapp,hero_image_url,doctor_image_url,room_image_url,logo_url FROM tenants WHERE id=?').bind(tenant).first();
        let content: any = {};
        try { content = t?.content ? JSON.parse(t.content) : {}; } catch(e){ content = {}; }
        return json({ content, tenant: { name: t?.name, brand_primary: t?.brand_primary, brand_accent: t?.brand_accent, whatsapp: t?.whatsapp, hero_image_url: t?.hero_image_url, doctor_image_url: t?.doctor_image_url, room_image_url: t?.room_image_url, logo_url: t?.logo_url } });
      }
      // CONTENT: guardar contenido editable (merge)
      if (p === '/api/content' && req.method === 'POST') {
        const b: any = await req.json();
        const tenant = b.tenant_id;
        const t: any = await env.aura_db.prepare('SELECT content FROM tenants WHERE id=?').bind(tenant).first();
        let cur: any = {}; try { cur = t?.content ? JSON.parse(t.content) : {}; } catch(e){ cur = {}; }
        const merged = { ...cur, ...(b.content || {}) };
        await env.aura_db.prepare('UPDATE tenants SET content=? WHERE id=?').bind(JSON.stringify(merged), tenant).run();
        return json({ ok: true, content: merged });
      }
      // CONTENT: editar con IA (lenguaje natural -> cambios de contenido)
      if (p === '/api/content-edit' && req.method === 'POST') {
        const b: any = await req.json();
        const tenant = b.tenant_id;
        const t: any = await env.aura_db.prepare('SELECT content FROM tenants WHERE id=?').bind(tenant).first();
        let cur: any = {}; try { cur = t?.content ? JSON.parse(t.content) : {}; } catch(e){ cur = {}; }
        const sys = 'Eres un editor de CONTENIDO de un embudo de clínica estética. SOLO puedes cambiar textos, no la estructura. Campos editables: hero_title, hero_sub, cta, lead_magnet, price, q1..q5 (cada una {pregunta, opciones[]}), chat_intro, advisor_name, clinic_name. Recibes el contenido actual (JSON) y una orden en español. Devuelve SOLO un JSON con los campos que cambian. JSON válido, sin texto extra.';
        const usr = 'CONTENIDO ACTUAL:\n' + JSON.stringify(cur) + '\n\nORDEN: ' + (b.message || '');
        let raw = '{}';
        try { raw = await runAI(env, [{ role:'system', content: sys }, { role:'user', content: usr }], true); } catch(e){ raw = '{}'; }
        let changes: any = {}; try { const m = raw.match(/\{[\s\S]*\}/); changes = m ? JSON.parse(m[0]) : {}; } catch(e){ changes = {}; }
        const merged = { ...cur, ...changes };
        await env.aura_db.prepare('UPDATE tenants SET content=? WHERE id=?').bind(JSON.stringify(merged), tenant).run();
        return json({ ok: true, changes, content: merged });
      }
      // CONTENT: regenerar una imagen por slot con IA (hero/doctor/room/before/after)
      if (p === '/api/regenerate-image' && req.method === 'POST') {
        const b: any = await req.json();
        const slot = b.slot || 'hero';
        const prompts: any = {
          hero: 'Hyperrealistic editorial vertical beauty photo, close-up of a Mediterranean woman with natural glowing skin and beautiful natural lips, soft warm light, aesthetic clinic, cream and terracotta tones, premium magazine style',
          doctor: 'Hyperrealistic friendly candid portrait of a Mediterranean female aesthetic doctor in a white coat, warm genuine smile, clinic background bokeh, natural skin texture',
          room: 'Hyperrealistic photo of a luxury aesthetic clinic treatment room, marble, brushed brass, peonies, warm natural light',
          before: 'Hyperrealistic beauty clinic BEFORE photo, close-up of thin natural lips, warm skin tone, neutral',
          after: 'Hyperrealistic beauty clinic AFTER photo, close-up of full glowing hydrated natural lips, same warm skin tone'
        };
        const imgUrl = await generateImage(env, b.prompt || prompts[slot] || prompts.hero);
        if (imgUrl) {
          const col = slot==='doctor' ? 'doctor_image_url' : slot==='room' ? 'room_image_url' : 'hero_image_url';
          if (slot==='hero'||slot==='doctor'||slot==='room') {
            await env.aura_db.prepare(`UPDATE tenants SET ${col}=? WHERE id=?`).bind(imgUrl, b.tenant_id).run();
          } else {
            const t: any = await env.aura_db.prepare('SELECT content FROM tenants WHERE id=?').bind(b.tenant_id).first();
            let cur: any = {}; try { cur = t?.content ? JSON.parse(t.content) : {}; } catch(e){}
            cur['img_'+slot] = imgUrl;
            await env.aura_db.prepare('UPDATE tenants SET content=? WHERE id=?').bind(JSON.stringify(cur), b.tenant_id).run();
          }
          return json({ ok:true, url: imgUrl });
        }
        return json({ ok:false, error:'no se pudo generar' }, 400);
      }

      // Leads CRUD
      if (p === '/api/leads' && req.method === 'POST') {
        const b = await req.json();
        const id = uid();
        await env.aura_db
          .prepare(
            `INSERT INTO leads (id,tenant_id,funnel_id,name,phone,email,treatment,motivo,plazo,objecion,quiz_score,temperature,status,source,ref)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
          )
          .bind(
            id,
            b.tenant_id,
            b.funnel_id || null,
            b.name || null,
            b.phone || null,
            b.email || null,
            b.treatment || null,
            b.motivo || null,
            b.plazo || null,
            b.objecion || null,
            b.quiz_score || 0,
            b.temperature || 'cold',
            'new',
            b.source || 'direct',
            b.ref || null
          )
          .run();
        return json({ ok: true, lead_id: id, ref: b.ref || null });
      }

      if (p === '/api/leads' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        if (!tenant) return json({ error: 'missing tenant' }, 400);
        const r = await env.aura_db
          .prepare(
            `SELECT * FROM leads WHERE tenant_id=? ORDER BY created_at DESC LIMIT 200`
          )
          .bind(tenant)
          .all();
        return json({ leads: r.results });
      }

      // Calendario: leer config
      if (p === '/api/calendar' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        if (!tenant) return json({ error: 'missing tenant' }, 400);
        const r: any = await env.aura_db.prepare('SELECT * FROM calendar_config WHERE tenant_id=?').bind(tenant).first();
        return json({ config: r || { tenant_id: tenant, days: '1,2,3,4,5', start_hour: 10, end_hour: 19, slot_min: 30, professional: '', slot_interval: 15 } });
      }
      // Calendario: guardar config
      if (p === '/api/calendar' && req.method === 'POST') {
        const b: any = await req.json();
        await env.aura_db.prepare(
          `INSERT INTO calendar_config (tenant_id,days,start_hour,end_hour,slot_min,professional,slot_interval,updated_at)
           VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
           ON CONFLICT(tenant_id) DO UPDATE SET days=excluded.days,start_hour=excluded.start_hour,end_hour=excluded.end_hour,slot_min=excluded.slot_min,professional=excluded.professional,slot_interval=excluded.slot_interval,updated_at=CURRENT_TIMESTAMP`
        ).bind(b.tenant_id, b.days||'1,2,3,4,5', b.start_hour||10, b.end_hour||19, b.slot_min||30, b.professional||'', b.slot_interval||15).run();
        return json({ ok: true });
      }
      // Calendario: generar huecos reales para el embudo (respeta horario por día + vacaciones)
      if (p === '/api/slots' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        if (!tenant) return json({ slots: [] });
        const schedule = await getScheduleByDay(env, tenant);
        const vacations = await getVacations(env, tenant);
        const cfg: any = await env.aura_db.prepare('SELECT slot_min FROM calendar_config WHERE tenant_id=?').bind(tenant).first();
        const slotMin = cfg?.slot_min || 60;
        const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit')||'6'), 30));
        const slots:any[] = [];
        // partimos del día de hoy en hora Madrid
        const today = madridParts(new Date());
        const nowUTCms = Date.now();
        let cursor = today.dateStr;
        for (let d=0; d<60 && slots.length<limit; d++){
          const dateStr = cursor;
          const closed = isDateClosed(dateStr, schedule, vacations);
          if (!closed.closed) {
            const dow = new Date(dateStr+'T12:00:00Z').getUTCDay();
            const row = schedule.find((s:any)=>s.dow===dow) || {};
            const tramos: Array<[string,string]> = [];
            if (row.t1_start && row.t1_end) tramos.push([row.t1_start, row.t1_end]);
            if (row.t2_start && row.t2_end) tramos.push([row.t2_start, row.t2_end]);
            if (tramos.length===0) tramos.push(['10:00','19:00']);
            for (const [ts,te] of tramos){
              if (slots.length>=limit) break;
              const [sh,sm] = ts.split(':').map((x:string)=>parseInt(x));
              const [eh,em] = te.split(':').map((x:string)=>parseInt(x));
              let mins = sh*60+(sm||0); const endMins = eh*60+(em||0);
              const step = slotMin>=30 ? slotMin : 60;
              for (; mins+step<=endMins && slots.length<limit; mins+=step){
                const hh = Math.floor(mins/60), mm = mins%60;
                const utc = madridToUTC(dateStr, hh, mm);
                if (utc.getTime() <= nowUTCms + 3600000) continue; // no ofrecer huecos pasados ni en <1h
                // no ofrecer hueco ya ocupado (cualquier profesional)
                const iso = dateStr+'T'+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
                const taken: any = await env.aura_db.prepare("SELECT COUNT(*) c FROM appointments WHERE tenant_id=? AND substr(date_iso,1,16)=? AND status NOT IN ('noshow','cancelled')").bind(tenant, iso).first();
                if ((taken?.c||0) > 0) continue;
                const dd = new Date(dateStr+'T12:00:00Z');
                slots.push({ label: DOW_ES[dd.getUTCDay()]+' '+dd.getUTCDate()+' · '+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0'), iso, date: dateStr });
              }
            }
          }
          // avanzar al día siguiente
          const nx = new Date(cursor+'T12:00:00Z'); nx.setUTCDate(nx.getUTCDate()+1); cursor = nx.toISOString().slice(0,10);
        }
        return json({ slots });
      }

      // DISPONIBILIDAD: leer horario por día (7 filas L-D, default si vacío)
      if (p === '/api/schedule-by-day' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        if (!tenant) return json({ error: 'missing tenant' }, 400);
        const schedule = await getScheduleByDay(env, tenant);
        const cfg: any = await env.aura_db.prepare('SELECT slot_min, professional FROM calendar_config WHERE tenant_id=?').bind(tenant).first();
        return json({ schedule, slot_min: cfg?.slot_min || 60, professional: cfg?.professional || '' });
      }
      // DISPONIBILIDAD: guardar horario por día (array de 7 filas)
      if (p === '/api/schedule-by-day' && req.method === 'POST') {
        const b: any = await req.json();
        await ensureAvailabilitySchema(env);
        const tenant = b.tenant_id;
        if (!tenant) return json({ error: 'missing tenant' }, 400);
        const rows: any[] = Array.isArray(b.schedule) ? b.schedule : [];
        for (const r of rows){
          const dow = parseInt(r.dow);
          if (isNaN(dow) || dow<0 || dow>6) continue;
          await env.aura_db.prepare(
            `INSERT INTO schedule_by_day (tenant_id,dow,is_open,t1_start,t1_end,t2_start,t2_end) VALUES (?,?,?,?,?,?,?)
             ON CONFLICT(tenant_id,dow) DO UPDATE SET is_open=excluded.is_open,t1_start=excluded.t1_start,t1_end=excluded.t1_end,t2_start=excluded.t2_start,t2_end=excluded.t2_end`
          ).bind(tenant, dow, r.is_open?1:0, r.t1_start||'10:00', r.t1_end||'19:00', r.t2_start||null, r.t2_end||null).run();
        }
        // mantener slot_min y profesional en calendar_config para compatibilidad
        if (b.slot_min || b.professional !== undefined) {
          await env.aura_db.prepare(
            `INSERT INTO calendar_config (tenant_id,days,start_hour,end_hour,slot_min,professional,updated_at)
             VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)
             ON CONFLICT(tenant_id) DO UPDATE SET slot_min=excluded.slot_min,professional=excluded.professional,updated_at=CURRENT_TIMESTAMP`
          ).bind(tenant, '1,2,3,4,5', 10, 19, b.slot_min||60, b.professional||'').run();
        }
        return json({ ok: true });
      }
      // DISPONIBILIDAD: vacaciones / días cerrados
      if (p === '/api/vacations' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        if (!tenant) return json({ error: 'missing tenant' }, 400);
        const vacations = await getVacations(env, tenant);
        return json({ vacations });
      }
      if (p === '/api/vacations' && req.method === 'POST') {
        const b: any = await req.json();
        await ensureAvailabilitySchema(env);
        if (b.delete) { await env.aura_db.prepare('DELETE FROM vacations WHERE id=?').bind(b.delete).run(); return json({ ok:true }); }
        if (!b.tenant_id || !b.start_date) return json({ error: 'missing data' }, 400);
        const id = 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
        await env.aura_db.prepare('INSERT INTO vacations (id,tenant_id,start_date,end_date,reason,created_at) VALUES (?,?,?,?,?,?)')
          .bind(id, b.tenant_id, b.start_date, b.end_date||b.start_date, b.reason||'Cerrado', Date.now()).run();
        return json({ ok:true, id });
      }

      // AUTH: pedir código por email (Resend)
      if (p === '/api/auth/request-code' && req.method === 'POST') {
        const b: any = await req.json();
        const email = (b.email||'').trim().toLowerCase();
        if (!email || !email.includes('@')) return json({ error: 'email inválido' }, 400);
        const code = String(Math.floor(100000 + Math.random()*900000));
        const exp = Date.now() + 10*60*1000;
        // Si el email es de un miembro del equipo, usa el tenant de ese equipo
        const tm: any = await env.aura_db.prepare("SELECT tenant_id FROM team_members WHERE email=? AND status='active'").bind(email).first();
        const tenant = tm?.tenant_id || b.tenant_id || email.split('@')[0].replace(/[^a-z0-9]/g,'-');
        await env.aura_db.prepare(
          `INSERT INTO owners (email,tenant_id,code,code_exp) VALUES (?,?,?,?)
           ON CONFLICT(email) DO UPDATE SET code=excluded.code,code_exp=excluded.code_exp`
        ).bind(email, tenant, code, exp).run();
        // enviar con Resend
        try{
          await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+env.RESEND_KEY,'Content-Type':'application/json'},body:JSON.stringify({
            from:'AURA <onboarding@resend.dev>', to:[email], subject:'Tu código de acceso a AURA: '+code,
            html:`<div style="font-family:sans-serif;max-width:420px;margin:auto;padding:24px"><h2 style="font-family:Georgia,serif;color:#A85942">Tu código de acceso</h2><p style="color:#444">Usa este código para entrar a tu panel de AURA. Caduca en 10 minutos.</p><div style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#2A211C;background:#F7EFE8;padding:18px;border-radius:12px;text-align:center;margin:18px 0">${code}</div><p style="color:#999;font-size:12px">Si no has solicitado esto, ignora este correo.</p></div>`
          })});
        }catch(e){ return json({ ok:true, sent:false }); }
        return json({ ok:true, sent:true });
      }
      // AUTH: verificar código → token de sesión
      if (p === '/api/auth/verify-code' && req.method === 'POST') {
        const b: any = await req.json();
        const email = (b.email||'').trim().toLowerCase();
        const o: any = await env.aura_db.prepare('SELECT * FROM owners WHERE email=?').bind(email).first();
        if (!o || o.code !== String(b.code) || Date.now() > (o.code_exp||0)) return json({ error: 'Código incorrecto o caducado' }, 401);
        const token = crypto.randomUUID().replace(/-/g,'') + crypto.randomUUID().replace(/-/g,'');
        await env.aura_db.prepare('INSERT INTO sessions (token,email,tenant_id,created_at) VALUES (?,?,?,?)').bind(token, email, o.tenant_id, Date.now()).run();
        await env.aura_db.prepare('UPDATE owners SET code=NULL WHERE email=?').bind(email).run();
        // resolver rol: si es miembro del equipo usa su rol; si no, es owner
        const member: any = await env.aura_db.prepare("SELECT role FROM team_members WHERE email=? AND tenant_id=? AND status='active'").bind(email, o.tenant_id).first();
        const role = member?.role || 'owner';
        return json({ ok:true, token, tenant_id: o.tenant_id, email, role });
      }
      // AUTH: validar sesión
      if (p === '/api/auth/me' && req.method === 'GET') {
        const token = url.searchParams.get('token');
        if (!token) return json({ auth:false });
        const s: any = await env.aura_db.prepare('SELECT * FROM sessions WHERE token=?').bind(token).first();
        if (!s) return json({ auth:false });
        const owner: any = await env.aura_db.prepare('SELECT role FROM owners WHERE email=?').bind(s.email).first();
        const mb: any = await env.aura_db.prepare("SELECT role,name FROM team_members WHERE email=? AND tenant_id=? AND status='active'").bind(s.email, s.tenant_id).first();
        const role = owner?.role === 'superadmin' ? 'superadmin' : (mb?.role || 'owner');
        // Estado de aceptación legal (solo aplica al dueño de la clínica, no a superadmin ni a otros roles)
        let legal_accepted = true;
        if (role === 'owner') {
          try {
            await env.aura_db.prepare('CREATE TABLE IF NOT EXISTS legal_acceptances (id TEXT PRIMARY KEY, tenant_id TEXT, email TEXT, signer_name TEXT, clinic_name TEXT, version TEXT, docs TEXT, ip TEXT, user_agent TEXT, accepted_at INTEGER)').run();
            const la:any = await env.aura_db.prepare('SELECT id FROM legal_acceptances WHERE tenant_id=? ORDER BY accepted_at DESC LIMIT 1').bind(s.tenant_id).first();
            legal_accepted = !!la;
          } catch(e){ legal_accepted = true; }
        }
        return json({ auth:true, email:s.email, tenant_id:s.tenant_id, role, name: mb?.name||null, legal_accepted });
      }

      // ESTADO/REGISTRO de aceptación legal (clickwrap)
      if (p === '/api/legal-status' && req.method === 'GET') {
        const token = url.searchParams.get('token'); const tid = url.searchParams.get('tenant')||'';
        if (!token) return json({ ok:false, error:'unauthorized' }, 401);
        const s:any = await env.aura_db.prepare('SELECT * FROM sessions WHERE token=?').bind(token).first();
        if (!s) return json({ ok:false, error:'unauthorized' }, 401);
        await env.aura_db.prepare('CREATE TABLE IF NOT EXISTS legal_acceptances (id TEXT PRIMARY KEY, tenant_id TEXT, email TEXT, signer_name TEXT, clinic_name TEXT, version TEXT, docs TEXT, ip TEXT, user_agent TEXT, accepted_at INTEGER)').run().catch(()=>{});
        const la:any = await env.aura_db.prepare('SELECT * FROM legal_acceptances WHERE tenant_id=? ORDER BY accepted_at DESC LIMIT 1').bind(tid||s.tenant_id).first();
        return json({ ok:true, accepted: !!la, record: la||null });
      }
      if (p === '/api/legal-accept' && req.method === 'POST') {
        const token = url.searchParams.get('token') || (req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
        if (!token) return json({ ok:false, error:'unauthorized' }, 401);
        const s:any = await env.aura_db.prepare('SELECT * FROM sessions WHERE token=?').bind(token).first();
        if (!s) return json({ ok:false, error:'unauthorized' }, 401);
        const b:any = await req.json().catch(()=>({}));
        const signer = (b.signer_name||'').trim();
        if (signer.length < 3) return json({ ok:false, error:'signer_required' });
        if (!b.accept_terms || !b.accept_privacy || !b.accept_dpa) return json({ ok:false, error:'must_accept_all' });
        await env.aura_db.prepare('CREATE TABLE IF NOT EXISTS legal_acceptances (id TEXT PRIMARY KEY, tenant_id TEXT, email TEXT, signer_name TEXT, clinic_name TEXT, version TEXT, docs TEXT, ip TEXT, user_agent TEXT, accepted_at INTEGER)').run().catch(()=>{});
        const tid = s.tenant_id;
        const t:any = await env.aura_db.prepare('SELECT name FROM tenants WHERE id=?').bind(tid).first().catch(()=>null);
        const ip = req.headers.get('cf-connecting-ip') || '';
        const ua = req.headers.get('user-agent') || '';
        const id = 'la_'+Math.random().toString(36).slice(2,12);
        await env.aura_db.prepare('INSERT INTO legal_acceptances (id,tenant_id,email,signer_name,clinic_name,version,docs,ip,user_agent,accepted_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
          .bind(id, tid, s.email, signer, (t&&t.name)||(b.clinic_name||''), b.version||'1.0', JSON.stringify({terms:true,privacy:true,dpa:true,reviewed:!!b.reviewed}), ip, ua, Date.now()).run();
        return json({ ok:true, id });
      }
      // Listar todos los tenants (solo para superadmin)
      if (p === '/api/tenants' && req.method === 'GET') {
        const token = url.searchParams.get('token') || (req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
        if (!token) return json({ error:'unauthorized' }, 401);
        const s: any = await env.aura_db.prepare('SELECT email FROM sessions WHERE token=?').bind(token).first();
        if (!s) return json({ error:'unauthorized' }, 401);
        const owner: any = await env.aura_db.prepare('SELECT role FROM owners WHERE email=?').bind(s.email).first();
        if (!owner || owner.role !== 'superadmin') return json({ error:'forbidden' }, 403);
        const r = await env.aura_db.prepare('SELECT id, name FROM tenants ORDER BY name').all();
        return json({ tenants: r.results || [] });
      }

      // ============ ADMINISTRACIÓN (solo Super Admin) — onboarding de clínicas ============
      if (p.startsWith('/api/admin-')) {
        // Verificar Super Admin por sesión
        let tk = (req.headers.get('authorization')||'').replace(/^Bearer\s+/i,''); if(!tk) tk = url.searchParams.get('token')||'';
        if(!tk){ try{ const c=req.headers.get('cookie')||''; const m=c.match(/aura_token=([^;]+)/); if(m) tk=decodeURIComponent(m[1]); }catch(e){} }
        const sess:any = tk ? await env.aura_db.prepare('SELECT email FROM sessions WHERE token=?').bind(tk).first() : null;
        const ow:any = sess ? await env.aura_db.prepare('SELECT role FROM owners WHERE email=?').bind(sess.email).first() : null;
        if (!ow || ow.role !== 'superadmin') return json({ error:'forbidden' }, 403);

        // LISTAR clínicas con estado (pacientes, SMS, WhatsApp, plan)
        if (p === '/api/admin-clinics' && req.method === 'GET') {
          const ts:any = await env.aura_db.prepare('SELECT id,name,city,email,owner_name,status,plan,sms_credits,created_at FROM tenants ORDER BY created_at DESC').all();
          const out:any[] = [];
          for (const t of (ts.results||[])) {
            const pac:any = await env.aura_db.prepare('SELECT COUNT(*) c FROM leads WHERE tenant_id=?').bind(t.id).first();
            const wa:any = await env.aura_db.prepare('SELECT connected FROM wa_config WHERE tenant_id=?').bind(t.id).first().catch(()=>null);
            out.push({ ...t, patients: pac?pac.c:0, wa_connected: wa?!!wa.connected:false });
          }
          return json({ ok:true, clinics: out });
        }

        // CREAR clínica nueva (vacía y aislada)
        if (p === '/api/admin-create-clinic' && req.method === 'POST') {
          const b:any = await req.json();
          const name = (b.name||'').trim(); if(!name) return json({ ok:false, error:'name_required' });
          // id slug único a partir del nombre
          let base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40) || 'clinica';
          let id = base; let n=1;
          while (await env.aura_db.prepare('SELECT 1 FROM tenants WHERE id=?').bind(id).first()) { id = base+'-'+(++n); }
          const email = (b.email||'').trim().toLowerCase();
          const nw = Date.now();
          await env.aura_db.prepare('INSERT INTO tenants (id,name,city,address,whatsapp,email,owner_name,doctor_name,brand_primary,brand_accent,google_rating,google_reviews,status,plan,sms_credits,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            .bind(id, name, b.city||'', b.address||'', b.whatsapp||'', email, b.owner_name||'', b.doctor_name||'', b.brand_primary||'#C8745A', b.brand_accent||'#A85942', 4.9, 0, 'active', b.plan||'growth', 100, nw, nw).run();
          // Propietario: lo damos de alta en owners (rol owner) para que pueda entrar
          if (email.includes('@')) {
            try { await env.aura_db.prepare('INSERT INTO owners (email,tenant_id,role,created_at) VALUES (?,?,?,?)').bind(email, id, 'owner', nw).run(); } catch(e){}
          }
          // Packs de ejemplo opcionales (para que el portal no nazca vacío)
          if (b.seed_packs) {
            await ensurePacksSchema(env);
            const packs = [
              { name:'Bono 3 sesiones', tagline:'Ahorra reservando tu pack', price:240, sessions:3, badge:'', featured:0 },
              { name:'Pack Glow facial', tagline:'Tu piel radiante', price:180, sessions:1, badge:'Nuevo', featured:1 },
              { name:'Membresía mensual', tagline:'Cuídate todo el año', price:59, sessions:1, badge:'', featured:0 },
            ];
            for (const pk of packs) { try { await env.aura_db.prepare('INSERT INTO packs (id,tenant_id,name,tagline,price,sessions,badge,featured,active,created_at) VALUES (?,?,?,?,?,?,?,?,1,?)').bind('pk_'+Math.random().toString(36).slice(2,12), id, pk.name, pk.tagline, pk.price, pk.sessions, pk.badge, pk.featured, nw).run(); } catch(e){} }
          }
          return json({ ok:true, id, login_url:'https://aura-mvp.pages.dev/login' });
        }

        // ENVIAR acceso al propietario (email con enlace al panel)
        if (p === '/api/admin-send-access' && req.method === 'POST') {
          const b:any = await req.json(); const email=(b.email||'').trim().toLowerCase(); const cname=b.clinic_name||'tu clínica';
          if(!email.includes('@')) return json({ ok:false, error:'email_invalido' });
          try{ await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+env.RESEND_KEY,'Content-Type':'application/json'},body:JSON.stringify({
            from:'AURA <onboarding@resend.dev>', to:[email], subject:'Tu panel de AURA ya está listo',
            html:`<div style="font-family:sans-serif;max-width:460px;margin:auto;padding:24px"><h2 style="font-family:Georgia,serif;color:#A85942">Bienvenida a AURA</h2><p style="color:#444">Hemos preparado el panel de <b>${cname}</b>. Entra con este correo y te enviaremos un código de acceso.</p><a href="https://aura-mvp.pages.dev/login" style="display:inline-block;background:#C8745A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;margin-top:10px">Entrar a mi panel</a></div>`
          })}); }catch(e){ return json({ ok:false, error:'email_fallo' }); }
          return json({ ok:true });
        }

        // ELIMINAR clínica (con confirmación en el front)
        if (p === '/api/admin-delete-clinic' && req.method === 'POST') {
          const b:any = await req.json(); const id=b.id;
          if(!id || id==='aura-demo') return json({ ok:false, error:'protegida' });
          await env.aura_db.prepare("UPDATE tenants SET status='archived' WHERE id=?").bind(id).run();
          return json({ ok:true });
        }

        // REACTIVAR clínica archivada
        if (p === '/api/admin-reactivate-clinic' && req.method === 'POST') {
          const b:any = await req.json(); const id=b.id;
          if(!id) return json({ ok:false, error:'id_required' });
          await env.aura_db.prepare("UPDATE tenants SET status='active' WHERE id=?").bind(id).run();
          return json({ ok:true });
        }

        // Asegura tablas auxiliares de onboarding (idempotente)
        await env.aura_db.prepare('CREATE TABLE IF NOT EXISTS admin_notes (id TEXT PRIMARY KEY, tenant_id TEXT, text TEXT, author TEXT, created_at INTEGER)').run().catch(()=>{});
        await env.aura_db.prepare('CREATE TABLE IF NOT EXISTS admin_onboarding (tenant_id TEXT PRIMARY KEY, manual_json TEXT, owner_resp TEXT, updated_at INTEGER)').run().catch(()=>{});

        // FICHA COMPLETA de una clínica (datos + marca + comercial + contadores + checklist autodetectado)
        if (p === '/api/admin-clinic-detail' && req.method === 'GET') {
          const id = url.searchParams.get('id')||'';
          if(!id) return json({ ok:false, error:'id_required' });
          const t:any = await env.aura_db.prepare('SELECT * FROM tenants WHERE id=?').bind(id).first();
          if(!t) return json({ ok:false, error:'not_found' });
          const cnt = async (sql:string)=>{ try{ const r:any=await env.aura_db.prepare(sql).bind(id).first(); return r?(r.c||0):0; }catch(e){ return 0; } };
          // equipo: profesionales activos + miembros de team_members (lo que exista)
          const team   = (await cnt('SELECT COUNT(*) c FROM professionals WHERE tenant_id=?')) + (await cnt('SELECT COUNT(*) c FROM team_members WHERE tenant_id=?'));
          const catalog= await cnt('SELECT COUNT(*) c FROM treatment_catalog WHERE tenant_id=?');
          const packs  = await cnt('SELECT COUNT(*) c FROM packs WHERE tenant_id=?');
          const portal = await cnt('SELECT COUNT(*) c FROM pack_orders WHERE tenant_id=?');
          const patients = await cnt('SELECT COUNT(*) c FROM leads WHERE tenant_id=?');
          const wa:any = await env.aura_db.prepare('SELECT connected FROM wa_config WHERE tenant_id=?').bind(id).first().catch(()=>null);
          const sch:any = await env.aura_db.prepare('SELECT COUNT(*) c FROM schedule_by_day WHERE tenant_id=?').bind(id).first().catch(()=>null);
          const ob:any = await env.aura_db.prepare('SELECT manual_json,owner_resp FROM admin_onboarding WHERE tenant_id=?').bind(id).first().catch(()=>null);
          let manual:any = {}; try{ if(ob?.manual_json) manual = JSON.parse(ob.manual_json); }catch(e){}
          const checklist = {
            datos:    !!(t.name && t.city && t.whatsapp),
            logo:     !!t.logo_url,
            horario:  (sch && sch.c>0) || !!manual.horario,
            tratamientos: catalog>0 || !!manual.tratamientos,
            equipo:   team>0 || !!manual.equipo,
            whatsapp: (wa?!!wa.connected:false) || !!manual.whatsapp,
            packs:    packs>0 || !!manual.packs,
            embudo:   !!manual.embudo,
            acceso:   !!manual.acceso,
          };
          return json({ ok:true, clinic:t, counts:{team,catalog,packs,portal,patients}, wa_connected: wa?!!wa.connected:false, hours_set: !!(sch&&sch.c>0), checklist, manual, owner_resp: ob?ob.owner_resp:'' });
        }

        // ACTUALIZAR todos los campos de una clínica
        if (p === '/api/admin-update-clinic' && req.method === 'POST') {
          const b:any = await req.json(); const id=b.id;
          if(!id) return json({ ok:false, error:'id_required' });
          const fields = ['name','city','address','whatsapp','email','owner_name','doctor_name','brand_primary','brand_accent','google_rating','google_reviews','google_review_url','plan','status','trial_ends_at','ai_system_prompt','logo_url','website'];
          const sets:string[]=[]; const vals:any[]=[];
          for (const f of fields){ if (b[f]!==undefined){ sets.push(f+'=?'); vals.push(b[f]); } }
          if(!sets.length) return json({ ok:false, error:'no_fields' });
          sets.push('updated_at=?'); vals.push(Date.now()); vals.push(id);
          try{ await env.aura_db.prepare('UPDATE tenants SET '+sets.join(',')+' WHERE id=?').bind(...vals).run(); }
          catch(e:any){ return json({ ok:false, error:'update_failed', detail:String(e&&e.message||e) }); }
          return json({ ok:true });
        }

        // RECARGAR SMS a una clínica
        if (p === '/api/admin-add-sms' && req.method === 'POST') {
          const b:any = await req.json(); const id=b.id; const amount=parseInt(b.amount,10)||0;
          if(!id || amount<=0) return json({ ok:false, error:'bad_request' });
          await env.aura_db.prepare('UPDATE tenants SET sms_credits = COALESCE(sms_credits,0) + ? WHERE id=?').bind(amount, id).run();
          const t:any = await env.aura_db.prepare('SELECT sms_credits FROM tenants WHERE id=?').bind(id).first();
          return json({ ok:true, sms_credits: t?t.sms_credits:null });
        }

        // NOTAS internas por clínica
        if (p === '/api/admin-notes' && req.method === 'GET') {
          const id = url.searchParams.get('id')||'';
          if(!id) return json({ ok:false, error:'id_required' });
          const r:any = await env.aura_db.prepare('SELECT id,text,author,created_at FROM admin_notes WHERE tenant_id=? ORDER BY created_at DESC').bind(id).all();
          return json({ ok:true, notes: r.results||[] });
        }
        if (p === '/api/admin-notes' && req.method === 'POST') {
          const b:any = await req.json(); const id=b.id; const text=(b.text||'').trim();
          if(!id || !text) return json({ ok:false, error:'bad_request' });
          const nid = 'note_'+Math.random().toString(36).slice(2,12);
          await env.aura_db.prepare('INSERT INTO admin_notes (id,tenant_id,text,author,created_at) VALUES (?,?,?,?,?)').bind(nid, id, text, sess.email||'admin', Date.now()).run();
          return json({ ok:true, id:nid });
        }
        if (p === '/api/admin-note-delete' && req.method === 'POST') {
          const b:any = await req.json(); if(!b.id) return json({ ok:false, error:'id_required' });
          await env.aura_db.prepare('DELETE FROM admin_notes WHERE id=?').bind(b.id).run();
          return json({ ok:true });
        }

        // CHECKLIST manual + responsable de onboarding
        if (p === '/api/admin-checklist' && req.method === 'POST') {
          const b:any = await req.json(); const id=b.id;
          if(!id) return json({ ok:false, error:'id_required' });
          const manual = JSON.stringify(b.manual||{});
          const owner_resp = b.owner_resp!==undefined ? b.owner_resp : null;
          const now = Date.now();
          const exist:any = await env.aura_db.prepare('SELECT tenant_id FROM admin_onboarding WHERE tenant_id=?').bind(id).first().catch(()=>null);
          if (exist) {
            if (owner_resp!==null) await env.aura_db.prepare('UPDATE admin_onboarding SET manual_json=?, owner_resp=?, updated_at=? WHERE tenant_id=?').bind(manual, owner_resp, now, id).run();
            else await env.aura_db.prepare('UPDATE admin_onboarding SET manual_json=?, updated_at=? WHERE tenant_id=?').bind(manual, now, id).run();
          } else {
            await env.aura_db.prepare('INSERT INTO admin_onboarding (tenant_id,manual_json,owner_resp,updated_at) VALUES (?,?,?,?)').bind(id, manual, owner_resp||'', now).run();
          }
          return json({ ok:true });
        }

        return json({ ok:false, error:'unknown_admin_endpoint' });
      }

      // EQUIPO: listar miembros
      if (p === '/api/team' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        const r = await env.aura_db.prepare('SELECT id,email,name,role,status,created_at FROM team_members WHERE tenant_id=? ORDER BY created_at').bind(tenant).all();
        return json({ members: r.results || [] });
      }
      // EQUIPO: invitar/añadir miembro
      if (p === '/api/team' && req.method === 'POST') {
        const b: any = await req.json();
        const tenant = b.tenant_id; const email = (b.email||'').trim().toLowerCase();
        const role = b.role || 'reception'; const name = b.name || null;
        if (!tenant || !email.includes('@')) return json({ error:'datos inválidos' }, 400);
        const id = uid();
        await env.aura_db.prepare(
          `INSERT INTO team_members (id,tenant_id,email,name,role,status,created_at) VALUES (?,?,?,?,?, 'active', ?)`
        ).bind(id, tenant, email, name, role, Date.now()).run();
        // email de invitación
        try{
          await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+env.RESEND_KEY,'Content-Type':'application/json'},body:JSON.stringify({
            from:'AURA <onboarding@resend.dev>', to:[email], subject:'Te han dado acceso al panel de AURA',
            html:`<div style="font-family:sans-serif;max-width:440px;margin:auto;padding:24px"><h2 style="font-family:Georgia,serif;color:#A85942">Tienes acceso al panel</h2><p style="color:#444">Te han añadido al equipo en AURA con el rol <b>${role}</b>. Entra con tu email y te enviaremos un código de acceso.</p><a href="https://aura-mvp.pages.dev/login" style="display:inline-block;background:#C8745A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;margin-top:10px">Entrar al panel</a></div>`
          })});
        }catch(e){}
        return json({ ok:true, id });
      }
      // EQUIPO: eliminar/cambiar rol
      if (p === '/api/team' && req.method === 'DELETE') {
        const b: any = await req.json();
        await env.aura_db.prepare('DELETE FROM team_members WHERE id=? AND tenant_id=?').bind(b.id, b.tenant_id).run();
        return json({ ok:true });
      }
      if (p === '/api/team/role' && req.method === 'POST') {
        const b: any = await req.json();
        await env.aura_db.prepare('UPDATE team_members SET role=? WHERE id=? AND tenant_id=?').bind(b.role, b.id, b.tenant_id).run();
        return json({ ok:true });
      }

      // SMS TEMPLATES: defaults por defecto
      const DEFAULT_SMS = {
        result_no_chat: '{clinica}: {nombre}, tu plan de labios está listo. Mira cómo quedarías y reserva tu valoración gratis: {link}',
        chat_no_book: '{clinica}: {nombre}, te guardo hueco para tu valoración gratis esta semana. ¿Te va bien? Respóndeme y lo cerramos: {link}',
        reminder_24h: '{clinica}: tu cita es mañana {fecha} a las {hora}. Confírmala o cámbiala con un toque aquí: {link}',
        reminder_2h: '{clinica}: te esperamos hoy a las {hora} en {direccion}. Hasta ahora!',
        no_show: '{clinica}: {nombre}, hoy no pudimos verte. ¿Reprogramamos? Te guardo otro hueco: {link}',
        confirm2: '{clinica}: {nombre}, ¿te esperamos {fecha} a las {hora}? Confírmame con un toque o cámbiala aquí: {link}',
        noshow2: '{clinica}: {nombre}, aún tengo un hueco para ti esta semana. ¿Lo reservamos antes de que se ocupe? {link}',
        reactivation: '{clinica}: {nombre}, tu valoración sigue disponible. Tengo hueco {proximo_dia}, te lo guardo: {link}',
        recall_sale: '{clinica}: {nombre}, toca tu revisión para mantener el resultado. Tengo hueco {proximo_dia}, reserva aquí: {link}',
        review: '{clinica}: {nombre}, gracias por tu visita. ¿Nos dejas tu opinión? Te toma 20 segundos y nos ayuda muchísimo: {link}',
        fast20: '{clinica}: {nombre}, vi que dejaste tus datos. ¿Te ayudo a reservar tu valoración? Es solo un momento: {link}',
        fast5h: '{clinica}: {nombre}, te guardo tu hueco para la valoración. Tengo disponibilidad {proximo_dia}, ¿la cerramos? {link}',
        react_last: '{clinica}: {nombre}, última oportunidad para tu valoración con la promo de este mes. Si te interesa, reserva aquí antes de que cierre: {link}',
        birthday: '{clinica}: ¡Feliz cumpleaños, {nombre}! Te regalamos un detalle en tu próxima visita. Resérvala cuando quieras: {link}'
      };
      if (p === '/api/sms-templates' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        const row: any = await env.aura_db.prepare('SELECT templates FROM sms_templates WHERE tenant_id=?').bind(tenant).first();
        let tpl = {}; try { tpl = row?.templates ? JSON.parse(row.templates) : {}; } catch(e){}
        return json({ templates: Object.assign({}, DEFAULT_SMS, tpl) });
      }
      if (p === '/api/sms-templates' && req.method === 'POST') {
        const b: any = await req.json();
        await env.aura_db.prepare('INSERT INTO sms_templates (tenant_id,templates,updated_at) VALUES (?,?,?) ON CONFLICT(tenant_id) DO UPDATE SET templates=excluded.templates,updated_at=excluded.updated_at').bind(b.tenant_id, JSON.stringify(b.templates||{}), Date.now()).run();
        return json({ ok:true });
      }
      // SMS TEMPLATES: generar con IA adaptadas a la clínica
      if (p === '/api/sms-generate' && req.method === 'POST') {
        const b: any = await req.json();
        const t: any = await env.aura_db.prepare('SELECT name FROM tenants WHERE id=?').bind(b.tenant_id).first();
        const sys='Eres copywriter experto en SMS para clínicas estéticas en España. Genera SMS disruptivos, breves (<160 car), que empiecen con el nombre de la clínica, con beneficio claro y un link {link}. Usa variables {clinica} {nombre} {link} {fecha} {hora} {direccion} {tel} {proximo_dia}. La variable {proximo_dia} resuelve al próximo día abierto de la clínica (ej: el lunes); úsala en reactivation y recall_sale para empujar la reserva sin decir que está cerrado. Devuelve SOLO JSON con claves: result_no_chat, chat_no_book, reminder_24h, reminder_2h, no_show, reactivation.';
        const usr='Clínica: '+(t?.name||'clínica estética')+'. Tratamiento principal: '+(b.treatment||'aumento de labios')+'. Tono: '+(b.tone||'cercano y profesional')+'.';
        let raw='{}'; try{ raw=await runAI(env,[{role:'system',content:sys},{role:'user',content:usr}],true); }catch(e){}
        let gen={}; try{ const m=raw.match(/\{[\s\S]*\}/); gen=m?JSON.parse(m[0]):{}; }catch(e){}
        const merged=Object.assign({},DEFAULT_SMS,gen);
        await env.aura_db.prepare('INSERT INTO sms_templates (tenant_id,templates,updated_at) VALUES (?,?,?) ON CONFLICT(tenant_id) DO UPDATE SET templates=excluded.templates,updated_at=excluded.updated_at').bind(b.tenant_id, JSON.stringify(merged), Date.now()).run();
        return json({ ok:true, templates: merged });
      }
      // LEAD EVENT: marcar que conversó en el chat (para prioridad de llamada punto B)
      if (p === '/api/lead-chatted' && req.method === 'POST') {
        const b: any = await req.json();
        await env.aura_db.prepare("UPDATE leads SET chatted=1 WHERE id=?").bind(b.lead_id).run();
        return json({ ok:true });
      }
      // SMS: envío de prueba / genérico
      if (p === '/api/send-sms' && req.method === 'POST') {
        const b: any = await req.json();
        const res = await sendSMS(env, b.number, b.message, b.sender, b.tenant_id);
        return json(res, res.ok ? 200 : 400);
      }
      // SMS: consultar saldo de la clínica
      if (p === '/api/sms-credits' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        const t: any = await env.aura_db.prepare('SELECT sms_credits FROM tenants WHERE id=?').bind(tenant).first();
        return json({ credits: t?.sms_credits ?? 0 });
      }
      // SMS: crear sesión de Stripe Checkout para comprar 1000 SMS / 75€
      if (p === '/api/sms-checkout' && req.method === 'POST') {
        const b: any = await req.json();
        if (!env.STRIPE_SECRET_KEY) return json({ error: 'pagos no configurados' }, 400);
        const origin = b.origin || 'https://aura-mvp.pages.dev';
        const purchaseId = uid();
        await env.aura_db.prepare('INSERT INTO sms_purchases (id,tenant_id,qty,price_eur,status,created_at) VALUES (?,?,?,?,?,?)').bind(purchaseId, b.tenant_id, 1000, 75, 'pending', Date.now()).run();
        const form = new URLSearchParams();
        form.set('mode', 'payment');
        form.set('success_url', origin + '/dashboard?t=' + b.tenant_id + '&sms=ok');
        form.set('cancel_url', origin + '/dashboard?t=' + b.tenant_id);
        form.set('line_items[0][price_data][currency]', 'eur');
        form.set('line_items[0][price_data][product_data][name]', 'AURA · 1.000 SMS');
        form.set('line_items[0][price_data][unit_amount]', '7500');
        form.set('line_items[0][quantity]', '1');
        form.set('client_reference_id', purchaseId);
        form.set('metadata[purchase_id]', purchaseId);
        form.set('metadata[tenant_id]', b.tenant_id);
        const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        });
        const d: any = await r.json();
        if (d.url) return json({ url: d.url });
        return json({ error: d.error?.message || 'error stripe' }, 400);
      }
      // Stripe webhook: al confirmar pago, recargar SMS
      if (p === '/api/stripe-webhook' && req.method === 'POST') {
        const ev: any = await req.json().catch(() => null);
        if (ev && ev.type === 'checkout.session.completed') {
          const s = ev.data?.object || {};
          const tenantId = s.metadata?.tenant_id;
          const purchaseId = s.metadata?.purchase_id;
          if (tenantId) {
            await env.aura_db.prepare('UPDATE tenants SET sms_credits = COALESCE(sms_credits,0) + 1000 WHERE id=?').bind(tenantId).run();
            if (purchaseId) await env.aura_db.prepare("UPDATE sms_purchases SET status='paid' WHERE id=?").bind(purchaseId).run();
          }
        }
        return json({ received: true });
      }

      // Métricas de embudo real (por funnel o agregado)
      if (p === '/api/funnel-metrics' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        const funnel = url.searchParams.get('funnel'); // opcional
        if (!tenant) return json({ error: 'missing tenant' }, 400);
        let q = 'SELECT * FROM leads WHERE tenant_id=?';
        const binds: any[] = [tenant];
        if (funnel && funnel !== 'all') { q += ' AND treatment=?'; binds.push(funnel); }
        const r = await env.aura_db.prepare(q).bind(...binds).all();
        const leads: any[] = r.results || [];
        const entered = leads.length;
        const quizDone = leads.filter(l => l.objecion || l.plazo || (l.quiz_score||0) > 0).length;
        const chatted = leads.filter(l => l.last_message_at).length;
        const booked = leads.filter(l => l.status === 'booked' || l.status === 'attended' || l.status === 'client').length;
        const attended = leads.filter(l => l.status === 'attended' || l.status === 'client').length;
        // lista de funnels (treatments) presentes para el selector
        const funnels = Array.from(new Set(leads.map(l => l.treatment).filter(Boolean)));
        return json({ metrics: { entered, quizDone, chatted, booked, attended }, funnels });
      }

      // Pipeline: leer fases del tenant
      if (p === '/api/pipeline' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        const r: any = await env.aura_db.prepare('SELECT stages FROM pipeline_config WHERE tenant_id=?').bind(tenant).first();
        let stages = null;
        if (r && r.stages) { try { stages = JSON.parse(r.stages); } catch(e){} }
        if (!stages) stages = [{id:'new',name:'Nuevos'},{id:'whatsapp',name:'En WhatsApp'},{id:'booked',name:'Cita reservada'},{id:'attended',name:'Asistió'},{id:'client',name:'Cliente'},{id:'lost',name:'Perdido'}];
        return json({ stages });
      }
      // Pipeline: guardar fases del tenant
      if (p === '/api/pipeline' && req.method === 'POST') {
        const b: any = await req.json();
        await env.aura_db.prepare(
          `INSERT INTO pipeline_config (tenant_id,stages,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)
           ON CONFLICT(tenant_id) DO UPDATE SET stages=excluded.stages,updated_at=CURRENT_TIMESTAMP`
        ).bind(b.tenant_id, JSON.stringify(b.stages||[])).run();
        return json({ ok: true });
      }

      // Pipeline: cambiar etapa del lead
      if (p === '/api/lead-stage' && req.method === 'POST') {
        const b: any = await req.json();
        if (b.lead_id && b.stage) {
          await env.aura_db.prepare(`UPDATE leads SET status=? WHERE id=?`).bind(b.stage, b.lead_id).run();
        }
        return json({ ok: true });
      }

      // Lead event (whatsapp opened, etc.)
      if (p === '/api/lead-event' && req.method === 'POST') {
        const b: any = await req.json();
        if (b.event === 'whatsapp_opened' && b.lead_id) {
          await env.aura_db.prepare(`UPDATE leads SET wa_opened=1, last_message_at=CURRENT_TIMESTAMP WHERE id=?`).bind(b.lead_id).run();
        }
        return json({ ok: true });
      }

      // Buscar lead por ref, nombre o telefono
      if (p === '/api/lead-search' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        const q = (url.searchParams.get('q') || '').trim();
        if (!tenant || !q) return json({ leads: [] });
        const like = '%' + q + '%';
        const r = await env.aura_db
          .prepare(`SELECT * FROM leads WHERE tenant_id=? AND (ref LIKE ? OR name LIKE ? OR phone LIKE ?) ORDER BY created_at DESC LIMIT 50`)
          .bind(tenant, like, like, like)
          .all();
        return json({ leads: r.results });
      }

      // Mensajes
      if (p === '/api/messages' && req.method === 'POST') {
        const b = await req.json();
        await env.aura_db
          .prepare(
            `INSERT INTO messages (tenant_id,lead_id,role,content,channel) VALUES (?,?,?,?,?)`
          )
          .bind(b.tenant_id, b.lead_id, b.role, b.content, b.channel || 'chat_web')
          .run();
        await env.aura_db
          .prepare(`UPDATE leads SET last_message_at=CURRENT_TIMESTAMP WHERE id=?`)
          .bind(b.lead_id)
          .run();
        return json({ ok: true });
      }

      if (p === '/api/messages' && req.method === 'GET') {
        const lead = url.searchParams.get('lead');
        if (!lead) return json({ error: 'missing lead' }, 400);
        const r = await env.aura_db
          .prepare('SELECT * FROM messages WHERE lead_id=? ORDER BY created_at ASC')
          .bind(lead)
          .all();
        return json({ messages: r.results });
      }

      // TRIAJE: registrar resultado de llamada (saca al lead de la cola urgente)
      if (p === '/api/lead-call' && req.method === 'POST') {
        const b: any = await req.json();
        await ensureLeadFlowSchema(env);
        const res = b.result || 'no_contesta';     // 'reservo' | 'no_contesta' | 'no_interesado'
        const fase = b.fase || 'llama';             // 'llama' | 'recuperar' | 'confirmar' | 'reactivar'
        const MAX: any = { llama:4, recuperar:3, confirmar:2, reactivar:2 };
        const lead: any = await env.aura_db.prepare('SELECT call_attempts FROM leads WHERE id=?').bind(b.lead_id).first();
        const prevAttempts = Number(lead?.call_attempts||0);
        const nowIso = new Date().toISOString();
        if (res === 'reservo') {
          // Recuperado por llamada manual: sale del pipeline y se atribuye a AURA
          await env.aura_db.prepare("UPDATE leads SET call_result='recuperado', pipeline_state='recovered', recovered_by='llamada', recovered_at=?, last_call_at=?, call_attempts=? WHERE id=?")
            .bind(nowIso, nowIso, prevAttempts+1, b.lead_id).run();
          return json({ ok:true, state:'recovered' });
        }
        if (res === 'no_interesado') {
          await env.aura_db.prepare("UPDATE leads SET call_result='no_interesado', pipeline_state='lost', lost_reason='no_interesado', last_call_at=?, call_attempts=? WHERE id=?")
            .bind(nowIso, prevAttempts+1, b.lead_id).run();
          return json({ ok:true, state:'lost' });
        }
        // no_contesta: suma intento; si supera el máximo de la fase -> perdido (no contactable)
        const attempts = prevAttempts + 1;
        const max = MAX[fase] || 4;
        if (attempts >= max) {
          await env.aura_db.prepare("UPDATE leads SET call_attempts=?, last_call_at=?, pipeline_state='lost', lost_reason='no_contactable', call_result='no_contesta' WHERE id=?")
            .bind(attempts, nowIso, b.lead_id).run();
          return json({ ok:true, state:'lost', attempts });
        }
        // sigue en cola, pero no reaparece hasta el día siguiente (last_call_at controla "1 llamada/día")
        await env.aura_db.prepare("UPDATE leads SET call_attempts=?, last_call_at=?, call_result=NULL WHERE id=?")
          .bind(attempts, nowIso, b.lead_id).run();
        return json({ ok:true, state:'retry', attempts, remaining: max-attempts });
      }
      // FICHA: guardar notas, recall y tags del lead
      if (p === '/api/lead-meta' && req.method === 'POST') {
        const b: any = await req.json();
        if (b.recall_type !== undefined) {
          await env.aura_db.prepare('UPDATE leads SET notes=?, recall_date=?, recall_type=? WHERE id=?')
            .bind(b.notes||null, b.recall_date||null, b.recall_type||null, b.lead_id).run();
        } else {
          await env.aura_db.prepare('UPDATE leads SET notes=?, recall_date=?, recall_note=?, tags=? WHERE id=?')
            .bind(b.notes||null, b.recall_date||null, b.recall_note||null, b.tags||null, b.lead_id).run();
        }
        return json({ ok:true });
      }
      // ===== HISTORIA CLÍNICA =====
      // Ficha clínica + notas de evolución de un paciente
      if (p === '/api/clinical' && req.method === 'GET') {
        await ensureInventorySchema(env);
        const lead = url.searchParams.get('lead')||''; if(!lead) return json({ clinical:null, notes:[] });
        const clin:any = await env.aura_db.prepare('SELECT * FROM patient_clinical WHERE lead_id=?').bind(lead).first();
        const nt:any = await env.aura_db.prepare('SELECT * FROM clinical_notes WHERE lead_id=? ORDER BY (visit_date||"") DESC, created_at DESC').bind(lead).all();
        return json({ clinical: clin||null, notes: (nt.results||[]) });
      }
      // Guardar ficha clínica (alergias, antecedentes, medicación, tipo de piel, notas)
      if (p === '/api/clinical' && req.method === 'POST') {
        await ensureInventorySchema(env);
        const b:any = await req.json(); const lead=b.lead_id; if(!lead||!b.tenant_id) return json({error:'missing'},400);
        const actor = (await getSessionRole(env, req, url)) || '';
        await env.aura_db.prepare('INSERT INTO patient_clinical (lead_id,tenant_id,allergies,conditions,medications,skin_type,blood_type,notes,dob,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(lead_id) DO UPDATE SET allergies=excluded.allergies, conditions=excluded.conditions, medications=excluded.medications, skin_type=excluded.skin_type, blood_type=excluded.blood_type, notes=excluded.notes, dob=excluded.dob, updated_at=excluded.updated_at, updated_by=excluded.updated_by')
          .bind(lead, b.tenant_id, b.allergies||'', b.conditions||'', b.medications||'', b.skin_type||'', b.blood_type||'', b.notes||'', b.dob||'', Date.now(), actor).run();
        return json({ ok:true });
      }
      // Añadir una nota de evolución / visita clínica
      if (p === '/api/clinical-note' && req.method === 'POST') {
        await ensureInventorySchema(env);
        const b:any = await req.json(); if(!b.tenant_id) return json({error:'missing'},400);
        if(b.delete){ await env.aura_db.prepare('DELETE FROM clinical_notes WHERE id=? AND tenant_id=?').bind(b.delete, b.tenant_id).run(); return json({ ok:true }); }
        if(!b.lead_id) return json({error:'missing_lead'},400);
        const actor = (await getSessionRole(env, req, url)) || '';
        const id='cn_'+Math.random().toString(36).slice(2,12);
        const vdate = b.visit_date || new Date().toISOString().slice(0,10);
        await env.aura_db.prepare('INSERT INTO clinical_notes (id,tenant_id,lead_id,visit_date,professional,treatment,areas,product,lot,units,note,photo_url,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .bind(id, b.tenant_id, b.lead_id, vdate, b.professional||'', b.treatment||'', b.areas||'', b.product||'', b.lot||'', b.units||'', b.note||'', b.photo_url||'', Date.now(), actor).run();
        return json({ ok:true, id });
      }
      // TRATAMIENTOS / PAGOS por lead
      if (p === '/api/treatments' && req.method === 'GET') {
        const lead = url.searchParams.get('lead');
        const r = await env.aura_db.prepare('SELECT * FROM treatments_log WHERE lead_id=? ORDER BY created_at DESC').bind(lead).all();
        const rows: any[] = r.results || [];
        const total = rows.filter(x=>x.pay_status==='paid').reduce((s,x)=>s+(x.amount||0),0);
        const pending = rows.filter(x=>x.pay_status!=='paid').reduce((s,x)=>s+(x.amount||0),0);
        return json({ treatments: rows, total_spent: total, pending });
      }
      if (p === '/api/treatments' && req.method === 'POST') {
        const b: any = await req.json();
        const id = 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
        const baseDate = b.date_iso ? new Date(b.date_iso) : new Date();
        await env.aura_db.prepare('INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,created_at,method,cost) VALUES (?,?,?,?,?,?,?,?,?,?)')
          .bind(id, b.tenant_id, b.lead_id, b.name||'Tratamiento', b.amount||0, b.pay_status||'pending', baseDate.toISOString(), Date.now(), b.method||null, Number(b.cost)||0).run();
        // Programar recall automático según tipo de tratamiento y recurrencia
        try {
          const nm = (b.name||'').toLowerCase();
          const prev: any = await env.aura_db.prepare('SELECT COUNT(*) as c FROM treatments_log WHERE lead_id=?').bind(b.lead_id).first();
          const isFirst = (prev?.c||1) <= 1;
          // Ciclo de recall por tratamiento (benchmark de duración real del efecto)
          let days = 90; // por defecto: 3 meses
          if (nm.includes('labio')) days = isFirst ? 180 : 270;       // labios: 6 meses, luego 9
          else if (nm.includes('botox') || nm.includes('arrug') || nm.includes('toxina')) days = 120; // botox: 4 meses
          else if (nm.includes('rino') || nm.includes('mand') || nm.includes('ojera') || nm.includes('relleno') || nm.includes('surco') || nm.includes('menton')) days = 270; // rellenos: 9 meses
          else if (nm.includes('meso') || nm.includes('vitamin')) days = 30;  // mesoterapia: mantenimiento mensual
          else if (nm.includes('hidrat') || nm.includes('peel') || nm.includes('piel') || nm.includes('facial') || nm.includes('limpie')) days = 30; // facial/peeling: mensual
          else if (nm.includes('laser') || nm.includes('láser') || nm.includes('depil') || nm.includes('ipl')) days = 45; // láser/depilación: ~6 semanas entre sesiones
          const rd = new Date(baseDate); rd.setDate(rd.getDate() + days);
          // Mensaje de recall persuasivo ADAPTADO POR PRODUCTO
          let recallMsg = '{clinica}: {nombre}, tu tratamiento ya pide un repaso para seguir luciéndolo. Resérvalo gratis aquí: {link}';
          if (nm.includes('labio')) recallMsg = '{clinica}: {nombre}, tus labios ya están perdiendo volumen. No esperes a que bajen del todo: te guardo hueco para mantenerlos perfectos. Reserva en 1 toque: {link}';
          else if (nm.includes('botox') || nm.includes('arrug')) recallMsg = '{clinica}: {nombre}, el efecto de tu botox está a punto de irse y las arrugas vuelven. Renuévalo antes de que se note. Reserva aquí: {link}';
          else if (nm.includes('hidrat') || nm.includes('peel') || nm.includes('piel')) recallMsg = '{clinica}: {nombre}, tu piel necesita su sesión de mantenimiento para seguir luminosa. Te guardo hueco esta semana: {link}';
          else if (nm.includes('rino') || nm.includes('mand') || nm.includes('ojera') || nm.includes('relleno')) recallMsg = '{clinica}: {nombre}, tu resultado empieza a reabsorberse. Una revisión ahora lo mantiene impecable. Reserva aquí: {link}';
          const recallNote = 'Recontactar para retoque/nueva venta de ' + (b.name||'tratamiento');
          // Reprograma recall recurrente: cada tratamiento/revisión nuevo reinicia el ciclo (recall_sms_sent=0)
          await env.aura_db.prepare("UPDATE leads SET recall_date=?, recall_note=?, recall_type='venta', recall_msg=?, recall_sms_sent=0 WHERE id=?").bind(rd.toISOString().slice(0,10), recallNote, recallMsg, b.lead_id).run();
        } catch(e) {}
        return json({ ok:true, id });
      }
      if (p === '/api/treatments' && req.method === 'PUT') {
        const b: any = await req.json();
        await env.aura_db.prepare('UPDATE treatments_log SET pay_status=?, amount=?, name=?'+(b.method!==undefined?', method=?':'')+' WHERE id=?').bind(...(b.method!==undefined?[b.pay_status, b.amount, b.name, b.method, b.id]:[b.pay_status, b.amount, b.name, b.id])).run();
        return json({ ok:true });
      }
      if (p === '/api/treatments' && req.method === 'DELETE') {
        const b: any = await req.json();
        await env.aura_db.prepare('DELETE FROM treatments_log WHERE id=?').bind(b.id).run();
        return json({ ok:true });
      }

      // ===== CLINIC OS lite: INVENTARIO =====
      if (p === '/api/products' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant'); if(!tenant) return json({error:'missing tenant'},400);
        const r = await env.aura_db.prepare('SELECT * FROM products WHERE tenant_id=? ORDER BY name').bind(tenant).all();
        return json({ products: r.results });
      }
      if (p === '/api/products' && req.method === 'POST') {
        const b:any = await req.json();
        if (b.delete) { await env.aura_db.prepare('DELETE FROM products WHERE id=?').bind(b.delete).run(); return json({ok:true}); }
        if (b.id) { // editar / ajustar stock
          await env.aura_db.prepare('UPDATE products SET name=?, stock=?, unit=?, cost=?, low_alert=? WHERE id=?')
            .bind(b.name||'Producto', Number(b.stock)||0, b.unit||'ud', Number(b.cost)||0, Number(b.low_alert)||3, b.id).run();
          return json({ ok:true, id:b.id });
        }
        const id = 'p_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
        await env.aura_db.prepare('INSERT INTO products (id,tenant_id,name,stock,unit,cost,low_alert,created_at) VALUES (?,?,?,?,?,?,?,?)')
          .bind(id, b.tenant_id, b.name||'Producto', Number(b.stock)||0, b.unit||'ud', Number(b.cost)||0, Number(b.low_alert)||3, Date.now()).run();
        return json({ ok:true, id });
      }

      // ===== CATÁLOGO DE TRATAMIENTOS (duración + precio) =====
      if (p === '/api/treatment-catalog' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant'); if(!tenant) return json({error:'missing tenant'},400);
        const r = await env.aura_db.prepare('SELECT * FROM treatment_catalog WHERE tenant_id=? ORDER BY sort_order, name').bind(tenant).all();
        return json({ catalog: r.results });
      }
      if (p === '/api/treatment-catalog' && req.method === 'POST') {
        await ensureInventorySchema(env);
        const b:any = await req.json();
        if (b.delete) { await env.aura_db.prepare('DELETE FROM treatment_catalog WHERE id=? AND tenant_id=?').bind(b.delete, b.tenant_id).run(); return json({ok:true}); }
        const upL=b.upsell_label||null, upP=Number(b.upsell_price)||0, pkL=b.pack_label||null, pkP=Number(b.pack_price)||0, pkO=Number(b.pack_original)||0, nDays=Number(b.next_days)||0;
        if (b.id) {
          await env.aura_db.prepare('UPDATE treatment_catalog SET name=?, duration_min=?, price=?, color=?, upsell_label=?, upsell_price=?, pack_label=?, pack_price=?, pack_original=?, next_days=? WHERE id=? AND tenant_id=?')
            .bind(b.name||'Tratamiento', Number(b.duration_min)||30, Number(b.price)||0, b.color||'#9B7BFF', upL, upP, pkL, pkP, pkO, nDays, b.id, b.tenant_id).run();
          return json({ ok:true, id:b.id });
        }
        const id = 'tc_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
        const colors=['#9B7BFF','#FF6B5A','#34a877','#d9a23a','#3a8fd9','#c0568f'];
        await env.aura_db.prepare('INSERT INTO treatment_catalog (id,tenant_id,name,duration_min,price,color,created_at,upsell_label,upsell_price,pack_label,pack_price,pack_original,next_days) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .bind(id, b.tenant_id, b.name||'Tratamiento', Number(b.duration_min)||30, Number(b.price)||0, b.color||colors[Math.floor(Math.random()*colors.length)], Date.now(), upL, upP, pkL, pkP, pkO, nDays).run();
        return json({ ok:true, id });
      }

      // ===== CLINIC OS lite: BONOS / PACKS =====
      if (p === '/api/bonos' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant'); if(!tenant) return json({error:'missing tenant'},400);
        const lead = url.searchParams.get('lead');
        let r;
        if (lead) r = await env.aura_db.prepare("SELECT * FROM bonos WHERE tenant_id=? AND lead_id=? ORDER BY created_at DESC").bind(tenant, lead).all();
        else r = await env.aura_db.prepare("SELECT b.*, l.name AS lead_name FROM bonos b LEFT JOIN leads l ON l.id=b.lead_id WHERE b.tenant_id=? ORDER BY b.created_at DESC LIMIT 200").bind(tenant).all();
        return json({ bonos: r.results });
      }
      if (p === '/api/bonos' && req.method === 'POST') {
        const b:any = await req.json();
        if (b.delete) { await env.aura_db.prepare('DELETE FROM bonos WHERE id=?').bind(b.delete).run(); return json({ok:true}); }
        if (b.use_session) { // descontar una sesión manualmente
          await env.aura_db.prepare("UPDATE bonos SET used_sessions = MIN(total_sessions, used_sessions+1), status = CASE WHEN used_sessions+1 >= total_sessions THEN 'done' ELSE 'active' END WHERE id=?").bind(b.use_session).run();
          return json({ ok:true });
        }
        const id = 'bo_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
        await env.aura_db.prepare('INSERT INTO bonos (id,tenant_id,lead_id,name,total_sessions,used_sessions,amount,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
          .bind(id, b.tenant_id, b.lead_id||null, b.name||'Bono', Number(b.total_sessions)||1, 0, Number(b.amount)||0, 'active', Date.now()).run();
        // El bono es una venta: la registramos como pago en caja
        if ((Number(b.amount)||0) > 0) {
          await env.aura_db.prepare("INSERT INTO treatments_log (id,lead_id,tenant_id,name,amount,pay_status,date_iso,method,cost) VALUES (?,?,?,?,?,?,?,?,?)")
            .bind('t_'+uid(), b.lead_id||null, b.tenant_id, 'Bono: '+(b.name||'pack'), Number(b.amount)||0, 'paid', new Date().toISOString(), b.method||null, 0).run();
        }
        return json({ ok:true, id });
      }

      // ===== CLINIC OS lite: CAJA (resumen de ingresos por fecha) =====
      if (p === '/api/cashbox' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant'); if(!tenant) return json({error:'missing tenant'},400);
        const day = url.searchParams.get('day') || new Date().toISOString().slice(0,10);
        // pagos del día (por fecha del tratamiento)
        const rows: any = await env.aura_db.prepare("SELECT * FROM treatments_log WHERE tenant_id=? AND substr(date_iso,1,10)=?").bind(tenant, day).all();
        const list = rows.results || [];
        const paid = list.filter((x:any)=>x.pay_status==='paid');
        const totalDay = paid.reduce((s:number,x:any)=>s+(x.amount||0),0);
        const cost = paid.reduce((s:number,x:any)=>s+(x.cost||0),0);
        const byMethod: any = {};
        paid.forEach((x:any)=>{ const m=x.method||'otro'; byMethod[m]=(byMethod[m]||0)+(x.amount||0); });
        // ayer para comparar
        const dPrev = new Date(day+'T12:00:00Z'); dPrev.setUTCDate(dPrev.getUTCDate()-1); const prevStr=dPrev.toISOString().slice(0,10);
        const prevRows: any = await env.aura_db.prepare("SELECT amount FROM treatments_log WHERE tenant_id=? AND substr(date_iso,1,10)=? AND pay_status='paid'").bind(tenant, prevStr).all();
        const totalPrev = (prevRows.results||[]).reduce((s:number,x:any)=>s+(x.amount||0),0);
        return json({ day, total: totalDay, cost, margin: totalDay-cost, tickets: paid.length, by_method: byMethod, total_prev: totalPrev, items: list });
      }

      // ===== RECUPERADO GRACIAS A AURA (atribución de valor) =====
      if (p === '/api/recovered' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant'); if(!tenant) return json({error:'missing tenant'},400);
        const period = url.searchParams.get('period')||'month';
        const ref = url.searchParams.get('day') || new Date().toISOString().slice(0,10);
        const refD = new Date(ref+'T12:00:00Z');
        let start = ref, end = ref;
        if (period==='week'){ const wd=(refD.getUTCDay()+6)%7; const s=new Date(refD); s.setUTCDate(refD.getUTCDate()-wd); const e=new Date(s); e.setUTCDate(s.getUTCDate()+6); start=s.toISOString().slice(0,10); end=e.toISOString().slice(0,10); }
        else if (period==='month'){ start=ref.slice(0,8)+'01'; const e=new Date(Date.UTC(refD.getUTCFullYear(), refD.getUTCMonth()+1, 0)); end=e.toISOString().slice(0,10); }
        else if (period==='year'){ start=ref.slice(0,4)+'-01-01'; end=ref.slice(0,4)+'-12-31'; }
        // visitas pagadas del periodo, con datos del lead para atribuir origen
        const rows:any = await env.aura_db.prepare(
          `SELECT t.amount, t.lead_id, l.recover_state, l.noshow_count, l.react_d3, l.react_d7, l.recall_type, l.funnel_id, l.source, l.recovered_by
           FROM treatments_log t LEFT JOIN leads l ON l.id=t.lead_id
           WHERE t.tenant_id=? AND t.pay_status='paid' AND substr(t.date_iso,1,10) BETWEEN ? AND ?`
        ).bind(tenant, start, end).all();
        const buckets:any = { call:{n:0,v:0}, noshow:{n:0,v:0}, recall:{n:0,v:0}, reactivation:{n:0,v:0}, funnel:{n:0,v:0} };
        for (const r of (rows.results||[])){
          const amt = Number(r.amount)||0; if(amt<=0) continue;
          // prioridad de atribución (una sola causa por visita)
          if (r.recovered_by==='llamada') { buckets.call.n++; buckets.call.v+=amt; }
          else if (r.recover_state==='noshow' || (r.noshow_count&&r.noshow_count>0)) { buckets.noshow.n++; buckets.noshow.v+=amt; }
          else if (r.recall_type==='venta') { buckets.recall.n++; buckets.recall.v+=amt; }
          else if (r.react_d3 || r.react_d7) { buckets.reactivation.n++; buckets.reactivation.v+=amt; }
          else if (r.funnel_id || (r.source && r.source!=='manual' && r.source!=='walkin')) { buckets.funnel.n++; buckets.funnel.v+=amt; } // entró por el embudo
        }
        const total = buckets.call.v + buckets.noshow.v + buckets.recall.v + buckets.reactivation.v + buckets.funnel.v;
        const totalN = buckets.call.n + buckets.noshow.n + buckets.recall.n + buckets.reactivation.n + buckets.funnel.n;
        return json({ period, start, end, total: Math.round(total*100)/100, count: totalN,
          breakdown: [
            { key:'call', label:'Recuperados por llamada', n:buckets.call.n, value:Math.round(buckets.call.v*100)/100 },
            { key:'noshow', label:'Citas recuperadas (no-show)', n:buckets.noshow.n, value:Math.round(buckets.noshow.v*100)/100 },
            { key:'recall', label:'Nuevas ventas por recall', n:buckets.recall.n, value:Math.round(buckets.recall.v*100)/100 },
            { key:'reactivation', label:'Leads reactivados', n:buckets.reactivation.n, value:Math.round(buckets.reactivation.v*100)/100 },
            { key:'funnel', label:'Captados por el embudo', n:buckets.funnel.n, value:Math.round(buckets.funnel.v*100)/100 }
          ] });
      }

      // ============ INVENTARIO ============
      if (p.startsWith('/api/inv-')) {
        await ensureInventorySchema(env);
        let tid = url.searchParams.get('tenant') || url.searchParams.get('tenant_id') || '';
        if (!tid && req.method!=='GET') { try { const cl = req.clone(); const bb:any = await cl.json(); tid = bb.tenant_id || bb.tenant || ''; } catch(e){} }
        const nowI = Date.now();
        if (p === '/api/inv-products' && req.method === 'GET') {
          const prods:any = await env.aura_db.prepare('SELECT * FROM inventory_products WHERE tenant_id=? AND active=1 ORDER BY name').bind(tid).all();
          const lots:any = await env.aura_db.prepare('SELECT product_id, lot, qty, expiry, cost_per_unit FROM inventory_lots WHERE tenant_id=? AND qty>0 ORDER BY expiry').bind(tid).all();
          const byProd:any = {}; for (const l of (lots.results||[])) { (byProd[l.product_id]=byProd[l.product_id]||[]).push(l); }
          return json({ ok:true, products: (prods.results||[]).map((pr:any)=>({ ...pr, lots: byProd[pr.id]||[] })) });
        }
        if (p === '/api/inv-product' && req.method === 'POST') {
          const b:any = await req.json();
          if (b.delete) { await env.aura_db.prepare('UPDATE inventory_products SET active=0 WHERE id=? AND tenant_id=?').bind(b.delete, tid).run(); return json({ ok:true }); }
          if (b.photo!==undefined && b.id && b.name===undefined) { await env.aura_db.prepare('UPDATE inventory_products SET image_url=?, updated_at=? WHERE id=? AND tenant_id=?').bind(b.photo||null, nowI, b.id, tid).run(); return json({ ok:true, id:b.id }); }
          if (b.id) {
            await env.aura_db.prepare('UPDATE inventory_products SET name=?,category=?,unit=?,min_stock=?,cost_per_unit=?,sale_price=?,track_lots=?,image_url=COALESCE(?,image_url),updated_at=? WHERE id=? AND tenant_id=?')
              .bind(b.name, b.category||'servicio', b.unit||'unidad', Number(b.min_stock)||0, Number(b.cost_per_unit)||0, Number(b.sale_price)||0, b.track_lots?1:0, b.image_url||null, nowI, b.id, tid).run();
            return json({ ok:true, id:b.id });
          }
          const id = 'inv_'+Math.random().toString(36).slice(2,12);
          await env.aura_db.prepare('INSERT INTO inventory_products (id,tenant_id,name,category,unit,stock,min_stock,cost_per_unit,sale_price,track_lots,active,image_url,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?,?)')
            .bind(id, tid, b.name||'Producto', b.category||'servicio', b.unit||'unidad', Number(b.stock)||0, Number(b.min_stock)||0, Number(b.cost_per_unit)||0, Number(b.sale_price)||0, b.track_lots?1:0, b.image_url||null, nowI, nowI).run();
          if ((Number(b.stock)||0)>0) await env.aura_db.prepare('INSERT INTO inventory_moves (id,tenant_id,product_id,delta,reason,actor,created_at) VALUES (?,?,?,?,?,?,?)').bind('mv_'+Math.random().toString(36).slice(2,10), tid, id, Number(b.stock)||0, 'alta', b.actor||'panel', nowI).run();
          return json({ ok:true, id });
        }
        if (p === '/api/inv-restock' && req.method === 'POST') {
          const b:any = await req.json();
          const prod:any = await env.aura_db.prepare('SELECT * FROM inventory_products WHERE tenant_id=? AND id=?').bind(tid, b.product_id).first();
          if (!prod) return json({ ok:false, error:'no_product' });
          const qty = Number(b.qty)||0; if (qty<=0) return json({ ok:false, error:'bad_qty' });
          await env.aura_db.prepare('UPDATE inventory_products SET stock=stock+?, updated_at=? WHERE id=? AND tenant_id=?').bind(qty, nowI, b.product_id, tid).run();
          if (b.lot || b.expiry) { await env.aura_db.prepare('INSERT INTO inventory_lots (id,tenant_id,product_id,lot,qty,expiry,cost_per_unit,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('lot_'+Math.random().toString(36).slice(2,10), tid, b.product_id, b.lot||'', qty, b.expiry||'', Number(b.cost_per_unit)||prod.cost_per_unit||0, nowI).run(); }
          await env.aura_db.prepare('INSERT INTO inventory_moves (id,tenant_id,product_id,delta,reason,actor,created_at) VALUES (?,?,?,?,?,?,?)').bind('mv_'+Math.random().toString(36).slice(2,10), tid, b.product_id, qty, 'recarga', b.actor||'panel', nowI).run();
          const upd:any = await env.aura_db.prepare('SELECT stock FROM inventory_products WHERE id=?').bind(b.product_id).first();
          return json({ ok:true, stock: upd?upd.stock:null });
        }
        if (p === '/api/inv-recipes' && req.method === 'GET') {
          const rc:any = await env.aura_db.prepare('SELECT r.*, pr.name as product_name, pr.unit FROM inventory_recipes r LEFT JOIN inventory_products pr ON pr.id=r.product_id WHERE r.tenant_id=? ORDER BY r.treatment').bind(tid).all();
          return json({ ok:true, recipes: rc.results||[] });
        }
        if (p === '/api/inv-recipe' && req.method === 'POST') {
          const b:any = await req.json();
          if (b.delete) { await env.aura_db.prepare('DELETE FROM inventory_recipes WHERE id=? AND tenant_id=?').bind(b.delete, tid).run(); return json({ ok:true }); }
          const id = 'rcp_'+Math.random().toString(36).slice(2,10);
          await env.aura_db.prepare('INSERT INTO inventory_recipes (id,tenant_id,treatment,product_id,qty,created_at) VALUES (?,?,?,?,?,?)').bind(id, tid, b.treatment||'', b.product_id, Number(b.qty)||0, nowI).run();
          return json({ ok:true, id });
        }
        if (p === '/api/inv-alerts' && req.method === 'GET') {
          const low:any = await env.aura_db.prepare('SELECT id,name,stock,min_stock,unit FROM inventory_products WHERE tenant_id=? AND active=1 AND min_stock>0 AND stock<=min_stock ORDER BY name').bind(tid).all();
          const soon = new Date(Date.now()+30*864e5).toISOString().slice(0,10);
          const exp:any = await env.aura_db.prepare("SELECT l.lot,l.qty,l.expiry,pr.name FROM inventory_lots l LEFT JOIN inventory_products pr ON pr.id=l.product_id WHERE l.tenant_id=? AND l.qty>0 AND l.expiry!='' AND l.expiry<=? ORDER BY l.expiry").bind(tid, soon).all();
          return json({ ok:true, low: low.results||[], expiring: exp.results||[] });
        }
        return json({ ok:false, error:'unknown_inv_endpoint' });
      }

      // ============ TRANSCRIPCIÓN DE VOZ (Whisper) ============
      if (p === '/api/transcribe' && req.method === 'POST') {
        if (!env.OPENAI_KEY) return json({ ok:false, error:'no_key' });
        try {
          const inForm = await req.formData();
          const audio:any = inForm.get('audio');
          if (!audio) return json({ ok:false, error:'no_audio' });
          // Nombre con extensión correcta según el tipo (mejora la detección del formato)
          const ct = (audio.type||'').toLowerCase();
          const ext = ct.includes('webm')?'webm': ct.includes('mp4')||ct.includes('m4a')?'m4a': ct.includes('mpeg')||ct.includes('mp3')?'mp3': ct.includes('wav')?'wav': ct.includes('ogg')?'ogg':'webm';
          // Prompt de contexto: vocabulario de clínica estética -> mejora la precisión de los términos
          const ctxPrompt = 'Transcripción para una clínica estética en español. Vocabulario habitual: toxina botulínica, bótox, ácido hialurónico, relleno, mesoterapia, peeling, láser, rinomodelación, hidratación facial, viales, jeringas, unidades, mililitros, lote, caducidad, stock, recargar, producto, paciente, cita.';
          const callWhisper = async (model:string, withPrompt:boolean) => {
            const fd = new FormData();
            fd.append('file', audio, 'voice.'+ext);
            fd.append('model', model);
            fd.append('language', 'es');
            fd.append('response_format', 'json');
            if (withPrompt) fd.append('prompt', ctxPrompt);
            const wr = await fetch('https://api.openai.com/v1/audio/transcriptions', { method:'POST', headers:{ Authorization:`Bearer ${env.OPENAI_KEY}` }, body: fd });
            return wr;
          };
          // 1º intento: modelo de mayor calidad (gpt-4o-mini-transcribe) con prompt de contexto
          let wr = await callWhisper('gpt-4o-mini-transcribe', true);
          if (!wr.ok) {
            // Fallback robusto a whisper-1 (siempre disponible)
            wr = await callWhisper('whisper-1', true);
          }
          const wd:any = await wr.json();
          return json({ ok:true, text: (wd && wd.text) ? String(wd.text).trim() : '' });
        } catch(e:any){ return json({ ok:false, error:'transcribe_failed' }); }
      }

      // ============ COPILOTO IA ============
      if (p === '/api/copilot' && req.method === 'POST') {
        await ensureInventorySchema(env);
        const b:any = await req.json();
        // BLINDAJE: el tenant se deriva de la SESIÓN verificada, nunca del parámetro del cliente.
        const tenantSolicitado = (url.searchParams.get('tenant') || url.searchParams.get('tenant_id') || b.tenant_id || '') || null;
        const ctx = await resolveCopilotTenant(env, req, url, tenantSolicitado);
        if (ctx.error) return json({ ok:false, stage:'done', message: ctx.error==='no_copilot_permission' ? 'No tienes permiso para usar el Copiloto. Pídeselo al propietario de la clínica.' : 'No autorizado.' }, ctx.error==='no_copilot_permission'?403:401);
        const tid = ctx.tenant as string;
        const actorEmail = ctx.email || '';
        const text = (b.text||'').toString().slice(0,1000);
        let parsed:any = {};
        if (!b.confirm) {
          if (!text) return json({ ok:false, error:'empty' });
          const prods:any = await env.aura_db.prepare('SELECT id,name,unit,stock FROM inventory_products WHERE tenant_id=? AND active=1').bind(tid).all();
          const prodList = (prods.results||[]).map((x:any)=>x.name+' (id:'+x.id+', '+x.stock+' '+x.unit+')').join('; ');
          const hoyISO = new Date().toISOString().slice(0,10);
          // Historial de la conversación (turnos previos) para que el copiloto recuerde lo ya dicho
          const history:any[] = Array.isArray(b.history) ? b.history.slice(-12) : [];
          const draft = b.draft || null; // ficha parcial que se está rellenando
          const sys = 'Eres el copiloto de gestión de una clínica estética (AURA). Hoy es '+hoyISO+'. Mantienes una CONVERSACIÓN y devuelves SOLO un JSON. '
            + 'Acciones (action): "crear_producto","recargar_stock","crear_receta","crear_contacto","crear_empleado","consultar","consultar_agenda","consultar_pacientes","consultar_negocio","consultar_pendientes","reservar_cita","anular_cita","ninguna". '
            + 'INVENTARIO: crear_producto -> {action,name,category(servicio|retail|material),unit(unidad|ml|jeringa|vial),stock,min_stock,cost_per_unit,sale_price}. OBLIGATORIOS: name, category, unit, cost_per_unit. '
            + 'recargar_stock -> {action,product_query,qty,lot,expiry(YYYY-MM-DD)}. OBLIGATORIOS: product_query, qty. crear_receta -> {action,treatment,product_query,qty}. OBLIGATORIOS: treatment, product_query, qty. consultar -> {action,query_type(stock|caducidad)}. '
            + 'PACIENTES: crear_contacto -> {action,name,phone,treatment}. OBLIGATORIOS: name, phone. consultar_pacientes -> {action,patient_query(nombre o vacío), info(ultima_visita|gasto|telefono|sin_venir)}. '
            + 'EQUIPO: crear_empleado -> {action,name,role(direccion|gerente|medico|doctora|enfermeria|pro|laser|reception|atencion|comercial|marketing|finanzas|aux|limpieza|other),salary_gross(número, sueldo mensual),ss_pct(% seguridad social, por defecto 30),commission_pct(% comisión, por defecto 0),can_copilot(true/false: si tendrá acceso al copiloto)}. OBLIGATORIOS: name, role, salary_gross, can_copilot. El sueldo se añade a los costes de personal del Beneficio real. '
            + 'AGENDA: consultar_agenda -> {action,day(hoy|manana|YYYY-MM-DD)}. reservar_cita -> {action,patient_name,phone,treatment,date(YYYY-MM-DD),time(HH:MM)}. OBLIGATORIOS: patient_name, treatment, date, time. anular_cita -> {action,patient_name,date(YYYY-MM-DD),time(HH:MM)}. '
            + 'NEGOCIO: consultar_negocio -> {action,metric(facturacion|beneficio|top_tratamiento), period(hoy|mes)}. consultar_pendientes -> {action,kind(llamar|noshow|confirmar|resumen)}. '
            + 'REGLA CONVERSACIONAL CLAVE: para las acciones que MODIFICAN (crear_*, recargar_stock, reservar_cita), si falta algún campo OBLIGATORIO o es ambiguo, NO confirmes todavía: devuelve {"action":"<la accion>", "need":"<nombre del campo que falta>", "ask":"<pregunta breve y natural en español para pedir ese dato>", ...campos ya conocidos}. Pregunta SOLO UN campo cada vez, el más importante que falte. Cuando ya tengas TODOS los obligatorios, devuelve el JSON completo SIN "need"/"ask" para confirmar. Reutiliza los datos ya dichos en la conversación y en el borrador. '
            + 'Productos actuales: ['+prodList+']. '+(draft?('Borrador en curso: '+JSON.stringify(draft)+'. '):'')
            + 'Devuelve SIEMPRE "summary" en español (claro, sin exclamaciones excesivas) para confirmar/responder. Las consultas (consultar_*) NO necesitan confirmación ni preguntas. Si no entiendes, action="ninguna". SEGURIDAD: solo gestionas ESTA clínica; nunca menciones ni intentes acceder a datos de otras clínicas. SOLO JSON.';
          const msgs:any[] = [{role:'system',content:sys}];
          for (const h of history){ if(h && h.role && h.content) msgs.push({role: h.role==='ai'?'assistant':'user', content: String(h.content).slice(0,500)}); }
          msgs.push({role:'user',content:text});
          try { const raw = await runAI(env, msgs, true); parsed = JSON.parse(raw||'{}'); } catch(e){ parsed = { action:'ninguna', summary:'No he podido interpretar la orden.' }; }
          // SEGURIDAD POR ROL: las acciones financieras (nóminas/beneficio) solo owner/finance/superadmin
          const _coRole = ctx.role || '';
          const _coCanFinance = (_coRole==='owner'||_coRole==='finance'||_coRole==='superadmin');
          const _financeActions = ['crear_empleado'];
          if (!_coCanFinance && (_financeActions.includes(parsed.action) || (parsed.action==='consultar_negocio' && (parsed.metric==='beneficio'||parsed.metric==='facturacion')))) {
            return json({ ok:false, stage:'done', message:'No tienes permiso para ver o gestionar sueldos ni datos financieros. Pídeselo al propietario o a finanzas de la clínica.' });
          }
          // Las CONSULTAS se responden al instante (no necesitan confirmación)
          const readOnly = ['consultar','consultar_agenda','consultar_pacientes','consultar_negocio','consultar_pendientes'];
          if (readOnly.includes(parsed.action)) {
            const r = await runCopilotAction(env, tid, parsed, actorEmail, text);
            return json({ ok:r.ok, stage:'done', message:r.msg });
          }
          if (parsed.action==='ninguna') return json({ ok:true, stage:'done', message: parsed.summary||'No te he entendido. Prueba a decirlo de otra forma.' });
          // FLUJO CONVERSACIONAL: si faltan datos, preguntar (no confirmar)
          if (parsed.need || parsed.ask) {
            const draftOut = Object.assign({}, parsed); delete draftOut.ask; delete draftOut.need; delete draftOut.summary;
            return json({ ok:true, stage:'ask', question: parsed.ask || ('¿Me indicas '+(parsed.need||'ese dato')+'?'), draft: draftOut });
          }
          return json({ ok:true, stage:'confirm', plan: parsed });
        }
        const plan = b.plan || parsed;
        // SEGURIDAD POR ROL también al confirmar (el cliente no puede saltarse el check enviando confirm directo)
        const _coRole2 = ctx.role || '';
        const _coCanFinance2 = (_coRole2==='owner'||_coRole2==='finance'||_coRole2==='superadmin');
        if (!_coCanFinance2 && plan && plan.action==='crear_empleado') {
          return json({ ok:false, stage:'done', message:'No tienes permiso para dar de alta empleados ni gestionar nóminas.' });
        }
        const result = await runCopilotAction(env, tid, plan, actorEmail, text);
        return json({ ok: result.ok, stage:'done', message: result.msg });
      }

      // ============ WHATSAPP (Unipile API) ============
      // Config por tenant: cada clínica tiene su account_id de Unipile. Tabla wa_config (campo instance = account_id).
      if (p.startsWith('/api/wa-')) {
        await ensureWaSchema(env);
        const UNI = env.UNIPILE_DSN || 'https://api50.unipile.com:18013';
        const UKEY = env.UNIPILE_KEY || '';
        const uni = async (path:string, method='GET', body?:any) => {
          const r = await fetch(UNI+path, { method, headers: { 'X-API-KEY': UKEY, 'accept':'application/json', 'content-type':'application/json' }, body: body?JSON.stringify(body):undefined });
          const t = await r.text(); try { return { ok:r.ok, status:r.status, data: JSON.parse(t) }; } catch { return { ok:r.ok, status:r.status, data:t }; }
        };
        const tnt = url.searchParams.get('tenant') || (await (async()=>{ try{ const b:any=await req.clone().json(); return b.tenant_id||b.tenant; }catch{return null;} })());
        // Devuelve el account_id de Unipile guardado para este tenant
        const acctOf = async (t:string):Promise<string|null> => { try{ const r:any=await env.aura_db.prepare('SELECT instance FROM wa_config WHERE tenant_id=?').bind(t).first(); return r?.instance||null; }catch{return null;} };
        const digits9 = (s:any)=> String(s||'').replace(/@.*/,'').replace(/\D/g,'').slice(-9);
        // Convierte string de QR en data URL de imagen usando un generador externo no es posible offline; devolvemos el string y el panel lo renderiza

        // PROXY DE MEDIOS: descarga el adjunto de Unipile (foto/video/audio/doc) y lo sirve al navegador
        if (p === '/api/wa-media' && req.method === 'GET') {
          const mid = url.searchParams.get('mid')||''; let aid = url.searchParams.get('aid')||'';
          if(!mid) return new Response('missing mid', { status:400 });
          // Si no tenemos attachment_id, intentamos resolverlo consultando el mensaje en Unipile
          if(!aid || aid==='0' || aid==='null'){
            try{ const mr = await uni('/api/v1/messages/'+encodeURIComponent(mid)); const at=(mr.data?.attachments&&mr.data.attachments[0])||null; aid = at?(at.id||at.attachment_id||''):''; }catch(e){}
          }
          if(!aid) return new Response('no attachment', { status:404 });
          try{
            const ar = await fetch(UNI+'/api/v1/messages/'+encodeURIComponent(mid)+'/attachments/'+encodeURIComponent(aid), { headers:{ 'X-API-KEY': UKEY } });
            if(!ar.ok) return new Response('upstream '+ar.status, { status:502 });
            const ct = ar.headers.get('content-type') || 'application/octet-stream';
            const buf = await ar.arrayBuffer();
            return new Response(buf, { headers: { 'content-type': ct, 'cache-control':'public, max-age=86400', 'access-control-allow-origin':'*' } });
          }catch(e){ return new Response('error', { status:500 }); }
        }
        // Estado de conexión
        if (p === '/api/wa-status' && req.method === 'GET') {
          if(!tnt) return json({error:'missing tenant'},400);
          const acc = await acctOf(tnt);
          if(!acc) return json({ connected:false, exists:false });
          const st = await uni('/api/v1/accounts/'+acc);
          if(!st.ok) return json({ connected:false, exists:false });
          const sources = st.data?.sources || [];
          const ok = Array.isArray(sources) ? sources.some((s:any)=>s.status==='OK') : (st.data?.status==='OK');
          return json({ connected: !!ok, state: ok?'open':'connecting', exists:true, account_id:acc });
        }
        // Conectar: crea cuenta WhatsApp en Unipile y devuelve el string del QR
        if (p === '/api/wa-connect' && req.method === 'POST') {
          if(!tnt) return json({error:'missing tenant'},400);
          const r = await uni('/api/v1/accounts','POST',{ provider:'WHATSAPP' });
          const acc = r.data?.account_id;
          const qr = r.data?.checkpoint?.qrcode || null;
          if(acc){ await env.aura_db.prepare("INSERT INTO wa_config (tenant_id,instance,updated_at) VALUES (?,?,?) ON CONFLICT(tenant_id) DO UPDATE SET instance=excluded.instance, updated_at=excluded.updated_at").bind(tnt, acc, Date.now()).run(); }
          return json({ ok:!!qr, account_id:acc, qrstr:qr });
        }
        // Refrescar QR de una cuenta en checkpoint (si caduca)
        if (p === '/api/wa-qr' && req.method === 'GET') {
          const acc = await acctOf(tnt||''); if(!acc) return json({ qrstr:null });
          const r = await uni('/api/v1/accounts/'+acc+'/checkpoint','POST',{});
          return json({ qrstr: r.data?.checkpoint?.qrcode || null });
        }
        // Sincroniza chats desde Unipile a wa_chats_meta (nombre/teléfono reales). Se usa en carga inicial y en cron.
        const syncChats = async (t:string, acc:string) => {
          const r = await uni('/api/v1/chats?account_id='+acc+'&limit=50');
          const items = (r.data?.items)||[];
          const top = items.slice(0,25);
          const att = await Promise.all(top.map((c:any)=> uni('/api/v1/chats/'+encodeURIComponent(c.id)+'/attendees').then((a:any)=>{ const it=(a.data?.items||[]).find((x:any)=>x.is_self!==1)||(a.data?.items||[])[0]; return it||null; }).catch(()=>null) ));
          // intenta obtener foto de perfil de cada contacto (cuando WhatsApp la expone)
          const pics = await Promise.all(att.map((a:any)=>{ const pid=a?.public_identifier||a?.provider_id; if(!pid) return Promise.resolve(null); return uni('/api/v1/users/'+encodeURIComponent(pid)+'?account_id='+acc).then((u:any)=> u.data?.profile_picture_url||u.data?.picture_url||null).catch(()=>null); }));
          for (let i=0;i<top.length;i++){ const c=top[i]; const a=att[i]||{};
            // Extracción robusta del teléfono. PRIORIDAD: specifics.phone_number y public_identifier (traen el tel real),
            // NUNCA provider_id cuando es '...@lid' (ID interno de WhatsApp sin teléfono).
            const candidates = [ a.specifics?.phone_number, a.public_identifier, a.attendee_provider_id, a.provider_id, c.provider_id, c.attendee_provider_id ];
            let phoneRaw = '';
            for (const cand of candidates){ const s=String(cand||''); if(/@lid/i.test(s)) continue; const dgs=s.replace(/@.*/,'').replace(/\D/g,''); if(dgs.length>=7 && dgs.length<=15){ phoneRaw=dgs; break; } }
            const realName=a.name||(phoneRaw?('+'+phoneRaw):''); const last=c.last_message?.text||c.snippet||''; const ts=c.timestamp?Date.parse(c.timestamp):Date.now(); const pic=pics[i]||a.picture_url||a.profile_picture_url||null;
            try { await env.aura_db.prepare("INSERT INTO wa_chats_meta (tenant_id,chat_id,name,phone,picture,last_text,last_ts,unread,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,chat_id) DO UPDATE SET name=COALESCE(NULLIF(excluded.name,''),wa_chats_meta.name), phone=COALESCE(NULLIF(excluded.phone,''),wa_chats_meta.phone), picture=COALESCE(excluded.picture,wa_chats_meta.picture), last_text=excluded.last_text, last_ts=excluded.last_ts, updated_at=excluded.updated_at").bind(t,c.id,realName,phoneRaw,pic,last,ts,c.unread_count||0,Date.now()).run(); } catch(e){}
          }
        };
        // Lista de chats: SERVIDA DESDE LA BD de AURA (escalable). Sincroniza la 1ª vez si está vacía.
        if (p === '/api/wa-chats' && req.method === 'GET') {
          if(!tnt) return json({error:'missing tenant'},400);
          const acc = await acctOf(tnt); if(!acc) return json({ chats:[] });
          let metaRes:any = await env.aura_db.prepare('SELECT * FROM wa_chats_meta WHERE tenant_id=? ORDER BY last_ts DESC LIMIT 50').bind(tnt).all();
          if(!(metaRes.results||[]).length){ try{ await syncChats(tnt, acc); }catch(e){} metaRes = await env.aura_db.prepare('SELECT * FROM wa_chats_meta WHERE tenant_id=? ORDER BY last_ts DESC LIMIT 50').bind(tnt).all(); }
          const byPhone:any = {};
          try { const leadsRes:any = await env.aura_db.prepare('SELECT id,name,phone,treatment,status,temperature FROM leads WHERE tenant_id=?').bind(tnt).all(); for (const l of (leadsRes.results||[])) { const k=digits9(l.phone); if(k) byPhone[k]=l; } } catch(e){}
          const chats = (metaRes.results||[]).map((m:any)=>{ const num=digits9(m.phone||''); const lead=byPhone[num]; return { remoteJid:m.chat_id, id:m.chat_id, chat_id:m.chat_id, pushName:m.name, name:m.name, phone:m.phone, picture:m.picture||null, timestamp:m.last_ts||null, unread:m.unread||0, lastMessage:{ message:{ conversation:m.last_text||'' } }, _lead: lead?{ id:lead.id, name:lead.name, treatment:lead.treatment, status:lead.status, temperature:lead.temperature }:undefined }; });
          return json({ chats });
        }
        // Ficha del paciente por número
        if (p === '/api/wa-patient' && req.method === 'GET') {
          if(!tnt) return json({error:'missing tenant'},400);
          const num = digits9(url.searchParams.get('number')||'');
          if(!num) return json({ lead:null });
          const leadsRes:any = await env.aura_db.prepare('SELECT id,name,phone,treatment,status,temperature,created_at FROM leads WHERE tenant_id=?').bind(tnt).all();
          let lead=null; for (const l of (leadsRes.results||[])) { if(digits9(l.phone)===num){ lead=l; break; } }
          let spent=0, visits=0, nextAppt:any=null;
          if(lead){ try{ const t:any=await env.aura_db.prepare("SELECT COALESCE(SUM(amount),0) s, COUNT(*) n FROM treatments_log WHERE lead_id=? AND pay_status='paid'").bind(lead.id).first(); spent=Number(t?.s)||0; visits=Number(t?.n)||0; }catch(e){}
            try{ nextAppt = await env.aura_db.prepare("SELECT id,treatment,date_iso,status FROM appointments WHERE lead_id=? AND status IN ('booked','confirmed') AND date_iso>=datetime('now') ORDER BY date_iso ASC LIMIT 1").bind(lead.id).first(); }catch(e){} }
          return json({ lead, spent, visits, next_appt: nextAppt });
        }
        // ===== GALERÍA DE MEDIOS DEL PACIENTE (historia clínica: antes/después, etc.) =====
        // Listar medios por lead_id o por teléfono
        if (p === '/api/wa-patient-media' && req.method === 'GET') {
          if(!tnt) return json({error:'missing tenant'},400);
          const leadId = url.searchParams.get('lead_id')||''; const phone = digits9(url.searchParams.get('phone')||'');
          let rows:any;
          if(leadId){ rows = await env.aura_db.prepare('SELECT * FROM patient_media WHERE tenant_id=? AND lead_id=? ORDER BY created_at DESC').bind(tnt, leadId).all(); }
          else if(phone){ rows = await env.aura_db.prepare('SELECT * FROM patient_media WHERE tenant_id=? AND phone=? ORDER BY created_at DESC').bind(tnt, phone).all(); }
          else return json({ media: [] });
          return json({ media: (rows.results||[]) });
        }
        // Guardar en la ficha un medio que llegó por el chat (lo descargamos de Unipile y lo subimos a R2)
        if (p === '/api/wa-patient-media-save' && req.method === 'POST') {
          const b:any = await req.json(); if(!b.tenant_id) return json({error:'missing tenant'},400);
          const t2 = b.tenant_id; const mid=b.mid||''; let aid=b.aid||''; const phone=digits9(b.phone||''); let leadId=b.lead_id||'';
          // resolver lead por teléfono si no viene
          if(!leadId && phone){ try{ const lr:any=await env.aura_db.prepare('SELECT id FROM leads WHERE tenant_id=?').bind(t2).all(); for(const l of (lr.results||[])){ /* match abajo */ } }catch(e){} }
          if(!leadId && phone){ try{ const lr:any=await env.aura_db.prepare('SELECT id,phone FROM leads WHERE tenant_id=?').bind(t2).all(); for(const l of (lr.results||[])){ if(digits9(l.phone)===phone){ leadId=l.id; break; } } }catch(e){} }
          if(!mid) return json({ ok:false, error:'no_mid' });
          // resolver attachment_id si falta
          if(!aid){ try{ const mr=await uni('/api/v1/messages/'+encodeURIComponent(mid)); const at=(mr.data?.attachments&&mr.data.attachments[0])||null; aid=at?(at.id||at.attachment_id||''):''; }catch(e){} }
          if(!aid) return json({ ok:false, error:'no_attachment' });
          try{
            const ar = await fetch(UNI+'/api/v1/messages/'+encodeURIComponent(mid)+'/attachments/'+encodeURIComponent(aid), { headers:{ 'X-API-KEY': UKEY } });
            if(!ar.ok) return json({ ok:false, error:'upstream_'+ar.status });
            const ct = ar.headers.get('content-type') || 'application/octet-stream';
            const buf = await ar.arrayBuffer();
            const ext = ct.includes('png')?'png': ct.includes('jpeg')||ct.includes('jpg')?'jpg': ct.includes('mp4')?'mp4': ct.includes('webp')?'webp': ct.includes('pdf')?'pdf':'bin';
            const key = 'pm_'+t2+'_'+Math.random().toString(36).slice(2,12)+'.'+ext;
            if (env.aura_r2) { try { await env.aura_r2.put('img/'+key, buf, { httpMetadata:{ contentType: ct } }); } catch(e){ await env.AURA_IMG.put(key, buf, { metadata:{ contentType: ct } }); } }
            else { await env.AURA_IMG.put(key, buf, { metadata:{ contentType: ct } }); }
            const mediaUrl = '/img/'+key; const mt = ct.startsWith('video')?'video': ct.startsWith('image')?'img':'file';
            const id='pm_'+Math.random().toString(36).slice(2,12);
            await env.aura_db.prepare('INSERT INTO patient_media (id,tenant_id,lead_id,phone,url,mtype,caption,source,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, t2, leadId||null, phone||null, mediaUrl, mt, b.caption||'', 'whatsapp', Date.now()).run();
            return json({ ok:true, id, url: mediaUrl, lead_id: leadId||null });
          }catch(e){ return json({ ok:false, error:'save_failed' }); }
        }
        // Subir un medio manualmente (desde el ordenador) a la ficha
        if (p === '/api/wa-patient-media-upload' && req.method === 'POST') {
          const b:any = await req.json(); if(!b.tenant_id) return json({error:'missing tenant'},400);
          const t2=b.tenant_id; let leadId=b.lead_id||''; const phone=digits9(b.phone||'');
          const m=(b.data_b64||'').match(/^data:([^;]+);base64,(.+)$/); if(!m) return json({ ok:false, error:'bad_data' });
          const ct=m[1]; const bin=atob(m[2]); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
          const ext = ct.includes('png')?'png': ct.includes('jpeg')||ct.includes('jpg')?'jpg': ct.includes('mp4')?'mp4': ct.includes('webp')?'webp': ct.includes('pdf')?'pdf':'bin';
          const key='pm_'+t2+'_'+Math.random().toString(36).slice(2,12)+'.'+ext;
          if (env.aura_r2) { try { await env.aura_r2.put('img/'+key, bytes.buffer, { httpMetadata:{ contentType: ct } }); } catch(e){ await env.AURA_IMG.put(key, bytes.buffer, { metadata:{ contentType: ct } }); } }
          else { await env.AURA_IMG.put(key, bytes.buffer, { metadata:{ contentType: ct } }); }
          const mediaUrl='/img/'+key; const mt = ct.startsWith('video')?'video': ct.startsWith('image')?'img':'file';
          const id='pm_'+Math.random().toString(36).slice(2,12);
          await env.aura_db.prepare('INSERT INTO patient_media (id,tenant_id,lead_id,phone,url,mtype,caption,source,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, t2, leadId||null, phone||null, mediaUrl, mt, b.caption||'', 'upload', Date.now()).run();
          return json({ ok:true, id, url: mediaUrl });
        }
        if (p === '/api/wa-patient-media-delete' && req.method === 'POST') {
          const b:any = await req.json(); if(!b.tenant_id||!b.id) return json({error:'missing'},400);
          await env.aura_db.prepare('DELETE FROM patient_media WHERE id=? AND tenant_id=?').bind(b.id, b.tenant_id).run();
          return json({ ok:true });
        }
        // Mensajes de un chat: SERVIDOS DESDE LA BD. Sincroniza desde Unipile si no hay (1ª vez).
        if (p === '/api/wa-messages' && req.method === 'GET') {
          if(!tnt) return json({error:'missing tenant'},400);
          const chatId = url.searchParams.get('number')||'';
          let dbRes:any = await env.aura_db.prepare('SELECT * FROM wa_messages WHERE tenant_id=? AND chat_id=? ORDER BY ts ASC LIMIT 100').bind(tnt, chatId).all();
          // RENDIMIENTO: servimos SIEMPRE desde la BD al instante. Solo llamamos a Unipile (lento) si el chat
          // está vacío (1ª vez) o si se pide refresco explícito con ?sync=1. El cron resincroniza cada 10 min en 2º plano.
          const wantSync = url.searchParams.get('sync')==='1';
          if(!(dbRes.results||[]).length || wantSync){
            try {
              const r = await uni('/api/v1/chats/'+encodeURIComponent(chatId)+'/messages?limit=60');
              const items = (r.data?.items)||[];
              for (const m of items){ const att=(m.attachments&&m.attachments[0])||null;
                const mtype=att?String(att.type||att.mimetype||att.mime_type||'file').toLowerCase():'text';
                const directUrl=att?(att.url||att.download_url||att.public_url||att.file_url||(att.data&&att.data.url)||null):null;
                const attId=att?(att.id||att.attachment_id||null):null;
                const mname=att?(att.file_name||att.name||att.filename||null):null;
                const mid=m.id||(chatId+'_'+(m.timestamp?Date.parse(m.timestamp):Date.now()));
                const murl = directUrl || (att ? ('/api/wa-media?mid='+encodeURIComponent(mid)+'&aid='+encodeURIComponent(attId||'0')+'&t='+encodeURIComponent(tnt)) : null);
                const ts=m.timestamp?Date.parse(m.timestamp):Date.now(); const fromMe=(m.is_sender===1||m.is_sender===true)?1:0;
                // INSERT OR REPLACE: inserta o reemplaza por message_id (PK), rellenando medios
                try{ await env.aura_db.prepare("INSERT OR REPLACE INTO wa_messages (message_id,tenant_id,chat_id,from_me,text,mtype,murl,mname,att_id,ts,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(mid, tnt, chatId, fromMe, m.text||'', mtype, murl, mname, attId, ts, Date.now()).run(); }catch(e){}
              }
              // Rellena el TELÉFONO del chat desde el remitente de un mensaje entrante (dato 100% fiable de esta conversación).
              // Busca un identificador con formato 'numero@s.whatsapp.net' (ignora '@lid', que es ID interno sin teléfono).
              try{
                let foundPhone='';
                for(const m of items){ if(m.is_sender===1||m.is_sender===true) continue; const cands=[m.sender_public_identifier, m.sender?.attendee_provider_id, m.provider_id]; for(const cc of cands){ const s=String(cc||''); if(/@lid|@g\.us/i.test(s)) continue; const dgs=s.replace(/@.*/,'').replace(/\D/g,''); if(dgs.length>=7 && dgs.length<=15){ foundPhone=dgs; break; } } if(foundPhone) break; }
                if(foundPhone){ await env.aura_db.prepare("UPDATE wa_chats_meta SET phone=COALESCE(NULLIF(phone,''),?), name=COALESCE(NULLIF(name,''),?) WHERE tenant_id=? AND chat_id=?").bind(foundPhone, '+'+foundPhone, tnt, chatId).run(); }
              }catch(e){}
            } catch(e){}
            dbRes = await env.aura_db.prepare('SELECT * FROM wa_messages WHERE tenant_id=? AND chat_id=? ORDER BY ts ASC LIMIT 100').bind(tnt, chatId).all();
          }
          // marca leído
          try { await env.aura_db.prepare('UPDATE wa_chats_meta SET unread=0 WHERE tenant_id=? AND chat_id=?').bind(tnt, chatId).run(); } catch(e){}
          const messages = (dbRes.results||[]).map((m:any)=>({ id:m.message_id, fromMe: m.from_me===1, text:m.text||'', timestamp:m.ts||null, mtype:m.mtype||'text', murl:m.murl||null, mname:m.mname||null, key:{ id:m.message_id, fromMe: m.from_me===1 }, message:{ conversation:m.text||'' } }));
          return json({ messages });
        }
        // Enviar mensaje (number = chat_id)
        if (p === '/api/wa-send' && req.method === 'POST') {
          const b:any = await req.json(); if(!b.tenant_id) return json({error:'missing tenant'},400);
          const chatId = b.jid || b.number;
          const r = await uni('/api/v1/chats/'+encodeURIComponent(chatId)+'/messages','POST',{ text:b.text });
          // guarda saliente en BD
          try { const mid=r.data?.message_id||r.data?.id||(chatId+'_out_'+Date.now()); const now=Date.now(); await env.aura_db.prepare("INSERT OR IGNORE INTO wa_messages (message_id,tenant_id,chat_id,from_me,text,mtype,ts,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(mid, b.tenant_id, chatId, 1, b.text||'', 'text', now, now).run(); await env.aura_db.prepare("UPDATE wa_chats_meta SET last_text=?, last_ts=?, unread=0 WHERE tenant_id=? AND chat_id=?").bind(b.text||'', now, b.tenant_id, chatId).run(); } catch(e){}
          return json({ ok:r.ok, data:r.data });
        }
        // Enviar adjunto (imagen/audio/documento) - recibe base64 y lo manda como multipart a Unipile
        if (p === '/api/wa-attach' && req.method === 'POST') {
          const b:any = await req.json(); if(!b.tenant_id) return json({error:'missing tenant'},400);
          const chatId = b.jid || b.number; if(!chatId) return json({ok:false,error:'no chat'});
          try {
            const bin = Uint8Array.from(atob(String(b.data_b64||'').split(',').pop()||''), c=>c.charCodeAt(0));
            const fd = new FormData();
            if(b.text) fd.append('text', b.text);
            fd.append('attachments', new Blob([bin], { type: b.mime||'application/octet-stream' }), b.filename||'archivo');
            const r = await fetch(UNI+'/api/v1/chats/'+encodeURIComponent(chatId)+'/messages', { method:'POST', headers:{ 'X-API-KEY': UKEY, 'accept':'application/json' }, body: fd });
            const t = await r.text(); const data=(()=>{try{return JSON.parse(t);}catch{return t;}})();
            try { const mid=(data&&(data.message_id||data.id))||(chatId+'_out_'+Date.now()); const now=Date.now(); const isImg=/^image\//.test(b.mime||''); await env.aura_db.prepare("INSERT OR IGNORE INTO wa_messages (message_id,tenant_id,chat_id,from_me,text,mtype,mname,ts,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(mid, b.tenant_id, chatId, 1, b.text||'', isImg?'img':'file', b.filename||'archivo', now, now).run(); await env.aura_db.prepare("UPDATE wa_chats_meta SET last_text=?, last_ts=?, unread=0 WHERE tenant_id=? AND chat_id=?").bind('[adjunto]', now, b.tenant_id, chatId).run(); } catch(e){}
            return json({ ok:r.ok, status:r.status, data });
          } catch(e:any){ return json({ ok:false, error:String(e&&e.message||e) }); }
        }
        // Reaccionar a un mensaje
        if (p === '/api/wa-react' && req.method === 'POST') {
          const b:any = await req.json(); const chatId=b.jid||b.number; if(!chatId||!b.message_id) return json({ok:false});
          const r = await uni('/api/v1/chats/'+encodeURIComponent(chatId)+'/messages','POST',{ reaction:{ value:b.emoji||'👍', message_id:b.message_id } });
          return json({ ok:r.ok, data:r.data });
        }
        // Iniciar conversación nueva con un número (start new chat)
        if (p === '/api/wa-newchat' && req.method === 'POST') {
          const b:any = await req.json(); if(!b.tenant_id) return json({error:'missing tenant'},400);
          const acc = await acctOf(b.tenant_id); if(!acc) return json({ok:false,error:'sin cuenta'});
          const phone = String(b.number||'').replace(/\D/g,'');
          if(!phone) return json({ok:false,error:'numero'});
          const fd = new FormData(); fd.append('account_id', acc); fd.append('text', b.text||'Hola'); fd.append('attendees_ids', phone+'@s.whatsapp.net');
          try { const r = await fetch(UNI+'/api/v1/chats', { method:'POST', headers:{ 'X-API-KEY': UKEY, 'accept':'application/json' }, body: fd }); const t=await r.text(); return json({ ok:r.ok, status:r.status, data:(()=>{try{return JSON.parse(t);}catch{return t;}})() }); } catch(e:any){ return json({ok:false,error:String(e&&e.message||e)}); }
        }
        // Crear paciente/lead desde un chat de WhatsApp (cuando el contacto no existe)
        if (p === '/api/wa-add-lead' && req.method === 'POST') {
          const b:any = await req.json(); if(!b.tenant_id) return json({error:'missing tenant'},400);
          const phone = String(b.phone||'').replace(/[^0-9+]/g,''); if(!phone) return json({ok:false,error:'sin telefono'});
          const num9 = phone.replace(/\D/g,'').slice(-9);
          // evita duplicado: si ya existe un lead con ese teléfono, lo devuelve
          try { const ex:any = await env.aura_db.prepare('SELECT id,name,phone FROM leads WHERE tenant_id=?').bind(b.tenant_id).all(); for(const l of (ex.results||[])){ if(String(l.phone||'').replace(/\D/g,'').slice(-9)===num9){ return json({ ok:true, existed:true, lead_id:l.id }); } } } catch(e){}
          const nid = 'wa_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
          try { await env.aura_db.prepare("INSERT INTO leads (id,tenant_id,name,phone,treatment,temperature,status,source,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(nid, b.tenant_id, (b.name||'Contacto WhatsApp'), phone, (b.treatment||''), 'warm', 'new', 'whatsapp', 'Creado desde WhatsApp', new Date().toISOString()).run(); } catch(e:any){ return json({ ok:false, error:String(e&&e.message||e) }); }
          return json({ ok:true, existed:false, lead_id:nid });
        }
        // Confirmar una cita desde el chat
        if (p === '/api/wa-confirm-appt' && req.method === 'POST') {
          const b:any = await req.json(); if(!b.tenant_id||!b.appointment_id) return json({ok:false});
          try { await env.aura_db.prepare("UPDATE appointments SET status='confirmed' WHERE id=? AND tenant_id=?").bind(b.appointment_id, b.tenant_id).run(); } catch(e){ return json({ok:false}); }
          return json({ ok:true });
        }
        // Marcar chat como leído
        if (p === '/api/wa-read' && req.method === 'POST') {
          const b:any = await req.json(); const chatId=b.jid||b.number; if(!chatId) return json({ok:false});
          await uni('/api/v1/chats/'+encodeURIComponent(chatId),'PATCH',{ action:'setReadStatus', value:true });
          return json({ ok:true });
        }
        // Desconectar
        if (p === '/api/wa-logout' && req.method === 'POST') {
          const b:any = await req.json(); const acc = await acctOf(b.tenant_id||''); 
          if(acc){ await uni('/api/v1/accounts/'+acc,'DELETE'); await env.aura_db.prepare('DELETE FROM wa_config WHERE tenant_id=?').bind(b.tenant_id).run(); }
          return json({ ok:true });
        }
        // Webhook entrante de Unipile (mensajes nuevos) en tiempo real -> persiste en AURA
        if (p === '/api/wa-webhook' && req.method === 'POST') {
          try {
            const ev:any = await req.json();
            if (ev && (ev.event==='message_received' || ev.message || ev.message_id)) {
              const accId = ev.account_id;
              let owner:any = null;
              try { owner = await env.aura_db.prepare('SELECT tenant_id FROM wa_config WHERE instance=?').bind(accId).first(); } catch(e){}
              const tenantId = owner?.tenant_id;
              if (tenantId) {
                const chatId = ev.chat_id || '';
                const msgId = ev.message_id || (chatId+'_'+(ev.timestamp||Date.now()));
                const fromMe = !!(ev.account_info?.user_id && ev.sender?.attendee_provider_id && String(ev.account_info.user_id)===String(ev.sender.attendee_provider_id));
                const text = String(ev.message||'');
                const att = (ev.attachments&&ev.attachments[0])||null;
                const mtype = att ? String(att.type||'file').toLowerCase() : 'text';
                const murl = att ? (att.url||null) : null;
                const mname = att ? (att.file_name||att.name||null) : null;
                const ts = ev.timestamp ? Date.parse(ev.timestamp) : Date.now();
                const senderPhone = (ev.sender?.attendee_provider_id||ev.provider_id||'').replace(/@.*/,'');
                // dedupe por message_id (INSERT OR IGNORE)
                try { await env.aura_db.prepare("INSERT OR IGNORE INTO wa_messages (message_id,tenant_id,chat_id,from_me,text,mtype,murl,mname,ts,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(msgId, tenantId, chatId, fromMe?1:0, text, mtype, murl, mname, ts, Date.now()).run(); } catch(e){}
                // actualiza metadatos del chat (nombre, último texto, no leídos)
                try {
                  const who = ev.sender?.attendee_name || (senderPhone?('+'+senderPhone):'');
                  const incUnread = fromMe ? 0 : 1;
                  await env.aura_db.prepare("INSERT INTO wa_chats_meta (tenant_id,chat_id,name,phone,last_text,last_ts,unread,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,chat_id) DO UPDATE SET last_text=excluded.last_text, last_ts=excluded.last_ts, unread=wa_chats_meta.unread+"+incUnread+", name=COALESCE(NULLIF(wa_chats_meta.name,''),excluded.name), phone=COALESCE(NULLIF(wa_chats_meta.phone,''),excluded.phone), updated_at=excluded.updated_at").bind(tenantId, chatId, who, senderPhone, text||(att?'[adjunto]':''), ts, incUnread, Date.now()).run();
                } catch(e){}
              }
            }
          } catch(e){}
          return json({ ok:true });
        }
        if (p === '/api/wa-webhook') { return json({ ok:true }); }
        return json({ error:'wa endpoint not found' }, 404);
      }

      // ===== CONSENTIMIENTOS: plantillas (panel) =====
      if (p === '/api/consent-templates' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant'); if(!tenant) return json({error:'missing tenant'},400);
        const r:any = await env.aura_db.prepare('SELECT * FROM consent_templates WHERE tenant_id=? ORDER BY created_at DESC').bind(tenant).all();
        let list = r.results||[];
        if (!list.length) list = CONSENT_DEFAULTS.map((t:any,i:number)=>({ id:'def_'+i, tenant_id:tenant, title:t.title, body:t.body, treatment_key:t.key, _default:true }));
        return json({ templates: list });
      }
      if (p === '/api/consent-templates' && req.method === 'POST') {
        const b:any = await req.json(); if(!b.tenant_id) return json({error:'missing tenant'},400);
        if (b.delete) { await env.aura_db.prepare('DELETE FROM consent_templates WHERE id=? AND tenant_id=?').bind(b.delete,b.tenant_id).run(); return json({ok:true}); }
        if (b.id && !String(b.id).startsWith('def_')) {
          await env.aura_db.prepare('UPDATE consent_templates SET title=?, body=?, treatment_key=? WHERE id=? AND tenant_id=?').bind(b.title||'Consentimiento', b.body||'', b.treatment_key||'', b.id, b.tenant_id).run();
          return json({ ok:true, id:b.id });
        }
        const id='ct_'+uid();
        await env.aura_db.prepare('INSERT INTO consent_templates (id,tenant_id,title,body,treatment_key,created_at) VALUES (?,?,?,?,?,?)').bind(id,b.tenant_id,b.title||'Consentimiento',b.body||'',b.treatment_key||'',Date.now()).run();
        return json({ ok:true, id });
      }
      // Crear+enviar consentimiento a un paciente (panel) -> genera doc pendiente y manda SMS con link
      if (p === '/api/consent-send' && req.method === 'POST') {
        const b:any = await req.json(); if(!b.tenant_id||!b.lead_id) return json({error:'missing'},400);
        const lead:any = await env.aura_db.prepare('SELECT name,phone FROM leads WHERE id=? AND tenant_id=?').bind(b.lead_id,b.tenant_id).first();
        if(!lead) return json({error:'lead not found'},404);
        const id='cs_'+uid();
        await env.aura_db.prepare('INSERT INTO consents_signed (id,tenant_id,lead_id,template_id,title,body,status,created_at) VALUES (?,?,?,?,?,?,?,?)')
          .bind(id,b.tenant_id,b.lead_id,b.template_id||null,b.title||'Consentimiento',b.body||'','pending',Date.now()).run();
        // link de firma con token FUERTE atado a ESTE consentimiento (no reutilizable en otros documentos)
        const tok = await signConsent(env, id, b.lead_id);
        const link = 'https://aura-mvp.pages.dev/firmar?consent='+id+'&lead='+encodeURIComponent(b.lead_id)+'&k='+tok;
        let smsSent=false;
        if (lead.phone && !b.no_sms) {
          const tn:any = await env.aura_db.prepare('SELECT id,name,whatsapp,address FROM tenants WHERE id=?').bind(b.tenant_id).first();
          const msg = (tn?.name||'AURA')+': '+(lead.name||'')+', firma tu consentimiento para el tratamiento aqui (1 min, desde tu movil): '+link;
          const r = await sendSMS(env, lead.phone, msg, (tn?.name||'AURA'), b.tenant_id); smsSent = r.ok;
        }
        return json({ ok:true, id, sms_sent: smsSent, sign_link: link });
      }
      // Ver un consentimiento para firmar (paciente, valida token del lead)
      if (p === '/api/consent-get' && req.method === 'GET') {
        const id=url.searchParams.get('id'); const lead=url.searchParams.get('lead'); const k=url.searchParams.get('k')||'';
        if(!id||!lead) return json({error:'invalid'},403);
        const okTok = (await verifyConsent(env,id,lead,k)) || (await verifyLead(env,lead,k)); // compat con links antiguos
        if(!okTok) return json({error:'invalid'},403);
        const c:any = await env.aura_db.prepare('SELECT cs.*, l.name AS lead_name FROM consents_signed cs LEFT JOIN leads l ON l.id=cs.lead_id WHERE cs.id=? AND cs.lead_id=?').bind(id,lead).first();
        if(!c) return json({error:'not found'},404);
        const tn:any = await env.aura_db.prepare('SELECT name FROM tenants WHERE id=?').bind(c.tenant_id).first();
        return json({ consent:c, clinic: tn?.name||'' });
      }
      // Firmar (paciente): recibe firma en dataURL, la guarda en R2 y sella fecha/hora
      if (p === '/api/consent-sign' && req.method === 'POST') {
        const b:any = await req.json();
        if(!b.id||!b.lead) return json({error:'invalid'},403);
        const okSign = (await verifyConsent(env,b.id,b.lead,b.k||'')) || (await verifyLead(env,b.lead,b.k||''));
        if(!okSign) return json({error:'invalid'},403);
        const c:any = await env.aura_db.prepare('SELECT * FROM consents_signed WHERE id=? AND lead_id=?').bind(b.id,b.lead).first();
        if(!c) return json({error:'not found'},404);
        if(c.status==='signed') return json({ ok:true, already:true }); // nunca se re-firma
        // validar payload de firma (tamano razonable, formato png base64)
        if(typeof b.signature!=='string' || b.signature.length>400000) return json({error:'bad_signature'},400);
        // guardar imagen de firma (dataURL base64) en R2
        let sigKey='';
        try{ const m=(b.signature||'').match(/^data:image\/png;base64,(.+)$/); if(m){ const bin=atob(m[1]); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i); sigKey='sig_'+b.id+'_'+b64url(crypto.getRandomValues(new Uint8Array(12)).buffer)+'.png'; if(env.aura_r2){ try{ await env.aura_r2.put('img/'+sigKey, bytes.buffer, { httpMetadata:{contentType:'image/png'} }); }catch(e){ await env.AURA_IMG.put(sigKey, bytes.buffer, { metadata:{contentType:'image/png'} }); } } else { await env.AURA_IMG.put(sigKey, bytes.buffer, { metadata:{contentType:'image/png'} }); } } }catch(e){}
        const ip = req.headers.get('cf-connecting-ip') || '';
        await env.aura_db.prepare("UPDATE consents_signed SET status='signed', signature_key=?, signer_name=?, signer_dni=?, signed_at=?, signed_ip=? WHERE id=?")
          .bind(sigKey||null, b.signer_name||c.signer_name||'', b.signer_dni||'', new Date().toISOString(), ip, b.id).run();
        return json({ ok:true });
      }
      // Listar consentimientos de un paciente (panel)
      if (p === '/api/consents' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant'); const lead=url.searchParams.get('lead');
        if(!tenant) return json({error:'missing tenant'},400);
        let q='SELECT cs.*, l.name AS lead_name FROM consents_signed cs LEFT JOIN leads l ON l.id=cs.lead_id WHERE cs.tenant_id=?'; const args:any[]=[tenant];
        if(lead){ q+=' AND cs.lead_id=?'; args.push(lead); }
        q+=' ORDER BY cs.created_at DESC';
        const r:any = await env.aura_db.prepare(q).bind(...args).all();
        return json({ consents: r.results||[] });
      }

      // ===== GASTOS DEL NEGOCIO =====
      if (p === '/api/business-costs' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant'); if(!tenant) return json({error:'missing tenant'},400);
        await ensureBusinessCosts(env);
        const r:any = await env.aura_db.prepare('SELECT * FROM business_costs WHERE tenant_id=?').bind(tenant).first();
        let fixed:any[] = []; try{ fixed = r?.fixed_json? JSON.parse(r.fixed_json): []; }catch(e){}
        return json({ fixed, marketing_monthly: r?.marketing_monthly||0, commission_pct: r?.commission_pct||0, iva_pct: r?.iva_pct??21, price_includes_iva: r?.price_includes_iva??1, prorate_mode: r?.prorate_mode||'open_days' });
      }
      if (p === '/api/business-costs' && req.method === 'POST') {
        const b:any = await req.json(); await ensureBusinessCosts(env);
        if(!b.tenant_id) return json({error:'missing tenant'},400);
        await env.aura_db.prepare(
          `INSERT INTO business_costs (tenant_id,fixed_json,marketing_monthly,commission_pct,iva_pct,price_includes_iva,prorate_mode,updated_at) VALUES (?,?,?,?,?,?,?,?)
           ON CONFLICT(tenant_id) DO UPDATE SET fixed_json=excluded.fixed_json,marketing_monthly=excluded.marketing_monthly,commission_pct=excluded.commission_pct,iva_pct=excluded.iva_pct,price_includes_iva=excluded.price_includes_iva,prorate_mode=excluded.prorate_mode,updated_at=excluded.updated_at`
        ).bind(b.tenant_id, JSON.stringify(b.fixed||[]), Number(b.marketing_monthly)||0, Number(b.commission_pct)||0, b.iva_pct!=null?Number(b.iva_pct):21, b.price_includes_iva?1:0, b.prorate_mode||'open_days', Date.now()).run();
        return json({ ok:true });
      }

      // ===== BENEFICIO REAL (día/semana/mes) =====
      if (p === '/api/profit' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant'); if(!tenant) return json({error:'missing tenant'},400);
        const period = url.searchParams.get('period')||'day';
        const ref = url.searchParams.get('day') || new Date().toISOString().slice(0,10);
        await ensureBusinessCosts(env);
        const bc:any = await env.aura_db.prepare('SELECT * FROM business_costs WHERE tenant_id=?').bind(tenant).first() || {};
        let fixedArr:any[]=[]; try{ fixedArr = bc.fixed_json? JSON.parse(bc.fixed_json): []; }catch(e){}
        const fixedMonthly = fixedArr.reduce((s:number,x:any)=>s+(Number(x.amount)||0),0);
        // coste de personal mensual: salarios brutos + Seguridad Social de empleados activos
        const empRows:any = await env.aura_db.prepare('SELECT salary_gross, ss_pct FROM professionals WHERE tenant_id=? AND active=1').bind(tenant).all();
        const personnelMonthly = (empRows.results||[]).reduce((s:number,e:any)=>{ const sal=Number(e.salary_gross)||0; const ss=e.ss_pct!=null?Number(e.ss_pct):30; return s + sal*(1+ss/100); }, 0);
        const marketingMonthly = Number(bc.marketing_monthly)||0;
        const commissionPct = Number(bc.commission_pct)||0;
        const ivaPct = bc.iva_pct!=null? Number(bc.iva_pct): 21;
        const priceInclIva = bc.price_includes_iva!=null? bc.price_includes_iva: 1;
        const prorateMode = bc.prorate_mode||'open_days';
        const refD = new Date(ref+'T12:00:00Z');
        let start = ref, end = ref;
        if (period==='week'){ const wd=(refD.getUTCDay()+6)%7; const s=new Date(refD); s.setUTCDate(refD.getUTCDate()-wd); const e=new Date(s); e.setUTCDate(s.getUTCDate()+6); start=s.toISOString().slice(0,10); end=e.toISOString().slice(0,10); }
        else if (period==='month'){ start=ref.slice(0,8)+'01'; const e=new Date(Date.UTC(refD.getUTCFullYear(), refD.getUTCMonth()+1, 0)); end=e.toISOString().slice(0,10); }
        const rows:any = await env.aura_db.prepare("SELECT amount,cost,date_iso FROM treatments_log WHERE tenant_id=? AND pay_status='paid' AND substr(date_iso,1,10) BETWEEN ? AND ?").bind(tenant, start, end).all();
        const list = rows.results||[];
        const cobrado = list.reduce((s:number,x:any)=>s+(x.amount||0),0);
        const prodCost = list.reduce((s:number,x:any)=>s+(x.cost||0),0);
        const base = priceInclIva ? cobrado/(1+ivaPct/100) : cobrado;
        const iva = priceInclIva ? cobrado - base : cobrado*(ivaPct/100);
        const comisiones = base * (commissionPct/100);
        const schedule = await getScheduleByDay(env, tenant); const vacs = await getVacations(env, tenant);
        function daysBetween(a:string,b:string){ const arr=[]; let c=a; for(let i=0;i<400;i++){ arr.push(c); if(c===b)break; const d=new Date(c+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+1); c=d.toISOString().slice(0,10);} return arr; }
        const monthStart = ref.slice(0,8)+'01'; const monthEndD=new Date(Date.UTC(refD.getUTCFullYear(), refD.getUTCMonth()+1, 0)); const monthEnd=monthEndD.toISOString().slice(0,10);
        const monthDays = daysBetween(monthStart, monthEnd);
        const openDaysMonth = monthDays.filter(d=>!isDateClosed(d, schedule, vacs).closed).length || monthDays.length;
        const periodDays = daysBetween(start, end);
        const periodOpenDays = periodDays.filter(d=>!isDateClosed(d, schedule, vacs).closed).length;
        const fixedDaily = prorateMode==='linear' ? (fixedMonthly/monthDays.length) : (fixedMonthly/openDaysMonth);
        const personnelDaily = prorateMode==='linear' ? (personnelMonthly/monthDays.length) : (personnelMonthly/openDaysMonth);
        const marketingDaily = prorateMode==='linear' ? (marketingMonthly/monthDays.length) : (marketingMonthly/openDaysMonth);
        const daysForCost = prorateMode==='linear' ? periodDays.length : periodOpenDays;
        const fixedShare = fixedDaily * daysForCost;
        const personnelShare = personnelDaily * daysForCost;
        const marketingShare = marketingDaily * daysForCost;
        const beneficio = base - prodCost - comisiones - personnelShare - fixedShare - marketingShare;
        return json({ period, start, end,
          cobrado: Math.round(cobrado*100)/100,
          iva: Math.round(iva*100)/100,
          base: Math.round(base*100)/100,
          coste_producto: Math.round(prodCost*100)/100,
          comisiones: Math.round(comisiones*100)/100,
          personal: Math.round(personnelShare*100)/100,
          gastos_fijos: Math.round(fixedShare*100)/100,
          marketing: Math.round(marketingShare*100)/100,
          beneficio: Math.round(beneficio*100)/100,
          iva_apartar: Math.round(iva*100)/100,
          detalle: { iva_pct: ivaPct, commission_pct: commissionPct, prorate_mode: prorateMode, open_days_month: openDaysMonth, period_open_days: periodOpenDays, personal_mensual: Math.round(personnelMonthly*100)/100 }
        });
      }

      // CITA por link mágico: ver y confirmar/cambiar (valida token)
      if (p === '/api/appt-status' && req.method === 'GET') {
        const lead = url.searchParams.get('lead'); const tok = url.searchParams.get('k')||'';
        if (!lead || !(await verifyLead(env, lead, tok))) return json({ error:'invalid' }, 403);
        const a: any = await env.aura_db.prepare("SELECT id,treatment,date_iso,confirmed,status FROM appointments WHERE lead_id=? ORDER BY date_iso DESC LIMIT 1").bind(lead).first();
        const t: any = await env.aura_db.prepare('SELECT name,address FROM tenants WHERE id=(SELECT tenant_id FROM leads WHERE id=?)').bind(lead).first();
        return json({ ok:true, appointment:a||null, clinic:t||null });
      }
      if (p === '/api/appt-confirm' && req.method === 'POST') {
        const b: any = await req.json();
        if (!b.lead || !(await verifyLead(env, b.lead, b.k||''))) return json({ error:'invalid' }, 403);
        if (b.action === 'confirm') {
          await env.aura_db.prepare("UPDATE appointments SET confirmed=1 WHERE lead_id=? AND status='booked'").bind(b.lead).run();
        } else if (b.action === 'change' || b.action === 'cancel') {
          // El paciente quiere cambiar/cancelar: tratarlo como recuperación inmediata (lead calentito que quería venir)
          await env.aura_db.prepare("UPDATE appointments SET confirmed=-1"+(b.action==='cancel'?", status='cancelled'":'')+" WHERE lead_id=? AND status='booked'").bind(b.lead).run();
          await env.aura_db.prepare("UPDATE leads SET recover_state='cancel', call_priority='urgent' WHERE id=?").bind(b.lead).run();
        }
        return json({ ok:true });
      }
      // CONVERSACIÓN por link mágico (valida token) — reanudar sesión del lead
      if (p === '/api/resume' && req.method === 'GET') {
        const lead = url.searchParams.get('lead'); const tok = url.searchParams.get('k') || '';
        if (!lead) return json({ error: 'missing lead' }, 400);
        const ok = await verifyLead(env, lead, tok);
        if (!ok) return json({ error: 'invalid_token' }, 403);
        const lr: any = await env.aura_db.prepare('SELECT id,name,phone,treatment,motivo,plazo,objecion,temperature,status FROM leads WHERE id=?').bind(lead).first();
        const mr = await env.aura_db.prepare('SELECT role,content,channel,created_at FROM messages WHERE lead_id=? ORDER BY created_at ASC').bind(lead).all();
        return json({ ok: true, lead: lr || null, messages: mr.results || [] });
      }
      // Generar link mágico de un lead
      if (p === '/api/magic-link' && req.method === 'GET') {
        const lead = url.searchParams.get('lead'); const tenant = url.searchParams.get('tenant');
        if (!lead || !tenant) return json({ error: 'missing' }, 400);
        return json({ ok: true, url: await magicLink(env, tenant, lead) });
      }

      // Citas
      if (p === '/api/appointments' && req.method === 'POST') {
        const b = await req.json();
        const id = appId();
        await env.aura_db
          .prepare(
            `INSERT INTO appointments (id,tenant_id,lead_id,treatment,date_iso,duration_min,status) VALUES (?,?,?,?,?,?,?)`
          )
          .bind(id, b.tenant_id, b.lead_id || null, b.treatment || null, b.date_iso, b.duration_min || 30, 'booked')
          .run();
        if (b.lead_id) {
          await env.aura_db
            .prepare(`UPDATE leads SET status='booked',temperature='hot' WHERE id=?`)
            .bind(b.lead_id)
            .run();
        }
        // SMS al lead con confirmación + link de WhatsApp (lo inicia el lead, sin baneo)
        try {
          const lead: any = await env.aura_db.prepare('SELECT * FROM leads WHERE id=?').bind(b.lead_id).first();
          const tn: any = await env.aura_db.prepare('SELECT name,whatsapp FROM tenants WHERE id=?').bind(b.tenant_id).first();
          if (lead && lead.phone) {
            const clinica = (tn?.name || 'la clínica');
            const wa = (tn?.whatsapp || '').replace(/[^0-9]/g,'');
            const ref = lead.ref || '';
            const mlink = await magicLink(env, b.tenant_id, b.lead_id);
            let msg = `${clinica}: ${lead.name||''}, tu cita esta confirmada para ${b.date_iso? new Date(b.date_iso).toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : 'tu hora reservada'}. Ver detalles: ${mlink}`;
            if (wa) {
              const txt = encodeURIComponent(`Hola, soy ${lead.name||''}. He reservado mi cita${ref?(' (ref '+ref+')'):''}`);
              msg += ` o escribenos: https://wa.me/${wa}?text=${txt}`;
            }
            const sms = await sendSMS(env, lead.phone, msg, (clinica||'AURA'), b.tenant_id);
            await env.aura_db.prepare(`INSERT INTO messages (id,tenant_id,lead_id,role,channel,content,created_at) VALUES (?,?,?,?,?,?,?)`).bind(uid(), b.tenant_id, b.lead_id, 'system', 'sms', 'SMS de confirmación '+(sms.ok?'enviado':'no enviado'), Date.now()).run().catch(()=>{});
          }
        } catch(e) {}
        return json({ ok: true, appointment_id: id });
      }

      if (p === '/api/appointments' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        if (!tenant) return json({ error: 'missing tenant' }, 400);
        const prof = url.searchParams.get('professional') || '';
        let r;
        if (prof) {
          r = await env.aura_db
            .prepare(`SELECT a.*, l.name AS lead_name, l.phone AS lead_phone FROM appointments a LEFT JOIN leads l ON l.id=a.lead_id WHERE a.tenant_id=? AND a.professional_id=? ORDER BY a.date_iso DESC LIMIT 200`)
            .bind(tenant, prof).all();
        } else {
          r = await env.aura_db
            .prepare(`SELECT a.*, l.name AS lead_name, l.phone AS lead_phone FROM appointments a LEFT JOIN leads l ON l.id=a.lead_id WHERE a.tenant_id=? ORDER BY a.date_iso DESC LIMIT 200`)
            .bind(tenant).all();
        }
        return json({ appointments: r.results });
      }

      // RECEPCIÓN: cerrar visita (vino + tratamiento + importe) → cliente + pago + recall
      if (p === '/api/close-visit' && req.method === 'POST') {
        const b: any = await req.json();
        const apptId = b.appointment_id; const leadId = b.lead_id; const tenantId = b.tenant_id;
        if (!leadId) return json({ error:'missing lead' }, 400);
        if (b.attended === false) {
          // No vino → no-show, entra a flow de recuperación
          if (apptId) await env.aura_db.prepare("UPDATE appointments SET status='noshow' WHERE id=?").bind(apptId).run();
          await env.aura_db.prepare("UPDATE leads SET status='noshow' WHERE id=?").bind(leadId).run();
          return json({ ok:true, result:'noshow' });
        }
        // IDEMPOTENCIA anti doble cobro: si la cita YA está atendida, no reprocesar (devolver ok sin volver a cobrar/descontar stock)
        if (apptId) {
          try {
            const apPrev:any = await env.aura_db.prepare('SELECT status FROM appointments WHERE id=?').bind(apptId).first();
            if (apPrev && apPrev.status==='attended') {
              return json({ ok:true, result:'already_closed', duplicate:true });
            }
          } catch(e){}
        }
        // Vino: marcar cita atendida + lead cliente
        // ATRIBUCIÓN: ¿sin AURA esta venta no habría pasado? Leemos el estado ANTES de marcar cliente.
        let attribution = 'normal';
        try {
          const lprev: any = await env.aura_db.prepare('SELECT recovered_by, recover_state, noshow_count, recall_type, recall_sms_sent, react_d3, react_d7, react_d21, chatted, last_call_at FROM leads WHERE id=?').bind(leadId).first();
          if (lprev) {
            if (lprev.recovered_by==='llamada' || lprev.last_call_at) attribution='call';            // lo recuperaste con una llamada
            else if (lprev.recover_state==='noshow' || (lprev.noshow_count&&lprev.noshow_count>0)) attribution='noshow'; // no vino y volvió
            else if (lprev.recall_type==='venta' && lprev.recall_sms_sent==1) attribution='recall';   // volvió por el recall de su tratamiento
            else if (lprev.react_d3 || lprev.react_d7 || lprev.react_d21) attribution='reactivation'; // lead frío revivido por SMS
          }
        } catch(e){}
        if (apptId) await env.aura_db.prepare("UPDATE appointments SET status='attended' WHERE id=?").bind(apptId).run();
        await env.aura_db.prepare("UPDATE leads SET status='client' WHERE id=?").bind(leadId).run();
        // DESCUENTO AUTOMÁTICO DE STOCK según receta del tratamiento (+ coste real para el beneficio)
        let invCost = 0;
        try {
          await ensureInventorySchema(env);
          let treat = b.treatment;
          if (!treat && apptId) { const ap:any = await env.aura_db.prepare('SELECT treatment FROM appointments WHERE id=?').bind(apptId).first(); treat = ap?ap.treatment:null; }
          if (treat) {
            const recs:any = await env.aura_db.prepare('SELECT r.product_id, r.qty, pr.cost_per_unit FROM inventory_recipes r LEFT JOIN inventory_products pr ON pr.id=r.product_id WHERE r.tenant_id=? AND LOWER(r.treatment)=LOWER(?)').bind(tenantId, treat).all();
            for (const rc of (recs.results||[])) {
              const q = Number(rc.qty)||0; if (q<=0 || !rc.product_id) continue;
              invCost += (Number(rc.cost_per_unit)||0) * q;
              await env.aura_db.prepare('UPDATE inventory_products SET stock=stock-?, updated_at=? WHERE id=? AND tenant_id=?').bind(q, Date.now(), rc.product_id, tenantId).run();
              await env.aura_db.prepare('INSERT INTO inventory_moves (id,tenant_id,product_id,delta,reason,ref,actor,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('mv_'+Math.random().toString(36).slice(2,10), tenantId, rc.product_id, -q, 'consumo-tratamiento', treat, b.actor||'sistema', Date.now()).run();
            }
          }
        } catch(e){}
        // VENTA DE PRODUCTO SUELTO en caja: descuenta inventory_products, registra movimiento y suma a caja
        let soldExtra = 0;
        try {
          await ensureInventorySchema(env);
          const sold = Array.isArray(b.sold_products) ? b.sold_products : [];
          for (const sp of sold) {
            const pid = sp.product_id; const q = Number(sp.qty)||0; if (!pid || q<=0) continue;
            const pr:any = await env.aura_db.prepare('SELECT name,sale_price,cost_per_unit FROM inventory_products WHERE id=? AND tenant_id=?').bind(pid, tenantId).first();
            if (!pr) continue;
            const lineEur = (sp.price!=null ? Number(sp.price) : (Number(pr.sale_price)||0)) * q;
            soldExtra += lineEur;
            invCost += (Number(pr.cost_per_unit)||0) * q;
            await env.aura_db.prepare('UPDATE inventory_products SET stock=stock-?, updated_at=? WHERE id=? AND tenant_id=?').bind(q, Date.now(), pid, tenantId).run();
            await env.aura_db.prepare('INSERT INTO inventory_moves (id,tenant_id,product_id,delta,reason,ref,actor,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('mv_'+Math.random().toString(36).slice(2,10), tenantId, pid, -q, 'venta-mostrador', (pr.name||''), b.actor||'panel', Date.now()).run();
          }
        } catch(e){}
        // Reseña automática en Google: si la clínica tiene enlace, pedir reseña al paciente tras la visita
        try {
          const tn: any = await env.aura_db.prepare('SELECT name,whatsapp,google_review_url FROM tenants WHERE id=?').bind(tenantId).first();
          const ld: any = await env.aura_db.prepare('SELECT name,phone FROM leads WHERE id=?').bind(leadId).first();
          if (tn?.google_review_url && ld?.phone) {
            const trow: any = await env.aura_db.prepare('SELECT templates FROM sms_templates WHERE tenant_id=?').bind(tenantId).first();
            let tpl:any = {}; try { tpl = trow?.templates ? JSON.parse(trow.templates) : {}; } catch(e){}
            const reviewTpl = tpl.review || '{clinica}: {nombre}, gracias por tu visita. ¿Nos dejas tu opinión? Te toma 20 segundos y nos ayuda muchísimo: {link}';
            const firstName = (ld.name||'').split(' ')[0] || '';
            const msg = reviewTpl.replace(/\{clinica\}/g, tn.name||'AURA').replace(/\{nombre\}/g, firstName).replace(/\{link\}/g, tn.google_review_url);
            await sendSMS(env, ld.phone, msg, tn.name||'AURA', tenantId);
          }
        } catch(e){}
        // Registrar tratamiento/pago si viene
        const tname = b.treatment || 'Tratamiento';
        let amount = (Number(b.amount)||0) + (soldExtra||0);
        // Canje de puntos como descuento (recepción indica redeem_points)
        const redeemPts = Math.max(0, Math.round(Number(b.redeem_points)||0));
        if (redeemPts > 0) {
          try {
            const lc:any = await env.aura_db.prepare('SELECT * FROM loyalty_config WHERE tenant_id=?').bind(tenantId).first();
            const bal:any = await env.aura_db.prepare('SELECT COALESCE(SUM(delta),0) as b FROM points_ledger WHERE lead_id=?').bind(leadId).first();
            const have = Number(bal?.b)||0;
            const use = Math.min(redeemPts, have);
            if (use > 0 && lc) {
              const eurPer100 = Number(lc.eur_per_100pts)||10;
              const discount = (use/100)*eurPer100;
              amount = Math.max(0, amount - discount);
              await env.aura_db.prepare("INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES (?,?,?,?,?,?)").bind('pt_'+uid(), tenantId, leadId, -use, 'canje:'+discount.toFixed(2)+'EUR', new Date().toISOString()).run();
            }
          } catch(e){}
        }
        // Coste de material para el margen: inventario real (receta + venta suelta) + compat producto viejo
        let prodCost = invCost || 0;
        if (b.product_id && b.product_qty) {
          try {
            const prod: any = await env.aura_db.prepare('SELECT * FROM products WHERE id=? AND tenant_id=?').bind(b.product_id, tenantId).first();
            if (prod) {
              const qty = Number(b.product_qty)||0;
              prodCost += (Number(prod.cost)||0) * qty;
              await env.aura_db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id=?').bind(qty, b.product_id).run();
            }
          } catch(e){}
        }
        if (amount > 0 || b.treatment) {
          await env.aura_db.prepare("INSERT INTO treatments_log (id,lead_id,tenant_id,name,amount,pay_status,date_iso,method,cost) VALUES (?,?,?,?,?,?,?,?,?)")
            .bind('t_'+uid(), leadId, tenantId, tname, amount, b.pay_status||'paid', new Date().toISOString(), b.method||null, prodCost).run();
        }
        // Bono/pack: si se usa una sesión de un bono, descontarla
        if (b.bono_id) {
          try { await env.aura_db.prepare("UPDATE bonos SET used_sessions = used_sessions + 1, status = CASE WHEN used_sessions + 1 >= total_sessions THEN 'done' ELSE 'active' END WHERE id=? AND tenant_id=?").bind(b.bono_id, tenantId).run(); } catch(e){}
        }
        // Programar recall según producto (días exactos)
        const nm = tname.toLowerCase();
        const prev: any = await env.aura_db.prepare('SELECT COUNT(*) as c FROM treatments_log WHERE lead_id=?').bind(leadId).first();
        const isFirst = (prev?.c||1) <= 1;
        let days = 180;
        if (nm.includes('labio')) days = isFirst ? 180 : 270;
        else if (nm.includes('botox') || nm.includes('arrug')) days = 90;
        else if (nm.includes('hidrat') || nm.includes('peel') || nm.includes('piel')) days = 45;
        else if (nm.includes('rino') || nm.includes('mand') || nm.includes('ojera') || nm.includes('relleno')) days = 270;
        const rd = new Date(); rd.setDate(rd.getDate() + days);
        // Si recepción reserva ya la siguiente cita (rebooking instantáneo): crea cita futura y NO programa SMS de recall
        if (b.next_date) {
          const nid = appId();
          await env.aura_db.prepare("INSERT INTO appointments (id,tenant_id,lead_id,treatment,date_iso,duration_min,status) VALUES (?,?,?,?,?,?,?)").bind(nid, tenantId, leadId, 'Revisión / '+tname, b.next_date, 30, 'booked').run();
          // recall queda informado pero sin SMS (ya tiene cita) — se marca recall_sms_sent=1 para que el motor no lo envíe
          await env.aura_db.prepare("UPDATE leads SET recall_date=?, recall_type='venta', recall_sms_sent=1 WHERE id=?").bind(b.next_date.slice(0,10), leadId).run();
          return json({ ok:true, result:'client_rebooked', next_appt: nid, attribution, amount });
        }
        let recallMsg = '{clinica}: {nombre}, tu tratamiento ya pide un repaso para seguir luciéndolo. Resérvalo gratis aquí: {link}';
        if (nm.includes('labio')) recallMsg = '{clinica}: {nombre}, tus labios ya están perdiendo volumen. No esperes a que bajen del todo: te guardo hueco para mantenerlos perfectos. Reserva en 1 toque: {link}';
        else if (nm.includes('botox') || nm.includes('arrug')) recallMsg = '{clinica}: {nombre}, el efecto de tu botox está a punto de irse y las arrugas vuelven. Renuévalo antes de que se note. Reserva aquí: {link}';
        else if (nm.includes('hidrat') || nm.includes('peel') || nm.includes('piel')) recallMsg = '{clinica}: {nombre}, tu piel necesita su sesión de mantenimiento para seguir luminosa. Te guardo hueco esta semana: {link}';
        else if (nm.includes('rino') || nm.includes('mand') || nm.includes('ojera') || nm.includes('relleno')) recallMsg = '{clinica}: {nombre}, tu resultado empieza a reabsorberse. Una revisión ahora lo mantiene impecable. Reserva aquí: {link}';
        await env.aura_db.prepare("UPDATE leads SET recall_date=?, recall_type='venta', recall_msg=?, recall_sms_sent=0 WHERE id=?").bind(rd.toISOString().slice(0,10), recallMsg, leadId).run();
        // Fidelización: sumar puntos por el importe gastado (si está activo)
        try {
          const lc:any = await env.aura_db.prepare('SELECT * FROM loyalty_config WHERE tenant_id=?').bind(tenantId).first();
          if (lc && lc.enabled && amount > 0) {
            const pts = Math.round(amount * (Number(lc.pts_per_eur)||1));
            if (pts>0) await env.aura_db.prepare("INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES (?,?,?,?,?,?)").bind('pt_'+uid(), tenantId, leadId, pts, 'compra', new Date().toISOString()).run();
          }
        } catch(e){}
        return json({ ok:true, result:'client', recall_date: rd.toISOString().slice(0,10), attribution, amount });
      }

      // PROFESIONALES (recursos del calendario)
      // migración segura: columna schedule (JSON de horario por profesional)
      try { await env.aura_db.exec("ALTER TABLE professionals ADD COLUMN schedule TEXT"); } catch(e){}
      try { await env.aura_db.exec("ALTER TABLE professionals ADD COLUMN can_copilot INTEGER DEFAULT 0"); } catch(e){}
      if (p === '/api/professionals' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        const r = await env.aura_db.prepare('SELECT * FROM professionals WHERE tenant_id=? ORDER BY created_at').bind(tenant).all();
        const role = await getSessionRole(env, req, url);
        const canSeeSalary = (role==='owner'||role==='finance'||role==='superadmin');
        let pros:any = r.results || [];
        if (!canSeeSalary) pros = pros.map((p:any)=>{ const {salary_gross, ss_pct, commission_pct, ...rest} = p; return rest; });
        return json({ professionals: pros });
      }
      if (p === '/api/professionals' && req.method === 'POST') {
        const b:any = await req.json();
        // Solo horario (sin tocar datos ni compensación): permitido a roles operativos
        if (b.id && b.schedule!==undefined && b.name===undefined && b.delete===undefined) {
          await env.aura_db.prepare('UPDATE professionals SET schedule=? WHERE id=? AND tenant_id=?').bind(typeof b.schedule==='string'?b.schedule:JSON.stringify(b.schedule), b.id, b.tenant_id).run();
          return json({ ok:true, id:b.id });
        }
        // Crear/editar/borrar empleado y su NÓMINA: solo owner/finance/superadmin
        const _profRole = await getSessionRole(env, req, url);
        if (!(_profRole==='owner'||_profRole==='finance'||_profRole==='superadmin')) return json({ error:'forbidden', reason:'role' }, 403);
        if (b.delete) { await env.aura_db.prepare('DELETE FROM professionals WHERE id=?').bind(b.delete).run(); return json({ok:true}); }
        if (b.id) {
          await env.aura_db.prepare('UPDATE professionals SET name=?, role=?, salary_gross=?, ss_pct=?, commission_pct=?, active=?, can_copilot=? WHERE id=? AND tenant_id=?')
            .bind(b.name||'Profesional', b.role||'pro', Number(b.salary_gross)||0, b.ss_pct!=null?Number(b.ss_pct):30, Number(b.commission_pct)||0, b.active!=null?(b.active?1:0):1, b.can_copilot?1:0, b.id, b.tenant_id).run();
          if (b.schedule!==undefined) { try{ await env.aura_db.prepare('UPDATE professionals SET schedule=? WHERE id=? AND tenant_id=?').bind(typeof b.schedule==='string'?b.schedule:JSON.stringify(b.schedule), b.id, b.tenant_id).run(); }catch(e){} }
          return json({ ok:true, id: b.id });
        }
        const id = 'pr_'+uid();
        const colors=['#9B7BFF','#FF6B5A','#34a877','#d9a23a','#3a8fd9','#c0568f'];
        await env.aura_db.prepare('INSERT INTO professionals (id,tenant_id,name,color,role,salary_gross,ss_pct,commission_pct,active,can_copilot,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
          .bind(id, b.tenant_id, b.name||'Profesional', b.color||colors[Math.floor(Math.random()*colors.length)], b.role||'pro', Number(b.salary_gross)||0, b.ss_pct!=null?Number(b.ss_pct):30, Number(b.commission_pct)||0, 1, b.can_copilot?1:0, Date.now()).run();
        return json({ ok:true, id });
      }

      // BLOQUEOS de horas (vacaciones, descansos)
      if (p === '/api/blocks' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        const r = await env.aura_db.prepare('SELECT * FROM time_blocks WHERE tenant_id=? ORDER BY start_iso').bind(tenant).all();
        return json({ blocks: r.results });
      }
      if (p === '/api/blocks' && req.method === 'POST') {
        const b:any = await req.json();
        if (b.delete) { await env.aura_db.prepare('DELETE FROM time_blocks WHERE id=?').bind(b.delete).run(); return json({ok:true}); }
        const id='bl_'+uid();
        await env.aura_db.prepare('INSERT INTO time_blocks (id,tenant_id,professional_id,start_iso,end_iso,reason,created_at) VALUES (?,?,?,?,?,?,?)').bind(id, b.tenant_id, b.professional_id||null, b.start_iso, b.end_iso, b.reason||'No disponible', Date.now()).run();
        return json({ ok:true, id });
      }

      // WAITLIST (lista de espera)
      if (p === '/api/waitlist' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        const r = await env.aura_db.prepare("SELECT * FROM waitlist WHERE tenant_id=? AND status='waiting' ORDER BY created_at").bind(tenant).all();
        return json({ waitlist: r.results });
      }
      if (p === '/api/waitlist' && req.method === 'POST') {
        const b:any = await req.json();
        if (b.remove) { await env.aura_db.prepare("UPDATE waitlist SET status='done' WHERE id=?").bind(b.remove).run(); return json({ok:true}); }
        const id='w_'+uid();
        await env.aura_db.prepare('INSERT INTO waitlist (id,tenant_id,lead_id,name,phone,treatment,pref,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, b.tenant_id, b.lead_id||null, b.name||'', b.phone||'', b.treatment||'', b.pref||'', 'waiting', Date.now()).run();
        return json({ ok:true, id });
      }

      // CREAR CITA MANUAL (walk-in) con anti-doble-reserva por profesional
      if (p === '/api/appt-create' && req.method === 'POST') {
        const b:any = await req.json();
        // aviso (no bloqueante) si el día elegido está cerrado o en vacaciones
        let closedWarning: string | null = null;
        try {
          const ds = String(b.date_iso||'').slice(0,10);
          if (ds) {
            const sch = await getScheduleByDay(env, b.tenant_id);
            const vac = await getVacations(env, b.tenant_id);
            const c = isDateClosed(ds, sch, vac);
            if (c.closed) closedWarning = c.reason || 'Cerrado';
          }
        } catch(e){}
        // anti-doble-reserva: misma fecha/hora y mismo profesional
        if (b.professional_id) {
          const clash:any = await env.aura_db.prepare("SELECT id FROM appointments WHERE tenant_id=? AND professional_id=? AND date_iso=? AND status NOT IN ('noshow','cancelled')").bind(b.tenant_id, b.professional_id, b.date_iso).first();
          if (clash) return json({ ok:false, error:'clash' });
          // valida horario del profesional (si lo tiene definido)
          try {
            const pr:any = await env.aura_db.prepare('SELECT schedule FROM professionals WHERE id=? AND tenant_id=?').bind(b.professional_id, b.tenant_id).first();
            if (pr && pr.schedule) { const sch = typeof pr.schedule==='string'?JSON.parse(pr.schedule):pr.schedule; const dt=new Date(b.date_iso); const dk=['sun','mon','tue','wed','thu','fri','sat'][dt.getDay()]; const c=sch[dk]; const hhmm=String(b.date_iso).slice(11,16);
              if (c && c.on===false) return json({ ok:false, error:'pro_off', detail:'El profesional no trabaja ese día' });
              if (c && c.on!==false) {
                const t1s=c.t1_start||c.start, t1e=c.t1_end||c.end;
                const in1 = t1s ? (hhmm>=t1s && hhmm<(t1e||'23:59')) : true;
                const in2 = c.t2_start ? (hhmm>=c.t2_start && hhmm<(c.t2_end||'23:59')) : false;
                if (t1s && !in1 && !in2) { const franjas = c.t2_start ? (t1s+'-'+t1e+' y '+c.t2_start+'-'+c.t2_end) : (t1s+'-'+t1e); return json({ ok:false, error:'pro_off', detail:'Fuera del horario del profesional ('+franjas+')' }); }
              }
            }
          } catch(e){}
        }
        // crear/asociar lead
        let leadId = b.lead_id;
        if (!leadId) {
          leadId = uid();
          await env.aura_db.prepare('INSERT INTO leads (id,tenant_id,name,phone,treatment,status,temperature,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(leadId, b.tenant_id, b.name||'Cliente', b.phone||'', b.treatment||'', 'booked','warm', new Date().toISOString()).run();
        }
        const id=appId();
        await env.aura_db.prepare('INSERT INTO appointments (id,tenant_id,lead_id,treatment,date_iso,duration_min,status,professional_id) VALUES (?,?,?,?,?,?,?,?)').bind(id, b.tenant_id, leadId, b.treatment||null, b.date_iso, b.duration_min||30, 'booked', b.professional_id||null).run();
        return json({ ok:true, appointment_id:id, lead_id:leadId, closed_warning: closedWarning });
      }

      // MOVER / REAGENDAR CITA (drag & drop)
      if (p === '/api/appt-move' && req.method === 'POST') {
        const b:any = await req.json();
        if (b.professional_id) {
          const clash:any = await env.aura_db.prepare("SELECT id FROM appointments WHERE tenant_id=? AND professional_id=? AND date_iso=? AND id!=? AND status NOT IN ('noshow','cancelled')").bind(b.tenant_id, b.professional_id, b.date_iso, b.appointment_id).first();
          if (clash) return json({ ok:false, error:'clash' });
        }
        await env.aura_db.prepare('UPDATE appointments SET date_iso=?'+(b.professional_id?', professional_id=?':'')+' WHERE id=?')
          .bind(...(b.professional_id?[b.date_iso,b.professional_id,b.appointment_id]:[b.date_iso,b.appointment_id])).run();
        return json({ ok:true });
      }

      // Consultations
      if (p === '/api/consultations' && req.method === 'POST') {
        const b: any = await req.json();
        await env.aura_db
          .prepare(`INSERT INTO consultations (name,email,phone,slot,tenant_id,status) VALUES (?,?,?,?,?,'pending')`)
          .bind(b.name||'',b.email||'',b.phone||'',b.slot||'',b.tenant_id||null)
          .run();
        return json({ ok: true });
      }
      if (p === '/api/consultations' && req.method === 'GET') {
        const r = await env.aura_db.prepare('SELECT * FROM consultations ORDER BY created_at DESC LIMIT 200').all();
        return json({ consultations: r.results });
      }

      // BACKUP manual (protegido por clave simple) + listado
      if (p === '/api/backup-now' && req.method === 'POST') {
        const key = url.searchParams.get('key') || '';
        if (key !== (env.JWT_SECRET || 'aura')) return json({ error: 'forbidden' }, 403);
        const r = await runBackup(env);
        return json(r);
      }
      if (p === '/api/run-automations' && req.method === 'POST') {
        const key = url.searchParams.get('key') || '';
        if (key !== (env.JWT_SECRET || 'aura')) return json({ error: 'forbidden' }, 403);
        const r = await runAutomations(env);
        return json(r);
      }
      if (p === '/api/backups' && req.method === 'GET') {
        const key = url.searchParams.get('key') || '';
        if (key !== (env.JWT_SECRET || 'aura')) return json({ error: 'forbidden' }, 403);
        const idx = await env.AURA_IMG.get('backup_index', 'json') as any;
        return json({ backups: idx || [] });
      }

      // Dashboard overview
      if (p.startsWith('/api/dashboard/') && req.method === 'GET') {
        const id = p.split('/').pop()!;
        const total = await env.aura_db
          .prepare('SELECT COUNT(*) AS n FROM leads WHERE tenant_id=?')
          .bind(id)
          .first<{ n: number }>();
        const hot = await env.aura_db
          .prepare("SELECT COUNT(*) AS n FROM leads WHERE tenant_id=? AND temperature='hot'")
          .bind(id)
          .first<{ n: number }>();
        const booked = await env.aura_db
          .prepare("SELECT COUNT(*) AS n FROM leads WHERE tenant_id=? AND status='booked'")
          .bind(id)
          .first<{ n: number }>();
        const today = await env.aura_db
          .prepare("SELECT COUNT(*) AS n FROM leads WHERE tenant_id=? AND date(created_at)=date('now')")
          .bind(id)
          .first<{ n: number }>();
        return json({
          total_leads: total?.n || 0,
          hot_leads: hot?.n || 0,
          booked: booked?.n || 0,
          today: today?.n || 0,
        });
      }

      return json({ error: 'not_found', path: p }, 404);
    } catch (e: any) {
      return json({ error: 'server_error', detail: String(e && e.message ? e.message : e) }, 500);
    }
  },
  // Cron: backup (1 vez/día a las 3h) + automatizaciones SMS (cada hora) + sync WhatsApp respaldo (cada 10 min)
  async scheduled(event: any, env: Env, ctx: any) {
    const now = new Date();
    const hour = now.getUTCHours();
    const min = now.getUTCMinutes();
    // Backup: SOLO 1 vez al día, a las 03:00 UTC exactas (el cron corre cada minuto, por eso filtramos minuto 0)
    if (hour === 3 && min === 0) ctx.waitUntil(runBackup(env).catch((e:any)=>console.error('backup error', e)));
    // Automatizaciones SMS: CADA MINUTO. Las ventanas de recordatorio son de 1h exacta (24h/2h/etc),
    // así que hay que comprobarlas con frecuencia para no perder ningún envío. Los flags (sms_24h, sms_2h…)
    // garantizan que cada SMS se envía UNA sola vez por paciente/cita. Cada clínica usa SUS plantillas/créditos.
    ctx.waitUntil(runAutomations(env).catch((e:any)=>console.error('automations error', e)));
    // Respaldo WhatsApp: cada 10 min resincroniza chats por si el webhook falló (Unipile lo recomienda)
    if (min % 10 === 0) ctx.waitUntil(runWaSync(env).catch((e:any)=>console.error('wa sync error', e)));
  },
};

// ─── RESPALDO WHATSAPP (cron cada 10 min) ───
// Resincroniza chats/mensajes recientes de clínicas conectadas por si el webhook falló. Dedupe por message_id.
async function runWaSync(env: Env): Promise<void> {
  const UNI = env.UNIPILE_DSN || 'https://api50.unipile.com:18013';
  const UKEY = env.UNIPILE_KEY || '';
  if (!UKEY) return;
  const uni = async (path:string) => { try { const r=await fetch(UNI+path,{ headers:{ 'X-API-KEY':UKEY, 'accept':'application/json' } }); const t=await r.text(); try{return JSON.parse(t);}catch{return null;} } catch{ return null; } };
  let cfgs:any;
  try { cfgs = await env.aura_db.prepare('SELECT tenant_id, instance FROM wa_config').all(); } catch { return; }
  for (const c of (cfgs?.results||[])) {
    const t=c.tenant_id, acc=c.instance; if(!acc) continue;
    const r = await uni('/api/v1/chats?account_id='+acc+'&limit=15'); const items=(r?.items)||[];
    for (const chat of items.slice(0,15)) {
      const ts = chat.timestamp?Date.parse(chat.timestamp):Date.now();
      const last = chat.last_message?.text||'';
      try { await env.aura_db.prepare("INSERT INTO wa_chats_meta (tenant_id,chat_id,last_text,last_ts,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(tenant_id,chat_id) DO UPDATE SET last_text=excluded.last_text, last_ts=MAX(wa_chats_meta.last_ts,excluded.last_ts), updated_at=excluded.updated_at").bind(t, chat.id, last, ts, Date.now()).run(); } catch(e){}
      // trae últimos mensajes y deduplica
      const mr = await uni('/api/v1/chats/'+encodeURIComponent(chat.id)+'/messages?limit=20'); const msgs=(mr?.items)||[];
      for (const m of msgs){ const att=(m.attachments&&m.attachments[0])||null; const mtype=att?String(att.type||'file').toLowerCase():'text'; const murl=att?(att.url||null):null; const mname=att?(att.file_name||att.name||null):null; const mts=m.timestamp?Date.parse(m.timestamp):Date.now(); const fromMe=(m.is_sender===1||m.is_sender===true)?1:0;
        try{ await env.aura_db.prepare("INSERT OR IGNORE INTO wa_messages (message_id,tenant_id,chat_id,from_me,text,mtype,murl,mname,ts,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(m.id||(chat.id+'_'+mts), t, chat.id, fromMe, m.text||'', mtype, murl, mname, mts, Date.now()).run(); }catch(e){}
      }
    }
  }
}

// ─── MOTOR DE AUTOMATIZACIONES SMS (corre cada hora) ───
// Respeta plantillas, sender, datos, link mágico y créditos de CADA clínica. Anti-duplicado. Horario 9-21h Madrid.
async function runAutomations(env: Env): Promise<{ ok: boolean; sent: number }> {
  let sent = 0;
  const nowUTC = new Date();
  const madridHour = (nowUTC.getUTCHours() + 2) % 24; // aprox CEST
  const within = (madridHour >= 9 && madridHour <= 21);
  const DEFTPL: any = {
    reminder_24h: '{clinica}: tu cita es mañana {fecha} a las {hora}. Confírmala o cámbiala con un toque aquí: {link}',
    reminder_2h: '{clinica}: te esperamos hoy a las {hora} en {direccion}. Hasta ahora!',
    no_show: '{clinica}: {nombre}, hoy no pudimos verte. ¿Reprogramamos? Te guardo otro hueco: {link}',
    confirm2: '{clinica}: {nombre}, ¿te esperamos {fecha} a las {hora}? Confírmame con un toque o cámbiala aquí: {link}',
    noshow2: '{clinica}: {nombre}, aún tengo un hueco para ti esta semana. ¿Lo reservamos antes de que se ocupe? {link}',
    reactivation: '{clinica}: {nombre}, tu valoración sigue disponible. Tengo hueco {proximo_dia}, te lo guardo: {link}',
    recall_sale: '{clinica}: {nombre}, toca tu revisión para mantener el resultado. Tengo hueco {proximo_dia}, reserva aquí: {link}',
    fast20: '{clinica}: {nombre}, vi que dejaste tus datos. ¿Te ayudo a reservar tu valoración? Es solo un momento: {link}',
    fast5h: '{clinica}: {nombre}, te guardo tu hueco para la valoración. Tengo disponibilidad {proximo_dia}, ¿la cerramos? {link}',
    react_last: '{clinica}: {nombre}, última oportunidad para tu valoración con la promo de este mes. Si te interesa, reserva aquí antes de que cierre: {link}',
    birthday: '{clinica}: ¡Feliz cumpleaños, {nombre}! Te regalamos un detalle en tu próxima visita. Resérvala cuando quieras: {link}'
  };
  async function tpl(tenantId: string){
    const row: any = await env.aura_db.prepare('SELECT templates FROM sms_templates WHERE tenant_id=?').bind(tenantId).first();
    let t = {}; try { t = row?.templates ? JSON.parse(row.templates) : {}; } catch(e){}
    return Object.assign({}, DEFTPL, t);
  }
  function fill(s: string, vars: any){ return (s||'').replace(/\{(\w+)\}/g, (_m, k)=> vars[k]!=null ? String(vars[k]) : ''); }
  const tenantsCache: any = {};
  async function tenant(id: string){ if(!tenantsCache[id]){ tenantsCache[id] = await env.aura_db.prepare('SELECT id,name,whatsapp,address FROM tenants WHERE id=?').bind(id).first(); } return tenantsCache[id]; }
  // Disponibilidad SIEMPRE fresca: se relee cada ejecución del cron (cada hora) para reflejar cambios de horario/vacaciones.
  const schedCache: any = {}; const vacCache: any = {};
  async function schedFor(tid: string){ if(!schedCache[tid]) schedCache[tid] = await getScheduleByDay(env, tid); return schedCache[tid]; }
  async function vacFor(tid: string){ if(!vacCache[tid]) vacCache[tid] = await getVacations(env, tid); return vacCache[tid]; }
  // Texto del próximo día abierto (ej 'el lunes') para apuntar SIEMPRE la conversión al siguiente hueco real.
  // Los anuncios corren 24/7: nunca dejamos enfriar al lead, lo redirigimos al próximo día abierto.
  async function proximoDiaFor(tid: string){ const sch = await schedFor(tid); const vac = await vacFor(tid); const today = madridParts(nowUTC).dateStr; const nxt = nextOpenDate(today, sch, vac); if (isDateClosed(nxt, sch, vac).closed) return null; return proximoDiaTexto(nxt, today); }

  if (within) {
    // 1) Citas futuras: recordatorio 24h y 2h
    const appts: any = await env.aura_db.prepare("SELECT a.*, l.name AS lead_name, l.phone AS lead_phone FROM appointments a LEFT JOIN leads l ON l.id=a.lead_id WHERE a.status='booked' AND a.date_iso IS NOT NULL").all();
    const SEND_CAP = 2000; // tope de seguridad de SMS por ejecución del cron (anti-desborde)
    for (const a of (appts.results||[])) {
      if (sent >= SEND_CAP) break;
      try {
      if (!a.lead_phone) continue;
      const dt = new Date(a.date_iso); const diffH = (dt.getTime() - nowUTC.getTime())/3600000;
      const tn: any = await tenant(a.tenant_id); if(!tn) continue;
      const T = await tpl(a.tenant_id);
      const fecha = dt.toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
      const hora = dt.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
      const mlink = await magicLink(env, a.tenant_id, a.lead_id);
      const vars = { clinica: tn.name||'', nombre: a.lead_name||'', fecha, hora, direccion: tn.address||'', tel: (tn.whatsapp||''), link: mlink };
      // La cita NO debe caer en un día cerrado/vacaciones (edge case: se cerró el día después de reservar).
      // Si cae cerrada, no enviamos recordatorios que confundan y marcamos como enviados para no reintentar.
      const apptDay = String(a.date_iso).slice(0,10);
      const apptClosed = isDateClosed(apptDay, await schedFor(a.tenant_id), await vacFor(a.tenant_id)).closed;
      // RECORDATORIO 24h — BLINDADO: ventana "a partir de" (en cuanto faltan ≤24h y aún >2h, sin importar el minuto
      // exacto del cron). El flag sms_24h garantiza 1 solo envío. Así nunca se pierde aunque el cron falle/cambie.
      if (!a.sms_24h && diffH <= 24 && diffH > 2) {
        if (apptClosed) { await env.aura_db.prepare('UPDATE appointments SET sms_24h=1 WHERE id=?').bind(a.id).run(); }
        else { const r = await sendSMS(env, a.lead_phone, fill(T.reminder_24h, vars), tn.name||'AURA', a.tenant_id);
          if (r.ok) { await env.aura_db.prepare('UPDATE appointments SET sms_24h=1 WHERE id=?').bind(a.id).run(); sent++; } }
      }
      // RECORDATORIO 2h — BLINDADO: en cuanto faltan ≤2h y la cita no ha pasado (>0h). Flag sms_2h evita duplicados.
      if (!a.sms_2h && diffH <= 2 && diffH > 0) {
        if (apptClosed) { await env.aura_db.prepare('UPDATE appointments SET sms_2h=1 WHERE id=?').bind(a.id).run(); }
        else { const r = await sendSMS(env, a.lead_phone, fill(T.reminder_2h, vars), tn.name||'AURA', a.tenant_id);
          if (r.ok) { await env.aura_db.prepare('UPDATE appointments SET sms_2h=1 WHERE id=?').bind(a.id).run(); sent++; } }
      }
      // FLUJO NO CONFIRMA: ~18h antes sin confirmar (confirmed=0) -> 2o toque + Llamar urgente en pipeline
      if (!a.sms_confirm2 && !apptClosed && (a.confirmed===0 || a.confirmed==null) && diffH <= 18 && diffH > 5) {
        const r = await sendSMS(env, a.lead_phone, fill(T.confirm2, vars), tn.name||'AURA', a.tenant_id);
        if (r.ok) {
          await env.aura_db.prepare('UPDATE appointments SET sms_confirm2=1 WHERE id=?').bind(a.id).run();
          await env.aura_db.prepare("UPDATE leads SET call_priority='urgent' WHERE id=?").bind(a.lead_id).run();
          sent++;
        }
      }
      // FLUJO NO-SHOW paso 1 — BLINDADO: a partir de 2h después de la cita (hasta 48h) si sigue booked. Flag sms_noshow evita duplicados.
      if (!a.sms_noshow && diffH <= -2 && diffH > -48) {
        const r = await sendSMS(env, a.lead_phone, fill(T.no_show, vars), tn.name||'AURA', a.tenant_id);
        if (r.ok) {
          await env.aura_db.prepare('UPDATE appointments SET sms_noshow=1, noshow_at=? WHERE id=?').bind(nowUTC.toISOString(), a.id).run();
          // marcar lead como no-show recuperable: contador + estado + llamar urgente
          await env.aura_db.prepare("UPDATE leads SET noshow_count=COALESCE(noshow_count,0)+1, recover_state='noshow', call_priority='urgent' WHERE id=?").bind(a.lead_id).run();
          sent++;
        }
      }
      // FLUJO NO-SHOW paso 2: 48h después del no-show, si no ha reservado nueva cita
      if (a.sms_noshow && !a.sms_noshow2 && diffH <= -48 && diffH > -72) {
        const futura: any = await env.aura_db.prepare("SELECT COUNT(*) c FROM appointments WHERE lead_id=? AND status='booked' AND date_iso > ?").bind(a.lead_id, nowUTC.toISOString()).first();
        if ((futura?.c||0) === 0) {
          const r = await sendSMS(env, a.lead_phone, fill(T.noshow2, vars), tn.name||'AURA', a.tenant_id);
          if (r.ok) { await env.aura_db.prepare('UPDATE appointments SET sms_noshow2=1 WHERE id=?').bind(a.id).run(); sent++; }
        } else {
          await env.aura_db.prepare('UPDATE appointments SET sms_noshow2=1 WHERE id=?').bind(a.id).run();
        }
      }
      } catch(err){ console.error('automations appt error', a && a.id, err); }
    }
    // 2) Reactivación de leads no reservados (día 3 y 7) — EXCLUYE clientes con recall (ya son clientes, no leads fríos)
    const leads: any = await env.aura_db.prepare("SELECT * FROM leads WHERE status!='booked' AND phone IS NOT NULL AND (recall_type IS NULL OR recall_type!='venta')").all();
    for (const l of (leads.results||[])) {
      if (sent >= SEND_CAP) break;
      try {
      const created = new Date(l.created_at); const days = (nowUTC.getTime()-created.getTime())/86400000;
      const tn: any = await tenant(l.tenant_id); if(!tn) continue;
      const T = await tpl(l.tenant_id);
      const mlink = await magicLink(env, l.tenant_id, l.id);
      // Apuntamos SIEMPRE al próximo día abierto (anuncios 24/7: nunca dejamos enfriar al lead).
      const prox = await proximoDiaFor(l.tenant_id);
      const vars = { clinica: tn.name||'', nombre: l.name||'', link: mlink, tel:(tn.whatsapp||''), proximo_dia: prox || 'esta semana' };
      const mins = (nowUTC.getTime()-created.getTime())/60000;
      // TOQUE RÁPIDO: dejó datos y no reservó ni entró al chat. 1er SMS a los ~3 min (lead caliente, contacto inmediato), 2º a las 5h
      if (!l.sms_fast20 && mins >= 3 && mins < 300 && !l.chatted) {
        const r = await sendSMS(env, l.phone, fill(T.fast20, vars), tn.name||'AURA', l.tenant_id);
        if (r.ok) { await env.aura_db.prepare('UPDATE leads SET sms_fast20=1 WHERE id=?').bind(l.id).run(); sent++; }
      } else if (!l.sms_fast5h && mins >= 300 && mins < 1440 && !l.chatted) {
        // BLINDADO: a partir de 5h y hasta 24h tras dejar datos (antes solo 5-6h). Flag sms_fast5h evita duplicados.
        if (!prox) { /* sin día abierto: espera */ } else {
          const r = await sendSMS(env, l.phone, fill(T.fast5h, vars), tn.name||'AURA', l.tenant_id);
          if (r.ok) { await env.aura_db.prepare('UPDATE leads SET sms_fast5h=1 WHERE id=?').bind(l.id).run(); sent++; }
        }
      } else if (!l.react_d3 && days >= 3 && days < 7) {
        // BLINDADO: ventana amplia (día 3 al 7) en vez de franja de 1h. Flag react_d3 evita duplicados.
        if (!prox) continue; // sin ningún día abierto en el horizonte: espera al siguiente cron
        const r = await sendSMS(env, l.phone, fill(T.reactivation, vars), tn.name||'AURA', l.tenant_id);
        if (r.ok) { await env.aura_db.prepare('UPDATE leads SET react_d3=1 WHERE id=?').bind(l.id).run(); sent++; }
      } else if (!l.react_d7 && days >= 7 && days < 21) {
        // BLINDADO: ventana amplia (día 7 al 21). Flag react_d7 evita duplicados.
        if (!prox) continue;
        const r = await sendSMS(env, l.phone, fill(T.reactivation, vars), tn.name||'AURA', l.tenant_id);
        if (r.ok) { await env.aura_db.prepare('UPDATE leads SET react_d7=1 WHERE id=?').bind(l.id).run(); sent++; }
      } else if (!l.react_d21 && days >= 21 && days < 60) {
        // BLINDADO: último intento, ventana amplia (día 21 al 60). Flag react_d21 evita duplicados.
        const r = await sendSMS(env, l.phone, fill(T.react_last, vars), tn.name||'AURA', l.tenant_id);
        if (r.ok) { await env.aura_db.prepare('UPDATE leads SET react_d21=1 WHERE id=?').bind(l.id).run(); sent++; }
      }
      } catch(err){ console.error('automations lead error', l && l.id, err); }
    }
    // 2b) CUMPLEAÑOS: SMS de felicitación una vez al año a clientes con fecha de nacimiento (mes-día = hoy)
    const md = (madridParts(nowUTC).dateStr).slice(5); // MM-DD
    const yr = (madridParts(nowUTC).dateStr).slice(0,4);
    const bdays: any = await env.aura_db.prepare("SELECT * FROM leads WHERE birthday IS NOT NULL AND substr(birthday,6,5)=? AND phone IS NOT NULL AND (bday_year_sent IS NULL OR bday_year_sent!=?)").bind(md, yr).all();
    for (const l of (bdays.results||[])) {
      if (sent >= SEND_CAP) break;
      try {
      const tn: any = await tenant(l.tenant_id); if(!tn) continue;
      const T = await tpl(l.tenant_id);
      const mlink = await magicLink(env, l.tenant_id, l.id);
      const vars = { clinica: tn.name||'', nombre: l.name||'', link: mlink, tel:(tn.whatsapp||'') };
      const r = await sendSMS(env, l.phone, fill(T.birthday, vars), tn.name||'AURA', l.tenant_id);
      if (r.ok) { await env.aura_db.prepare('UPDATE leads SET bday_year_sent=? WHERE id=?').bind(yr, l.id).run(); sent++; }
      } catch(err){ console.error('automations bday error', l && l.id, err); }
    }
    // 3) Recall de nueva venta: recall_date vencido y tipo venta, SMS una vez
    const recalls: any = await env.aura_db.prepare("SELECT * FROM leads WHERE recall_type='venta' AND recall_date IS NOT NULL AND (recall_sms_sent IS NULL OR recall_sms_sent=0) AND phone IS NOT NULL").all();
    const todayStr = nowUTC.toISOString().slice(0,10);
    for (const l of (recalls.results||[])) {
      if (sent >= SEND_CAP) break;
      try {
      if (String(l.recall_date) > todayStr) continue; // aún no vence
      // Si el día de recall cae en día cerrado/vacaciones, desplazar al siguiente día abierto y esperar a esa fecha
      try {
        const sch = await schedFor(l.tenant_id); const vac = await vacFor(l.tenant_id);
        if (isDateClosed(String(l.recall_date), sch, vac).closed) {
          const moved = nextOpenDate(String(l.recall_date), sch, vac);
          if (moved !== String(l.recall_date)) {
            await env.aura_db.prepare('UPDATE leads SET recall_date=? WHERE id=?').bind(moved, l.id).run();
            if (moved > todayStr) continue; // aún no toca tras el desplazamiento
          }
        }
      } catch(e){}
      // NO enviar recall si ya tiene una cita futura reservada (no pisar)
      const futura: any = await env.aura_db.prepare("SELECT COUNT(*) as c FROM appointments WHERE lead_id=? AND status='booked' AND date_iso > ?").bind(l.id, nowUTC.toISOString()).first();
      if ((futura?.c||0) > 0) { await env.aura_db.prepare('UPDATE leads SET recall_sms_sent=1 WHERE id=?').bind(l.id).run(); continue; }
      // Apuntamos al próximo día abierto; si no hay ninguno en el horizonte, espera al siguiente cron
      const proxR = await proximoDiaFor(l.tenant_id);
      if (!proxR) continue;
      const tn: any = await tenant(l.tenant_id); if(!tn) continue;
      const T = await tpl(l.tenant_id);
      const mlink = await magicLink(env, l.tenant_id, l.id);
      const bookLink = mlink + (mlink.includes('?')?'&':'?') + 'book=1';
      const vars = { clinica: tn.name||'', nombre: (l.name||'').split(' ')[0]||'', link: bookLink, tel:(tn.whatsapp||''), proximo_dia: proxR };
      const msgTpl = l.recall_msg || T.recall_sale;
      const r = await sendSMS(env, l.phone, fill(msgTpl, vars), tn.name||'AURA', l.tenant_id);
      if (r.ok) { await env.aura_db.prepare('UPDATE leads SET recall_sms_sent=1 WHERE id=?').bind(l.id).run(); sent++; }
      } catch(err){ console.error('automations recall error', l && l.id, err); }
    }
  }
  return { ok: true, sent };
}

// ─── BACKUP: exporta todas las tablas D1 a JSON y lo guarda en KV con fecha + retención 30 días ───
async function runBackup(env: Env): Promise<{ ok: boolean; key?: string; tables?: number; rows?: number; error?: string }> {
  try {
    const tables = ['tenants','funnels','leads','messages','appointments','consultations','lead_analyses','users','team_members','sms_templates','pipeline_config','calendar_config','schedule_by_day','vacations','professionals','time_blocks','waitlist','treatments_log','owners','products','bonos','business_costs','consent_templates','consents_signed'];
    const dump: any = { created_at: new Date().toISOString(), tables: {} };
    let totalRows = 0;
    for (const t of tables) {
      try {
        const r = await env.aura_db.prepare('SELECT * FROM ' + t).all();
        dump.tables[t] = r.results || [];
        totalRows += (r.results || []).length;
      } catch (e) { dump.tables[t] = { error: String(e) }; }
    }
    const stamp = new Date().toISOString().slice(0,10) + '_' + Date.now().toString(36);
    const key = 'backups/backup_' + stamp + '.json';
    const body = JSON.stringify(dump);
    // Guardar en R2 si está disponible; si no, KV
    let store: 'r2'|'kv' = 'kv';
    if (env.aura_r2) { try { await env.aura_r2.put(key, body, { httpMetadata: { contentType: 'application/json' } }); store='r2'; } catch(e) { await env.AURA_IMG.put(key, body); } }
    else { await env.AURA_IMG.put(key, body); }
    // índice + retención 30 (el índice vive en KV por simplicidad)
    let idx = (await env.AURA_IMG.get('backup_index', 'json') as any) || [];
    idx.unshift({ key, created: dump.created_at, rows: totalRows, store });
    const keep = idx.slice(0, 30);
    const drop = idx.slice(30);
    for (const d of drop) { try { if (d.store==='r2' && env.aura_r2) await env.aura_r2.delete(d.key); else await env.AURA_IMG.delete(d.key); } catch (e) {} }
    await env.AURA_IMG.put('backup_index', JSON.stringify(keep));
    return { ok: true, key, tables: tables.length, rows: totalRows };
  } catch (e: any) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

// ─── Handler: Chat IA ─────────────────────────────────────────────
async function handleChat(req: Request, env: Env) {
  if (req.method !== 'POST') return text('AURA chat worker · POST a este endpoint');
  const body: any = await req.json();
  const tenantId = body.tenant_id || 'clinica-elvira';
  const t = await env.aura_db
    .prepare('SELECT * FROM tenants WHERE id=?')
    .bind(tenantId)
    .first<any>();
  // Modo DEMO de ventas: el agente vende AURA a la dueña de la clínica (no asesora de labios)
  const isDemo = (t?.status === 'demo' || t?.plan === 'trial');
  let prompt;
  if (isDemo) {
    prompt = SALES_DEMO_PROMPT +
      `\nNombre de la clínica que está probando: ${t?.name || 'tu clínica'}.`;
  } else {
    prompt = (t?.ai_system_prompt || SYSTEM_BASE) +
      `\nContexto del lead: nombre=${body.context?.name || '-'}, tratamiento=${body.context?.treatment || '-'}, plazo=${body.context?.plazo || '-'}, objecion=${body.context?.objecion || '-'}`;
  }

  const messages = [{ role: 'system', content: prompt }, ...(body.messages || []).slice(-12)];
  const content = await runAI(env, messages, false);
  return json({ content, source: env.OPENAI_KEY ? 'openai' : 'workers-ai' });
}

// ─── Handler: Generador IA desde URL ──────────────────────────────
async function handleGenerate(req: Request, env: Env) {
  const body: any = await req.json();
  const userUrl: string = (body.url || '').trim();
  const userPrompt: string = (body.prompt || '').trim();
  if (!userUrl && !userPrompt) return json({ error: 'missing url or prompt' }, 400);

  // 1) Scrape de la URL (best-effort): nombre, logo, fotos, colores, texto
  let pageText = '';
  let detectedName = '';
  let detectedLogo = '';
  let detectedPhotos: string[] = [];
  let detectedColors: string[] = [];
  let origin = '';
  if (userUrl) {
    try {
      const u = new URL(userUrl.startsWith('http') ? userUrl : 'https://' + userUrl);
      origin = u.origin;
      const r = await fetch(u.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AURA-Bot/1.0)' },
        cf: { cacheTtl: 60 } as any,
      });
      const html = await r.text();
      const abs = (src: string) => { try { return new URL(src, u).toString(); } catch { return ''; } };
      // título / nombre
      const ogSite = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
      const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      detectedName = (ogSite?.[1] || tm?.[1] || '').trim().replace(/\s+/g, ' ').replace(/\s*[|\-–].*$/, '').slice(0, 60);
      // logo: link rel icon/apple-touch / og:image / img con 'logo'
      const appleIcon = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i);
      const icon = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i);
      const logoImg = html.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*(?:alt|class)=["'][^"']*logo[^"']*["']/i) || html.match(/<img[^>]+(?:alt|class)=["'][^"']*logo[^"']*["'][^>]*(?:src|data-src)=["']([^"']+)["']/i);
      const logoCand = abs(logoImg?.[1] || appleIcon?.[1] || icon?.[1] || '');
      detectedLogo = /\.(png|jpe?g|webp|svg)(\?|$)/i.test(logoCand) ? logoCand : '';
      // respaldo fiable: favicon de alta resolucion via Google si no hay logo claro
      if(!detectedLogo){ try{ detectedLogo = 'https://www.google.com/s2/favicons?sz=128&domain=' + u.hostname; }catch(e){} }
      // fotos og:image + primeras imagenes grandes
      const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (ogImg) detectedPhotos.push(abs(ogImg[1]));
      const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi)].map(m => abs(m[1])).filter(Boolean);
      detectedPhotos = Array.from(new Set([...detectedPhotos, ...imgs])).slice(0, 6);
      // colores hex del CSS inline / theme-color
      const theme = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i);
      if (theme) detectedColors.push(theme[1]);
      const hexes = [...html.matchAll(/#([0-9a-fA-F]{6})\b/g)].map(m => '#' + m[1]);
      detectedColors = Array.from(new Set([...detectedColors, ...hexes])).slice(0, 8);
      // texto plano
      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 4000);
    } catch (e) {
      // ignorar; trabajamos con el prompt sólo
    }
  }

  // 2) Generar config con IA
  const sys = `Eres un growth designer experto en clínicas estéticas. Devuelves SOLO JSON válido sin texto extra.`;
  const usr = `A partir de esta información de la clínica genera la configuración del embudo en JSON con este formato exacto:
{
 "name": "Nombre de la clínica",
 "city": "ciudad",
 "doctor_name": "Nombre del doctor o doctora",
 "brand_primary": "#5e1a2a",
 "brand_accent": "#D4A574",
 "ai_system_prompt": "<system prompt corto del asesor en castellano>",
 "treatments": ["labios","botox","rino","hidratacion","perfilado","ojeras","hilos","peelings","depilacion"]
}

URL: ${userUrl}
Prompt del usuario: ${userPrompt}
Nombre detectado: ${detectedName}
Colores detectados en la web: ${detectedColors.join(', ')}
Texto de la web (extracto): ${pageText.slice(0, 2400)}

Usa los colores detectados de la web como brand_primary y brand_accent si son apropiados (evita blancos/negros puros). Devuelve solo el JSON. Si algún campo no se infiere, deja el default.`;

  let configRaw = '{}';
  try {
    configRaw = await runAI(env, [
      { role: 'system', content: sys },
      { role: 'user', content: usr },
    ], true);
  } catch (e) {
    configRaw = '{}';
  }

  let config: any = {};
  try {
    const m = configRaw.match(/\{[\s\S]*\}/);
    config = m ? JSON.parse(m[0]) : {};
  } catch {}

  // Defaults
  const name = (config.name || detectedName || 'Tu clínica').slice(0, 80);
  const tenantId = slugify(name);
  const city = config.city || '';
  const doctorName = config.doctor_name || '';
  const pickColor = (arr: string[]) => arr.find(c => { const h = c.toLowerCase(); return h !== '#ffffff' && h !== '#000000' && h !== '#fff' && h !== '#000'; });
  const brandPrimary = config.brand_primary || pickColor(detectedColors) || '#5e1a2a';
  const brandAccent = config.brand_accent || detectedColors[1] || '#D4A574';
  const aiPrompt = config.ai_system_prompt || SYSTEM_BASE;
  const treatments: string[] = Array.isArray(config.treatments) && config.treatments.length
    ? config.treatments.slice(0, 9)
    : ['labios', 'botox', 'rino', 'hidratacion', 'perfilado', 'ojeras', 'hilos', 'peelings', 'depilacion'];

  // 3) Crear/actualizar tenant
  await env.aura_db
    .prepare(
      `INSERT OR REPLACE INTO tenants (id,name,url,city,doctor_name,brand_primary,brand_accent,ai_system_prompt,status,plan,google_rating,google_reviews,treatments_done)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      tenantId,
      name,
      userUrl || null,
      city,
      doctorName,
      brandPrimary,
      brandAccent,
      aiPrompt,
      'demo',
      'trial',
      4.87,
      0,
      0
    )
    .run();

  // 4) Crear funnels por tratamiento con quiz especializado
  const QUIZ_TEMPLATES: any = {
    labios: {
      headline: 'Tus labios <em>como siempre los soñaste</em>',
      sub: 'Aumento natural y discreto, sin volumen excesivo. Plan a medida con la doctora.',
      lead_magnet: 'Foto-análisis 3D + plan personalizado',
      price_from: 380,
      quiz: [
        { q: '¿qué quieres conseguir?', opt: ['más definición','volumen sutil','hidratación','corregir asimetría'] },
        { q: '¿cómo los quieres?', opt: ['muy naturales','con un poquito más','efecto glow','no lo tengo claro'] },
        { q: '¿para cuándo?', opt: ['esta semana','este mes','2-3 meses','sin prisa'] },
        { q: '¿qué te frena?', opt: ['que se note artificial','el dolor','el precio','la duración'] },
      ],
    },
    botox: {
      headline: 'Borra los signos del tiempo <em>sin perder tu expresión</em>',
      sub: 'Botox sutil para frente, entrecejo y patas de gallo. Resultado natural.',
      lead_magnet: 'Análisis facial + plan personalizado',
      price_from: 280,
      quiz: [
        { q: '¿qué zona te preocupa?', opt: ['frente','entrecejo','patas de gallo','varias zonas'] },
        { q: '¿qué resultado buscas?', opt: ['muy sutil','clásico','no lo tengo claro','reversión gradual'] },
        { q: '¿para cuándo?', opt: ['esta semana','este mes','2-3 meses','sin prisa'] },
        { q: '¿qué te frena?', opt: ['quedar inexpresiva','dolor del pinchazo','precio','la duración'] },
      ],
    },
    rino: {
      headline: 'Corrige tu nariz <em>sin pasar por quirófano</em>',
      sub: 'Rinomodelación con ácido hialurónico. Resultado inmediato y reversible.',
      lead_magnet: 'Foto-análisis 3D del perfil',
      price_from: 480,
      quiz: [
        { q: '¿qué quieres corregir?', opt: ['caballete','punta caída','asimetría','varias cosas'] },
        { q: '¿cuánto cambio quieres?', opt: ['casi imperceptible','equilibrar','redibujar','no lo sé'] },
        { q: '¿para cuándo?', opt: ['esta semana','este mes','2-3 meses','sin prisa'] },
        { q: '¿qué te frena?', opt: ['el resultado','dolor','precio','la reversibilidad'] },
      ],
    },
    hidratacion: {
      headline: 'Piel <em>radiante e hidratada</em> en una sola sesión',
      sub: 'Hydrafacial premium + ácido hialurónico. Resultado en 24 horas.',
      lead_magnet: 'Primera sesión 49€ (90€)',
      price_from: 90,
      quiz: [
        { q: '¿qué quieres mejorar?', opt: ['hidratación','luminosidad','poros','manchas'] },
        { q: '¿cómo tienes la piel?', opt: ['seca','mixta','grasa','sensible'] },
        { q: '¿para cuándo?', opt: ['esta semana','este mes','2-3 meses','sin prisa'] },
        { q: '¿qué te frena?', opt: ['precio','tiempo','no saber qué necesito','dudas'] },
      ],
    },
    perfilado: {
      headline: 'Define tu mandíbula <em>con técnica precisa</em>',
      sub: 'Perfilado mandibular y mentón con ácido hialurónico.',
      lead_magnet: 'Foto-análisis 3D del óvalo facial',
      price_from: 420,
      quiz: [
        { q: '¿qué buscas?', opt: ['definir mandíbula','proyectar mentón','equilibrar perfil','varias zonas'] },
        { q: '¿cuánto cambio?', opt: ['sutil','medio','definido','no lo sé'] },
        { q: '¿para cuándo?', opt: ['esta semana','este mes','2-3 meses','sin prisa'] },
        { q: '¿qué te frena?', opt: ['naturalidad','precio','recuperación','no saber qué necesito'] },
      ],
    },
    ojeras: {
      headline: 'Borra esa cara de cansada <em>aunque duermas 5 horas</em>',
      sub: 'Tratamiento de ojeras con ácido hialurónico de baja densidad.',
      lead_magnet: 'Análisis personalizado de ojeras',
      price_from: 320,
      quiz: [
        { q: '¿qué tipo de ojeras tienes?', opt: ['hundidas','oscuras','bolsa','varias'] },
        { q: '¿desde cuándo?', opt: ['siempre','genéticas','últimos años','no estoy segura'] },
        { q: '¿para cuándo?', opt: ['esta semana','este mes','2-3 meses','sin prisa'] },
        { q: '¿qué te frena?', opt: ['miedo a la zona','precio','recuperación','dudas'] },
      ],
    },
    hilos: {
      headline: 'Reafirma sin cirugía <em>con hilos tensores</em>',
      sub: 'Hilos de PDO o ácido poliláctico. Efecto lifting natural y progresivo.',
      lead_magnet: 'Análisis facial + plan personalizado',
      price_from: 590,
      quiz: [
        { q: '¿qué zona quieres tratar?', opt: ['óvalo','cuello','pómulos','varias'] },
        { q: '¿qué resultado?', opt: ['lifting sutil','definición','reafirmación','no lo sé'] },
        { q: '¿para cuándo?', opt: ['esta semana','este mes','2-3 meses','sin prisa'] },
        { q: '¿qué te frena?', opt: ['recuperación','precio','dolor','dudas'] },
      ],
    },
    peelings: {
      headline: 'Renueva tu piel <em>desde la primera sesión</em>',
      sub: 'Peeling químico médico. Ideal para manchas, marcas y textura.',
      lead_magnet: 'Diagnóstico de piel + plan',
      price_from: 120,
      quiz: [
        { q: '¿qué quieres tratar?', opt: ['manchas','marcas de acné','textura','luminosidad'] },
        { q: '¿tu piel es?', opt: ['clara','media','oscura','muy sensible'] },
        { q: '¿para cuándo?', opt: ['esta semana','este mes','2-3 meses','sin prisa'] },
        { q: '¿qué te frena?', opt: ['recuperación','precio','no saber qué necesito','dudas'] },
      ],
    },
    depilacion: {
      headline: 'Adiós al vello <em>con láser de diodo</em>',
      sub: 'Depilación láser definitiva. Indolora y segura todo el año.',
      lead_magnet: 'Primera sesión axilas 19€',
      price_from: 19,
      quiz: [
        { q: '¿qué zona?', opt: ['piernas','axilas','ingles','cuerpo entero'] },
        { q: '¿qué tipo de vello?', opt: ['fino','medio','grueso','no estoy segura'] },
        { q: '¿para cuándo?', opt: ['esta semana','este mes','2-3 meses','sin prisa'] },
        { q: '¿qué te frena?', opt: ['precio','tiempo','dolor','dudas'] },
      ],
    },
    generic: {
      headline: 'Tu mejor versión <em>empieza aquí</em>',
      sub: 'Plan personalizado con la doctora. Sin compromiso.',
      lead_magnet: 'Valoración + plan personalizado',
      price_from: 0,
      quiz: [
        { q: '¿qué te llevaría a dar el paso?', opt: ['sentirme mejor','evento próximo','informarme','llevo años pensándolo'] },
        { q: '¿qué te interesa más?', opt: ['cara','cuerpo','piel','no lo sé'] },
        { q: '¿para cuándo?', opt: ['esta semana','este mes','2-3 meses','sin prisa'] },
        { q: '¿qué te frena?', opt: ['naturalidad','precio','dudas','dolor'] },
      ],
    },
  };

  for (const tk of treatments) {
    const tpl = QUIZ_TEMPLATES[tk] || QUIZ_TEMPLATES.generic;
    const fid = `${tenantId}__${tk}`;
    await env.aura_db
      .prepare(
        `INSERT OR REPLACE INTO funnels (id,tenant_id,treatment,headline,subheadline,lead_magnet,price_from,quiz_json,status)
         VALUES (?,?,?,?,?,?,?,?, 'active')`
      )
      .bind(fid, tenantId, tk, tpl.headline, tpl.sub, tpl.lead_magnet, tpl.price_from, JSON.stringify(tpl.quiz))
      .run();
  }

  // Generic funnel siempre presente
  const fgen = `${tenantId}__generic`;
  const gen = QUIZ_TEMPLATES.generic;
  await env.aura_db
    .prepare(
      `INSERT OR REPLACE INTO funnels (id,tenant_id,treatment,headline,subheadline,lead_magnet,price_from,quiz_json,status)
       VALUES (?,?,?,?,?,?,?,?, 'active')`
    )
    .bind(fgen, tenantId, 'generic', gen.headline, gen.sub, gen.lead_magnet, gen.price_from, JSON.stringify(gen.quiz))
    .run();

  // Guardar logo y fotos reales detectadas (si las hay)
  if (detectedLogo) {
    try { await env.aura_db.prepare('UPDATE tenants SET logo_url=? WHERE id=?').bind(detectedLogo, tenantId).run(); } catch(e){}
  }

  return json({
    ok: true,
    tenant_id: tenantId,
    name,
    treatments,
    logo: detectedLogo || null,
    photos: detectedPhotos,
    colors: detectedColors,
    brand_primary: brandPrimary,
    brand_accent: brandAccent,
    demo_url: `/c/${tenantId}`,
    dashboard_url: `/dashboard?t=${tenantId}`,
    images_status: 'generating',
  });
}
