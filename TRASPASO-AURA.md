# Documento de traspaso — AURA

> Guía para que cualquier desarrollador (o Claude Code) continúe AURA **sin perder tiempo ni explicaciones**.
> Léelo de arriba abajo una vez. Última actualización: 15 de junio de 2026.

---

## 1. Qué es AURA (en una frase)

SaaS multi-clínica (multi-tenant) para clínicas de estética en España: CRM/pipeline de pacientes, agenda, caja con beneficio real, WhatsApp (Unipile), SMS (LabsMobile), portal del cliente con fidelización, generador de embudos, copiloto IA (texto+voz), inventario y panel de Administración para onboarding asistido. Modelo: **4.000 € de alta + 497 €/mes**.

---

## 2. Infraestructura (dónde vive cada cosa)

| Pieza | Tecnología | Identificador / URL |
|---|---|---|
| **Backend (toda la API)** | Cloudflare Worker (TypeScript) | `aura-chat-worker` → `https://aura-chat-worker.adrian-7b9.workers.dev` |
| **Base de datos** | Cloudflare D1 (SQLite) | `aura-db` (id `f8c45a8d-5a83-4673-9e4e-56f76f458aa5`) |
| **Ficheros/imágenes** | Cloudflare R2 | bucket `aura-storage` (se sirven por `/img/...`) |
| **Imágenes KV** | Cloudflare KV | binding `AURA_IMG` |
| **IA nativa CF** | Workers AI | binding `AI` |
| **Frontend** | HTML/CSS/JS estático | Cloudflare Pages `aura-mvp` → `https://aura-mvp.pages.dev` |
| **Cron** | Cloudflare Triggers | cada minuto (`* * * * *`) → automatizaciones SMS, sync WhatsApp |
| **Cuenta Cloudflare** | account_id | `7b92a21dc56bedffe54ed6113ab9cf38` |
| **Código fuente** | GitHub | `Lucenathor/aura-aesthetic-deck` (rama `main`) |
| **Dominio producto** | — | `auraos.io` (PENDIENTE: ahora apunta a otro proyecto, ver §9) |

**Entidad legal:** THOR GROUP AL-FZCO (Dubái, EAU). License 46219.

---

## 3. Estructura del repositorio

```
aura-presentation/
├── worker/
│   ├── src/index.ts        ← TODO el backend (~3.440 líneas). API, multi-tenant, cron, copiloto, WhatsApp, inventario, admin, legal.
│   └── wrangler.toml       ← Config Cloudflare (bindings D1/R2/KV/AI + cron)
├── mvp/
│   ├── index.html          ← Landing pública
│   ├── dashboard.html      ← Panel de la clínica (~el más grande). Todas las secciones + copiloto + admin
│   ├── portal.html         ← Portal del paciente (puntos, packs)
│   ├── login.html          ← Login (código por email)
│   ├── funnel.html / labios.html ← Embudos públicos
│   ├── activar.html, firmar.html, puntos.html ← Activación, firma de consentimientos, tarjeta de puntos
│   ├── legal/              ← aviso-legal, privacidad, cookies, terminos, dpa (HTML)
│   └── favicon.ico, favicon-*.png, apple-touch-icon.png
├── AGENTS.md               ← Reglas del proyecto (LEER SIEMPRE)
├── COMO-RESTAURAR-AURA.md  ← Guía de restauración + secrets
└── TRASPASO-AURA.md        ← Este documento
```

> El backend es un **único archivo** `worker/src/index.ts`. Todas las rutas se resuelven dentro de un gran `if (p === '/api/...')`. Para añadir un endpoint, se inserta otro bloque `if`.

---

## 4. Cómo desplegar (flujo seguro)

Requiere el token de Cloudflare (en `~/.cf_session_token`, lo gestiona Adrián).

```bash
# 1) Validar el JS del panel antes de desplegar (evita romper producción)
cd aura-presentation
python3 -c "import re; html=open('mvp/dashboard.html').read(); s=re.findall(r'<script>(.*?)</script>', html, re.S); open('/tmp/dc.js','w').write(max(s,key=len))" && node --check /tmp/dc.js

# 2) Desplegar el BACKEND (worker)
cd worker && source ~/.cf_session_token && npx wrangler deploy

# 3) Desplegar el FRONTEND (panel/web)
cd .. && source ~/.cf_session_token && npx wrangler pages deploy mvp --project-name aura-mvp --branch main --commit-dirty=true

# 4) Guardar en GitHub (OBLIGATORIO tras cada cambio)
git add -A
git -c user.name="AURA Dev" -c user.email="dev@auraos.io" commit -m "mensaje claro"
git branch -f main gh-pages && git push origin main
```

Consultar BD en producción:
```bash
cd worker && source ~/.cf_session_token
npx wrangler d1 execute aura-db --remote --command "SELECT ... "
```

---

## 5. Secrets (en Cloudflare, NUNCA en el código)

Configurados como *secrets* del Worker (`npx wrangler secret list`):

