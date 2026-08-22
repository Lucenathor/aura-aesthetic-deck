# Embudo híbrido AURA: chat web, SMS y WhatsApp por clínica

**Fecha:** 22 de agosto de 2026  
**Objetivo:** convertir tráfico de estética en valoraciones, citas y pacientes sin bloquear el lanzamiento de una clínica por la aprobación de su número de WhatsApp.

---

## Decisión principal

> **AURA no debe esperar a WhatsApp para salir a captar.** El chat web y el SMS permiten que cada clínica opere desde el primer día; WhatsApp se incorpora como una capa de conversación y cierre de mayor valor cuando el número esté operativo.

La combinación correcta no consiste en enviar lo mismo por los tres canales. Cada canal tiene una función distinta dentro de un único historial de lead. El CRM debe decidir cuál es el siguiente mejor contacto y suprimir los demás, nunca hacer que el paciente reciba un SMS y un WhatsApp iguales al mismo tiempo.

| Canal | Papel único | Cuándo debe usarse | No debe usarse para |
|---|---|---|---|
| **Chat web AURA** | Descubrir, cualificar, aportar valor y mostrar agenda | Siempre; es el primer contacto desde anuncio, landing o QR | Recordatorios después de que el paciente abandona la web |
| **SMS** | Asegurar la entrega de un enlace crítico y recuperar una sesión | Antes de tener WhatsApp, como contingencia o para cita urgente | Conversaciones largas, fotos, ofertas masivas o información sensible |
| **WhatsApp oficial** | Conversar, resolver objeciones, enviar recursos, cerrar y fidelizar | Tras opt-in y número/template operativo | Sustituir el chat web de entrada o spamear listas sin segmentar |

---

## Primero: no lo llamemos "chat fake"

La interfaz actual, parecida a una conversación de WhatsApp, funciona muy bien como patrón de conversión móvil. Sin embargo, de cara al paciente y a la clínica debe presentarse como **«Asistente de la clínica»** o **«Asistente de valoración»**, no como WhatsApp si realmente está dentro de la web. Es una cuestión de confianza: el paciente sabe que está conversando en la landing, obtiene respuesta inmediata y no espera equivocadamente un mensaje en su móvil.

El asistente web ya cumple una función muy valiosa: registra el lead, guarda las respuestas del quiz, conserva la conversación en `chat_web`, puede consultar huecos y crear la cita. Es el canal que no depende de Meta, de una plantilla aprobada ni de que el paciente haya aceptado previamente recibir mensajes.

---

## La arquitectura recomendada: tres canales, un solo cerebro

El error más frecuente de los CRMs es tener tres automatizaciones independientes. En AURA debe existir una **orquestación única por lead**: una secuencia activa, un estado comercial y una regla explícita de prioridad de canal.

> En una demostración reciente de automatización, el creador resumía correctamente la idea: *“If a lead did not reply after 24 hours, then we’re going to send them a follow-up message”*. La parte importante no es el número de horas, sino que el seguimiento se cancela al responder o reservar. [1]

### Regla de prioridad

1. **Si el paciente está actualmente escribiendo en el chat web**, AURA mantiene el chat web y no le interrumpe con mensajes externos.
2. **Si WhatsApp está aprobado, hay consentimiento verificable y el paciente ha respondido en WhatsApp en las últimas 24 horas**, WhatsApp es el canal principal de conversación.
3. **Si WhatsApp está aprobado pero la conversación está cerrada**, AURA usa una plantilla Meta correcta; solo después de respuesta vuelve a conversación libre.
4. **Si no existe WhatsApp operativo, no hay consentimiento para WhatsApp o el número está restringido**, SMS entrega un enlace mágico de regreso al chat/agenda.
5. **Si el SMS no se entrega, no se insiste por otro canal automáticamente sin una regla de consentimiento y frecuencia.** Se crea una tarea para recepción si el lead es caliente.

