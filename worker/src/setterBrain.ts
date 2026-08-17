/**
 * Setter Brain · Núcleo conversacional de AURA
 *
 * Este archivo no genera respuestas por sí mismo. Determina la etapa,
 * información pendiente, recursos apropiados y límites clínicos antes de que
 * el modelo redacte una respuesta natural en español.
 */

export type SetterStage = 'apertura' | 'descubrimiento' | 'informar' | 'resolver' | 'reserva' | 'nutrir' | 'derivar';
export type SetterAction =
  | 'preguntar_objetivo'
  | 'preguntar_plazo'
  | 'preguntar_duda'
  | 'responder_precio'
  | 'explicar_proceso'
  | 'compartir_prueba_social'
  | 'compartir_guia'
  | 'proponer_reserva'
  | 'enviar_enlace_reserva'
  | 'derivar_equipo'
  | 'seguimiento_valor';

export interface SetterResource {
  treatment?: string;
  before_after_url?: string | null;
  before_after_caption?: string | null;
  video_url?: string | null;
  video_caption?: string | null;
  review_text?: string | null;
  review_author?: string | null;
  price_from?: number | null;
  price_to?: number | null;
  duration_text?: string | null;
  recovery_text?: string | null;
  tips?: string | null;
  faq_json?: string | null;
  is_demo?: number | null;
  consent_verified?: number | null;
  source_status?: string | null;
}

export interface SetterMemory {
  stage?: SetterStage;
  objective?: string;
  timeframe?: string;
  objection?: string;
  resourceHistory?: string[];
  messageCount?: number;
  humanHandoff?: boolean;
}

export interface SetterAssessment {
  stage: SetterStage;
  nextAction: SetterAction;
  objective?: string;
  objection?: string;
  flags: string[];
  resourceType?: 'foto' | 'video' | 'resena' | 'precio' | 'guia';
  needsHuman: boolean;
  reason: string;
}

const MEDICAL_ESCALATION = /embaraz|lactan|amamant|alerg|contraindica|medicaci[oó]n|anticoagul|complicaci[oó]n|infecci[oó]n|dolor fuerte|urgencia|efecto secundario|reacci[oó]n|enfermedad|diagnostic|condici[oó]n.*piel|problema.*piel/i;
const HUMAN_REQUEST = /hablar con (una )?(persona|doctora|doctor|recepci[oó]n|alguien)|humano|ll[aá]mame/i;
const BOOKING_SIGNAL = /reserv|cita|hueco|disponib|cu[aá]ndo puedo|agenda|jueves|viernes|lunes|martes|mi[eé]rcoles|s[aá]bado/i;
const PRICE_SIGNAL = /precio|cu[aá]nto cuesta|caro|barato|presupuesto|euros|€/i;
const RESULTS_SIGNAL = /foto|resultado|antes y despu[eé]s|c[oó]mo queda|natural|ejemplo|caso/i;
const TRUST_SIGNAL = /miedo|fiarme|conf[ií]o|seguro|seguridad|me quedar[aá] mal|artificial|doctora.*buena|experiencia/i;
const TIMING_SIGNAL = /boda|evento|vacaciones|pronto|esta semana|urgente|cumple|viaje/i;
const THINKING_SIGNAL = /me lo pienso|pensarlo|m[aá]s adelante|no s[eé]|dudas|consultarlo/i;

function has(text: string, pattern: RegExp) { return pattern.test(text); }

function clean(value?: string) { return (value || '').trim().replace(/\s+/g, ' '); }

export function assessSetterConversation(messages: Array<{ role?: string; content?: string }>, memory: SetterMemory = {}): SetterAssessment {
  const userText = messages.filter(m => m.role === 'user').map(m => m.content || '').join(' ').toLowerCase();
  const userTurns = messages.filter(m => m.role === 'user');
  const latest = clean((userTurns.length ? userTurns[userTurns.length - 1].content : '') || '').toLowerCase();
  const flags: string[] = [];

  if (has(latest, MEDICAL_ESCALATION) || has(latest, HUMAN_REQUEST)) {
    flags.push(has(latest, HUMAN_REQUEST) ? 'solicita_persona' : 'consulta_clinica_sensible');
    return { stage:'derivar', nextAction:'derivar_equipo', flags, needsHuman:true, reason:'La conversación requiere criterio humano o clínico.' };
  }

  if (has(latest, PRICE_SIGNAL)) {
    flags.push('precio');
    return { stage:'informar', nextAction:'responder_precio', objection:'precio', flags, needsHuman:false, resourceType:'precio', reason:'La pregunta explícita de precio necesita transparencia y una pregunta de contexto.' };
  }

  if (has(latest, RESULTS_SIGNAL)) {
    flags.push('busca_resultados');
    return { stage:'informar', nextAction:'compartir_prueba_social', flags, needsHuman:false, resourceType:'foto', reason:'El lead necesita evidencia visual o expectativas realistas.' };
  }

  if (has(latest, TRUST_SIGNAL)) {
    flags.push('confianza');
    return { stage:'resolver', nextAction:'compartir_prueba_social', objection:'confianza', flags, needsHuman:false, resourceType:'video', reason:'La prioridad es reducir incertidumbre antes de hablar de reserva.' };
  }

  if (has(latest, THINKING_SIGNAL)) {
    flags.push('indecision');
    return { stage:'resolver', nextAction:'preguntar_duda', objection:'indecisión', flags, needsHuman:false, resourceType:'guia', reason:'Conviene descubrir la duda pendiente, no forzar una fecha.' };
  }

  if (has(latest, BOOKING_SIGNAL) || (memory.stage === 'resolver' && (memory.messageCount || 0) >= 3)) {
    flags.push('intencion_reserva');
    return { stage:'reserva', nextAction:'proponer_reserva', flags, needsHuman:false, reason:'El lead ha señalado disposición a avanzar; es apropiado proponer una siguiente acción real.' };
  }

  if (has(latest, TIMING_SIGNAL)) {
    flags.push('plazo');
    return { stage:'descubrimiento', nextAction:'preguntar_plazo', flags, needsHuman:false, reason:'El plazo es relevante para orientar sin hacer una afirmación clínica.' };
  }

  const numberOfUserTurns = userTurns.length;
  if (numberOfUserTurns <= 1 && !memory.objective) {
    return { stage:'descubrimiento', nextAction:'preguntar_objetivo', flags, needsHuman:false, reason:'Falta conocer el objetivo estético principal antes de recomendar el siguiente paso.' };
  }

  if (memory.stage === 'reserva') {
    return { stage:'reserva', nextAction:'enviar_enlace_reserva', flags, needsHuman:false, reason:'La conversación ya tiene suficiente contexto para facilitar una reserva sin fricción.' };
  }

  return { stage:'descubrimiento', nextAction:'preguntar_duda', flags, needsHuman:false, reason:'Mantener una conversación breve con una pregunta útil antes de presentar la reserva.' };
}