| Secret | Para qué |
|---|---|
| `OPENAI_KEY` | Copiloto (gpt-4o-mini) y transcripción de voz (gpt-4o-mini-transcribe / whisper-1) |
| `UNIPILE_KEY`, `UNIPILE_DSN` | WhatsApp no oficial (QR) por API |
| `LABSMOBILE_USER`, `LABSMOBILE_TOKEN` | Envío de SMS reales |
| `RESEND_KEY` | Emails (acceso, etc.) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Pagos (hoy solo compra de SMS) |
| `EVOLUTION_KEY`, `EVOLUTION_URL` | WhatsApp alternativo (Evolution API en Railway) — NO activo, Unipile es el que se usa |

Para añadir/editar secret: `cd worker && source ~/.cf_session_token && npx wrangler secret put NOMBRE`.

---

## 6. Modelo multi-tenant (CRÍTICO)

- Cada clínica = un `tenant_id` (slug). Todas las tablas filtran por `tenant_id`.
- El backend deriva el tenant de la **sesión verificada**, no del parámetro del cliente (ver `resolveCopilotTenant` y `getSessionRole`). **Nunca confíes en el tenant que manda el cliente** para datos sensibles.
- Roles (tabla `owners` y `team_members`): `superadmin` (solo adrian@lucenathor.com), `owner`, `reception`, `pro`, `finance`.
- **Super Admin** ve la sección Administración; el resto no.
- Tenant de demo con datos: `aura-demo`. Las clínicas reales nacen vacías.

---

## 7. Base de datos (44 tablas, las clave)

| Tabla | Contenido |
|---|---|
| `tenants` | Las clínicas (datos, marca, plan, estado, sms_credits, trial_ends_at…) |
| `owners` | Emails con rol global (incluye superadmin) |
| `team_members` | Equipo por clínica (rol, can_copilot) |
| `professionals` | Empleados/profesionales (sueldo `salary_gross`, `ss_pct`, comisión, horario `schedule`) → alimentan el Beneficio real |
| `leads` | Pacientes/contactos del pipeline |
| `appointments` | Citas |
| `treatments_log` | Tratamientos cobrados (facturación) |
| `treatment_catalog` | Catálogo de tratamientos y precios |
| `business_costs` | Costes fijos, IVA, comisiones → Beneficio real |
| `inventory_products` / `inventory_lots` / `inventory_moves` / `inventory_recipes` | Inventario y consumo automático |
| `packs` / `pack_orders` | Packs del portal y compras |
| `loyalty_config` / `points_ledger` | Fidelización (puntos) |
| `wa_config` / `wa_messages` / `wa_chats_meta` | WhatsApp (cuenta Unipile, mensajes, metadatos) |
| `sms_templates` / `sms_purchases` | SMS automáticos y recargas |
| `consent_templates` / `consents_signed` | Consentimientos y firmas |
| `funnels` | Config del embudo por clínica |
| `sessions` | Tokens de sesión |
| `copilot_log` | Log del copiloto |
| `admin_notes` / `admin_onboarding` | Notas internas y checklist de onboarding (panel admin) |
| `legal_acceptances` | Aceptación legal (clickwrap): quién, IP, fecha, versión |

> Migraciones: se hacen con `ALTER TABLE` idempotente envuelto en try/catch dentro del worker (busca `ensureInventorySchema`, `ensureBusinessCosts`, etc.).

---

## 8. Mapa de endpoints (API del worker)

Todos bajo `https://aura-chat-worker.adrian-7b9.workers.dev`. Agrupados:

- **Auth:** `/api/auth/me`, `/api/auth/request-code`, `/api/auth/verify-code`, `/api/magic-link`
- **Legal (clickwrap):** `/api/legal-status`, `/api/legal-accept`
- **Pipeline/pacientes:** `/api/leads`, `/api/lead-*` (call, chatted, event, meta, search, stage), `/api/pipeline`
- **Agenda:** `/api/appointments`, `/api/appt-*` (create, move, status, confirm), `/api/slots`, `/api/calendar`, `/api/schedule-by-day`, `/api/blocks`, `/api/vacations`
- **Caja/negocio:** `/api/cashbox`, `/api/profit`, `/api/business-costs`, `/api/close-visit`, `/api/recovered`, `/api/treatments`, `/api/treatment-catalog`
- **Equipo:** `/api/professionals`, `/api/team`, `/api/team/role`
- **Inventario:** `/api/inv-products`, `/api/inv-product`, `/api/inv-restock`, `/api/inv-recipes`, `/api/inv-recipe`, `/api/inv-alerts`
- **Copiloto IA:** `/api/copilot` (conversacional, con `history` y `draft`), `/api/transcribe` (voz)
- **WhatsApp (Unipile):** `/api/wa-*` (status, connect, qr, send, messages, chats, react, read, newchat, add-lead, patient, confirm-appt, logout, webhook, attach)
- **SMS:** `/api/send-sms`, `/api/sms-credits`, `/api/sms-templates`, `/api/sms-generate`, `/api/sms-checkout`
- **Portal cliente:** `/api/portal-info`, `/api/portal-clients`, `/api/packs`, `/api/pack-buy`, `/api/my-appointments`, `/api/my-bonos`, `/api/loyalty-*`, `/api/refer`
- **Embudo:** `/api/funnel-edit`, `/api/funnel-save`, `/api/funnel-metrics`, `/api/content`, `/api/content-edit`, `/api/generate`, `/api/generate-image`
- **Consentimientos:** `/api/consent-templates`, `/api/consent-send`, `/api/consent-sign`, `/api/consent-get`, `/api/consents`
- **Admin (solo superadmin):** `/api/admin-clinics`, `/api/admin-create-clinic`, `/api/admin-clinic-detail`, `/api/admin-update-clinic`, `/api/admin-add-sms`, `/api/admin-notes`, `/api/admin-note-delete`, `/api/admin-checklist`, `/api/admin-reactivate-clinic`, `/api/admin-delete-clinic`, `/api/admin-send-access`
- **Otros:** `/api/tenants`, `/api/tenant-meta`, `/api/clinic-signup`, `/api/run-automations`, `/api/backup-now`, `/api/backups`, `/api/upload-image`, `/api/stripe-webhook`

