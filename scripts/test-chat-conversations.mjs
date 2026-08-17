#!/usr/bin/env node
/**
 * Simula 15 conversaciones reales con el chat IA del embudo de AURA.
 * Cada conversación tiene un perfil de paciente diferente.
 */
import { writeFileSync } from 'fs';

const WORKER = 'https://aura-chat-worker.adrian-7b9.workers.dev';
const TENANT = 'aura-demo';

const PROFILES = [
  { id: 1, name: 'María', treatment: 'labios', msg: 'hola, estoy interesada en el aumento de labios pero es mi primera vez y me da un poco de miedo', desc: 'Curiosa por labios — primera vez, tiene miedo' },
  { id: 2, name: 'Laura', treatment: 'labios', msg: 'hola cuanto cuesta el aumento de labios?', desc: 'Pregunta precio directamente' },
  { id: 3, name: 'Ana', treatment: 'labios', msg: 'hola, estoy mirando varias clínicas. en otra me lo hacen por 250€, vosotros cuánto cobráis?', desc: 'Compara con otra clínica' },
  { id: 4, name: 'Sofía', treatment: 'labios', msg: 'no sé si es para mí la verdad, me da cosa que se note mucho o que quede raro', desc: 'Indecisa — no sé si es para mí' },
  { id: 5, name: 'Carmen', treatment: 'botox', msg: 'hola buenas, tenéis hueco esta semana para bótox?', desc: 'Tiene prisa — quiere cita ya' },
  { id: 6, name: 'Paula', treatment: 'labios', msg: 'esto es un bot o estoy hablando con una persona real?', desc: 'Desconfiada — ¿es un bot?' },
  { id: 7, name: 'Elena', treatment: 'labios', msg: 'hola! me hice los labios hace 8 meses y quiero un retoque, se puede?', desc: 'Ya se lo hizo antes — quiere retoque' },
  { id: 8, name: 'Lucía', treatment: 'labios', msg: 'me da mucho miedo el dolor, duele mucho el aumento de labios?', desc: 'Pregunta por dolor' },
  { id: 9, name: 'Marta', treatment: 'labios', msg: 'tenéis fotos de antes y después de labios? quiero ver resultados reales', desc: 'Quiere ver resultados' },
  { id: 10, name: 'Claudia', treatment: 'botox', msg: 'ahora mismo no puedo, estoy liada con el trabajo. quizás en septiembre', desc: 'Objeción de tiempo' },
  { id: 11, name: 'Irene', treatment: 'labios', msg: 'hola! me caso en 3 semanas y quiero hacerme los labios antes, da tiempo?', desc: 'Quiere para un evento' },
  { id: 12, name: 'Patricia', treatment: 'labios', msg: 'y si me queda mal? se puede deshacer? tengo miedo de que se note artificial', desc: 'Miedo a efectos secundarios' },
  { id: 13, name: 'Cristina', treatment: 'labios', msg: 'hola! me lo ha recomendado mi amiga Laura que se los hizo con vosotros y le quedaron genial', desc: 'Viene recomendada' },
  { id: 14, name: 'Andrea', treatment: 'labios', msg: 'hola, me gustaría hacerme labios, bótox en la frente y algo para las ojeras. se puede todo junto?', desc: 'Quiere varios tratamientos' },
  { id: 15, name: 'Carlos', treatment: 'botox', msg: 'buenas, soy hombre y estoy interesado en bótox preventivo. hacéis a hombres también?', desc: 'Hombre interesado — romper estigma' },
];

async function chat(messages, context) {
  const r = await fetch(WORKER + '/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ tenant_id: TENANT, messages, context })
  });
  const d = await r.json();
  return d.content || d.error || 'SIN RESPUESTA';
}

