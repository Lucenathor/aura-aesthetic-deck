import https from 'https';
import fs from 'fs';

const WORKER = 'https://aura-chat-worker.adrian-7b9.workers.dev/chat';
const TENANT = 'aura-demo';

const scenarios = [
  // BLOQUE 1: Preguntas directas
  {name:'Laura',treatment:'labios',msg:'hola, cuanto cuesta el aumento de labios?',tag:'precio-directo'},
  {name:'Marta',treatment:'botox',msg:'me interesa el botox pero no se cuanto cuesta',tag:'precio-indirecto'},
  {name:'Paula',treatment:'labios',msg:'quiero hacerme los labios, que opciones teneis?',tag:'opciones'},
  {name:'Ana',treatment:'rellenos',msg:'hola buenas, quiero rellenarme las ojeras',tag:'consulta-ojeras'},
  {name:'Carmen',treatment:'labios',msg:'vi vuestro anuncio en instagram y me interesa',tag:'desde-anuncio'},
  // BLOQUE 2: Objeciones de precio
  {name:'Lucía',treatment:'labios',msg:'280 euros me parece caro para unos labios',tag:'objecion-caro'},
  {name:'Elena',treatment:'botox',msg:'en otra clinica me lo hacen por 150',tag:'competencia-precio'},
  {name:'Raquel',treatment:'labios',msg:'no puedo permitirmelo ahora mismo',tag:'sin-dinero'},
  // BLOQUE 3: Miedo y desconfianza
  {name:'Irene',treatment:'labios',msg:'tengo miedo de que me quede mal o artificial',tag:'miedo-resultado'},
  {name:'Sara',treatment:'botox',msg:'me da panico las agujas',tag:'miedo-agujas'},
  {name:'Nuria',treatment:'labios',msg:'una amiga se los hizo en otro sitio y le quedaron fatal',tag:'mala-experiencia-ajena'},
  {name:'Diana',treatment:'labios',msg:'esto es un bot o estoy hablando con alguien real?',tag:'desconfia-bot'},
  {name:'Cristina',treatment:'rellenos',msg:'como se que la doctora es buena?',tag:'desconfia-profesional'},
  // BLOQUE 4: Indecisión
  {name:'María',treatment:'labios',msg:'me lo pienso y os digo algo vale?',tag:'me-lo-pienso'},
  {name:'Alicia',treatment:'botox',msg:'no se si es el momento, quizas mas adelante',tag:'no-es-momento'},
  {name:'Bea',treatment:'labios',msg:'tengo que consultarlo con mi pareja',tag:'consultar-pareja'},
  // BLOQUE 5: Urgencia y eventos
  {name:'Claudia',treatment:'labios',msg:'tengo una boda en 3 semanas y quiero hacerme los labios',tag:'evento-boda'},
  {name:'Patricia',treatment:'botox',msg:'me voy de vacaciones el mes que viene y quiero estar perfecta',tag:'evento-vacaciones'},
  // BLOQUE 6: Recomendaciones
  {name:'Silvia',treatment:'labios',msg:'me lo recomendo mi amiga carmen que se los hizo aqui',tag:'recomendada'},
  {name:'Julia',treatment:'rellenos',msg:'vi las fotos de una amiga y quiero lo mismo',tag:'quiere-igual'},
  // BLOQUE 7: Hombres
  {name:'Carlos',treatment:'botox',msg:'hola, soy hombre y me interesa el botox, es raro?',tag:'hombre-duda'},
  {name:'David',treatment:'rellenos',msg:'quiero quitarme las ojeras, se puede?',tag:'hombre-ojeras'},
  // BLOQUE 8: Preguntas técnicas
  {name:'Mónica',treatment:'labios',msg:'cuanto dura el efecto del acido hialuronico?',tag:'duracion'},
  {name:'Teresa',treatment:'botox',msg:'que efectos secundarios tiene el botox?',tag:'efectos-secundarios'},
  {name:'Rosa',treatment:'labios',msg:'se puede hacer si estoy dando el pecho?',tag:'lactancia'},
  // BLOQUE 9: Seguimiento
  {name:'Inés',treatment:'labios',msg:'ya me los hice hace 8 meses y quiero retoque',tag:'retoque'},
  {name:'Lola',treatment:'botox',msg:'hace un año que me hice botox y quiero repetir',tag:'repetir'},
  // BLOQUE 10: Varios tratamientos
  {name:'Eva',treatment:'labios',msg:'quiero labios y tambien me interesa el botox en la frente',tag:'varios'},
  {name:'Pilar',treatment:'rellenos',msg:'quiero un plan completo de rejuvenecimiento facial',tag:'plan-completo'},
  // BLOQUE 11: Disponibilidad
  {name:'Noelia',treatment:'labios',msg:'teneis hueco esta semana?',tag:'disponibilidad'},
];

