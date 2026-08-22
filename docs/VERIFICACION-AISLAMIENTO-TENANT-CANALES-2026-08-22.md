# Verificación de aislamiento por tenant — Panel de Comunicaciones

**Fecha:** 22 de agosto de 2026  
**Ámbito:** Política de canal, plantillas, consentimientos, vista previa y registro de decisiones de AURA.

## Resultado

La configuración de comunicaciones está aislada por `tenant_id`. Una clínica puede cambiar sus propias preferencias dentro de los límites del producto, pero no leer, simular ni guardar la política de otra clínica.

> La garantía se aplica a los flujos y permisos comprobados. La prueba física restante —un número 360dialog real, una plantilla Meta aprobada y un fallo de entrega real— sigue pendiente y no se presenta como completada.

## Prueba con sesión real de propietario

Se utilizó una sesión activa de propietario de `clinica-elvira`, sin revelar ni registrar el token en la salida de prueba. El tenant objetivo de contraste fue `demo-firma`.

| Acción realizada con el propietario de Clínica Elvira | Tenant consultado | Resultado HTTP | Resultado esperado |
|---|---:|---:|---|
| Leer su propia política de canal | `clinica-elvira` | 200 | Permitido |
| Leer política de canal ajena | `demo-firma` | 403 | Rechazado |
| Leer plantillas ajenas | `demo-firma` | 403 | Rechazado |
| Leer consentimientos ajenos | `demo-firma` | 403 | Rechazado |
| Simular decisión de canal ajena | `demo-firma` | 403 | Rechazado |
| Guardar política ajena | `demo-firma` | 403 | Rechazado |

El superadmin conserva acceso multi-tenant intencionalmente para operación, soporte y onboarding. No es un permiso disponible para propietarios ni personal de clínica.

## Separación de datos

| Dato | Clave de aislamiento | Efecto práctico |
|---|---|---|
| Política de canal | Fila de `wa_config` por `tenant_id` | Cada clínica decide su modo, respaldo y pausa. |
| Plantillas | `tenant_id` y nombre/idioma único | Una clínica no puede reutilizar o editar plantillas de otra. |
| Consentimiento | `tenant_id + teléfono + categoría` | La baja o consentimiento de una clínica no altera el de otra. |
| Decisión automática | `tenant_id + evento + entidad` único | No duplica el mismo evento y no mezcla operaciones de clínicas. |
| Conversaciones y mensajes | `tenant_id` en chat y mensajes | La bandeja solo devuelve conversaciones de la clínica activa. |
| Estado de contacto | `tenant_id + teléfono` | Una respuesta o intervención humana pausa solo la recuperación de esa clínica. |

## Límites deliberados del panel

El tenant puede elegir modo de envío, respaldo, pausa y plantillas de sus eventos. No puede cambiar la captación web, activar WhatsApp y SMS a la vez, ignorar una baja, enviar sin consentimiento o forzar una plantilla sin aprobación. Tampoco puede marcar automáticamente un no-show.

## Estado de confianza

| Área | Estado |
|---|---|
| Autorización entre propietarios | Comprobada con sesión real |
| Separación de políticas, consentimientos y plantillas | Comprobada por API y esquema |
| Idempotencia por evento | Implementada con clave única por tenant, evento y entidad |
| Aislamiento visual en el panel | Comprobado en sesión autenticada |
| Envío y fallo real de WhatsApp | Pendiente de número y plantilla aprobados |

## Validación visual del organigrama

Se generaron dos vistas complementarias. La primera separa lo que la clínica puede decidir de las reglas que AURA no permite modificar. La segunda enfrenta dos clínicas ficticias y muestra que los intentos cruzados de un propietario devuelven HTTP 403, mientras que el superadmin conserva acceso operativo intencional. Ambas se verificaron tras el renderizado para evitar que la complejidad del esquema ocultara la regla principal: cada operación sigue el tenant autenticado.