La conversación debe pasar de IA a humano sin que ambos contesten a la vez. El ejemplo analizado utiliza un interruptor claro: *“You can switch the conversation to human agent … or … put it back to AI assistant”*. AURA ya tiene los cimientos del Setter Brain; la mejora es compartir este mismo control entre el chat web y WhatsApp.[1]

---

## Embudo de conversión de principio a fin

| Etapa del lead | Objetivo | Canal principal | Acción de AURA | Canal secundario permitido |
|---|---|---|---|---|
| 0. Anuncio / visita anónima | Captar atención | Landing + quiz | Pixel, UTM, tratamiento, ciudad y primer evento | Ninguno |
| 1. Quiz iniciado | Reducir fricción | Chat web | Preguntas cortas, beneficios, recursos visuales y autoridad | Ninguno |
| 2. Quiz completado | Capturar contacto y consentimiento | Chat web | Entregar resultado parcial, pedir nombre/teléfono y permisos diferenciados | SMS/WhatsApp solo con opt-in |
| 3. Conversación de valoración | Resolver dudas y mostrar huecos | Chat web o WhatsApp | Setter Brain, recursos aprobados, agenda y traspaso a recepción | SMS solo si abandona |
| 4. Lead abandona sin reserva | Recuperar intención fresca | WhatsApp si disponible; SMS si no | Un solo mensaje con enlace mágico y contexto conservado | Tarea humana para lead caliente |
| 5. Reserva creada | Reducir no-show | WhatsApp Utility o SMS | Confirmación, enlace para confirmar/cambiar y ubicación | El segundo canal solo como contingencia |
| 6. Pre-cita | Asegurar asistencia | WhatsApp Utility o SMS | Recordatorio 24 h y 2 h, sin contenido clínico sensible | Llamada solo ante alto valor/no respuesta |
| 7. Post-cita | Cuidar, recuperar y fidelizar | WhatsApp si el paciente lo usa | Check-in, satisfacción, reseña, revisión y recurrencia | SMS de enlace cuando WhatsApp no esté disponible |

La evidencia clínica disponible respalda reservar el SMS para recordatorios y enlaces de acción. Una revisión sistemática encontró en ensayos aleatorizados una mayor probabilidad de asistencia con recordatorios SMS frente a no enviarlos, aunque la magnitud varía entre contextos y no debe prometerse como resultado individual de cada clínica.[2]

---

## Qué hace cada canal exactamente

### 1. Chat web AURA: el conversor universal

El chat web debe ser permanente, incluso en clínicas que tengan WhatsApp validado. Convierte tráfico frío sin pedir al visitante que cambie de aplicación. Aquí se ejecuta el quiz, se descubren motivo, plazo, objeción y tratamiento, se crea el lead con UTM/ref y se enseña un hueco de agenda cuando existe suficiente intención.

El teléfono no se pide al principio. Se pide tras entregar una pequeña pieza de valor: el resultado personalizado, una recomendación no clínica, la guía de la doctora o el acceso a la agenda. En ese momento aparecen dos casillas separadas, sin marcar por defecto: **«acepto recibir avisos de mi cita»** y **«acepto recibir información/promociones por WhatsApp»**. Se guardan fuente, fecha, versión de texto y finalidad.

El objetivo del chat no es mantener una conversación infinita. Es lograr uno de tres resultados: **reserva**, **permiso para continuar** o **derivación humana**. Las preguntas médicas, contraindicación, dolor intenso, urgencia sanitaria o solicitud expresa de una doctora activan traspaso humano y no una respuesta diagnóstica de IA.

### 2. SMS: el cinturón de seguridad y puente de retorno

SMS permite empezar a vender con AURA antes de que Meta apruebe el número. Debe usarse de forma corta, identificable y con un único enlace seguro al embudo retomable; no como un clon de WhatsApp.

