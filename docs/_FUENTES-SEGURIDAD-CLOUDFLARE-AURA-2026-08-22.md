# Fuentes de investigación — seguridad Cloudflare para AURA

## Rate limiting

Fuente: https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/

Cloudflare recomienda límites granulares para login, OTP, APIs REST, scraping y operaciones sensibles. Para credenciales propone protecciones escalonadas y, cuando el plan lo permite, contar únicamente respuestas fallidas 401/403. Para OTP recomienda verificar la ruta exacta en analítica, contar fallos y evitar bloquear intentos válidos. También recomienda límites por sesión o identificador y no solo por IP cuando existe riesgo de rotación de direcciones.

Aplicación a AURA: límites independientes para solicitud de código, verificación del código, creación pública de leads, chat del embudo, uploads y operaciones administrativas. Los webhooks firmados de 360dialog deben excluirse de desafíos interactivos y protegerse con firma, idempotencia y límites específicos.

## Defensa en profundidad de APIs

Fuente: https://developers.cloudflare.com/use-cases/apis/protect-apis/

Cloudflare combina WAF, rate limiting por endpoint, validación de esquema OpenAPI, mTLS, Access, JWT y lógica de autenticación/HMAC en Workers. Ningún control único sustituye la autorización del backend.

Aplicación a AURA: conservar `requireTenant` y autorización del Worker como control primario; añadir controles de borde para reducir abuso, no para reemplazar el aislamiento multi-tenant.

## API Shield

Fuente: https://developers.cloudflare.com/api-shield/get-started/

API Shield puede descubrir endpoints, aprender esquemas, validar OpenAPI, detectar datos sensibles, configurar identificadores de sesión y recomendar límites por endpoint/sesión. Las funciones avanzadas pueden depender del plan. Cloudflare recomienda observar y aprender el tráfico antes de activar mitigaciones para reducir falsos positivos.

Aplicación a AURA: inventariar métodos y rutas desde el código; generar OpenAPI progresivamente; comenzar cualquier control de esquema en modo detección/log antes de bloquear. Usar `Authorization` o una claim estable como identificador solo donde el plan lo soporte.

## mTLS

Fuente: https://developers.cloudflare.com/api-shield/security/mtls/

mTLS verifica tanto servidor como cliente y está orientado a comunicaciones máquina-a-máquina. Cloudflare indica que puede configurarse con CA administrada en todos los planes.

Aplicación a AURA: candidato para servicios controlados por AURA, pero no debe imponerse al navegador ni a 360dialog sin confirmar compatibilidad de certificados. Para 360dialog se prioriza firma/secreto del webhook, allowlist si es estable y validación de payload.

## Security Insights y configuración de zona

Fuente: https://developers.cloudflare.com/security/security-insights/

Cloudflare inspecciona riesgos como DNS colgante, ausencia de DMARC/SPF, TLS antiguo, falta de HTTPS/HSTS, ausencia de reglas WAF administradas, APIs no autenticadas, datos sensibles en respuestas, usuarios sin MFA, registros no proxificados y ausencia de Turnstile. Los hallazgos son heurísticos y deben validarse antes de aplicar mitigaciones.

Aplicación a AURA: utilizar esta taxonomía como checklist, pero contrastarla con el código y tráfico real. Un endpoint público de embudo puede ser intencionado; debe protegerse con validación, límites y Turnstile adaptativo, no convertirse en privado.

## HSTS

Fuente: https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/

HSTS reduce ataques de downgrade, pero Cloudflare advierte que debe mantenerse HTTPS y que `includeSubDomains` o preload pueden dejar inaccesibles subdominios que no soporten TLS. Antes de activarlo hay que verificar todos los hosts y no pausar Cloudflare ni mover nameservers durante el `max-age`.

Aplicación a AURA: validar primero `auracrm.co`, `www`, Pages y cualquier subdominio operativo. Empezar con un `max-age` prudente, sin preload, y aumentar después de observación. No activar `includeSubDomains` hasta inventariar todos los hosts.

## Prevención de subdomain takeover

Fuente: https://cheatsheetseries.owasp.org/cheatsheets/Subdomain_Takeover_Prevention_Cheat_Sheet.html

OWASP recomienda inventario DNS ligado a propietario y recurso, eliminar DNS antes de desmantelar recursos, evitar comodines amplios, verificar hostnames, vigilar CNAME/A/AAAA/NS/MX colgantes y no confiar en comodines de subdominio para cookies, CSP, CORS u OAuth.