---

## 9. Estado actual (qué está hecho y qué falta)

### Hecho y en producción
- Todos los módulos: pipeline, agenda, caja+beneficio real, pacientes, WhatsApp (Unipile), SMS, inventario, portal, embudo, equipo, ajustes.
- **Copiloto IA conversacional** (texto+voz): pregunta campo a campo lo que falta (empleado, producto, receta, cita) y confirma antes de ejecutar. Crea empleados con sueldo (entra en Beneficio real).
- **Panel de Administración** (onboarding asistido): ficha de clínica con pestañas, checklist con autodetección, notas, responsable, recarga de SMS, buscar/filtrar, reactivar.
- **Legal:** Aviso legal, Privacidad (RGPD + datos de salud), Cookies, Términos y DPA. Pantalla de aceptación obligatoria (clickwrap con scroll) al primer acceso del dueño, registrada como prueba. Banner de cookies.
- **Favicon** de marca en todas las páginas.

### Pendiente / a vigilar para escalar
1. **Dominio `auraos.io`**: hoy apunta al proyecto "Funnel AI 2.0 Wow" (otro proyecto de webdev), NO a la web/panel de AURA (`aura-mvp.pages.dev`). Decidir y reapuntar DNS.
2. **Cobro recurrente (497 €/mes + 4.000 € alta)**: Stripe solo cobra SMS hoy. Falta suscripción automática (Stripe Subscriptions/Checkout).
3. **Backups automáticos de D1**: existe `/api/backup-now` y `/api/backups`, conviene confirmar que el cron los hace y se guardan fuera (R2). 
4. **Importador de pacientes** (CSV/Excel) en el panel admin: lo más pedido al migrar de otro CRM. NO implementado.
5. **Revisión legal por abogado** + **DPA firmado con proveedores** (Cloudflare, OpenAI, etc.) y, si se opera desde UE, valorar **representante UE (art. 27 RGPD)**.
6. **Historial persistente del copiloto**: hoy la memoria es solo de la sesión en curso (se reinicia al cerrar). Existe tabla `copilot_log` por si se quiere ampliar.
7. **Coste por clínica**: SMS (LabsMobile), WhatsApp (Unipile, una cuenta por clínica) e IA (OpenAI) escalan en coste — vigilar márgenes.

---

## 10. Datos útiles para pruebas

- **Super Admin:** adrian@lucenathor.com — token de prueba: `agui1780967104`.
- **Tenant demo:** `aura-demo` (57 pacientes, citas, caja, equipo, packs).
- Abrir panel como super admin: guardar el token en `localStorage.aura_token` y abrir `https://aura-mvp.pages.dev/dashboard.html?tenant=aura-demo`.
- Cloudflare WAF bloquea peticiones con User-Agent de scripts (error 1010): para probar la API usa `curl` o el navegador, no urllib de Python.

---

## 11. Reglas de oro (de AGENTS.md)

1. **GitHub manda.** El sandbox es temporal; commitea siempre tras un cambio.
2. **Valida antes de desplegar** (build del worker + `node --check` del JS del panel).
3. **No metas secrets en el código** ni `node_modules` en git.
4. **Multi-tenant es sagrado**: cada clínica solo ve lo suyo; el tenant sale de la sesión.
5. **Acciones destructivas/modificadoras del copiloto** siempre con confirmación.
6. **Datos de demo solo en `aura-demo`**; las clínicas reales nacen vacías.
7. Prueba en escritorio y móvil tras desplegar.

---

*Con este documento, Claude Code (o cualquier dev) puede continuar AURA: clonar el repo, leer `AGENTS.md` + este traspaso, y trabajar sobre `worker/src/index.ts` y `mvp/`. El despliegue requiere el token de Cloudflare de Adrián.*
