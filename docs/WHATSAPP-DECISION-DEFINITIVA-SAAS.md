# WhatsApp para AURA — Decisión definitiva (pensado para SaaS)

Objetivo: algo **fácil de montar, pensado para SaaS multi-cliente, con API directa**, que si hay que pagar se paga, pero sin líos.

---

## Las opciones que de verdad sirven para SaaS (descartando lo que da lío)

| Solución | Pensada para SaaS | Cómo se integra | Precio/número | Mantienes servidor | Lío de montaje |
|---|---|---|---|---|---|
| **Unipile** ⭐ | **Sí, nativo** | API unificada + **auth white-label alojada** | **~5€** (11-50 cuentas) | **No** | **Muy bajo (días)** |
| WasenderApi | Sí (partner) | API REST + webhooks | ~6$ | No | Bajo |
| Wazzap | No (es para GHL/Chatwoot) | vía Chatwoot | ~3$ | Sí (Chatwoot) | Medio-alto |
| Evolution self-host | Técnicamente sí | API propia | "gratis" | **Sí (tú)** | **Alto (el que sufrimos)** |
| 2Chat | Sí | API REST | **49$** ❌ | No | Bajo |
| 360dialog (oficial) | Sí | API oficial | Meta + cuota | No | Alto (alta por clínica) |

---

## La ganadora para tu caso: **Unipile**

**Por qué encaja como anillo al dedo en un SaaS:**
1. **Está diseñada literalmente para esto**: "Build real-time WhatsApp messaging INSIDE your software (CRM/SaaS)". No es un wrapper genérico, es una API pensada para que editores de software conecten las cuentas de SUS usuarios.
2. **"Hosted Auth white-label"**: te dan una **pantalla de conexión por QR de marca blanca** para meter en AURA. El cliente conecta su WhatsApp en segundos, sin que veas tú el lío técnico. Esto es justo lo que queremos.
3. **API unificada + webhooks estándar**: enviar/recibir, historial, adjuntos, voz, grupos, read receipts, eventos de cuenta. Un solo esquema. **Integración en "días, no meses"** (lo dicen y los devs lo confirman).
4. **Precio claro y barato a escala**: **~5€ por cuenta conectada/mes** (tramo 11-50), con descuentos por volumen. **Sin coste por mensaje.** Para 140 clínicas es de los más baratos y, sobre todo, **predecible**.
5. **Ellos mantienen la infraestructura** (hosting, cambios de protocolo, seguridad). **Cero servidor que mantengamos nosotros** → se acabó el dolor de Evolution.
6. **Bonus**: la misma API hace **LinkedIn, Gmail, etc.** Si algún día AURA quiere más canales, ya están.
7. **Cumplimiento (DMA)**: no scrapea perfiles, enfocada en interoperabilidad de mensajería → más tranquilidad legal para datos de clínicas.

**Lo honesto:** sigue siendo conexión por QR (no oficial de Meta), así que el riesgo de baneo no es 0 — pero ellos gestionan la infraestructura para minimizarlo, y tu uso (cliente escribe primero, sin spam) es de bajo riesgo. Es el mismo modelo que las demás QR, pero **el más "SaaS-ready" y el más fácil de integrar**.

---

## Por qué descarto las otras (para no liarnos)
- **2Chat:** 49$/número → inviable a escala. Fuera.
- **Wazzap:** no tiene API abierta para software propio (es para GHL/Chatwoot) → nos obligaría a montar Chatwoot en medio = otro servidor que mantener = el lío que queremos evitar.
- **Evolution self-host:** el dolor que ya vivimos (IP, versiones, caídas). Fuera para producción.
- **360dialog (oficial):** la más sólida, pero alta por clínica con papeleo de Meta = lento para tu "fábrica" de 140 clínicas. Buena para más adelante si quieres el sello oficial.
- **WasenderApi:** muy válida y barata (plan B), pero Unipile está más pensada para "meter dentro de un SaaS" y su auth white-label es superior.

---

## Plan de montaje (simple, días)
1. Cuenta en Unipile (tienen prueba/free para construir).
2. En AURA: botón **"Conectar WhatsApp"** que abre la **pantalla white-label de Unipile** (QR). La clínica escanea → conectada.
3. El worker de AURA usa la **API de Unipile** para enviar/recibir y su **webhook** para los mensajes entrantes → caen en la bandeja que ya construimos.
4. Ligamos cada chat a la ficha del paciente (ya hecho).
5. Probamos recibir+responder y listo.

El módulo de AURA (bandeja, ficha, IA, autorrefresco) **se queda igual**; solo cambia el motor por Unipile.

---

## Veredicto en una frase
**Unipile = la opción "para SaaS" por excelencia: API directa, conexión white-label por QR, precio bajo y predecible (~5€/cuenta), sin servidor que mantener y rápida de integrar.** Es exactamente lo que pediste: algo no complejo de montar, pensado para SaaS, y que si se paga, se paga poco y con sentido.

Plan B si Unipile no convence: **WasenderApi** (~6$, también directa y barata).
