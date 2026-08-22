# Validación del organigrama híbrido de AURA

**Fecha:** 22 de agosto de 2026  
**Propósito:** establecer una arquitectura clara y defendible para coordinar el asistente web, SMS y WhatsApp Business por tenant sin frenar el lanzamiento de ninguna clínica.

## Conclusión

El organigrama adopta un modelo de **orquestación permanente de tres canales**, no un sistema de sustitución. El chat web capta y cualifica tráfico nuevo; WhatsApp interviene cuando existe número operativo, permiso y contexto válido; SMS garantiza la continuidad de las acciones críticas cuando WhatsApp aún no está disponible, falla o el paciente necesita un enlace inmediato.

### Verificación visual

Se renderizaron una versión completa y una versión ejecutiva. La versión ejecutiva separa el recorrido comercial en siete pasos legibles y deja las cuatro reglas operativas visibles en una banda independiente. Los estados de WhatsApp por tenant se entregan en un segundo organigrama para evitar que el flujo principal se convierta en un esquema ilegible.

Esta arquitectura es preferible a esperar una aprobación de Meta antes de lanzar. Cada tenant puede publicar su embudo, capturar leads, mostrar agenda y enviar confirmaciones desde su primer día de setup. La aprobación de WhatsApp añade capacidad conversacional; no es un requisito de arranque.

## Reglas que se han validado

| Regla | Motivo operativo | Referencia |
|---|---|---|
| Un solo perfil e historial por teléfono normalizado | Evita que chat web, SMS y WhatsApp creen pacientes o conversaciones inconexas | [1] |
| Un canal automático pendiente por evento | Evita fatiga, mensajes duplicados y apariencia de spam | [1] [2] |
| Chat web para entrada y triage, no para diagnóstico | Conserva la inmediatez sin sustituir al criterio clínico ni al equipo humano | [3] [4] |
| SMS conciso para confirmación, recordatorio y enlace seguro | Es adecuado para acciones críticas y recordatorios de cita, no para conversación clínica prolongada | [5] [6] |
| WhatsApp con opt-in y plantilla/ventana correctos | Protege la calidad del número y el cumplimiento de las reglas de Meta | [7] [8] |
| Fallback por estado del tenant | La captación no se detiene si la verificación, las plantillas o la calidad de WhatsApp no permiten el envío | [9] [10] |

## Correcciones aplicadas respecto a una secuencia lineal simple

La secuencia no debe ser «chat → SMS → WhatsApp» para todos los leads. Ese enfoque genera duplicación y castiga la experiencia del paciente. La ruta correcta depende de tres variables que AURA debe evaluar antes de cada envío: **estado de WhatsApp del tenant, consentimiento registrado y última interacción útil del lead**.

El chat web se mantiene como primer contacto, incluso cuando la clínica opera WhatsApp. Meta recomienda las conversaciones iniciadas desde anuncios click-to-WhatsApp, pero eso no elimina el valor de una landing con quiz para campañas de búsqueda, tráfico directo, QR o navegación orgánica.[7]

La evidencia de recordatorios SMS respalda su uso para aumentar la asistencia clínica frente a no enviar recordatorios, aunque el efecto exacto debe medirse en cada clínica y no comunicarse como una promesa universal.[6]

## Reglas concretas de implementación

| Situación | Acción de AURA | Acción que debe quedar bloqueada |
|---|---|---|
| Lead activo en chat web | Mantener conversación y mostrar agenda | SMS/WhatsApp automático simultáneo |
| Lead abandona tras dar teléfono | Elegir WhatsApp o SMS según puerta de canal; incluir enlace mágico | Enviar ambos a la vez |
| Lead responde a WhatsApp | Abrir conversación de servicio y cancelar SMS pendiente | Mantener recuperación por SMS activa |
| Reserva creada | Enviar una sola confirmación por canal prioritario | Seguir secuencia de venta |
| Sin confirmación de cita | Revisar entrega; fallback permitido por estado; tarea humana si alto valor | Marcar no-show automáticamente |
| Pregunta clínica compleja o solicitud humana | Suspender IA y entregar resumen a recepción/profesional | Diagnóstico o presupuesto clínico cerrado por IA |
| WhatsApp pendiente, sin plantilla o restringido | Chat web + SMS conservan el servicio | Forzar envío de WhatsApp proactivo |

## Estados de WhatsApp por tenant

| Estado | Canal operativo | Resultado para el paciente |
|---|---|---|
| Preparación | Chat web + SMS | Puede completar valoración y reservar desde el primer día |
| En verificación | Chat web + SMS | La captación continúa mientras se aprueba el número |
| Conectado sin plantillas | Chat web + SMS; WhatsApp reactivo | Puede responder si el paciente inicia conversación |
| Activo y con plantillas | Chat web + WhatsApp; SMS fallback | Experiencia conversacional completa |
| Calidad restringida | Chat web + SMS; revisión humana | Continuidad sin comprometer la cuenta de WhatsApp |

## Referencias

[1] [Twilio — What is omnichannel?](https://www.twilio.com/docs/glossary/what-is-omnichannel)

[2] [Braze — Frequency capping](https://www.braze.com/resources/articles/whats-frequency-capping)

[3] [HelpSquad — AI-to-human escalation for patient conversations](https://helpsquad.com/blog/ai-to-human-escalation-designing-handoffs-that-dont-drop-the-patient/)

[4] [Get Weave — From chatbot to human handoff](https://www.getweave.com/chatbot-to-human-handoff/)

[5] [Twilio — Appointment reminders](https://www.twilio.com/en-us/use-cases/appointment-reminders)

[6] [Guy et al. — SMS reminders and clinic attendance](https://pmc.ncbi.nlm.nih.gov/articles/PMC3419880/)

[7] [Meta — Ads that click to WhatsApp](https://whatsappbusiness.com/products/ads-that-click-to-whatsapp/)

[8] [Meta — Send WhatsApp messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages)

[9] [Meta — Phone numbers on WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers)

[10] [Bird — WhatsApp, SMS and voice fallback](https://bird.com/en-us/blog/whatsapp-api-reporting-sms-voice-fallback)
