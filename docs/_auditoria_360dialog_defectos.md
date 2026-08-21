# Auditoría de código 360dialog — Defectos detectados

## 1. Aislamiento por tenant

| Endpoint | Defecto | Gravedad |
|---|---|---|
| `/api/wa-status-360` GET | No llama a `requireTenant`; cualquier sesión válida puede consultar el estado de cualquier clínica pasando `?tenant=X`. | Alta |
| `/api/wa-disconnect-360` POST | No llama a `requireTenant`; cualquier sesión puede desconectar el WhatsApp de otra clínica. | Crítica |
| `/api/wa-send-360` POST | Verifica la clave del tenant pero no comprueba que la sesión pertenezca a ese tenant. | Alta |
| `/api/wa-templates` GET | No protege con `requireTenant`; cualquier sesión puede leer las plantillas de otro tenant. | Alta |
| `/api/wa-templates` POST | No protege con `requireTenant`. | Alta |
| `/api/wa-send-template` POST | No protege con `requireTenant`. | Alta |
| `/api/wa-consents` GET/POST | No protege con `requireTenant`. | Alta |
| `/api/wa-automations` GET/POST | No protege con `requireTenant`. | Alta |
| `/api/wa-metrics` GET | No protege con `requireTenant`. | Alta |
| `/api/wa-attach` POST | No protege con `requireTenant`. | Alta |
| `/api/wa-react` POST | No protege con `requireTenant`. | Alta |
| `/api/wa-read` POST | No protege con `requireTenant`. | Alta |
| `/api/360-connect-session` POST | No protege con `requireTenant`; cualquier sesión podría asociar un canal a un tenant ajeno. | Crítica |

## 2. Directrices de la plataforma

| Problema | Detalle |
|---|---|
| Ventana de 24h solo en `/api/wa-send-360` | El endpoint `/api/wa-attach` envía adjuntos sin verificar la ventana de conversación. |
| Envío de adjuntos sin consentimiento | `/api/wa-attach` no comprueba opt-in antes de enviar medios. |
| Reacción sin ventana | `/api/wa-react` no verifica la ventana de 24h (Meta lo permite pero conviene documentar). |

## 3. Calidad y robustez

| Problema | Detalle |
|---|---|
| Bloque heredado de Unipile sigue presente | Las líneas 4380-4730 contienen código muerto que declara `UNI` y `UKEY` (aunque `uni()` devuelve 410). Aumenta la superficie de ataque y confunde. |
| Variable `UNI` referenciada sin declarar | Línea 4392 usa `UNI` que ya no existe como variable (fue reemplazada por el stub). Esto causa un ReferenceError si esa rama se alcanza. |
| `syncChats` heredado | Función completa que llama a `uni()` y nunca devolverá datos útiles. Código muerto. |
| Duplicación de `/api/wa-media` | Existe una versión oficial (línea 4222) y una heredada (línea 4382). La oficial se ejecuta primero por posición, pero la duplicación es confusa. |
| Duplicación de `/api/wa-patient-media-save` | Existe en línea 4243 (oficial) y en línea 4520 (heredada). |
| `wa-status` heredado (línea 4420) | Intenta llamar a Unipile si el provider no es 360dialog, pero `uni()` siempre devuelve 410. |
| Automatización fija a `Europe/Madrid` | El cron de recordatorios usa `Europe/Madrid` para la hora de silencio; debería usar la zona horaria del tenant. |

## 4. Acciones correctivas

1. Añadir `requireTenant` a todos los endpoints de 360dialog que operan sobre datos de un tenant.
2. Añadir verificación de ventana de 24h y consentimiento a `/api/wa-attach`.
3. Eliminar el bloque heredado de Unipile (líneas 4372-4730) y consolidar las rutas oficiales.
4. Mover la zona horaria de automatizaciones a la configuración del tenant (o usar un default configurable).
5. Verificar que el dashboard envía el tenant correcto en cada llamada y que no permite operar sobre un tenant ajeno.
