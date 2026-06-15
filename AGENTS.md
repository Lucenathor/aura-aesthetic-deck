# AGENTS.md — AURA (reglas de trabajo del proyecto)

> AURA es un SaaS multi-clínica (estética) sobre Cloudflare. Este archivo es la guía obligatoria
> para cualquier persona o agente que trabaje en el proyecto. Léelo antes de tocar nada.

## 1. Qué es y dónde vive cada cosa (infraestructura)

| Pieza | Qué es | Dónde |
|---|---|---|
| **Worker** (`worker/src/index.ts`) | Backend: toda la lógica/API (pipeline, caja, agenda, WhatsApp/Unipile, inventario, copiloto…) | Cloudflare Worker `aura-chat-worker` |
| **Panel + web** (`mvp/`) | Frontend: `dashboard.html` (panel clínica), `portal.html` (app paciente), embudo, login | Cloudflare Pages `aura-mvp` (rama `main`) |
| **Base de datos** | Datos (clínicas, pacientes, citas, packs, mensajes WA, inventario…) | Cloudflare D1 `aura-db` |
| **Imágenes/ficheros** | Logos, fotos de producto, etc. | Cloudflare R2 `aura-storage` (servidas en `/img/...`) |
| **WhatsApp** | Canal por API (no oficial, QR) | Unipile (cuenta externa, API key en secrets) |
| **Dominio** | Web pública | `auraos.io` (+ `aura-mvp.pages.dev`) |

## 2. Fuente única de la verdad
- **El código vive en GitHub** (`Lucenathor/aura-aesthetic-deck`). GitHub manda.
- Cloudflare SOLO recibe despliegues. NUNCA se edita código directamente en Cloudflare.
- El sandbox de Manus es un espacio de trabajo temporal: **puede borrarse o desincronizarse**.
  Por eso, todo cambio importante DEBE quedar en GitHub.

## 3. Reglas de oro (para no romper producción)
1. **Antes de desplegar**, comprobar que el archivo local NO está atrasado respecto a producción.
   Señal de alarma: si una sección que SÍ funciona en producción "no aparece" en el archivo local,
   STOP — el local está desincronizado. Recuperar la versión buena antes de tocar.
2. **Después de cada cambio importante**, hacer `git commit` y `git push`. No acumular días sin guardar.
3. **Validar antes de desplegar**: build del worker (`wrangler deploy --dry-run`) y comprobación de
   sintaxis del JS del panel. Si falla, NO desplegar.
4. **Un cambio = un commit con mensaje claro** (qué se cambió y por qué).
5. **Probar tras desplegar** (escritorio y móvil) antes de dar algo por terminado.

## 4. Secretos (NUNCA en el código)
- Los secretos viven como **Secrets de Cloudflare** (en el Worker), no en el repositorio.
  Claves: `UNIPILE_KEY`, `UNIPILE_DSN`, `OPENAI_KEY`, `JWT_SECRET`, credenciales SMS, etc.
- El archivo `.gitignore` impide subir `.env`, tokens y credenciales.
- El **token de Cloudflare** y el de **GitHub** los gestiona solo el responsable técnico.
  El resto del equipo trabaja sobre GitHub, sin acceso directo a Cloudflare/D1.

## 5. Despliegue (flujo seguro)
```
# Worker (backend)
cd worker && wrangler deploy --dry-run   # validar
cd worker && wrangler deploy             # publicar

# Panel/web (frontend)
wrangler pages deploy mvp --project-name aura-mvp --branch main

# Base de datos (cambios de esquema): migraciones idempotentes con try/catch ALTER TABLE
```
Tras desplegar: hacer `git add -A && git commit && git push`.

## 6. Estructura de carpetas
```
worker/        Backend (Cloudflare Worker) — src/index.ts + wrangler.toml
mvp/           Frontend (panel, portal, embudo, login)
brand/         Logos y marca
docs/          Documentación, análisis y decisiones (no afecta al producto)
scripts/       Scripts de datos/seed de la demo (no afecta al producto)
_backups/      Volcados de BD (NO se versiona; guardar fuera del sandbox)
```

## 7. Cómo trabaja el equipo (sin romper nada)
- Hacen cambios → commit + push a GitHub.
- Solo el responsable técnico despliega a Cloudflare (o se automatiza desde GitHub).
- Si algo se rompe: volver a la última versión buena en GitHub / rollback.

## Historial de desincronización (lección aprendida)
- 2026-06: el archivo local quedó atrasado respecto a producción (inventario/copiloto existían en
  Cloudflare pero no en el local) por trabajar sin commits frecuentes. Se recuperó desde producción.
  Causa: no se hacía commit a GitHub. Solución: commits frecuentes + GitHub como fuente única.

## 8. Onboarding asistido (panel Administración, solo Super Admin)
- `GET  /api/admin-clinic-detail?id=X`: ficha completa (datos, marca, comercial, contadores equipo/catálogo/packs/clientes portal, estado WhatsApp y horario, checklist autodetectado).
- `POST /api/admin-update-clinic`: edita todos los campos de `tenants`.
- `POST /api/admin-add-sms`: suma saldo SMS a una clínica.
- `GET/POST /api/admin-notes?id=X`: notas internas por clínica (tabla `admin_notes`).
- `POST /api/admin-checklist`: guarda items manuales del checklist (tabla `admin_onboarding`, JSON por tenant).
- `POST /api/admin-reactivate-clinic`: devuelve a `status='active'` una clínica archivada.

## 9. Aceptación legal obligatoria (clickwrap) del dueño
- Documentos en `mvp/legal/`: aviso-legal, privacidad, cookies, terminos, **dpa** (Contrato de Encargado de Tratamiento).
- Al primer acceso del rol `owner`, si no ha aceptado, el panel muestra una pantalla bloqueante (`showLegalGate`) con 3 casillas (Términos, Privacidad, DPA) + firma con nombre.
- `GET /api/auth/me` devuelve `legal_accepted` (solo para owner).
- `GET /api/legal-status?tenant=` y `POST /api/legal-accept` (registra en tabla `legal_acceptances`: tenant, email, signer_name, clinic_name, version, docs, ip, user_agent, accepted_at) como prueba legal.
- Superadmin y otros roles NO ven el gate.
