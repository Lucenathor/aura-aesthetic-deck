# AURA — Playbook completo del lead infalible

> **Versión 1.0 · 31 mayo 2026 · Vertical principal: clínica estética. Replicable a dental, abogados, fitness, inmobiliaria y restauración cambiando playbook.**

Este documento describe **todos los escenarios posibles del lead** en el sistema AURA, desde el clic en el anuncio de Meta hasta el post-tratamiento y la reactivación, con sus flujos de canales, reglas anti-baneo, KPIs y acciones de recuperación. Sirve como **única fuente de verdad** del producto.

---

## 1. Mapa de estados del lead

El lead transita por un máximo de **once estados** desde que ve el anuncio hasta que se convierte en paciente recurrente. Cada estado tiene su propio flujo, sus disparadores de avance y sus disparadores de recuperación si abandona.

| # | Estado | Acción esperada | Canal principal |
|---|---|---|---|
| 0 | **Impresión del anuncio en Meta** | Ver el creativo | Meta Ads (Facebook / Instagram) |
| 1 | **Clic en el anuncio** | Aterrizar en la landing | Landing AURA |
| 2 | **En la landing** | Empezar el quiz | Landing AURA |
| 3 | **En el quiz** | Responder 5 preguntas | Landing AURA |
| 4 | **Quiz completado** | Recibir resultado personalizado | Pantalla de resultado |
| 5 | **En el chat IA** | Resolver objeciones y reservar | Chat web embebido |
| 6 | **Reserva confirmada** | Calendario reservado + confirmación | Email + SMS |
| 7 | **Pre-cita (24 h y 2 h antes)** | Confirmar asistencia | SMS + voz IA |
| 8 | **Día de la cita** | Presentarse | Recepción humana |
| 9 | **Post-tratamiento (24 h)** | Aftercare + review | Email + WhatsApp template |
| 10 | **Cliente recurrente o reactivación** | Membership / upsell / win-back | Email + SMS + WhatsApp opt-in |

A continuación se detallan los flujos completos por estado y los cinco "puntos de fuga" críticos donde el lead puede abandonar y cómo lo recuperamos.

---

## 2. Flujo "happy path" — el lead que avanza sin fricción

### 2.1 De Meta a la landing

El lead ve un anuncio del **banco mensual** de creativos de AURA con su hook estacional (por ejemplo "Tu mejor versión empieza con 50 € de regalo"). El anuncio lleva objetivo **Leads externos** con destino a la landing propia de la clínica, no a Meta Instant Form. La razón: el quiz cualificador convierte al 40,1 % vs el 6,6 % de un formulario estático, y el lead llega a la consulta hasta 3-5× más cualificado.

En el momento del clic, el sistema dispara dos eventos en paralelo: el **Meta Pixel** del lado cliente y el **Conversion API server-side**, ambos con el `event_id` único para evitar duplicados. Se asigna también un `session_id` en cookie de primera parte (`__aura_sid`) que sobrevive a iOS 14 porque no es third-party.

### 2.2 Landing premium

La landing carga en menos de 1,2 s en un Android medio. Headline coincide palabra por palabra con el anuncio. Single CTA: "Empezar la valoración" (no "más información"). Tres elementos de confianza visibles sin scroll: foto de la doctora, número de tratamientos realizados, reseña de Google rotativa. El botón abre la primera pregunta del quiz al instante, sin recargar la página.

### 2.3 Quiz cualificador

Cinco preguntas auto-rellenando con animaciones suaves (320 ms cada transición). El sistema autoguarda cada respuesta en el backend en el momento exacto del clic, no al final. El móvil se pide en la **pregunta 2** (no en la 5) para garantizar captura aunque abandone después.

El orden óptimo de las preguntas es:

| Pregunta | Por qué |
|---|---|
| 1. ¿Qué te llevaría a dar el paso? | Pre-cualifica motivación. Marca "evento próximo" enciende cadencia urgente. |
| 2. Nombre + móvil | Captura temprana. El SMS de recovery ya tiene a quién mandárselo aunque abandone después. |
| 3. ¿Qué tratamiento te interesa más? | Define el playbook que carga la IA en el chat. |
| 4. ¿En qué plazo lo harías? | Define la cadencia del follow-up (urgente vs nurture). |
| 5. ¿Cuál es tu mayor preocupación? | Da al chat IA y al equipo presencial la objeción concreta a desactivar. |

