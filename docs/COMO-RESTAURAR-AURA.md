# 🛟 CÓMO RESTAURAR AURA (guía de recuperación)

Este documento explica cómo volver a poner AURA en marcha desde el backup si algo se rompe.
Guárdalo junto al ZIP de copia de seguridad en un lugar seguro (no solo en el sandbox).

---

## 1. Qué hay en el backup (ZIP)
- `worker/src/index.ts` → TODO el backend (cerebro de AURA).
- `worker/wrangler.toml` → configuración del worker (nombres, base de datos, bucket).
- `worker/schema.sql` + seeds → estructura y datos de ejemplo.
- `mvp/` → todo el panel (dashboard, portal, embudo, login, home).
- `_backups/aura-db-backup.sql` → **volcado completo de la base de datos** (estructura + todos los datos reales).
- `index.html`, `brand/` → landing y logos.

> Con esto se reconstruye AURA al 100%. Lo único que NO va en el ZIP (por seguridad) son los **secretos** (claves) y las **cuentas externas** → ver secciones 3 y 4.

---

## 2. Infraestructura (dónde vive AURA)
| Componente | Servicio | Identificador |
|---|---|---|
| Backend (API) | Cloudflare Workers | worker: **aura-chat-worker** · account_id: `7b92a21dc56bedffe54ed6113ab9cf38` |
| Base de datos | Cloudflare D1 | **aura-db** · id: `f8c45a8d-5a83-4673-9e4e-56f76f458aa5` |
| Almacenamiento | Cloudflare R2 | bucket: **aura-storage** |
| Panel/Web | Cloudflare Pages | proyecto: **aura-mvp** (rama `main`) · dominio: aura-mvp.pages.dev |
| WhatsApp | Unipile (api50.unipile.com) | cuenta del usuario |
| Dominio | auraos.io | (pendiente de conectar a Cloudflare) |

---

## 3. Secretos necesarios (NO están en el código; hay que volver a ponerlos)
Se configuran con `wrangler secret put NOMBRE` en el worker. Lista:
- `UNIPILE_DSN` → `https://api50.unipile.com:18013`
- `UNIPILE_KEY` → la API key de Unipile (del dashboard de Unipile)
- `JWT_SECRET` → secreto para firmar sesiones (cualquier cadena larga aleatoria; si cambia, se cierran las sesiones abiertas)
- `STRIPE_SECRET_KEY` → clave de Stripe (si se usa cobro online)
- `OPENAI_KEY` → clave de OpenAI (IA), si aplica
- `LABSMOBILE_USER` / `LABSMOBILE_TOKEN` → credenciales del proveedor de SMS
- `RESEND_KEY` → clave de Resend (emails), si aplica
- `AURA_IMG`, `AI` → bindings opcionales

---

## 4. Pasos de restauración (de cero)
Requisitos: tener instalado Node + `wrangler`, y acceso a la cuenta de Cloudflare.

```bash
# 1. Descomprimir el backup
unzip AURA-backup-XXXX.zip && cd aura-presentation/worker

# 2. Autenticarse en Cloudflare
npx wrangler login   # (o exportar CLOUDFLARE_API_TOKEN)

# 3. (Si la BD se perdió) Crear la base de datos y restaurar datos
#    Si la D1 'aura-db' aún existe, salta a importar.
npx wrangler d1 create aura-db   # solo si no existe; copia el nuevo id a wrangler.toml
npx wrangler d1 execute aura-db --remote --file=../_backups/aura-db-backup.sql

# 4. Volver a poner los secretos (uno por uno)
printf 'https://api50.unipile.com:18013' | npx wrangler secret put UNIPILE_DSN
printf 'LA_API_KEY_DE_UNIPILE'           | npx wrangler secret put UNIPILE_KEY
printf 'UN_SECRETO_LARGO'                | npx wrangler secret put JWT_SECRET
# ...y el resto de la sección 3 que se usen.

# 5. Desplegar el backend
npx wrangler deploy

# 6. Desplegar el panel (Pages)
cd .. && npx wrangler pages deploy mvp --project-name aura-mvp --branch main
```

Tras esto, AURA vuelve a estar operativa en su dominio. La conexión de WhatsApp de cada clínica habría que volver a escanear el QR si se perdió la sesión de Unipile (los datos/mensajes ya están en la BD restaurada).

---

## 5. Recuperación rápida (lo más habitual)
Si NO se ha perdido la infraestructura (solo se "rompió" algo del código):
- **Restaurar código:** volver a desplegar worker y panel desde el ZIP (pasos 5 y 6).
- **Restaurar datos:** importar `aura-db-backup.sql` (paso 3, importar).
- No hace falta tocar secretos ni cuentas.

---

## 6. Contacto / notas
- El código tiene historial en **Git** dentro del proyecto (control de versiones).
- El cron diario de AURA hace un `runBackup` interno; además conviene guardar este ZIP periódicamente fuera del sandbox.
- Fecha de este backup: ver nombre del ZIP (`AURA-backup-AAAAMMDD_HHMM.zip`).