Los casos correctos son: confirmación de reserva, recordatorio de asistencia, enlace de reanudación de quiz tras abandono consentido, enlace de consentimiento informado, cambio de cita y fallback cuando WhatsApp no está activo. No debe contener diagnósticos, fotografías, nombres de tratamientos delicados ni detalles clínicos sensibles. El enlace mágico ya existente en AURA conserva el `lead_id`, el contexto de quiz y el estado de reserva: es exactamente el puente correcto.

**Secuencia inicial sin WhatsApp:**

| Disparador | Envío | Objetivo |
|---|---|---|
| Abandona tras dejar teléfono y consentimiento | 20 minutos | Abrir el enlace mágico al punto exacto del chat |
| Sigue sin volver | 5 horas, solo si no respondió ni reservó | Ofrecer ayuda o un hueco, sin presión |
| Lead caliente sin reserva | Día 3 | Valor añadido: doctora, seguridad o disponibilidad |
| Lead dormido | Día 7 o 21 según el tratamiento | Reactivación segmentada, nunca masiva indiscriminada |

La regla es **máximo un mensaje pendiente por secuencia**. En cuanto abre, responde, reserva, cancela o es marcado como no interesado, se cancela todo lo demás.

### 3. WhatsApp: el canal de confianza y cierre

WhatsApp no sustituye al chat web: gana cuando el lead ya ha mostrado intención y necesita confianza, multimedia, respuesta asíncrona y seguimiento personal. Meta describe los anuncios click-to-WhatsApp como un formato que abre una conversación directa y permite medir resultados más allá del chat mediante Pixel, CAPI u offline conversions.[3]

Cuando el número está activo, AURA debe usar WhatsApp para:

- Entregar el resultado del quiz mediante una **plantilla de utilidad** si existe consentimiento.
- Abrir una conversación de 24 h tras la respuesta del paciente; ahí el Setter Brain puede conversar de forma natural, enviar recursos aprobados y proponer agenda.
- Mandar confirmaciones, cambios y recordatorios mediante plantillas de utilidad.
- Hacer seguimiento post-cita, solicitud de reseña y reactivación solo con finalidad y consentimiento apropiados.

No se debe usar para lanzar promociones a toda la base ni para enviar mensajes médicos personalizados sin la revisión adecuada. Tampoco hay que hacer promesas de resultado ni dar un diagnóstico por mensaje.

---

## Estados del tenant: AURA nunca se bloquea

| Estado de la clínica | Lo que ve y puede hacer | Motor activo |
|---|---|---|
| **Preparación** | Configura embudo, Setter Brain, recursos, agenda, SMS, Pixel y consentimientos | Chat web + SMS |
| **WhatsApp en verificación** | Panel indica el avance; puede captar y reservar sin limitación | Chat web + SMS |
| **Número activo, sin plantillas aprobadas** | Puede atender mensajes entrantes; aún no automatiza recontactos | Chat web + SMS; WhatsApp solo reactivo |
| **Activo y con plantillas aprobadas** | Activa mensajes de utilidad, recuperación y recordatorios por reglas | Chat web + WhatsApp; SMS fallback |
| **Calidad restringida / incidente** | Pausa campañas de WhatsApp y muestra motivo/acciones | Chat web + SMS de contingencia |

360dialog advierte que la verificación puede resolverse rápidamente mediante PLBV cuando el expediente está limpio, pero Meta toma la decisión final y no conviene detener el onboarding operativo esperando ese resultado.[4]

---

## Qué opción tiene más sentido para empezar

| Opción | Ventaja | Problema | Decisión |
|---|---|---|---|
| Esperar a que WhatsApp esté aprobado para lanzar | Experiencia conversacional completa desde el inicio | Retrasa la captación y convierte la aprobación externa en un cuello de botella | **No recomendada** |
| Lanzar solo chat web + SMS y sustituirlo totalmente por WhatsApp después | Simple de entender | Se desaprovecha WhatsApp y se obliga a migrar comportamiento | **Aceptable solo como contingencia temporal** |
| **Modelo híbrido permanente**: chat web siempre, WhatsApp cuando esté aprobado, SMS de seguridad | No frena ventas, conserva contexto, mejora cierre y reduce no-shows | Requiere una orquestación de canal bien hecha | **Recomendada** |