Al finalizar, el lead recibe una **pantalla de resultado personalizada** con su recomendación, dos casos before/after similares a su perfil y un botón único "Hablar con tu asesora ahora" que abre el chat IA dentro de la misma página.

### 2.4 Chat IA

El chat IA carga con el contexto completo del quiz inyectado en su prompt: nombre, tratamiento, plazo, objeción. La primera frase usa su nombre y reconoce su preocupación específica ("Marta, te entiendo, casi todas las pacientes nuevas dudan de quedar antinaturales"). Resuelve dudas en menos de 2 s por mensaje con el modelo más rápido disponible.

Tras 2-3 intercambios, el chat **abre el calendario embebido** (Google Calendar / Cal.com) y propone tres huecos. El lead elige uno y queda reservado al instante. Sin depósito. El lead recibe inmediatamente:

- **Email** de confirmación con el .ics adjunto, foto de la doctora y dirección con Google Maps.
- **SMS** breve con la fecha y el botón "añadir a calendario".
- Inscripción en la **cadencia de pre-cita** de 24 h y 2 h.

### 2.5 Pre-cita

La cadencia automatizada que más reduce el no-show en estética (Ringlyn AI 2026):

| Cuándo | Canal | Mensaje |
|---|---|---|
| 24 h antes | **Voz IA breve** | "Hola Marta, soy de Clínica Elvira, ¿confirmas tu cita de mañana a las 19:00?" — si dice que no puede, reagenda en directo. |
| 4 h antes | **SMS recordatorio** | "Marta, te esperamos hoy a las 19:00. Calle Velázquez 84. Aparcamiento aquí: maps.app/elvira" |
| 1 h antes | **WhatsApp template aprobado** (solo si el lead lo aceptó al reservar) | "Te esperamos en una hora. Si llegas tarde avísanos al +34 612…". |

Con esta triple capa el no-show baja de 22 % a menos del 9 % en estética y a menos del 6 % en dental.

### 2.6 Día de la cita

El paciente llega. La recepción humana cierra la venta presencial con la información ya cualificada en su ficha (presupuesto, objeción, expectativas). Tras el tratamiento se hace la foto post-result siguiendo el protocolo estándar (mismo fondo, misma luz, misma cámara) si el paciente firma el consentimiento de marketing.

### 2.7 Post-tratamiento

A las 24 h:

- **Email aftercare** con instrucciones de cuidado y vídeo corto de la doctora.
- **WhatsApp template "utility"** con check-in "¿cómo te encuentras?" y enlace a una mini-encuesta NPS.
- A las 72 h: pide reseña en Google con un link directo. Si el NPS es ≥9, se envía link de Google Reviews. Si NPS es ≤6, se intercepta y va al gerente para resolución privada (FTC compliant).

### 2.8 Reactivación / membership

A los 14 días, se ofrece membership con upsell automatizado. A los 90 días sin volver, se entra en cadencia de reactivación estacional. A los 180 días sin volver, el lead pasa a "frío" y solo recibe contenido informativo trimestral.

---

## 3. Los cinco puntos de fuga críticos (y cómo se recupera el lead en cada uno)

### 3.1 Fuga A — Abandona el anuncio (no clica)

Es el más temprano. El lead vio el anuncio pero no clicó. AURA usa **retargeting Meta** con un creativo diferente (otro hook UGC o un caso real with reveal). Si después de 14 días sigue sin clic, sale del retargeting para no quemar audiencia.

> **Indicador de éxito**: frecuencia <5 en 14 días, CPM estable.

### 3.2 Fuga B — Abandona el quiz a mitad

Este es el escenario más importante porque ya tenemos su móvil si abandonó después de la pregunta 2. Tres trayectos posibles:

**Trayecto B1 — Abandona entre la pregunta 1 y la 2** (sin móvil):
- El sistema usa el `session_id` y dispara un evento "QuizStarted" al Pixel + CAPI.
- Cuando vuelva por retargeting, le carga la pregunta donde lo dejó.
- Sin teléfono, no hay SMS posible. Solo retargeting.

