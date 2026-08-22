# Auditoría de seguridad AURA — hallazgos confirmados en curso

Documento de trabajo. No contiene secretos, tokens, datos clínicos ni identificadores personales.

## Estado de respaldo

Antes de modificar producción se creó una copia cifrada y verificada fuera de Cloudflare. Incluye código e historial Git, punto Time Travel y exportación portable de 69 tablas D1 con 3.342 registros, 51 objetos R2, inventario KV, Worker desplegado y configuración accesible. El archivo cifrado pasó SHA-256 y una descodificación completa a gzip. La copia sin cifrar y la clave temporal del sandbox se eliminaron.

## Hallazgos confirmados

| Prioridad | Superficie | Evidencia | Riesgo |
|---|---|---|---|
| Crítica | Sesiones | La tabla `sessions` solo tiene `token`, `email`, `tenant_id`, `created_at`; existen 10 sesiones y no hay `expires_at`, `last_seen_at` ni revocación explícita por dispositivo. | Un token robado puede permanecer válido indefinidamente. |
| Crítica | Transporte del token | El panel guarda `aura_token` en `localStorage`, lo acepta desde `?token=` y `/api/auth/me` lo recibe en la URL. | XSS, historial, logs, Referer o capturas pueden exponer sesiones. |
| Crítica | XSS almacenado | El dashboard contiene numerosos `innerHTML` construidos con valores procedentes de APIs, pacientes, equipo, recursos y configuración. Pages no entrega CSP. | Un campo persistido malicioso puede ejecutar JavaScript y robar el Bearer token. |
| Alta | Autenticación OTP | El código de seis cifras usa `Math.random`, se guarda en texto claro y los límites actuales son un `Map` en memoria por isolate. | Fuerza bruta distribuida, reintentos entre isolates y menor garantía criptográfica. |
| Alta | Alta no autorizada | `/api/auth/request-code` hace upsert en `owners` para cualquier correo y deriva un tenant del cuerpo o del email si no es miembro. | Puede crear identidades/tenants no previstos y ensuciar datos. |
| Alta | CORS | `json()` devuelve `Access-Control-Allow-Origin: *`; `corsForOrigin()` vuelve al wildcard cuando el origen no está permitido; OPTIONS siempre devuelve wildcard. | Orígenes no autorizados pueden consumir endpoints públicos y la política no separa datos públicos de protegidos. |
| Alta | Rate limiting | El contador es un `Map` en memoria del Worker y se reinicia/reparte entre isolates. | No constituye un límite global fiable para OTP, chat, leads, uploads ni endpoints de coste. |
| Alta | Enlace de confirmación | El token de cita se deriva de `SHA-256(appointmentId + secreto fijo en código)`, se trunca a 12 hex y no expira. | Replay permanente y secreto recuperable del repositorio. |
| Alta | TLS/HTTPS de zona | `always_use_https=off`, `min_tls_version=1.0`, HSTS de zona desactivado y SSL `full`, no `strict`. | Configuración inferior al estándar deseable; el redirect actual depende del producto Pages y no de una política uniforme de zona. |
| Alta | Bypass de controles de zona | La API se consume directamente desde `*.workers.dev`; WAF y reglas de la zona `auracrm.co` no protegen ese hostname. | Los controles de zona no cubren el backend principal. |
| Alta | Cabeceras del frontend | `auracrm.co`, `www` y `/dashboard` no sirven CSP, HSTS, X-Frame-Options ni Permissions-Policy; solo `nosniff` y Referrer-Policy. | Mayor impacto de XSS, clickjacking y carga de terceros. |
| Media | Secretos de firma | Varias firmas usan fallbacks como `aura-default-secret` si falta `JWT_SECRET`. | Un error de despliegue degradaría silenciosamente la seguridad a una clave conocida. |
| Media | Identificadores | Algunos IDs/slugs y el honeypot usan `Math.random`. | Enumeración/colisiones o falsa apariencia de aleatoriedad en artefactos con relevancia de seguridad. |
| Media | R2 uploads | Hay prefijos por tenant y límites de tamaño/tipo declarados, pero falta validar magic bytes, antivirus o cuarentena antes de servir archivos. | Archivos camuflados, contenido activo o abuso de almacenamiento. |
| Media | Recuperación | Time Travel está activo, pero el bucket operativo `aura-storage` no debe convertirse en backup inmutable. | Producción y backup quedarían en el mismo radio de explosión si se usa la misma cuenta/bucket. |

## Configuración Cloudflare confirmada

La zona `auracrm.co` está activa en plan Free. Están presentes Cloudflare Managed Free Ruleset, normalización y DDoS L7. TLS 1.3, HTTP/3, Brotli y Browser Integrity Check están activos; 0-RTT está desactivado. Pages tiene activos `auracrm.co` y `www.auracrm.co`; los dominios antiguos de `auraos.io` están desactivados.

## Restricciones de la credencial actual

El Account API Token permite Worker, Pages, D1, R2, KV y lectura de tokens, pero sigue devolviendo 403 para DNS y 401 para Cache Purge. Esto limita cambios de zona, DNSSEC, inventario de registros, WAF personalizado y purga; no impide endurecer el Worker y Pages mediante código.
