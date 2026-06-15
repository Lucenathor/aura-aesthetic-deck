# 360dialog vs su competencia (proveedores oficiales de WhatsApp) — para AURA

Análisis a fondo de los proveedores oficiales (BSP / Tech Providers de Meta) que valen para tu caso: **multi-tenant (140+ clínicas), España, sin baneos, integrable por API.**

---

## Primero: qué es un BSP y por qué importa
La API oficial de WhatsApp **no se accede directo**: necesitas un BSP (proveedor autorizado por Meta). El BSP te da el acceso, el "embedded signup" (alta fácil) y te factura. Lo que cambia entre ellos es: **cuánto recargan sobre el precio de Meta, si tienen alta embebida, y si están pensados para multi-tenant (SaaS).**

> Dato 2026: Meta cobra **por mensaje de plantilla** (no por conversación). Las respuestas dentro de la ventana de 24h (cliente escribe) son **gratis**. En España: marketing ~0,06$, utilidad ~0,013$, las de servicio gratis.

---

## Los competidores reales (los que valen para SaaS multi-tenant)

| Proveedor | Modelo de precio | Markup sobre Meta | Alta embebida | Multi-tenant / SaaS | Sede datos |
|---|---|---|---|---|---|
| **360dialog** | Cuota fija por número (~5€/mes) + Meta a coste | **0 (a coste)** | ✅ Sí | ✅ Diseñado para partners | **Berlín (UE)** |
| **Twilio** | Por mensaje + recargo | +0,005$/msg | ✅ Sí | ✅ Sí (devs) | UE bajo petición |
| **Gupshup** | Por mensaje + recargo | +0,001-0,004$/msg | ✅ Sí | ✅ Sí | Global (APAC fuerte) |
| **Meta directo (Cloud API)** | Solo Meta por mensaje | 0 | ✅ Sí (tú montas) | ✅ Pero todo el trabajo es tuyo | Global |
| **Wati** | Plan 39-299$/mes + Meta | a coste | Limitado | SMB (no tan multi-tenant) | US/Asia |
| **Infobip / Bird** | Enterprise a medida | bundle | ✅ | Enterprise (caro) | UE opción |

---

## Análisis para TU caso (clínicas en España, multi-tenant, escalar barato)

**360dialog — el más alineado contigo.**
- **Markup CERO** (pagas a Meta lo que cuesta + una cuota pequeña por número ~5€). El más barato a volumen.
- **Sede en Berlín = datos en la UE** → importante para clínicas (datos de salud, RGPD).
- **Embedded signup propio** → el botón "Conectar WhatsApp" va dentro de AURA, la clínica se da de alta en 30 min sin papeleo.
- **Hecho para partners/ISV** (SaaS que conectan a sus clientes) → exactamente AURA.
- Contra: **no trae interfaz** (ni inbox ni campañas). Pero eso da igual: **la interfaz ya la tenemos hecha en AURA**. Solo usamos su API.

**Twilio — la alternativa sólida.**
- Muy fiable y conocido, alta embebida, multi-tenant. Pero **recarga 0,005$/msg** que a volumen suma, y los datos no son UE por defecto. Mejor si ya usaras Twilio para SMS (no es el caso).

**Gupshup — potente pero APAC.**
- Barato a volumen, pero su fuerte es India/Asia y su soporte/integración en Europa es más flojo. No es el ideal para España.

**Meta directo (Cloud API sin BSP).**
- Gratis de markup, pero **te comes TODO el trabajo** (alta de cada clínica, verificación, mantener tokens). Es el dolor que queremos evitar. Por eso existe 360dialog.

**Wati / Infobip / Bird.**
- Wati es para PYMES con su propia interfaz (no encaja, ya tienes la tuya). Infobip/Bird son enterprise (caros, contratos, overkill).

---

## Veredicto

Para AURA, el ranking claro es:

1. **🥇 360dialog** — markup cero (lo más barato a escala), datos en la UE (clave para salud), alta embebida dentro de AURA, pensado para SaaS multi-tenant. Solo aporta la "tubería" oficial; la interfaz ya es nuestra. **Es la mejor opción.**
2. **🥈 Twilio** — si quisieras un nombre súper consolidado y no te importa el pequeño recargo por mensaje. Buena alternativa de respaldo.
3. El resto no encaja: Gupshup (APAC), Wati (trae su propia UI), Infobip/Bird (enterprise caro).

**Conclusión:** 360dialog gana a su competencia para tu caso concreto (clínicas, España/UE, multi-tenant, escalar barato y sin baneos). Es la vía oficial hecha fácil. Twilio queda como plan B.

---

## Cómo encaja en AURA (cualquiera de los dos)
El módulo que ya construí (bandeja, ficha del paciente, todo) **se mantiene**. Solo cambia el "motor": en el worker, en lugar de hablar con Evolution, hablamos con la API de 360dialog (o Twilio). La diferencia frente a Evolution: **cero servidor que mantener, cero baneos, conexión estable**.

### Lo que necesito de ti para 360dialog
1. Crear cuenta de **partner** en 360dialog.
2. Pasarme las credenciales de API (te guío).
3. Cada clínica conectará su número con el botón embebido (su Facebook + su número).

¿Tiramos por 360dialog?