**Trayecto B2 — Abandona entre las preguntas 3 y 5** (ya tenemos móvil):
- En el momento exacto de la pérdida de foco (`visibilitychange`) o cierre de pestaña (`beforeunload`), el backend dispara una secuencia:
  1. **+1 min · SMS link mágico**: "Hola Marta, soy de Clínica Elvira. Te he guardado el cuestionario. Sigue aquí: aura.link/m/9xK3"
  2. **+30 min · Email con resumen**: las respuestas que ya dio + recomendación parcial + botón continuar.
  3. **+24 h · Voz IA breve** ("¿quieres cerrarlo en 2 min?").
- El link mágico abre la **sesión exacta** donde la dejó, con sus respuestas pre-rellenadas.
- Si vuelve por el link y completa, fluye al chat IA con su contexto.
- Si nunca vuelve, entra en cadencia de 21 días con break-up email el día 14.

**Trayecto B3 — Abandona en el chat IA tras el quiz**:
Detallado en el siguiente bloque (3.3).

> **Indicador de éxito**: recuperación >35 % en B2.

### 3.3 Fuga C — Entra en el chat pero se va a mitad

El sistema monitoriza cuatro señales para detectar el abandono:

| Señal | Acción inmediata |
|---|---|
| Inactividad >90 s | SMS "Marta, ¿necesitas un minuto? Te dejo el sitio guardado: aura.link/m/9xK3" |
| Pérdida de foco / cambio de pestaña | Email con transcripción del chat + botón continuar |
| Intento de cerrar (`beforeunload`) | Modal exit-intent "Espera. Te envío tu recomendación al móvil" |
| Mensaje del lead sin respuesta del lead en 60 s tras la respuesta IA | SMS suave "¿Te ayudo a terminar?" |

**Importante**: el chat tiene **memoria persistente cross-device**. Si abrió el quiz en el iPhone a las 12 h y vuelve por el SMS en el portátil a las 22 h, el sistema reconoce el match por móvil + token y carga el historial completo, no empieza de cero.

A las 24 h, si no ha vuelto, dispara la voz IA breve. Si no contesta, sigue la cadencia (email valor día 3, SMS testimonio día 7, break-up día 14).

> **Indicador de éxito**: 30-40 % de leads que abandonan el chat vuelven y reservan dentro de los 7 días siguientes.

### 3.4 Fuga D — Termina el chat pero no agenda

El lead completó el chat IA, resolvió sus dudas, pero no abrió el calendario o lo abrió y no eligió hueco. El sistema lo categoriza como **"warm – objeción no resuelta"** con la objeción específica detectada por el analista de lead (Opus 4.8 sobre el transcript del chat).

Acciones:

1. **+1 h · SMS** con un caso real de paciente similar superando esa objeción específica.
2. **+24 h · Email VSL personalizado** del 60-90 s con la doctora hablando directamente sobre esa objeción. Tres variantes en biblioteca (precio, miedo, plazo) y se selecciona la que corresponde por la objeción detectada.
3. **+3 días · Voz IA breve** ofreciendo una llamada de 5 min con un asesor humano (no para vender, para resolver dudas técnicas).
4. **+7 días · SMS testimonio** con audio de 20 s del dueño.
5. **+14 días · email break-up**.

> **Indicador de éxito**: 18-25 % de estos warm leads acaban reservando en menos de 21 días.

### 3.5 Fuga E — Agenda pero no se presenta (no-show)

El sistema lo detecta cuando la recepción humana lo marca en la agenda como "no-show" o el sistema no recibe check-in en 30 min después de la hora de cita. Acciones:

1. **+30 min · WhatsApp template "utility"** (no marketing) preguntando si ha tenido un imprevisto y ofreciendo reprogramar en el próximo hueco disponible.
2. **+2 h · Voz IA breve** con tono empático ("a veces pasa, vamos a buscarte otra hora").
3. **+24 h · Email** con tres huecos sugeridos para los próximos siete días.
4. Si reprograma, se marca el contacto como "no-show 1" en la ficha del CRM para que el equipo presencial lo tenga visible la próxima vez.
5. Si acumula **dos no-shows**, el sistema sugiere al equipo humano llamarle personalmente antes de la siguiente reserva para confirmar interés real.
6. Si tras 14 días no reprograma, entra en la cadencia de reactivación estacional.

> **Indicador de éxito**: 40 % de no-shows se reprograman y acuden en los siguientes 14 días.

---

