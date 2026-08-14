const api = 'https://aura-chat-worker.adrian-7b9.workers.dev'
const token = process.env.AURA_AUDIT_TOKEN
const week = process.env.AURA_VIRAL_WEEK || '2026-W33'

if (!token) {
  throw new Error('Falta AURA_AUDIT_TOKEN')
}

const items = [
  {
    day_index: 0,
    title: 'Referencias de labios: educa antes de vender',
    category: 'viral',
    video_url: 'https://www.tiktok.com/@lagocisnesestetica/video/7567068572606811413',
    explain_text: 'Abre con una referencia visual y convierte la curiosidad en una pregunta clínica. Adáptalo mostrando qué se valora antes de un tratamiento.'
  },
  {
    day_index: 1,
    title: 'No te hagas los labios sin saber esto',
    category: 'autoridad',
    video_url: 'https://www.tiktok.com/@lagocisnesestetica/video/7572258613238992148',
    explain_text: 'Usa un aviso corto, una verdad útil y una demostración. El objetivo es posicionar a la clínica como la opción segura y profesional.'
  },
  {
    day_index: 2,
    title: 'Cuidados después de un relleno de labios',
    category: 'autoridad',
    video_url: 'https://www.tiktok.com/@lagocisnesestetica/video/7577451915718479124',
    explain_text: 'El contenido post-tratamiento reduce dudas y genera autoridad. Cierra con una recomendación práctica y una invitación a valoración.'
  },
  {
    day_index: 3,
    title: 'Reacciones reales al relleno: dolor y anestesia',
    category: 'viral',
    video_url: 'https://www.tiktok.com/@ipsbeauty/video/7464652953211735329',
    explain_text: 'El contraste entre expectativa y reacción real genera retención. Mantén el tono humano, explica el proceso y evita promesas absolutas.'
  },
  {
    day_index: 4,
    title: 'Procedimiento estético con CTA aspiracional',
    category: 'social',
    video_url: 'https://www.tiktok.com/@soulljess/video/7306648289154321670',
    explain_text: 'Muestra una experiencia deseable y termina con una llamada a la acción concreta: valoración, agenda o WhatsApp de la clínica.'
  }
]

for (const item of items) {
  const response = await fetch(`${api}/api/admin-viral-schedule`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tenant_id: 'aura-demo', week_id: week, ...item })
  })
  const result = await response.json()
  if (!response.ok || !result.ok) {
    throw new Error(`No se pudo guardar el día ${item.day_index}: ${JSON.stringify(result)}`)
  }
  console.log(`Día ${item.day_index + 1}: ${result.updated ? 'actualizado' : 'creado'}`)
}

console.log(`TikToks de prueba programados en aura-demo para ${week}`)