La recomendación firme es la tercera. **Cada clínica se puede vender, instalar y poner a captar desde el primer día.** El equipo hace el setup del embudo, agenda, cerebro, recursos, píxel, SMS y consentimientos en la primera sesión. En paralelo, inicia la conexión de 360dialog. Cuando Meta aprueba número y plantillas, AURA cambia automáticamente el canal prioritario para ese tenant sin reconstruir el embudo.

---

## Cómo debe medirse: una fuente de verdad

Cada lead debe tener un `journey_id` permanente desde el anuncio hasta el cobro. AURA ya recoge `ref`, UTM, eventos de embudo, chats, citas y cobros; hay que ampliar ese mismo historial con el canal y el resultado de cada contacto.

| Evento | Dato mínimo |
|---|---|
| `quiz_started` / `quiz_completed` | UTM, treatment, ref, tenant |
| `contact_captured` | teléfono normalizado, consentimiento SMS y WhatsApp |
| `chat_web_started` / `chat_web_handoff` | etapa, intención, motivo del handoff |
| `message_sent` / `message_delivered` / `message_replied` | canal, plantilla, secuencia, timestamp |
| `booking_created` / `booking_confirmed` | canal que originó y canal que confirmó |
| `appointment_attended` / `payment_completed` | ingreso y atribución del primer/último toque |
| `opt_out` / `blocked` | canal, causa y supresión inmediata |

La métrica central no debe ser «mensajes enviados». Debe ser: **coste por valoración asistida, porcentaje de valoración asistida que compra, ingreso atribuido por campaña y valor recuperado por cada secuencia**.

---

## Plan operativo de lanzamiento por clínica

### Día 1 — Se puede vender y captar

Se publica el embudo personalizado, se conecta Pixel/CAPI, se configura agenda, se ajusta el Setter Brain, se suben recursos autorizados, se activa SMS y se prueban enlaces mágicos. La clínica ya capta por landing, chat web y SMS.

### Días 1–10 — Se completa la capa WhatsApp sin paralizar el negocio

El propietario conecta el número de negocio, completa la verificación, se cargan cuatro plantillas mínimas: resultado de valoración, confirmación de cita, recordatorio de 24 h y cambio/cancelación. Durante este periodo SMS mantiene el papel de fallback.

### Tras la aprobación — Activación progresiva

Primero se activa WhatsApp para nuevos leads con consentimiento y confirmaciones de cita. Después se habilita recuperación de no-reserva, reactivación y post-cita, empezando con volúmenes bajos y midiendo respuestas, bloqueos y reservas antes de escalar.

---

## Decisión resumida en una frase

> **El chat web convierte la visita; SMS garantiza que el lead pueda volver; WhatsApp crea confianza, resuelve objeciones y cierra. Los tres trabajan, pero nunca compiten ni repiten el mismo mensaje.**

## Referencias

[1] [YouTube — Automate WhatsApp Messages, AI Lead Qualification, and Booking Reminders](https://www.youtube.com/watch?v=OQ9eSPNs1-0)

[2] [Guy et al. — SMS reminders and clinic attendance: systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3419880/)

[3] [Meta — Ads that click to WhatsApp](https://whatsappbusiness.com/products/ads-that-click-to-whatsapp/)

[4] [360dialog — Partner-Led Business Verification](https://docs.360dialog.com/docs/resources/meta-business-verification/partner-led-business-verification-plbv-for-whatsapp)

[5] [Twilio — Patient-centred scheduling and multi-channel appointment management](https://www.twilio.com/en-us/blog/deliver-patient-centered-healthcare)