## 4. Reglas anti-baneo por canal (resumen ejecutivo)

| Canal | Reglas críticas |
|---|---|
| **SMS** | Opt-in registrado al rellenar el quiz (texto LSSI explícito), "STOP" funcional, sender ID estable, máx 3 SMS/día, doble short-link para esquivar filtros, sin emojis spam. |
| **WhatsApp** | **NUNCA iniciar nosotros**. Siempre el lead pulsa `wa.me/<número>?text=token`. Ventana de 24 h activa. Templates marketing pre-aprobados. Quality rating verde. Privacy policy URL pública. Verificación de negocio. Bloqueo automático tras "STOP" en cualquier canal. |
| **Email** | Dominio calentado 30 días antes. SPF + DKIM + DMARC. List-Unsubscribe header (RFC 8058). Asunto sin spam-words. Texto/HTML ratio sano. Bounce rate < 3 %. Reply rate medible. Domain warm-up gradual: día 1 → 50 envíos, día 30 → 5.000. |
| **Voz IA** | Número local con STIR/SHAKEN. Máx 2 intentos por lead. NO marcar fuera de 9-21 h. Identificarse en los primeros 5 s ("Hola, soy de Clínica Elvira"). Audio del dueño opcional pero no clonado sin permiso firmado. |
| **Meta Ads** | Pixel + CAPI server-side. Sin claims médicos directos ("fix wrinkles"). Sin split-screen before/after. Privacy policy URL accesible. Audiencias broad + lookalike, no targeting de salud sensible. |
| **Trazabilidad** | Cada lead = un **thread único con token persistente**. "STOP" en cualquier canal = sale de TODOS. Log de consentimiento auditable. Cumplimiento LSSI + GDPR + Meta + CAN-SPAM en una sola capa. |

---

## 5. KPIs por etapa

| Etapa | KPI clave | Objetivo |
|---|---|---|
| Anuncio | CTR / CPM | CTR > 1,5 % · CPM < 12 € |
| Landing | Click → Quiz start | > 65 % |
| Quiz | Quiz start → Quiz complete | > 55 % |
| Chat IA | Quiz complete → Reserva | > 45 % |
| Reserva | Reserva → Confirmación SMS abierta | > 90 % |
| Pre-cita | Reserva → Show rate | > 91 % |
| Cita | Show → Tratamiento contratado | > 60 % |
| Post-tratamiento | Tratamiento → Reseña 5★ | > 35 % |
| Reactivación | Inactivo > 90 d → Cita | > 12 % |

---

## 6. Cuadro resumen de canales por escenario

| Escenario | Canal 1 | Canal 2 | Canal 3 |
|---|---|---|---|
| Avanza sin fricción | Chat web → calendario | Email confirmación | SMS recordatorio |
| Abandona el quiz tras pregunta 2 | SMS link mágico | Email resumen | Voz IA 24 h |
| Abandona el quiz antes de la pregunta 2 | Retargeting Meta | — | — |
| Abandona el chat IA | SMS link mágico | Email transcripción | Voz IA 24 h |
| Termina chat sin reservar | SMS caso real | Email VSL objeción | Voz IA día 3 |
| No se presenta a la cita | WhatsApp template utility | Voz IA empática | Email reprogramación |
| Post-tratamiento | Email aftercare | WhatsApp template check-in | Google Review request |
| Reactivación 90 d | Email estacional | SMS oferta | WhatsApp (solo con opt-in) |

---

## 7. Conclusión

El sistema cumple cuatro principios irrenunciables: nunca pierde la trazabilidad del lead aunque cambie de dispositivo o canal, nunca inicia una conversación de WhatsApp para evitar el baneo de Meta, nunca persigue al lead que ha dicho "STOP" en ningún canal y nunca habla del lead sin tener su consentimiento documentado. Por encima de eso, **maximiza el cost-per-booked** en lugar de minimizar el cost-per-lead, que es la métrica que de verdad importa en estética donde el valor de un paciente es de 1.800-4.500 €.

Cada escenario tiene su flujo, sus canales, su KPI y su disparador de recuperación documentados aquí. Este Playbook es el código fuente del comportamiento del SaaS.

---

**Versión:** 1.0
**Autor:** AURA (Manus AI)
**Fecha:** 31 mayo 2026
**Licencia:** propietaria, uso interno
