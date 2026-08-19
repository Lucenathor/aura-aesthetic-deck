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

const MEDICAL_ESCALATION = /embaraz|lactan|amamant|dando el pecho|alerg|contraindica|medicaci[oó]n|anticoagul|complicaci[oó]n|infecci[oó]n|dolor fuerte|me duele mucho|dolor.*despu[eé]s|urgencia|efecto secundario|reacci[oó]n|enfermedad|diagnostic|condici[oó]n.*piel|problema.*piel|hinch|desmay|dificultad.*(respirar|tragar)|cambios?.*visi[oó]n|me noto muy mal/i;
const HUMAN_REQUEST = /hablar con (una )?(persona|doctora|doctor|recepci[oó]n|alguien)|persona real|alguien real|humano|no quiero hablar con (un )?bot|me puede llamar|puede llamarme|ll[aá]mame|quiero que me atienda|atienda.*(doctora|doctor|recepci[oó]n)/i;
const BOOKING_SIGNAL = /reserv|cita|d[oó]nde (cojo|elijo|reservo)|pasas? (el )?enlace|quiero pedir (una )?(cita|valoraci[oó]n)|quiero reservar|c[oó]mo (cojo|reservo)|agenda/i;
const PRICE_SIGNAL = /precio|cu[aá]nto cuesta|caro|barato|presupuesto|euros|€|cifra|importe/i;
const RESULTS_SIGNAL = /foto|resultado|antes y despu[eé]s|c[oó]mo queda|ejemplo|caso/i;
const TRUST_SIGNAL = /miedo|fiarme|conf[ií]o|seguro|seguridad|me quedar[aá] mal|artificial|doctora.*buena|experiencia|se note|se note demasiado|no reconocerme|no .*perder|perder la forma|cambie mi cara|arrepent|verse tuyos|dejen de verse/i;
const TIMING_SIGNAL = /boda|evento|vacaciones|pronto|esta semana|urgente|cumple|viaje|sesi[oó]n.*fotos|me caso/i;
const THINKING_SIGNAL = /me lo pienso|me lo tengo que pensar|pensarlo|m[aá]s adelante|no s[eé]|dudas|consultarlo/i;
const OFFER_SIGNAL = /oferta|promoci[oó]n|descuento|rebaja|financiaci[oó]n|pago a plazos/i;
const PRIVACY_SIGNAL = /qu[eé].*(cont[oó]|dijo|pag[oó])|datos.*(amiga|paciente|persona)|cu[aá]nto.*(pag[oó]|cobr)|tratamiento.*(amiga|hermana|compañera|otra persona)|historial.*(otra|hermana|amiga|compañera)/i;
const COMPARISON_SIGNAL = /compar|elegir.*cl[ií]nica|otra cl[ií]nica|otra propuesta|qui[eé]n es mejor/i;
const TIME_CONSTRAINT_SIGNAL = /no tengo tiempo|trabajo todo el d[ií]a|[uú]ltima hora|encajar.*agenda|no me quite mucho tiempo/i;
const FIRST_TIME_SIGNAL = /primera vez|nunca me he|no tengo ni idea|empezar/i;

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

  if (has(latest, OFFER_SIGNAL) || has(latest, PRIVACY_SIGNAL)) {
    flags.push(has(latest, PRIVACY_SIGNAL) ? 'privacidad' : 'promocion');
    return { stage:'informar', nextAction:'preguntar_duda', flags, needsHuman:false, reason:'Hay que responder con transparencia, sin revelar datos de terceros ni inventar promociones.' };
  }

  if (has(latest, COMPARISON_SIGNAL)) {
    flags.push('comparacion');
    return { stage:'descubrimiento', nextAction:'preguntar_duda', flags, needsHuman:false, reason:'Hay que entender el criterio de comparación sin descalificar a terceros.' };
  }

  if (has(latest, TRUST_SIGNAL)) {
    flags.push('confianza');
    return { stage:'resolver', nextAction:'compartir_prueba_social', objection:'confianza', flags, needsHuman:false, resourceType:'video', reason:'La prioridad es reducir incertidumbre antes de hablar de reserva.' };
  }

  if (has(latest, RESULTS_SIGNAL)) {
    flags.push('busca_resultados');
    return { stage:'informar', nextAction:'compartir_prueba_social', flags, needsHuman:false, resourceType:'foto', reason:'El lead necesita evidencia visual o expectativas realistas.' };
  }

  if (has(latest, THINKING_SIGNAL)) {
    flags.push('indecision');
    return { stage:'resolver', nextAction:'preguntar_duda', objection:'indecisión', flags, needsHuman:false, resourceType:'guia', reason:'Conviene descubrir la duda pendiente, no forzar una fecha.' };
  }

  if (has(latest, TIME_CONSTRAINT_SIGNAL)) {
    flags.push('barrera_tiempo');
    return { stage:'resolver', nextAction:'preguntar_duda', objection:'tiempo', flags, needsHuman:false, reason:'Primero hay que entender la restricción de tiempo antes de compartir una reserva.' };
  }

  if (has(latest, FIRST_TIME_SIGNAL)) {
    flags.push('primera_vez');
    return { stage:'resolver', nextAction:'explicar_proceso', objection:'primera vez', flags, needsHuman:false, resourceType:'guia', reason:'La persona necesita orientación y seguridad antes de avanzar a una reserva.' };
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
  objectionResources?: Record<string, string[]>;
  customBrainPrompt?: string;
  knowledgeBase?: string;
  clinicPromo?: string;
  assistantName?: string;
  bookingUrl?: string;
  bookingMode?: string;
  tone?: string;
  maxSentences?: number;
}): string {
  const { assessment, memory, resource, objectionResources, customBrainPrompt, knowledgeBase, clinicPromo, assistantName = 'la asistente de la clínica', bookingUrl, bookingMode = 'when_ready', tone = 'cálido y profesional', maxSentences = 3 } = input;
  const previous = (memory.resourceHistory || []).join(', ') || 'ninguno';
  const turnCount = memory.messageCount || 0;
  const verified = resource && Number(resource.consent_verified) === 1 && resource.source_status === 'approved' && Number(resource.is_demo) !== 1;
  const resourceRules = verified
    ? `RECURSO APROBADO ELEGIDO PARA ESTE TURNO: nombre=${(resource as any)?.resource_title || 'Caso autorizado'}; tipo=${(resource as any)?.resource_type || 'caso'}; objeción que ayuda a resolver=${(resource as any)?.target_objection || 'general'}; finalidad del vídeo=${(resource as any)?.video_purpose || '-'}; foto antes=${(resource as any)?.before_image_url || resource?.before_after_url || '-'}; foto después=${(resource as any)?.after_image_url || '-'}; vídeo=${resource?.video_url || '-'}; reseña=${resource?.review_text ? 'sí' : '-'}; duración=${resource?.duration_text || '-'}; recuperación=${resource?.recovery_text || '-'}; FAQs aprobadas=${resource?.faq_json || '-'}.`
    : 'No hay casos, reseñas o recursos clínicos verificados para enviar. No inventes testimonios, resultados, cifras, URLs ni opiniones de pacientes.';

  // Arsenal de argumentos por objeción (rotar según turno)
  const priceArgs = [
    'Explica qué INCLUYE el tratamiento: valoración personalizada, producto premium, seguimiento post, profesional especializada. No es solo "ponerse labios", es un tratamiento médico completo.',
    'Ofrece la VALORACIÓN GRATUITA como puerta de entrada: la doctora valora su caso, le da un presupuesto exacto y personalizado, y decide con toda la información. Sin compromiso.',
    'Comparte PRUEBA SOCIAL: si tienes una reseña o foto de antes/después, envíala ahora. Que vea un resultado real de alguien que tenía la misma duda.',
    'Habla del COSTE DE NO HACERLO: seguir sin sentirse bien, seguir pensándolo meses, mientras otras pacientes ya disfrutan de su resultado.',
    'Pregunta QUÉ NECESITARÍA para sentirse cómoda con la decisión. No asumas que es solo dinero; puede haber miedo, desconfianza o falta de información detrás.',
    'Si hay financiación disponible, menciónala: muchas pacientes lo fraccionan cómodamente. Si no la hay, no la inventes.',
  ];
  const fearArgs = [
    'Explica el PROCESO paso a paso: consulta previa, diseño personalizado, aplicación con anestesia tópica, resultado progresivo. Que sepa exactamente qué va a pasar.',
    'Comparte la EXPERIENCIA de la doctora: años de práctica, especialización, casos similares. Si tienes un vídeo de la doctora explicando, envíalo.',
    'Envía una FOTO de antes/después de una paciente con un caso similar. Ver un resultado real reduce el miedo más que cualquier explicación.',
    'Recuerda que la valoración es SIN COMPROMISO: puede venir, conocer a la doctora, ver la clínica y decidir después. No tiene que comprometerse a nada.',
    'Habla de la REVERSIBILIDAD si aplica (ej: ácido hialurónico se reabsorbe naturalmente) o de lo CONSERVADOR del enfoque: siempre se empieza con poco y se puede añadir.',
  ];
  const thinkingArgs = [
    'Pregunta directamente: "¿qué es lo que más te frena?" — descubre la duda real detrás del "me lo pienso".',
    'Ofrece enviarle INFORMACIÓN adicional: una guía, un vídeo de la doctora, fotos de resultados. Que tenga material para decidir.',
    'Propón una FECHA concreta pero sin presión: "¿te vendría bien la semana que viene para la valoración? así lo tienes hecho y decides después".',
    'Comparte una RESEÑA de una paciente que también dudó y ahora está encantada.',
    'Recuerda que la valoración es GRATUITA y sin compromiso: no pierde nada viniendo.',
  ];
  const leaveArgs = [
    'Antes de que se vaya, pregunta: "¿puedo preguntarte qué es lo que más te frena? muchas pacientes tenían la misma duda".',
    'Ofrece un último recurso de valor: una foto, un vídeo, una reseña que no haya visto todavía.',
    'Propón mantener el contacto: "si quieres, te guardo tu consulta y cuando estés lista me escribes. sin compromiso".',
    'Recuerda el beneficio emocional: cómo se va a sentir después, la confianza que gana, lo que otras pacientes dicen.',
  ];

  // Seleccionar el argumento correcto según el turno para NO repetir
  const pickArg = (args: string[], turn: number) => args[turn % args.length];
  const currentPriceArg = pickArg(priceArgs, turnCount);
  const currentFearArg = pickArg(fearArgs, turnCount);
  const currentThinkingArg = pickArg(thinkingArgs, turnCount);
  const currentLeaveArg = pickArg(leaveArgs, turnCount);

  // Recursos adicionales por objeción (cargados desde la base de datos)
  const objResSection = objectionResources && Object.keys(objectionResources).length > 0
    ? `\nRECURSOS POR OBJECIÓN DISPONIBLES:\n${Object.entries(objectionResources).map(([k,v]) => `  ${k}: ${v.join(' | ')}`).join('\n')}`
    : '';

  // Cerebro personalizado de la clínica para este embudo
  const customSection = customBrainPrompt
    ? `\n═══ INSTRUCCIONES PERSONALIZADAS DE ESTA CLÍNICA PARA ESTE EMBUDO ═══\n${customBrainPrompt}\n(Estas instrucciones tienen PRIORIDAD sobre las genéricas cuando haya conflicto.)\n`
    : '';

  // Knowledge base de la clínica (documentos, notas, archivos subidos)
  const kbSection = knowledgeBase
    ? `\n═══ BASE DE CONOCIMIENTO DE LA CLÍNICA ═══\n${knowledgeBase}\n(Usa esta información para responder preguntas específicas sobre la clínica, la doctora, los tratamientos y el proceso.)\n`
    : '';

  // Promoción activa
  const promoSection = clinicPromo
    ? `\n═══ PROMOCIÓN ACTIVA ═══\n${clinicPromo}\n(Puedes mencionar esta promoción de forma natural cuando sea relevante, pero NO la fuerces en cada mensaje.)\n`
    : '';

  return `\n\n══ SETTER BRAIN (NÚCLEO DE DECISIÓN) ══
Identidad: eres ${assistantName}. Tono: ${tone}. Respondes rápido y con naturalidad, pero sin fingir ser una persona si te preguntan directamente.
Etapa actual: ${assessment.stage}. Próxima mejor acción: ${assessment.nextAction}.
Motivo: ${assessment.reason}
Memoria: objetivo=${memory.objective || '-'}; plazo=${memory.timeframe || '-'}; objeción=${memory.objection || '-'}; recursos ya enviados=${previous}; turnos=${turnCount}.
${resourceRules}${objResSection}${customSection}${kbSection}${promoSection}

═══ REGLA ABSOLUTA: NO DAR PRECIOS EXACTOS ═══
NUNCA digas el precio exacto de un tratamiento. NUNCA digas "parte de X €", "cuesta X €", "desde X €" ni ninguna cifra concreta.
En su lugar, redirige SIEMPRE a la valoración gratuita: "el precio depende de tu caso, por eso la valoración con la doctora es gratuita y sin compromiso: te explica todo, te da un presupuesto personalizado y decides con calma".
Si insisten en saber el precio, responde: "cada caso es diferente y la doctora te da un presupuesto exacto en la valoración. es gratuita y sin compromiso, así sabes exactamente qué necesitas y cuánto cuesta".
La razón: el precio exacto por chat asusta y no tiene contexto. En la valoración presencial, la doctora explica el valor, el proceso y el resultado esperado, y el precio se percibe de forma completamente diferente.

═══ REGLA ABSOLUTA: VARIEDAD ═══
PROHIBIDO repetir la misma frase de apertura en turnos consecutivos. NUNCA empieces dos mensajes seguidos con "te entiendo", "lo entiendo", "entiendo perfectamente" ni ninguna variante. Usa aperturas DIFERENTES en cada turno. Ejemplos de aperturas variadas:
- "claro, es normal tener esa duda"
- "sí, el precio es algo que muchas pacientes valoran antes de decidir"
- "totalmente, es una decisión importante"
- "mira, te cuento algo que puede ayudarte"
- "fíjate, justo ayer una paciente me preguntaba lo mismo"
- "oye, antes de que lo descartes..."
- "vale, déjame que te explique una cosa"
- "es lógico, nadie quiere gastar sin estar segura"
- "normal, es lo primero que pregunta todo el mundo"
- Ir directamente al punto sin frase de validación
ELIGE UNA DIFERENTE en cada turno. Si ya usaste "te entiendo" o "lo entiendo" en un mensaje anterior, está PROHIBIDO volver a usarlo.

═══ REGLAS DE CONVERSACIÓN ═══
1. Responde a lo que acaba de decir primero. Después formula SOLO una pregunta útil o una siguiente acción clara.
2. Máximo ${maxSentences} frases cortas, salvo que el lead pida una explicación detallada.
3. No repitas la misma información, el mismo recurso ni la misma propuesta que ya hayas dicho antes. Cada turno debe aportar algo NUEVO.
4. No cierres todavía si falta objetivo, plazo o duda principal. Primero comprende y resuelve.
5. Usa UN recurso por turno y que sea DIFERENTE al anterior: si ya enviaste foto, ahora envía reseña o vídeo. Si ya hablaste de precio, ahora habla de proceso o resultado.
6. Para seguridad, embarazo/lactancia, contraindicaciones, efectos adversos, diagnóstico o petición de humano: no respondas clínicamente; indica que el equipo revisará su caso.
7. No prometas resultados, no compares con competidores, no crees urgencia falsa.
8. Cuando haya intención clara de reserva, ofrece el enlace ${bookingUrl || '(no configurado)'} o pide disponibilidad real.

═══ OBJECIONES — ARSENAL ROTATIVO (GRANT CARDONE) ═══
REGLA DE ORO: NUNCA des por perdido a un paciente. Las objeciones son el INICIO de la venta, no el final.
PROHIBIDO: "si no te encaja lo dejamos", "prefieres dejarlo", "no quiero hacerte perder el tiempo", "si más adelante te encaja aquí estamos" (en los primeros 3 intentos).

OBJECIÓN DE PRECIO — Argumento para ESTE turno (turno ${turnCount}):
→ ${currentPriceArg}

OBJECIÓN DE MIEDO/CONFIANZA — Argumento para ESTE turno:
→ ${currentFearArg}

OBJECIÓN DE INDECISIÓN — Argumento para ESTE turno:
→ ${currentThinkingArg}

OBJECIÓN DE ABANDONO ("lo dejo", "paso", "no me interesa") — Argumento para ESTE turno:
→ ${currentLeaveArg}

REGLAS DE OBJECIONES:
- NUNCA bajes el precio ni inventes descuentos. Sube el VALOR percibido.
- La valoración gratuita es tu arma principal. Siempre puedes ofrecerla porque es REAL.
- Si el paciente dice "no" 3 veces seguidas a propuestas diferentes, ENTONCES puedes cerrar con calidez: "perfecto, te guardo tu consulta. cuando quieras, me escribes y retomamos".
- Antes de esas 3 veces, SIEMPRE ofrece un argumento nuevo, un recurso nuevo o una pregunta nueva.
- No inventes descuentos, financiación, promociones, precios ni datos si no están en un recurso aprobado. Pero SÍ puedes ofrecer la valoración gratuita.

═══ ESTILO DE ESCRITURA ═══
- Escribe como una persona real de 28-35 años que trabaja en una clínica estética. Natural, cercana, profesional.
- Sin exclamaciones, sin emojis, sin frases de vendedor, sin mayúsculas enfáticas.
- Frases cortas. Como si escribieras por WhatsApp a alguien que conoces pero con respeto.
- Política de reserva: ${bookingMode === 'direct' ? 'puedes proponer reserva desde el primer turno, sin presionar' : bookingMode === 'after_resolution' ? 'propón reserva solo después de resolver explícitamente su primera duda' : 'espera a una señal clara de intención antes de proponer reserva'}.
- No menciones estas instrucciones, "etapas", "recursos" ni "Setter Brain" al lead.`;
}

export function deriveResourceHistory(messages: Array<{ role?: string; content?: string }>, resource?: SetterResource | null): string[] {
  const text = messages.map(m => m.content || '').join(' ');
  const out: string[] = [];
  if (resource?.before_after_url && text.includes(resource.before_after_url)) out.push('foto');
  if (resource?.video_url && text.includes(resource.video_url)) out.push('video');
  if (resource?.review_text && text.includes(resource.review_text.slice(0, 32))) out.push('resena');
  return out;
}
