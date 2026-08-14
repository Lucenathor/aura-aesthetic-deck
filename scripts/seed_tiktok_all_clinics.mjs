const api = 'https://aura-chat-worker.adrian-7b9.workers.dev'
const token = process.env.AURA_AUDIT_TOKEN
const week = process.env.AURA_VIRAL_WEEK || '2026-W33'

if (!token) throw new Error('Falta AURA_AUDIT_TOKEN')

const pieces = [
  [0, 'Referencias de labios: educa antes de vender', 'viral', 'https://www.tiktok.com/@lagocisnesestetica/video/7567068572606811413', 'Abre con una referencia visual y convierte la curiosidad en una pregunta clínica.'],
  [1, 'No te hagas los labios sin saber esto', 'autoridad', 'https://www.tiktok.com/@lagocisnesestetica/video/7572258613238992148', 'Usa un aviso corto, una verdad útil y una demostración para reforzar seguridad y criterio.'],
  [2, 'Cuidados después de un relleno de labios', 'autoridad', 'https://www.tiktok.com/@lagocisnesestetica/video/7577451915718479124', 'Explica cuidados prácticos para resolver dudas y construir confianza antes de la valoración.'],
  [3, 'Reacciones reales al relleno: dolor y anestesia', 'viral', 'https://www.tiktok.com/@ipsbeauty/video/7464652953211735329', 'El contraste entre expectativa y reacción real mejora la retención si se comunica con humanidad.'],
  [4, 'Procedimiento estético con CTA aspiracional', 'social', 'https://www.tiktok.com/@soulljess/video/7306648289154321670', 'Muestra una experiencia deseable y termina con una llamada a valoración, agenda o WhatsApp.']
]

const overviewRes = await fetch(`${api}/api/admin-viral-overview?week=${encodeURIComponent(week)}`, {
  headers: { Authorization: `Bearer ${token}` }
})
const overview = await overviewRes.json()
if (!overviewRes.ok || !overview.ok) throw new Error('No se pudieron obtener las clínicas')
const tenantIds = overview.clinics.map(clinic => clinic.id)
if (!tenantIds.length) throw new Error('No hay clínicas para programar')

for (const [day_index, title, category, video_url, explain_text] of pieces) {
  const response = await fetch(`${api}/api/admin-viral-schedule`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_ids: tenantIds, week_id: week, day_index, title, category, video_url, explain_text })
  })
  const result = await response.json()
  if (!response.ok || !result.ok) throw new Error(`Falló ${day_index}: ${JSON.stringify(result)}`)
  console.log(`Día ${day_index + 1}: programado para ${tenantIds.length} clínicas`)
}

console.log(`Programación global finalizada para ${week}`)