async function chat(scenario) {
  const body = JSON.stringify({
    tenant_id: TENANT,
    messages: [{ role: 'user', content: scenario.msg }],
    context: { name: scenario.name, treatment: scenario.treatment }
  });
  return new Promise((resolve) => {
    const req = https.request(WORKER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).content || 'SIN RESPUESTA'); }
        catch(e) { resolve('ERROR: ' + data.slice(0,200)); }
      });
    });
    req.on('error', e => resolve('ERROR: ' + e.message));
    req.write(body);
    req.end();
  });
}

async function main() {
  const results = [];
  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    process.stdout.write(`[${i+1}/30] ${s.tag}...`);
    const resp = await chat(s);
    results.push({ ...s, response: resp });
    process.stdout.write(' ✓\n');
    await new Promise(r => setTimeout(r, 2000)); // rate limit
  }
  
  // Generar informe
  let md = '# Informe: 30 Conversaciones del Chat IA con Arsenal del Setter\n\n';
  md += `**Fecha:** ${new Date().toISOString().slice(0,10)}\n`;
  md += `**Modelo:** GPT-5.6 Sol\n`;
  md += `**Arsenal activo:** Sí (doctora, especialidad, experiencia, USP, precio, fotos, vídeo, reseña, enlace reserva)\n\n`;
  md += '---\n\n';
  
  let score = 0;
  for (const r of results) {
    md += `## ${r.tag}\n`;
    md += `**Paciente:** ${r.name} | **Tratamiento:** ${r.treatment}\n`;
    md += `**Mensaje:** "${r.msg}"\n\n`;
    md += `**Respuesta IA:**\n> ${r.response}\n\n`;
    
    // Scoring automático
    const resp = r.response.toLowerCase();
    let pts = 5; // base
    if (resp.includes('jueves') || resp.includes('viernes') || resp.includes('lunes') || resp.includes('martes') || resp.includes('miércoles')) pts += 1; // cierre con opciones
    if (resp.includes(r.name.toLowerCase())) pts += 1; // usa el nombre
    if (resp.includes('http')) pts += 1; // envía recurso
    if (resp.length < 300) pts += 1; // mensaje corto
    if (!resp.includes('!')) pts += 1; // sin exclamaciones
    score += Math.min(pts, 10);
    md += `**Puntuación:** ${Math.min(pts, 10)}/10\n\n---\n\n`;
  }
  
  const avg = (score / results.length).toFixed(1);
  md += `\n## RESUMEN\n\n`;
  md += `| Métrica | Valor |\n|---|---|\n`;
  md += `| Conversaciones probadas | ${results.length} |\n`;
  md += `| Puntuación media | **${avg}/10** |\n`;
  md += `| Respuestas con recurso (foto/vídeo/enlace) | ${results.filter(r=>r.response.includes('http')).length} |\n`;
  md += `| Respuestas con nombre del paciente | ${results.filter(r=>r.response.toLowerCase().includes(r.name.toLowerCase())).length} |\n`;
  md += `| Respuestas con cierre (día concreto) | ${results.filter(r=>/jueves|viernes|lunes|martes|miércoles|sábado/.test(r.response.toLowerCase())).length} |\n`;
  md += `| Respuestas cortas (<200 chars) | ${results.filter(r=>r.response.length<200).length} |\n`;
  
  fs.writeFileSync('/home/ubuntu/aura-presentation/INFORME-30-CONVERSACIONES.md', md);
  console.log(`\n✅ Informe generado: INFORME-30-CONVERSACIONES.md`);
  console.log(`📊 Puntuación media: ${avg}/10`);
}

main().catch(console.error);
