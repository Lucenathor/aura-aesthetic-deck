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
  const body: any = { message, tpoa: (sender || 'AURA').slice(0, 11), recipient: [{ msisdn }] };
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

      // Servir imágenes: primero R2, fallback a KV (compatibilidad con imágenes antiguas)
      if (p.startsWith('/img/')) {
        const k = p.slice(5);
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
        const r = await env.aura_db.prepare('SELECT * FROM calendar_config WHERE tenant_id=?').bind(tenant).first();
        return json({ config: r || { tenant_id: tenant, days: '1,2,3,4,5', start_hour: 10, end_hour: 19, slot_min: 30, professional: '' } });
      }
      // Calendario: guardar config
      if (p === '/api/calendar' && req.method === 'POST') {
        const b: any = await req.json();
        await env.aura_db.prepare(
          `INSERT INTO calendar_config (tenant_id,days,start_hour,end_hour,slot_min,professional,updated_at)
           VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)
           ON CONFLICT(tenant_id) DO UPDATE SET days=excluded.days,start_hour=excluded.start_hour,end_hour=excluded.end_hour,slot_min=excluded.slot_min,professional=excluded.professional,updated_at=CURRENT_TIMESTAMP`
        ).bind(b.tenant_id, b.days||'1,2,3,4,5', b.start_hour||10, b.end_hour||19, b.slot_min||30, b.professional||'').run();
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
        const mb: any = await env.aura_db.prepare("SELECT role,name FROM team_members WHERE email=? AND tenant_id=? AND status='active'").bind(s.email, s.tenant_id).first();
        const role = mb?.role || 'owner';
        return json({ auth:true, email: s.email, tenant_id: s.tenant_id, role, member_name: mb?.name || null });
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
        reactivation: '{clinica}: {nombre}, tu valoración sigue disponible. Tengo hueco {proximo_dia}, te lo guardo: {link}',
        recall_sale: '{clinica}: {nombre}, toca tu revisión para mantener el resultado. Tengo hueco {proximo_dia}, reserva aquí: {link}'
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
        await env.aura_db.prepare('UPDATE leads SET call_result=? WHERE id=?').bind(b.result||'contactado', b.lead_id).run();
        return json({ ok:true });
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
          let days = 180; // por defecto exacto
          if (nm.includes('labio')) days = isFirst ? 180 : 270;       // 6 / 9 meses exactos
          else if (nm.includes('botox') || nm.includes('arrug')) days = 90;   // 3 meses
          else if (nm.includes('hidrat') || nm.includes('peel') || nm.includes('piel')) days = 45;
          else if (nm.includes('rino') || nm.includes('mand') || nm.includes('ojera') || nm.includes('relleno')) days = 270;
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
        } else if (b.action === 'change') {
          await env.aura_db.prepare("UPDATE appointments SET confirmed=-1 WHERE lead_id=? AND status='booked'").bind(b.lead).run();
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
          .bind(id, b.tenant_id, b.lead_id, b.treatment || null, b.date_iso, b.duration_min || 30, 'booked')
          .run();
        await env.aura_db
          .prepare(`UPDATE leads SET status='booked',temperature='hot' WHERE id=?`)
          .bind(b.lead_id)
          .run();
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
        // Vino: marcar cita atendida + lead cliente
        if (apptId) await env.aura_db.prepare("UPDATE appointments SET status='attended' WHERE id=?").bind(apptId).run();
        await env.aura_db.prepare("UPDATE leads SET status='client' WHERE id=?").bind(leadId).run();
        // Registrar tratamiento/pago si viene
        const tname = b.treatment || 'Tratamiento';
        const amount = Number(b.amount)||0;
        // Inventario ligero: descontar producto usado y calcular coste para el margen
        let prodCost = 0;
        if (b.product_id && b.product_qty) {
          try {
            const prod: any = await env.aura_db.prepare('SELECT * FROM products WHERE id=? AND tenant_id=?').bind(b.product_id, tenantId).first();
            if (prod) {
              const qty = Number(b.product_qty)||0;
              prodCost = (Number(prod.cost)||0) * qty;
              await env.aura_db.prepare('UPDATE products SET stock = stock - ? WHERE id=?').bind(qty, b.product_id).run();
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
          return json({ ok:true, result:'client_rebooked', next_appt: nid });
        }
        let recallMsg = '{clinica}: {nombre}, tu tratamiento ya pide un repaso para seguir luciéndolo. Resérvalo gratis aquí: {link}';
        if (nm.includes('labio')) recallMsg = '{clinica}: {nombre}, tus labios ya están perdiendo volumen. No esperes a que bajen del todo: te guardo hueco para mantenerlos perfectos. Reserva en 1 toque: {link}';
        else if (nm.includes('botox') || nm.includes('arrug')) recallMsg = '{clinica}: {nombre}, el efecto de tu botox está a punto de irse y las arrugas vuelven. Renuévalo antes de que se note. Reserva aquí: {link}';
        else if (nm.includes('hidrat') || nm.includes('peel') || nm.includes('piel')) recallMsg = '{clinica}: {nombre}, tu piel necesita su sesión de mantenimiento para seguir luminosa. Te guardo hueco esta semana: {link}';
        else if (nm.includes('rino') || nm.includes('mand') || nm.includes('ojera') || nm.includes('relleno')) recallMsg = '{clinica}: {nombre}, tu resultado empieza a reabsorberse. Una revisión ahora lo mantiene impecable. Reserva aquí: {link}';
        await env.aura_db.prepare("UPDATE leads SET recall_date=?, recall_type='venta', recall_msg=?, recall_sms_sent=0 WHERE id=?").bind(rd.toISOString().slice(0,10), recallMsg, leadId).run();
        return json({ ok:true, result:'client', recall_date: rd.toISOString().slice(0,10) });
      }

      // PROFESIONALES (recursos del calendario)
      if (p === '/api/professionals' && req.method === 'GET') {
        const tenant = url.searchParams.get('tenant');
        const r = await env.aura_db.prepare('SELECT * FROM professionals WHERE tenant_id=? ORDER BY created_at').bind(tenant).all();
        return json({ professionals: r.results });
      }
      if (p === '/api/professionals' && req.method === 'POST') {
        const b:any = await req.json();
        if (b.delete) { await env.aura_db.prepare('DELETE FROM professionals WHERE id=?').bind(b.delete).run(); return json({ok:true}); }
        const id = 'pr_'+uid();
        const colors=['#9B7BFF','#FF6B5A','#34a877','#d9a23a','#3a8fd9','#c0568f'];
        await env.aura_db.prepare('INSERT INTO professionals (id,tenant_id,name,color,created_at) VALUES (?,?,?,?,?)').bind(id, b.tenant_id, b.name||'Profesional', b.color||colors[Math.floor(Math.random()*colors.length)], Date.now()).run();
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
  // Cron: backup (1 vez/día a las 3h) + automatizaciones SMS (cada hora)
  async scheduled(event: any, env: Env, ctx: any) {
    const hour = new Date().getUTCHours();
    if (hour === 3) ctx.waitUntil(runBackup(env).catch((e:any)=>console.error('backup error', e)));
    ctx.waitUntil(runAutomations(env).catch((e:any)=>console.error('automations error', e)));
  },
};

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
    reactivation: '{clinica}: {nombre}, tu valoración sigue disponible. Tengo hueco {proximo_dia}, te lo guardo: {link}',
    recall_sale: '{clinica}: {nombre}, toca tu revisión para mantener el resultado. Tengo hueco {proximo_dia}, reserva aquí: {link}'
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
    for (const a of (appts.results||[])) {
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
      // 24h exactas (ventana técnica de 1h del cron: 23-24h)
      if (!a.sms_24h && diffH <= 24 && diffH > 23) {
        if (apptClosed) { await env.aura_db.prepare('UPDATE appointments SET sms_24h=1 WHERE id=?').bind(a.id).run(); }
        else { const r = await sendSMS(env, a.lead_phone, fill(T.reminder_24h, vars), tn.name||'AURA', a.tenant_id);
          if (r.ok) { await env.aura_db.prepare('UPDATE appointments SET sms_24h=1 WHERE id=?').bind(a.id).run(); sent++; } }
      }
      // 2h exactas (ventana técnica de 1h del cron: 1-2h)
      if (!a.sms_2h && diffH <= 2 && diffH > 1) {
        if (apptClosed) { await env.aura_db.prepare('UPDATE appointments SET sms_2h=1 WHERE id=?').bind(a.id).run(); }
        else { const r = await sendSMS(env, a.lead_phone, fill(T.reminder_2h, vars), tn.name||'AURA', a.tenant_id);
          if (r.ok) { await env.aura_db.prepare('UPDATE appointments SET sms_2h=1 WHERE id=?').bind(a.id).run(); sent++; } }
      }
      // no-show: 2h exactas después de la cita (ventana 2-3h), si sigue booked
      if (!a.sms_noshow && diffH <= -2 && diffH > -3) {
        const r = await sendSMS(env, a.lead_phone, fill(T.no_show, vars), tn.name||'AURA', a.tenant_id);
        if (r.ok) { await env.aura_db.prepare('UPDATE appointments SET sms_noshow=1 WHERE id=?').bind(a.id).run(); sent++; }
      }
    }
    // 2) Reactivación de leads no reservados (día 3 y 7) — EXCLUYE clientes con recall (ya son clientes, no leads fríos)
    const leads: any = await env.aura_db.prepare("SELECT * FROM leads WHERE status!='booked' AND phone IS NOT NULL AND (recall_type IS NULL OR recall_type!='venta')").all();
    for (const l of (leads.results||[])) {
      const created = new Date(l.created_at); const days = (nowUTC.getTime()-created.getTime())/86400000;
      const tn: any = await tenant(l.tenant_id); if(!tn) continue;
      const T = await tpl(l.tenant_id);
      const mlink = await magicLink(env, l.tenant_id, l.id);
      // Apuntamos SIEMPRE al próximo día abierto (anuncios 24/7: nunca dejamos enfriar al lead).
      const prox = await proximoDiaFor(l.tenant_id);
      const vars = { clinica: tn.name||'', nombre: l.name||'', link: mlink, tel:(tn.whatsapp||''), proximo_dia: prox || 'esta semana' };
      if (!l.react_d3 && days >= 3 && days < 3.0417) {
        if (!prox) continue; // sin ningún día abierto en el horizonte: espera al siguiente cron
        const r = await sendSMS(env, l.phone, fill(T.reactivation, vars), tn.name||'AURA', l.tenant_id);
        if (r.ok) { await env.aura_db.prepare('UPDATE leads SET react_d3=1 WHERE id=?').bind(l.id).run(); sent++; }
      } else if (!l.react_d7 && days >= 7 && days < 7.0417) {
        if (!prox) continue;
        const r = await sendSMS(env, l.phone, fill(T.reactivation, vars), tn.name||'AURA', l.tenant_id);
        if (r.ok) { await env.aura_db.prepare('UPDATE leads SET react_d7=1 WHERE id=?').bind(l.id).run(); sent++; }
      }
    }
    // 3) Recall de nueva venta: recall_date vencido y tipo venta, SMS una vez
    const recalls: any = await env.aura_db.prepare("SELECT * FROM leads WHERE recall_type='venta' AND recall_date IS NOT NULL AND (recall_sms_sent IS NULL OR recall_sms_sent=0) AND phone IS NOT NULL").all();
    const todayStr = nowUTC.toISOString().slice(0,10);
    for (const l of (recalls.results||[])) {
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
    }
  }
  return { ok: true, sent };
}

// ─── BACKUP: exporta todas las tablas D1 a JSON y lo guarda en KV con fecha + retención 30 días ───
async function runBackup(env: Env): Promise<{ ok: boolean; key?: string; tables?: number; rows?: number; error?: string }> {
  try {
    const tables = ['tenants','funnels','leads','messages','appointments','consultations','lead_analyses','users','team_members','sms_templates','pipeline_config','calendar_config','schedule_by_day','vacations','professionals','time_blocks','waitlist','treatments_log','owners','products','bonos'];
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
  const prompt =
    (t?.ai_system_prompt || SYSTEM_BASE) +
    `\nContexto del lead: nombre=${body.context?.name || '-'}, tratamiento=${body.context?.treatment || '-'}, plazo=${body.context?.plazo || '-'}, objecion=${body.context?.objecion || '-'}`;

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
