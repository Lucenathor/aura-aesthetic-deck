# Validación del selector de canal de AURA

**Fecha:** 22 de agosto de 2026  
**Estado:** desplegado en producción y sincronizado en GitHub  
**Arquitectura:** captación fija en el embudo web de AURA; WhatsApp como canal preferente de continuidad; SMS como respaldo único.

## Decisión de producto

AURA no muestra al paciente una bifurcación para continuar por WhatsApp. El paciente termina la cualificación y la reserva dentro del embudo web. Cuando AURA necesita contactar fuera del embudo, un selector central decide un único canal.

La clínica dispone de tres modos:

| Modo | Comportamiento |
|---|---|
| Automático | Prioriza WhatsApp cuando el número, consentimiento, regla y plantilla están operativos. Si no puede enviarse y la clínica permite respaldo, utiliza un SMS. |
| Solo WhatsApp | No utiliza SMS. Si WhatsApp no está disponible, el evento queda pendiente. |
| Solo SMS | Utiliza SMS y no intenta WhatsApp. |

La clínica también puede desactivar el respaldo SMS y pausar todos los mensajes automáticos sin desactivar la bandeja ni los mensajes manuales.

## Reglas deterministas

El selector evalúa las condiciones en este orden:

1. Automatizaciones pausadas: no envía.
2. Teléfono inválido: no envía.
3. El paciente ya respondió después de convertirse en lead: cancela la recuperación.
4. Recepción intervino manualmente después de convertirse en lead: cancela la recuperación.
5. Falta consentimiento de marketing o reseñas: no envía por ningún canal.
6. Modo Solo SMS: selecciona SMS.
7. WhatsApp conectado, consentimiento válido y plantilla aprobada vinculada al evento: selecciona WhatsApp.
8. Modo Solo WhatsApp sin condiciones válidas: deja el evento pendiente.
9. Modo Automático con respaldo permitido: selecciona un único SMS.
10. Sin ningún canal permitido: no envía.

## Cobertura funcional

El selector gobierna actualmente:

- Confirmación inmediata de reserva.
- Firma de consentimiento clínico.
- Recordatorio 24 horas antes.
- Recordatorio 2 horas antes.
- Recuperación inmediata de leads.
- Recuperación a las 5 horas.
- Reactivación en los días 3, 7 y 21.
- Cumpleaños, con consentimiento de marketing.
- Recall de nueva venta, con consentimiento de marketing.
- Cuidados posteriores a las 24 horas.
- Seguimiento a los 7 días.
- Solicitud de reseña, con consentimiento específico.

El no-show automático se ha eliminado. AURA alerta a recepción cuando una cita lleva más de una hora sin resolución, pero no cambia el estado ni contacta al paciente automáticamente. El equipo debe confirmar manualmente si fue inasistencia, retraso, cancelación o visita atendida.

## Aislamiento e idempotencia

La configuración se almacena por `tenant_id` en `wa_config`. Los endpoints de lectura, guardado y vista previa exigen sesión y validan el tenant. Solo propietario o superadministrador pueden modificar la política.

Cada decisión crea una clave única `(tenant_id, event_key, entity_id)` en `channel_dispatches`. Un evento enviado no se vuelve a enviar y un estado incierto en procesamiento no se reintenta automáticamente, priorizando evitar mensajes duplicados.

La actividad de la conversación se registra por `(tenant_id, phone)` en `channel_contact_state`. Una respuesta entrante o un envío manual de recepción detienen la recuperación del mismo lead.

## Consentimiento

El embudo solicita permiso explícito para contactar por WhatsApp o SMS con finalidad de atender la solicitud y gestionar la cita. El consentimiento se normaliza por teléfono y se persiste por tenant en la categoría de servicio.

Marketing y reseñas requieren permisos separados. La ausencia de consentimiento de marketing o reseñas nunca se transforma en un SMS de respaldo.

## Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| Lectura sin sesión | HTTP 403 |
| Lectura y guardado del propio tenant | HTTP 200 |
| Propietario intentando modificar otro tenant | HTTP 403 |
| Superadministrador gestionando tenant autorizado | HTTP 200 |
| Modo Automático sin WhatsApp | Un SMS de respaldo |
| Modo Solo WhatsApp sin número conectado | No enviado; queda pendiente |
| Modo Solo SMS | SMS |
| Automatizaciones pausadas | No enviado |
| Falta consentimiento de marketing | No enviado por ningún canal |
| Respaldo desactivado | No enviado cuando WhatsApp no está disponible |
| Paciente respondió | Recuperación cancelada con `patient_replied` |
| Recepción intervino | Recuperación cancelada con `human_intervened` |
| Matriz de 10 eventos | Selección correcta sin envío real |
| Reserva pública con automatizaciones pausadas | Cita creada; confirmación registrada como no enviada; ningún contacto externo |
| Duplicados en `channel_dispatches` | 0 |
| Datos de QA restantes | 0 |
| Sintaxis del dashboard y embudo | Correcta |
| Compilación del Worker | Correcta |
| Rutas críticas post-despliegue | Correctas |

## Estado de interfaz

La configuración está en **Ajustes → Comunicaciones → Cómo contactará AURA**. La interfaz explica los tres modos sin exponer reglas técnicas. Las últimas decisiones se muestran con lenguaje comprensible. La antigua sección de SMS se presenta ahora como respaldo y aclara que nunca se envía además de WhatsApp.

El formulario de captación mantiene la misma secuencia. Solo incorpora el consentimiento de contacto. Durante la prueba se eliminó la promesa de «precio exacto» para mantener la regla del Setter: orientar y derivar a valoración gratuita.

## Limitación pendiente

No hay todavía un número real de WhatsApp Business operativo en el Partner de 360dialog. Por tanto, están validados el selector, las reglas, el fallback, los permisos, el consentimiento y la interfaz, pero queda pendiente el circuito físico final:

1. Conectar un número real.
2. Aprobar y vincular las plantillas de cada evento.
3. Enviar un WhatsApp real.
4. Simular fallo de entrega y verificar un único SMS de respaldo.
5. Responder desde el móvil y confirmar la pausa de recuperación con el webhook real.

## Commits principales

- `e3150b7`: primera versión desplegada del selector.
- `cb67192`: cobertura de recuperación y comprobación de actividad.
- `5aba7ea`: cancelación por respuesta o intervención humana.
- `8915f7d`: vista previa segura de dichas cancelaciones.
- `5c0ecaf`: trazabilidad e idempotencia reforzada.
- `cfc3c30`: cobertura ampliada, eliminación del no-show automático y copy final.
