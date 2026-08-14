# 🛡️ REGLAS DE DESPLIEGUE — AURA (auracrm.co)

## REGLA DE ORO

**NUNCA sobrescribir `mvp/index.html` con otro archivo.**

El archivo `mvp/index.html` es la **landing de ventas agresiva** con:
- Hero: "Tu clínica estética pierde pacientes por WhatsApp"
- Línea coral: "AURA los convierte en citas y ventas"
- Input para escribir nombre de clínica
- CTA flotante con neón
- Animaciones de scroll

El pitch deck animado (slides de inversores) es un archivo SEPARADO y NO debe reemplazar la landing.

---

## Cómo desplegar de forma segura

```bash
cd /home/ubuntu/aura-presentation
./deploy.sh          # Despliega TODO (worker + pages) con verificaciones
./deploy.sh worker   # Solo el worker
./deploy.sh pages    # Solo pages (frontend)
```

El script `deploy.sh` ejecuta automáticamente:
1. ✅ Verificación de sintaxis JS (`check_html_scripts.mjs`)
2. ✅ Verificación de integridad de la landing (`pre-deploy-check.mjs`)
3. ✅ Despliegue a Cloudflare
4. ✅ Purga de caché
5. ✅ Push a GitHub (backup)

---

## Si la landing se rompe

Restaurar desde el backup local:
```bash
cp mvp/.index-landing-backup.html mvp/index.html
./deploy.sh pages
```

O desde GitHub:
```bash
git checkout dd3c1d6 -- mvp/index.html
./deploy.sh pages
```

---

## Archivos protegidos (NO TOCAR)

| Archivo | Qué es | Consecuencia si se borra |
|---------|--------|--------------------------|
| `mvp/index.html` | Landing de ventas | Se pierde la homepage |
| `mvp/.index-landing-backup.html` | Backup de la landing | Se pierde el respaldo |
| `mvp/dashboard.html` | Panel CRM completo | Se pierde todo el SaaS |
| `worker/src/index.ts` | Backend (120+ endpoints) | Se cae toda la API |
| `scripts/pre-deploy-check.mjs` | Verificador de landing | Se pierde la protección |

---

## Estructura de archivos

```
mvp/
  index.html              ← LANDING DE VENTAS (PROTEGIDA)
  .index-landing-backup.html ← Backup inmutable
  dashboard.html          ← Panel CRM
  login.html              ← Login
  portal.html             ← Portal del paciente
  reservar.html           ← Reserva online pública
  firmar.html             ← Firma de consentimientos
  activar.html            ← Activación de cuenta
  _t/index.html           ← Embudo del paciente (quiz IA)
  legal/                  ← Páginas legales
worker/
  src/index.ts            ← Backend completo
  wrangler.toml           ← Config de Cloudflare Worker
scripts/
  check_html_scripts.mjs  ← Verificador de sintaxis
  pre-deploy-check.mjs    ← Verificador de landing (PROTECCIÓN)
deploy.sh                 ← Script de despliegue seguro
```
