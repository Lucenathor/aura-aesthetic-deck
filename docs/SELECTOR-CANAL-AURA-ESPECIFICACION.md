# Selector de canal de AURA

## Decisión de producto

AURA mantendrá una captación única en su embudo web. El selector únicamente decide el canal de continuidad cuando existe un evento que requiere contactar fuera del chat. No habrá un constructor visual de ramas ni envíos simultáneos.

| Modo del tenant | Comportamiento |
|---|---|
| **Automático** | Prioriza WhatsApp cuando el número está conectado, el paciente tiene consentimiento y existe una plantilla o ventana válida. Si no puede utilizarlo y el respaldo está permitido, usa SMS. |
| **Solo WhatsApp** | Utiliza exclusivamente WhatsApp. Si no cumple sus requisitos, no envía y crea un estado pendiente para revisión; nunca sustituye silenciosamente por SMS. |
| **Solo SMS** | Utiliza exclusivamente SMS y no intenta WhatsApp. |

La clínica podrá pausar todas las automatizaciones y activar o desactivar el respaldo SMS. La interfaz mostrará el modo seleccionado, el estado del número y el último canal utilizado, pero no expondrá reglas técnicas.

## Orden de decisión

| Orden | Comprobación | Resultado |
|---:|---|---|
| 1 | Automatizaciones pausadas | No enviar. |
| 2 | Lead reservado, respondido, dado de baja o atendido por una persona cuando el evento ya no corresponde | Cancelar el envío pendiente. |
| 3 | Persona activa en el asistente web | No interrumpir con un canal externo. |
| 4 | Modo Solo SMS | Intentar SMS si existe saldo y número válido. |
| 5 | Modo Automático o Solo WhatsApp | Evaluar WhatsApp. |
| 6 | 360dialog conectado, consentimiento adecuado y plantilla aprobada o ventana de servicio | Enviar WhatsApp. |
| 7 | WhatsApp no válido y modo Automático con respaldo SMS | Enviar SMS. |
| 8 | No existe canal válido | Registrar el motivo y dejar una tarea operativa, sin duplicar. |

## Preferencias visibles

El panel tendrá un selector de tres modos, un interruptor de respaldo SMS y otro para pausar automatizaciones. No se permitirá seleccionar “WhatsApp y SMS”. Las reglas de recuperación, confirmación y recordatorio conservarán sus activadores actuales, pero todas pasarán por el mismo selector.

## Consentimiento del embudo

El formulario del embudo solicitará aceptación expresa para que la clínica contacte al paciente por WhatsApp o SMS con el fin de atender su solicitud y gestionar la cita. Esta aceptación se guardará por tenant, teléfono, fuente, tratamiento, fecha y versión del texto. El consentimiento de marketing seguirá siendo independiente y no se presumirá a partir de la solicitud de valoración.

## Idempotencia

Cada envío automático tendrá una clave única formada por tenant, evento y entidad de negocio. Un registro reclamado por un proceso no podrá ser enviado por el otro canal. Los reintentos actualizarán el mismo registro y nunca crearán dos mensajes.
