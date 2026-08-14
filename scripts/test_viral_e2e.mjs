import fs from 'node:fs/promises';

const API = 'https://aura-chat-worker.adrian-7b9.workers.dev';
const token = process.env.AURA_AUDIT_TOKEN;
if (!token) throw new Error('AURA_AUDIT_TOKEN es obligatorio');

const stamp = Date.now();
const qaTenant = 'aura-demo';
const peerTenant = 'bella-madrid';
const now = new Date();
const jan4 = new Date(now.getFullYear(), 0, 4);
const weekNo = Math.ceil((((now - jan4) / 86400000) + jan4.getDay() + 1) / 7);
const week = `${now.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
const output = { started_at: new Date().toISOString(), week, checks: [], ids: {} };

async function request(path, { method = 'GET', body, tenant } = {}) {
  const url = new URL(API + path);
  if (tenant) url.searchParams.set('tenant', tenant);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(name, condition, detail = {}) {
  output.checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

try {
  const calendar = await request('/api/viral-content', { method: 'POST', body: {
    tenant_id: qaTenant,
    title: `QA Viral Calendario ${stamp}`,
    category: 'viral',
    video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=640&q=80',
    explain_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    explain_text: 'Pieza de prueba automática. No publicada en ninguna red social.',
    week_id: week,
    day_index: 0,
    sort_order: 999,
  }});
  assert('alta de contenido semanal autenticada', calendar.status === 200 && calendar.data.ok, calendar);
  output.ids.content = calendar.data.id;

  const contentList = await request(`/api/viral-content?tenant_id=${encodeURIComponent(qaTenant)}&week=${encodeURIComponent(week)}`, { tenant: qaTenant });
  const item = (contentList.data.items || []).find((row) => row.id === output.ids.content);
  assert('calendario devuelve la pieza del tenant y semana correctos', contentList.status === 200 && Boolean(item) && item.day_index === 0 && item.category === 'viral', { status: contentList.status, item });

  const wrongDelete = await request('/api/viral-content-delete', { method: 'POST', body: { id: output.ids.content, tenant_id: peerTenant }, tenant: peerTenant });
  const afterWrongDelete = await request(`/api/viral-content?tenant_id=${encodeURIComponent(qaTenant)}&week=${encodeURIComponent(week)}`, { tenant: qaTenant });
  assert('una clínica no puede borrar el contenido de otra', wrongDelete.status === 404 && (afterWrongDelete.data.items || []).some((row) => row.id === output.ids.content), { wrongDelete, items: afterWrongDelete.data.items });

  const reelQa = await request('/api/viral-submit', { method: 'POST', body: {
    tenant_id: qaTenant,
    reel_url: `https://example.com/aura-qa-reel-${stamp}`,
    title: `QA Reel Aura ${stamp}`,
    platform: 'instagram',
    views: 1250,
  }, tenant: qaTenant });
  assert('alta de reel propio autenticada', reelQa.status === 200 && reelQa.data.ok, reelQa);
  output.ids.qa_reel = reelQa.data.id;

  const reelPeer = await request('/api/viral-submit', { method: 'POST', body: {
    tenant_id: peerTenant,
    reel_url: `https://example.com/aura-peer-reel-${stamp}`,
    title: `QA Reel Bella ${stamp}`,
    platform: 'tiktok',
    views: 2000,
  }, tenant: peerTenant });
  assert('alta de reel de clínica comparada autenticada', reelPeer.status === 200 && reelPeer.data.ok, reelPeer);
  output.ids.peer_reel = reelPeer.data.id;

  const selfFire = await request('/api/viral-fire', { method: 'POST', body: { reel_id: output.ids.qa_reel, tenant_id: qaTenant }, tenant: qaTenant });
  assert('se bloquea el fuego al propio reel', selfFire.status === 403 && selfFire.data.error === 'own_reel', selfFire);

  const fire = await request('/api/viral-fire', { method: 'POST', body: { reel_id: output.ids.peer_reel, tenant_id: qaTenant }, tenant: qaTenant });
  assert('se permite un fuego entre clínicas', fire.status === 200 && fire.data.ok && fire.data.duplicate === false, fire);
  const duplicateFire = await request('/api/viral-fire', { method: 'POST', body: { reel_id: output.ids.peer_reel, tenant_id: qaTenant }, tenant: qaTenant });
  assert('se bloquea el fuego duplicado de la misma clínica', duplicateFire.status === 200 && duplicateFire.data.duplicate === true, duplicateFire);

  const updateOwn = await request('/api/viral-update-views', { method: 'POST', body: { reel_id: output.ids.qa_reel, tenant_id: qaTenant, views: 3333 }, tenant: qaTenant });
  assert('el dueño actualiza las views de su propio reel', updateOwn.status === 200 && updateOwn.data.ok, updateOwn);
  const updateOther = await request('/api/viral-update-views', { method: 'POST', body: { reel_id: output.ids.peer_reel, tenant_id: qaTenant, views: 999999 }, tenant: qaTenant });
  assert('se bloquea actualizar las views de otra clínica', updateOther.status === 403 && updateOther.data.error === 'not_owner', updateOther);

  const ranking = await request('/api/viral-ranking-monthly');
  const qaRank = (ranking.data.ranking || []).find((row) => row.tenant_id === qaTenant);
  const peerFeed = (ranking.data.reels || []).find((row) => row.id === output.ids.peer_reel);
  assert('ranking mensual agrega las views y feed mantiene el fuego único', ranking.status === 200 && qaRank?.total_views >= 3333 && peerFeed?.fires === 1, { ranking: qaRank, peerFeed });

  const correctDelete = await request('/api/viral-content-delete', { method: 'POST', body: { id: output.ids.content, tenant_id: qaTenant }, tenant: qaTenant });
  const afterDelete = await request(`/api/viral-content?tenant_id=${encodeURIComponent(qaTenant)}&week=${encodeURIComponent(week)}`, { tenant: qaTenant });
  assert('el dueño puede retirar su contenido de QA', correctDelete.status === 200 && !(afterDelete.data.items || []).some((row) => row.id === output.ids.content), { correctDelete, items: afterDelete.data.items });

  output.finished_at = new Date().toISOString();
  output.result = 'passed';
} catch (error) {
  output.finished_at = new Date().toISOString();
  output.result = 'failed';
  output.error = error instanceof Error ? error.message : String(error);
}

await fs.mkdir('/home/ubuntu/aura-presentation/audit/viral', { recursive: true });
await fs.writeFile('/home/ubuntu/aura-presentation/audit/viral/e2e-result.json', JSON.stringify(output, null, 2));
if (output.result !== 'passed') process.exitCode = 1;
