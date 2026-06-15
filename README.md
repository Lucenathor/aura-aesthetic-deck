# AURA — SaaS para clínicas estéticas

Plataforma multi-clínica: capta pacientes (embudo + IA), los gestiona (agenda, pipeline de llamadas,
caja con beneficio real), los fideliza (portal del paciente con puntos y packs) e integra WhatsApp
(vía Unipile) e inventario con copiloto de IA.

## Arquitectura (resumen)
- **Backend:** Cloudflare Worker — `worker/src/index.ts`
- **Frontend:** Cloudflare Pages — `mvp/` (`dashboard.html`, `portal.html`, embudo, login)
- **Base de datos:** Cloudflare D1 `aura-db`
- **Ficheros/imágenes:** Cloudflare R2 `aura-storage`
- **WhatsApp:** Unipile (API)
- **Web pública:** auraos.io

## ⚠️ Antes de tocar nada
Lee **AGENTS.md** (reglas de trabajo, despliegue seguro, secretos y estructura). Resumen:
- GitHub es la fuente única de la verdad. Commit + push tras cada cambio importante.
- Cloudflare solo recibe despliegues; nunca se edita código ahí.
- Secretos solo en Cloudflare Secrets, nunca en el repo.

## Carpetas
- `worker/` backend · `mvp/` frontend · `brand/` marca · `docs/` documentación · `scripts/` seeds de demo

## Despliegue
Ver sección 5 de AGENTS.md.

## Restauración ante desastre
Ver `docs/COMO-RESTAURAR-AURA.md`.
