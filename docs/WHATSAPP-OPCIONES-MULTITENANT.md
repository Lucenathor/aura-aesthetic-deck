# WhatsApp para AURA — Comparativa para multi-tenant (140+ clínicas)

Pensado para tu caso real: muchas clínicas, cada una con su WhatsApp, barato y que **conecte de forma fiable** (lo que nos falla con Evolution autoalojado).

---

## Las opciones, con coste real a escala

| Opción | Quién mantiene infra | Conecta por | Coste por nº/mes | Coste 140 clínicas/mes | Fiabilidad conexión |
|---|---|---|---|---|---|
| **Evolution (actual, self-host)** | **Tú** (servidor) | QR | "0€"* | ~10-30€ servidor total | ❌ La que nos falla |
| **WAHA Plus (self-host)** | **Tú** (servidor) | QR | licencia ~19€/mes total** | ~19€ + servidor | ⚠️ Mejor que Evolution, pero sigues tú con el servidor |
| **2Chat (gestionado)** | **Ellos** | QR | ~10-15$ | **~1.400-2.100$** | ✅ Alta (infra afinada) |
| **Whapi (gestionado)** | **Ellos** | QR | 29$ | ~4.060$ | ✅ Alta |
| **Meta Cloud API (oficial)** | Meta | Alta oficial | 0€ acceso + por mensaje | variable | ✅✅ Máxima, sin baneo |

\* Evolution es gratis de licencia pero el coste real es el tiempo/dolor de mantenerlo (lo estamos viviendo).
\** WAHA Plus: la licencia cubre TODAS tus sesiones en tu servidor (no es por número), pero sigues tú administrando el servidor y el escalado (sharding a partir de ~500 sesiones).

---

## Análisis honesto por opción

### Evolution / WAHA (self-host) — las "gratis"
- **Multi-tenant: sí**, técnicamente. WAHA escala muy bien (hasta 500 sesiones por servidor con el motor NOWEB).
- **Problema:** TÚ mantienes el servidor, las versiones, las IPs, el "calentamiento". Es justo lo que nos está dando guerra. WAHA es **más estable que Evolution**, pero el modelo es el mismo: tú administras la infraestructura.
- **Coste:** casi 0€ de licencia, pero alto en mantenimiento y dolores de cabeza.

### 2Chat / Whapi (gestionadas) — "solo API"
- **Multi-tenant: sí y white-label** (tu cliente solo escanea un QR dentro de AURA; no ve la marca).
- **Ventaja clave:** ellos mantienen la infra afinada (IPs limpias, versión correcta, números estables) → **la conexión "simplemente funciona"**, que es lo que nos falla.
- **Coste a escala:** aquí está el problema → **por número**. 140 clínicas × 10-29$ = **1.400-4.000$/mes**. Caro si escalas mucho.
- Siguen siendo método no oficial (riesgo de baneo por mal uso), pero estabilidad alta.

### Meta Cloud API (oficial) — la "de verdad"
- **Multi-tenant: sí**, es PARA esto (cada clínica su número oficial).
- **Sin baneos, máxima estabilidad.** Es la única 100% sólida para un producto serio.
- **Coste: acceso gratis + por mensaje** (~0,005-0,05$/conversación). A volumen de clínica suele salir **más barato que pagar 10-29$/número fijo**.
- **Pega:** alta por clínica (papeleo Meta) y mensajes salientes con plantilla. Onboarding menos "instantáneo".
- Proveedores como **360dialog** facilitan el alta multi-tenant (onboarding embebido).

---

## Conclusión para TU caso (multi-tenant a escala)

**El modelo "por número" (2Chat/Whapi) es cómodo pero se dispara con 140 clínicas** (miles de €/mes). El self-host (Evolution/WAHA) es barato pero te come en mantenimiento y fallos.

Hay dos caminos coherentes según la fase:

**A) AHORA, para validar y vender (pocas clínicas): 2Chat.**
- ~10-15$/número, white-label, conecta fiable, integración rápida en AURA.
- Perfecto para las primeras 5-20 clínicas mientras validas. Sin servidor, sin dolores.

**B) PARA ESCALAR de verdad (50-140+ clínicas): Meta Cloud API (vía 360dialog).**
- Es la única que escala barata y sin baneos. Es lo que usan los SaaS serios.
- Más trabajo de onboarding, pero es la apuesta a futuro.

### Mi recomendación
1. **Empezar con 2Chat** (gestionado, sin servidor) para que el WhatsApp **funcione YA** y puedas demostrarlo/venderlo. Integración limpia en AURA.
2. **Dejar Evolution** (nos ha dado demasiados problemas de conexión y te obliga a mantener servidor).
3. **Plan a futuro:** cuando tengas volumen, migrar a **Meta Cloud API oficial** (la única sólida y barata a gran escala). El módulo de AURA (bandeja, ficha del paciente) se queda igual; solo cambia el "motor" por detrás.

**En una frase:** para que funcione ya y sin líos → 2Chat. Para escalar a 140 clínicas barato y sin baneos → Meta Cloud API oficial. WAHA/Evolution self-host los descarto porque el mantenimiento es justo el dolor que quieres evitar.
