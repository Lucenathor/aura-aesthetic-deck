# Validación integral de seguridad e infraestructura — AURA

**Fecha:** 22 de agosto de 2026  
**Autor:** Manus AI  
**Producción:** [auracrm.co](https://auracrm.co)  
**Worker activo:** `5abfb57d-ae3d-436d-a31c-bb67d98bd9e1` al 100 %  
**Pages final:** `d3a91a8d.aura-mvp.pages.dev`  
**GitHub:** rama `main`, commit de despliegue `ed67a2c`

## Dictamen ejecutivo

AURA dispone ahora de **defensa en profundidad** en cinco capas: recuperación cifrada, perímetro Cloudflare, Worker/API, aislamiento multi-tenant y navegador. No existe una plataforma literalmente «imposible de hackear», pero la superficie confirmada de mayor riesgo quedó reducida y cubierta por pruebas automatizadas permanentes.

> La mejora más importante no es una regla aislada: es que una petición maliciosa debe superar Cloudflare, Turnstile o una firma, el rate limiting, la autenticación, la autorización del tenant y la validación de la operación antes de tocar D1 o R2.

## Copia de seguridad y recuperación

Antes de modificar producción se creó un backup integral, se cifró y se copió al equipo persistente. El archivo y la clave están separados por directorio, ambos con permisos `0600`. La verificación posterior comparó el hash SHA-256 y realizó una descodificación completa hasta un gzip válido.

| Componente | Cobertura verificada |
|---|---:|
| D1 portable | 69 tablas y 3.342 registros en el momento del backup |
| D1 Time Travel | Bookmark de recuperación incluido |
| R2 | 51 objetos; 24,7 MB copiados y verificados |
| KV | Inventario incluido |
| Código | Archivo fuente y bundle Git recuperable |
| Cloudflare | Worker desplegado, Pages y configuración accesible |
| Archivo cifrado | 291.369.296 bytes; SHA-256 `PASS` |

**Ubicación persistente:** `/home/ubuntu/aura-backups/security/aura-security-backup-20260822T171321Z.tar.gz.enc`  
**Clave protegida:** `/home/ubuntu/aura-backups/keys/aura-security-backup-20260822T171321Z.key`

El backup usa AES-256-CBC con PBKDF2 y 300.000 iteraciones. No contiene secretos en el manifiesto en texto abierto y nunca se versionó en GitHub. Cloudflare D1 ofrece Time Travel para restaurar el estado de la base dentro de su periodo de retención, pero no sustituye una copia externa cifrada.[1]

## Endurecimiento aplicado

### Identidad, sesiones y roles

Los códigos OTP dejaron de almacenarse o compararse en texto simple: se generan con `crypto.getRandomValues`, se conservan como HMAC y caducan. Los límites de intentos se guardan en D1, por lo que no se reinician con cada isolate. Las sesiones tienen expiración absoluta de siete días, inactividad máxima de doce horas, revocación y transición de 24 horas para sesiones anteriores.

El rol ya no se convierte en `owner` por defecto. `reception`, `finance`, `pro`, `admin`, `owner` y `superadmin` conservan únicamente el rol registrado. La sesión del navegador dejó de viajar por URL y dejó de persistir en `localStorage`: ahora vive en `sessionStorage` y se elimina al cerrar la pestaña. Se revocó una sesión antigua que aparecía hardcodeada en scripts históricos y se eliminaron sus copias del árbol de trabajo.

OWASP recomienda que cada consulta multi-tenant derive el tenant del contexto autenticado, aplique denegación por defecto y no confíe en identificadores suministrados por el cliente.[2] AURA aplica ahora esa regla a las rutas de gestión, métricas, agenda, ficheros, IA, SMS y WhatsApp.

### Captación pública y reservas

El login y la creación inicial de leads exigen **Cloudflare Turnstile validado en servidor**. Un token ausente o inválido produce HTTP 400 antes de enviar correo o escribir un lead. Las mutaciones posteriores del embudo —quiz, chat, eventos y reserva— requieren una capacidad HMAC expirable ligada al `lead_id`, tenant y propósito. Conocer o adivinar un ID ya no permite modificar otro lead.

Cloudflare exige validar Turnstile en el servidor; la comprobación solo en el navegador no protege el endpoint.[3] El widget está restringido a los dominios de AURA y el secreto se guarda exclusivamente como secret del Worker.

### API, webhooks y operaciones costosas

Se añadieron tres bindings de rate limiting de Cloudflare: autenticación, captación pública y operaciones de coste. El rate limiting es una capa de absorción, no la autorización primaria, coherente con la recomendación de Cloudflare de combinarlo con autenticación y otras defensas.[4]

Los webhooks de Twilio verifican `X-Twilio-Signature`. Los webhooks de 360dialog requieren la firma de plataforma o los tokens secretos separados de Partner y número. Los cuatro secretos críticos —`JWT_SECRET`, `TURNSTILE_SECRET`, `D360_PARTNER_WEBHOOK_TOKEN` y `D360_NUMBER_WEBHOOK_TOKEN`— están configurados; sus valores nunca se leyeron ni mostraron.

Los feeds iCal y los enlaces de confirmación de citas usan HMAC con caducidad. Se eliminaron secretos públicos y `Math.random()` de funciones de autenticación. El panel profesional usa PIN con hash HMAC, protección contra fuerza bruta y sesión temporal de ocho horas transmitida por cabecera, no por URL.

### Ficheros, R2 y SSRF

Las cargas de imágenes y recursos Setter tienen límite de tamaño, lista de MIME permitidos, verificación de firma binaria —PNG, JPEG, WebP, vídeo y documentos permitidos—, nombres criptográficos y prefijo por tenant. Un archivo activo camuflado con una extensión de imagen se rechaza antes de persistirse. OWASP recomienda combinar extensión, MIME, firma del archivo, renombrado y límites de tamaño; confiar solo en `Content-Type` no es suficiente.[5]

Las URLs controladas por usuarios se revisaron para evitar acceso a direcciones privadas, esquemas no permitidos y redirecciones inseguras. La validación de URL se mantiene también en backend, donde un atacante no puede omitirla manipulando el frontend.[6]

### Navegador y contenido

Pages publica CSP, HSTS, `X-Content-Type-Options: nosniff`, anti-clickjacking, `Referrer-Policy: no-referrer`, `Permissions-Policy` y políticas de aislamiento. Dashboard, login, staff, croquis y admin usan `Cache-Control: no-store` y `X-Robots-Tag: noindex, nofollow`.

La CSP restringe scripts, frames y conexiones a AURA, Cloudflare Turnstile, 360dialog y proveedores usados por el producto. Todavía admite scripts y estilos inline porque el frontend actual es HTML monolítico; retirar `'unsafe-inline'` exige modularizar el panel y usar nonces o hashes. Este punto queda como riesgo residual, no oculto.

## Controles Cloudflare activados

| Control | Estado final |
|---|---|
| HTTPS obligatorio | Activado |
| TLS mínimo | 1.2 |
| TLS 1.3 | Activado |
| HSTS de zona | 180 días, sin preload ni subdominios en la primera fase |
| Browser Integrity Check | Activado |
| Security Level | Medium |
| 0-RTT | Desactivado |
| WAF administrado | `Cloudflare Managed Free Ruleset` activo |
| WAF personalizado | Bloquea TRACE/CONNECT y rutas `.env`, `.git`, WordPress, phpMyAdmin y server-status |
| Turnstile | Login y alta de lead |
| Rate limiting | Tres bindings separados por riesgo dentro del Worker |

El WAF administrado está desplegado mediante una regla `execute` en `http_request_firewall_managed`, el mecanismo documentado por Cloudflare.[7] La regla personalizada usa `http_request_firewall_custom` y no contiene restricciones geográficas ni desafíos generales que puedan reducir la conversión.

**Ruleset administrado:** `397efe0b87ef49dbbe8114ac5cf2f131`  
**Ruleset personalizado:** `cb34176e910c4042925312b42318be01`

## Validaciones de producción

El primer despliegue endurecido reveló un error HTTP 1101 al ejecutar migraciones D1 dentro del primer request. La monitorización lo detectó inmediatamente. Worker y Pages se revirtieron de forma coordinada a las versiones estables anteriores, se aplicó el esquema explícitamente, se sustituyeron las migraciones en caliente por una verificación no destructiva y se probó el Worker corregido en un staging temporal sin cron. El staging superó 13 pruebas y fue eliminado con HTTP 404 antes del nuevo despliegue.

| Prueba | Resultado |
|---|---:|
| Regresión estática permanente | 18/18 |
| Sintaxis JavaScript | 5/5 páginas |
| Staging Worker | 13/13 |
| Producción final | 20/20 |
| Tenant propietario, datos propios | HTTP 200 |
| Tenant propietario, tenant ajeno | HTTP 403 |
| Superadmin, soporte a otro tenant | HTTP 200 |
| API sin sesión | HTTP 403 |
| OTP o lead sin Turnstile | HTTP 400 |
| Reserva/chat sin capacidad de lead | HTTP 403 |
| Webhooks Twilio sin firma | HTTP 403 |
| Webhooks 360dialog sin firma/token | HTTP 401 |
| CORS desde origen ajeno | Sin `Access-Control-Allow-Origin` |
| CORS desde `auracrm.co` | Permitido |
| Ruta WAF `wp-admin` | HTTP 403 |
| TLS 1.0 | Rechazado |
| TLS 1.2 | Aceptado |
| HTTPS raíz y `www` | HTTP 200 |

La inspección humana confirmó que Turnstile aparece en el login y que no produce errores de consola. No se completó un CAPTCHA de producción con una cuenta real durante la auditoría; la validación cubrió renderizado y rechazo backend sin token.

## Preservación de datos

Después del despliegue, `PRAGMA quick_check` devolvió `ok`. D1 conserva 72 tablas —69 originales más las tablas de seguridad—, 17 tenants, 379 leads, 147 citas, 213 mensajes y 7 facturas. R2 conserva exactamente los 51 objetos respaldados. No se crearon pacientes, citas ni cobros de prueba.

## Riesgos residuales y siguientes decisiones

| Riesgo residual | Impacto | Acción recomendada |
|---|---|---|
| El token API sigue devolviendo 403 en DNS y 401 en Cache Purge | No puedo auditar DNS, DNSSEC, CAA o purgar caché automáticamente | Añadir un segundo token de zona limitado a `auracrm.co` con `Zone Read`, `DNS Edit` y `Cache Purge` |
| SSL de zona está en `Full`, no `Full (strict)` | Cloudflare cifra al origen, pero no exige validar estrictamente su certificado | Auditar todos los registros DNS y orígenes; después activar `Full (strict)` |
| CSP necesita `'unsafe-inline'` | Un XSS en el HTML monolítico tendría mayor capacidad que con nonces | Modularizar scripts por bloques y migrar a CSP con nonces/hashes |
| Falta una prueba física completa 360dialog | No se ha certificado entrega real con número y plantilla aprobada | Conectar número piloto, configurar Platform Secret y probar mensaje entrante/saliente y plantilla |
| Backup externo es una instantánea manual | El RPO crece con el tiempo | Automatizar backup cifrado semanal y prueba mensual de restauración |
| No hay retención inmutable del archivo externo | Una credencial comprometida del equipo persistente podría borrar backup y clave | Copiar una segunda réplica a almacenamiento con Object Lock o credencial separada; R2 Object Lock evita reducir o eliminar una retención activa.[8] |

## Estrategia recomendada de backup recurrente

La tarea es determinista y utiliza CLI y cifrado, por lo que no necesita análisis de IA en cada ejecución. Hay dos alternativas viables:

| Enfoque | Compensación | Coste | Complejidad |
|---|---|---:|---:|
| Script semanal en el equipo persistente, con D1/R2/KV, cifrado y checksum | Más eficiente; requiere guardar un token Cloudflare de mínimo privilegio en el equipo | Sin coste adicional mientras el equipo ya esté activo | Media |
| Tarea programada de revisión y backup dirigida por un agente | Añade diagnóstico humano-legible en cada ejecución, pero consume créditos por ejecución | Variable | Baja |

Recomiendo el primer enfoque, más una prueba de restauración mensual. No se activó automáticamente porque la selección afecta dónde se almacenará una credencial permanente y el usuario debe aprobar esa decisión.

## Protocolo de respuesta a incidentes

| Fase | Acción operativa |
|---|---|
| Detectar | Conservar hora UTC, ruta, tenant, `cf-ray`, respuesta HTTP y evidencia sin copiar datos clínicos innecesarios. |
| Contener | Revocar sesiones afectadas; pausar automatizaciones del tenant; desactivar temporalmente el endpoint o regla concreta, no toda la plataforma. |
| Credenciales | Rotar primero tokens expuestos de sesión, después secretos de proveedor y finalmente credenciales Cloudflare; nunca reutilizar el valor anterior. |
| Preservar | Crear bookmark D1 Time Travel, inventario R2/KV y snapshot de Worker/Pages antes de limpiar o restaurar. |
| Recuperar | Restaurar el componente mínimo afectado, verificar checksum, ejecutar la batería de 20 pruebas y confirmar aislamiento 200/403 antes de reabrir. |
| Revisar | Documentar causa raíz, ventana temporal, tenants afectados, controles fallidos y una regresión automática que impida repetir el incidente. |

El rollback del Worker se realiza mediante versiones con distribución de tráfico; el de Pages mediante el deployment anterior. El incidente de despliegue ocurrido durante esta auditoría confirmó que ambos mecanismos funcionan de forma coordinada.

## Referencias

[1]: https://developers.cloudflare.com/d1/reference/time-travel/ "Cloudflare D1 — Time Travel"
[2]: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html "OWASP — Multi-Tenant Security Cheat Sheet"
[3]: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ "Cloudflare Turnstile — Server-side validation"
[4]: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ "Cloudflare Workers — Rate Limiting binding"
[5]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html "OWASP — File Upload Cheat Sheet"
[6]: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html "OWASP — SSRF Prevention Cheat Sheet"
[7]: https://developers.cloudflare.com/waf/managed-rules/deploy-api/ "Cloudflare WAF — Deploy a managed ruleset via API"
[8]: https://developers.cloudflare.com/r2/buckets/object-lock/ "Cloudflare R2 — Object Lock"
