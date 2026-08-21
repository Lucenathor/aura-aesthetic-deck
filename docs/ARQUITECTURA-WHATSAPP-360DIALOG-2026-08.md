# Arquitectura de WhatsApp oficial para AURA

## Principio rector

AURA utilizará exclusivamente la **WhatsApp Business Platform oficial**, operada mediante 360dialog como BSP y Partner Platform. Las conexiones mediante QR u otros mecanismos no oficiales no formarán parte de la experiencia ofrecida a clínicas. Esta decisión protege el número comercial de cada clínica, permite mensajes proactivos mediante plantillas aprobadas y hace trazable el consentimiento de cada paciente.

## Patrones investigados y aplicados

| Patrón | Decisión en AURA | Motivo verificable |
|---|---|---|
| Consentimiento por categoría | Registro separado para citas, seguimiento clínico y marketing | Meta exige opt-in previo y recomienda separar categorías para reducir bloqueos. |
| Confirmación de cita | Plantilla utility con botones **Confirmar** y **Necesito cambiarla** | Reduce fricción y permite que recepción actúe sobre una respuesta estructurada. |
| Recordatorio de agenda | Dos envíos configurables: 24 horas y 2 horas antes | Un recordatorio con hora, dirección y acción sencilla es un patrón recurrente en la operación clínica. |
| Post-cita | Encuesta breve y solicitud de reseña únicamente con consentimiento de marketing/reputación | Evita convertir un mensaje de servicio en publicidad no consentida. |
| Bandeja clínica | Conversaciones, estados, responsable, respuesta sugerida, adjuntos y trazabilidad de plantilla | La recepción necesita contexto clínico, no solo una lista de chats. |
| Gestión de plantillas | Biblioteca por tenant, categoría Meta, estado de aprobación, variables y vista previa | Los mensajes proactivos oficiales necesitan una plantilla aprobada. |
| Reserva en WhatsApp | Primera versión mediante botones/listas y enlace de reserva; WhatsApp Flows se activará tras validación del número | Los Flows permiten formularios estructurados, pero requieren configuración y prueba por WABA. |
| Automatización | Eventos de cita y cobro generan propuestas programables, nunca envíos ocultos | Una clínica debe conservar el control de las reglas, horarios y destinatarios. |

## Recorrido operativo propuesto

> La clínica conecta su número desde AURA, aprueba sus plantillas y define consentimiento, horarios de envío y reglas. A partir de ese momento, la plataforma propone y ejecuta comunicaciones oficiales según eventos de agenda, cobro y seguimiento; cada envío queda ligado al paciente, a la cita, a la plantilla y a su resultado.

El primer contacto estructurado será la confirmación de cita. El paciente podrá confirmar, solicitar una reprogramación o detener comunicaciones desde una interacción corta. La agenda se actualizará de forma segura y mostrará a recepción qué pacientes requieren intervención; una respuesta negativa nunca marcará automáticamente una cita como no-show.

La parte de reserva completa mediante WhatsApp Flows no se activará por defecto. Se habilitará cuando exista un número real en un WABA de prueba y se compruebe la disponibilidad, el bloqueo temporal del hueco y el pago o depósito sin riesgo de duplicar citas.

## Seguridad y aislamiento

Cada conexión guarda solamente referencias y secretos necesarios para su tenant. Los webhooks se validan con cabeceras configuradas en 360dialog y pueden reforzarse con la firma de onboarding oficial. Los eventos son idempotentes; un reintento del proveedor no puede crear mensajes, leads o cambios de cita duplicados. Las preferencias de consentimiento, revocación y categoría son propiedad del paciente dentro de su clínica y nunca se comparten entre tenants.

## Evidencia consultada

La guía de Meta de junio de 2026 exige permiso antes de enviar mensajes, identifica el nombre de negocio como parte del opt-in y recomienda consentimiento por categorías más un mecanismo claro de baja.[1] La API de 360dialog confirma que el envío oficial admite texto, medios, mensajes interactivos y plantillas, además de webhooks con cabeceras personalizadas.[2] [3]

Tres demostraciones analizadas confirman los patrones operativos: recordatorios en 24 horas y 2 horas, respuestas accionables, seguimiento post-cita, onboarding de Partner centralizado para la plataforma y formularios de reserva estructurados que leen disponibilidad desde el backend.[4] [5] [6]

## Referencias

[1] [Meta — Get opt-in for WhatsApp](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in)

[2] [360dialog — Messaging API: Messages](https://docs.360dialog.com/docs/messaging-api/api-reference/messages)

[3] [360dialog — Messaging API: Webhooks](https://docs.360dialog.com/docs/messaging-api/api-reference/webhooks)

[4] [YouTube — How to Automate WhatsApp Appointment Reminders](https://www.youtube.com/watch?v=Q5vXXwy38j8)

[5] [YouTube — How to Become a Meta Tech Provider with 360dialog](https://www.youtube.com/watch?v=TzpI1xAV5sQ)

[6] [YouTube — Appointment Booking in WhatsApp](https://www.youtube.com/watch?v=wUDzMzrzLxQ)