async function runConversation(profile) {
  const context = { name: profile.name, treatment: profile.treatment, plazo: '-', objecion: '-' };
  const messages = [];
  const log = [];
  
  // Turno 1: mensaje inicial del paciente
  messages.push({ role: 'user', content: profile.msg });
  log.push({ role: 'paciente', content: profile.msg });
  
  const r1 = await chat(messages, context);
  messages.push({ role: 'assistant', content: r1 });
  log.push({ role: 'ia', content: r1 });
  
  // Turno 2: respuesta del paciente (simulada según perfil)
  let followUp = '';
  switch(profile.id) {
    case 1: followUp = 'es que nunca me he puesto nada y no sé cómo queda'; break;
    case 2: followUp = 'vale pero más o menos cuánto es? para hacerme una idea'; break;
    case 3: followUp = 'es que 250 me parece buen precio, por qué debería ir a vuestra clínica?'; break;
    case 4: followUp = 'es que tengo los labios muy finos y no sé si con ácido hialurónico se puede'; break;
    case 5: followUp = 'sí, el jueves por la mañana me vendría bien'; break;
    case 6: followUp = 'es que no me fío de los bots, prefiero hablar con alguien de verdad'; break;
    case 7: followUp = 'sí, la última vez me pusieron medio vial y quiero completar'; break;
    case 8: followUp = 'es que soy muy sensible al dolor, hay anestesia?'; break;
    case 9: followUp = 'vale, y son resultados naturales? no quiero labios de pato'; break;
    case 10: followUp = 'ya pero es que siempre digo lo mismo y nunca lo hago jaja'; break;
    case 11: followUp = 'genial! y se hincha mucho? porque no quiero ir hinchada a la boda'; break;
    case 12: followUp = 'vale, y cuánto dura el efecto? porque no quiero estar retocándome cada 2 meses'; break;
    case 13: followUp = 'sí! le quedaron super naturales. yo quiero algo parecido, un poquito de volumen'; break;
    case 14: followUp = 'vale, y cuánto costaría todo junto más o menos?'; break;
    case 15: followUp = 'genial, es que tengo arrugas en la frente y quiero prevenirlas antes de que vayan a más'; break;
  }
  
  messages.push({ role: 'user', content: followUp });
  log.push({ role: 'paciente', content: followUp });
  
  const r2 = await chat(messages, context);
  messages.push({ role: 'assistant', content: r2 });
  log.push({ role: 'ia', content: r2 });
  
  // Turno 3: cierre o última objeción
  let closing = '';
  switch(profile.id) {
    case 1: closing = 'vale, me lo pienso y os digo algo'; break;
    case 2: closing = 'ok, y la valoración es gratis?'; break;
    case 3: closing = 'mmm vale, me lo pienso'; break;
    case 4: closing = 'bueno, podría ir a que me vean sin compromiso?'; break;
    case 5: closing = 'perfecto, apúntame'; break;
    case 6: closing = 'bueno vale, y cómo reservo?'; break;
    case 7: closing = 'genial, cuándo podría ir?'; break;
    case 8: closing = 'ah vale, entonces no se siente nada? me quedo más tranquila'; break;
    case 9: closing = 'vale me convence, cómo reservo la valoración?'; break;
    case 10: closing = 'tienes razón, a ver si me animo. qué tengo que hacer?'; break;
    case 11: closing = 'perfecto, pues quiero reservar cuanto antes'; break;
    case 12: closing = 'ok, me quedo más tranquila. puedo ir a una valoración?'; break;
    case 13: closing = 'genial! pues quiero pedir cita, cuándo tenéis hueco?'; break;
    case 14: closing = 'vale, pues me gustaría una valoración para ver todo'; break;
    case 15: closing = 'genial, pues quiero reservar. tenéis hueco pronto?'; break;
  }
  
  messages.push({ role: 'user', content: closing });
  log.push({ role: 'paciente', content: closing });
  
  const r3 = await chat(messages, context);
  messages.push({ role: 'assistant', content: r3 });
  log.push({ role: 'ia', content: r3 });
  
  return { profile, log };
}

async function main() {
  console.log('🧪 Iniciando 15 conversaciones de prueba con el chat IA del embudo...\n');
  const results = [];
  
  for (const p of PROFILES) {
    console.log(`  [${p.id}/15] ${p.desc}...`);
    try {
      const r = await runConversation(p);
      results.push(r);
    } catch(e) {
      console.error(`  ❌ Error en conversación ${p.id}: ${e.message}`);
      results.push({ profile: p, log: [{ role: 'error', content: e.message }] });
    }
    // Pausa entre conversaciones para no saturar
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Generar informe
  let report = '# Informe: 15 Conversaciones de Prueba con el Chat IA de AURA\n\n';
  report += `Fecha: ${new Date().toISOString().split('T')[0]}\n`;
  report += `Modelo: GPT-5.6 Sol (fallback: GPT-5.6 Terra)\n`;
  report += `Tenant: ${TENANT}\n\n---\n\n`;
  
  for (const r of results) {
    report += `## Conversación ${r.profile.id}: ${r.profile.desc}\n\n`;
    report += `**Paciente:** ${r.profile.name} | **Tratamiento:** ${r.profile.treatment}\n\n`;
    for (const m of r.log) {
      if (m.role === 'paciente') {
        report += `> **🧑 Paciente:** ${m.content}\n\n`;
      } else if (m.role === 'ia') {
        report += `**🤖 AURA:** ${m.content}\n\n`;
      } else {
        report += `**❌ Error:** ${m.content}\n\n`;
      }
    }
    report += '---\n\n';
  }
  
  writeFileSync('/home/ubuntu/aura-presentation/INFORME-CHAT-15-CONVERSACIONES.md', report);
  console.log('\n✅ Informe guardado en INFORME-CHAT-15-CONVERSACIONES.md');
}

main().catch(e => { console.error(e); process.exit(1); });