Aplicación a AURA: cookies host-only, allowlist exacta de orígenes, redirects OAuth exactos, comprobación periódica de CNAME y certificados, y checklist de baja de servicios. Esto requiere acceso DNS de zona, que el Account API Token actual todavía no aporta.

## Seguridad multi-tenant

Fuente: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html

OWASP recomienda derivar el tenant de una sesión autenticada, no confiar en IDs aportados por el cliente, validar `tenant_id + resource_id` en cada lectura o mutación, prefijar caché y almacenamiento por tenant, aplicar cuotas por tenant y registrar auditoría específica. Para blobs aconseja rutas con prefijo de tenant, verificación de propiedad y URLs firmadas.

Aplicación a AURA: revisar sistemáticamente cada endpoint, no solo los ya incluidos en `TENANT_GUARDED`; validar que R2 use claves tenant-scoped y que toda descarga compruebe propiedad. Los endpoints públicos de embudo deben derivar el tenant desde un slug verificado y no aceptar un tenant arbitrario.

## Sesiones

Fuente: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

OWASP exige IDs con suficiente entropía, HTTPS durante toda la sesión, cookies `Secure`, `HttpOnly` y `SameSite`, renovación tras cambios de privilegio, timeouts de inactividad y absolutos, revocación al cerrar sesión y registro del ciclo de vida. El token no debe aparecer en URL ni contener PII.

Aplicación a AURA: el uso actual de Bearer en `localStorage` debe evaluarse como superficie XSS. La mejora preferente es cookie `__Host-` HttpOnly para el panel o, si se mantiene Bearer, CSP estricta, vida corta, rotación y revocación robusta.

## Lógica de negocio y carreras

Fuente: https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html

OWASP recomienda recalcular en servidor precios, permisos y propiedad; modelar workflows como máquinas de estado; rechazar replays; expirar estados parciales; usar restricciones atómicas e idempotency keys; y limitar cada funcionalidad abusiva, no solo el login.

Aplicación a AURA: cobros, anulaciones, confirmaciones de citas, facturas, leads, WhatsApp/SMS y webhooks necesitan invariantes explícitos, idempotencia y pruebas concurrentes. El selector de canal ya incorpora parte de este enfoque; hay que extenderlo al resto de operaciones críticas.

## Recuperación D1 y backups de larga duración

Fuentes: https://developers.cloudflare.com/d1/reference/time-travel/ y https://developers.cloudflare.com/workflows/examples/backup-d1/

D1 Time Travel está siempre activo y permite recuperar cualquier minuto dentro de la ventana del plan; Cloudflare documenta 30 días para Workers Paid y 7 días para Free. La restauración sobrescribe la base y cancela consultas en curso, por lo que requiere runbook y confirmación. Para retención superior, Cloudflare propone un Workflow que exporta D1 mediante REST y guarda el SQL en R2 con reintentos.

Aplicación a AURA: conservar Time Travel para incidentes rápidos, pero mantener copia externa cifrada y programar exportaciones a un bucket de backups separado. Nunca restaurar directamente producción sin registrar el bookmark actual y validar primero el artefacto portable.

## R2 Bucket Locks y lifecycle

Fuentes: https://developers.cloudflare.com/r2/buckets/bucket-locks/ y https://developers.cloudflare.com/r2/buckets/object-lifecycles/

Bucket Locks impide borrar o sobrescribir objetos durante una retención definida; la regla más estricta prevalece sobre lifecycle. Lifecycle permite caducidad y transición de almacenamiento, pero no sustituye un lock contra borrado prematuro.

Aplicación a AURA: no bloquear indiscriminadamente `aura-storage`, porque contiene recursos editables de clínicas. Crear un bucket separado para backups con prefijos fechados y lock de retención. Mantener una copia fuera de Cloudflare para que una credencial comprometida de la cuenta no afecte a producción y backup al mismo tiempo.

## Rate Limiting binding de Workers

Fuentes: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ y https://developers.cloudflare.com/changelog/post/2025-09-19-ratelimit-workers-ga/

Cloudflare declaró estable el binding de Rate Limiting para Workers. Permite claves por usuario, tenant o recurso y varios límites por Worker. Los contadores son rápidos, permisivos, eventualmente consistentes y locales a cada ubicación de Cloudflare; no deben usarse como contabilidad exacta ni como única defensa ante fuerza bruta distribuida.

Aplicación a AURA: sustituir el `Map` por bindings para chat, formularios, uploads y APIs costosas, usando claves por endpoint más identidad. Para OTP y acciones críticas combinarlo con contadores persistentes D1, límites de intentos y expiración, porque el binding por sí solo no ofrece garantía global estricta.