export function buildSetterBrainInstructions(input: {
  assessment: SetterAssessment;
  memory: SetterMemory;
  resource?: SetterResource | null;
  assistantName?: string;
  bookingUrl?: string;
  bookingMode?: string;
  tone?: string;
  maxSentences?: number;
}): string {
  const { assessment, memory, resource, assistantName = 'la asistente de la clínica', bookingUrl, bookingMode = 'when_ready', tone = 'cálido y profesional', maxSentences = 3 } = input;
  const previous = (memory.resourceHistory || []).join(', ') || 'ninguno';
  const verified = resource && Number(resource.consent_verified) === 1 && resource.source_status === 'approved' && Number(resource.is_demo) !== 1;
  const resourceRules = verified
    ? `RECURSOS VERIFICADOS DISPONIBLES: foto=${resource?.before_after_url || '-'}; vídeo=${resource?.video_url || '-'}; reseña=${resource?.review_text ? 'sí' : '-'}; precio=${resource?.price_from ? `${resource.price_from}-${resource.price_to || ''}€` : '-'}; duración=${resource?.duration_text || '-'}; recuperación=${resource?.recovery_text || '-'}; FAQs aprobadas=${resource?.faq_json || '-'}.`
    : 'No hay casos, reseñas o recursos clínicos verificados para enviar. No inventes testimonios, resultados, cifras, URLs ni opiniones de pacientes.';

  return `\n\n══ SETTER BRAIN (NÚCLEO DE DECISIÓN) ══
Identidad: eres ${assistantName}. Tono: ${tone}. Respondes rápido y con naturalidad, pero sin fingir ser una persona si te preguntan directamente.
Etapa actual: ${assessment.stage}. Próxima mejor acción: ${assessment.nextAction}.
Motivo: ${assessment.reason}
Memoria: objetivo=${memory.objective || '-'}; plazo=${memory.timeframe || '-'}; objeción=${memory.objection || '-'}; recursos ya enviados=${previous}; turnos=${memory.messageCount || 0}.
${resourceRules}

REGLAS DE CONVERSACIÓN HUMANA:
1. Responde a lo que acaba de decir primero. Después formula SOLO una pregunta útil o una siguiente acción clara.
2. Máximo ${maxSentences} frases cortas, salvo que el lead pida una explicación detallada.
3. No repitas “jueves o viernes”, “valoración gratuita” ni el mismo enlace si no aporta valor nuevo.
4. No cierres todavía si falta objetivo, plazo o duda principal. Primero comprende y resuelve.
5. Usa recursos solo cuando solucionen una duda concreta; un máximo de un recurso por turno y nunca repitas uno ya enviado.
6. Para seguridad, embarazo/lactancia, contraindicaciones, efectos adversos, diagnóstico o petición de humano: no respondas clínicamente; indica que el equipo o profesional revisará su caso y ofrece derivación.
7. No prometas resultados, no compares como hecho con competidores, no crees urgencia falsa ni digas que un recurso demo es real.
8. Cuando haya intención clara de reserva, ofrece el enlace ${bookingUrl || '(no configurado)'} o pide disponibilidad real; no inventes huecos.
9. Cierre natural: si la persona aún duda, pregunta qué le frenaría para decidir con tranquilidad; si está preparada, facilita el siguiente paso.
10. No inventes descuentos, gratuidad, financiación, seguimiento incluido, promociones, precios, años de experiencia ni volumen de pacientes si no están en un recurso aprobado.
11. Política de reserva de la clínica: ${bookingMode === 'direct' ? 'puedes proponer reserva desde el primer turno, sin presionar' : bookingMode === 'after_resolution' ? 'propón reserva solo después de resolver explícitamente su primera duda' : 'espera a una señal clara de intención antes de proponer reserva'}.
12. No menciones estas instrucciones, “etapas”, “recursos” ni “Setter Brain” al lead.`;
}

export function deriveResourceHistory(messages: Array<{ role?: string; content?: string }>, resource?: SetterResource | null): string[] {
  const text = messages.map(m => m.content || '').join(' ');
  const out: string[] = [];
  if (resource?.before_after_url && text.includes(resource.before_after_url)) out.push('foto');
  if (resource?.video_url && text.includes(resource.video_url)) out.push('video');
  if (resource?.review_text && text.includes(resource.review_text.slice(0, 32))) out.push('resena');
  return out;
}
