# Unipile para AURA — Análisis a fondo (qué funciona, qué le sobra a las otras, qué le falta, qué construir)

Tras barrer foros (Reddit, G2), su doc técnica y comparar con el resto del sector.

---

## 1. ¿Qué funciona de Unipile? (lo confirmado)

**Opiniones reales:**
- **G2: 4,3/5.** Bien valorada para integrar LinkedIn + WhatsApp + Email en SaaS.
- 3.000+ empresas la usan (Lemlist, Reply.io, Recruit CRM…). Es una API consolidada, no un proyecto pequeño.
- En Reddit la recomiendan para "saltarse el lío de Meta Business", y el consejo clave que dan encaja con AURA: *"si la usas para responder a quien te escribe primero, el riesgo de baneo es bajo; el riesgo sube si la usas para mandar en frío"* → **es exactamente nuestro caso (cliente escribe primero).**

**Lo que técnicamente hace (verificado en su doc):**
- Conexión **QR no oficial** (WhatsApp normal o Business), sin Meta, inmediato.
- **API REST +100 endpoints + SDK + webhooks en tiempo real** (mensajes, estado, reacciones, lecturas).
- Enviar/recibir texto, **voz**, imágenes, vídeo, documentos, **grupos**, historial, "¿este número tiene WhatsApp?".
- **Hosted Auth white-label**: pantalla de conexión de tu marca.

---

## 2. Qué tiene Unipile que las otras NO (su ventaja real)

Esto es lo importante y la razón por la que la elijo:

### a) Protección de cuenta de nivel empresa (lo que nos faltaba con Evolution)
Su sección "Account Protection" trae **de serie**:
- **Proxies automáticos con rotación de IP** + **geolocalización por país** (50+ países) → "los proveedores nunca saben que usas Unipile". *Esto es justo lo que nos baneaba/desconectaba en Evolution (IP de datacenter).*
- **Rate limiting inteligente preventivo** (frena antes de que WhatsApp detecte comportamiento de bot) + **cuotas por cuenta**.
- **Caché** para no tocar límites.
- **99,9% uptime, <50ms latencia.**

→ Ninguna de las baratas (WasenderApi, Wazzap, Evolution) documenta este nivel de protección de IP/cuota. **Esta es la diferencia que evita el problema que sufrimos.**

### b) Cumplimiento serio (clave para clínicas)
- **GDPR + SOC 2 Tipo II + centros de datos en la UE + cifrado 256-bit.** Para datos de salud de clínicas, esto es oro (las otras no lo ofrecen a este nivel).

### c) Multicanal con la misma API
- WhatsApp + LinkedIn + Instagram + Telegram + Email + Calendario, **mismo esquema**. Si AURA quiere crecer, ya está.

---

## 3. Qué le FALTA a Unipile (honestidad)

- **Sigue siendo NO oficial (QR).** El riesgo de baneo no es 0% (ninguna QR lo es). La protección de proxies lo baja mucho, pero no lo elimina. Para "cero baneo garantizado" → solo la oficial de Meta.
- **No tiene bot builder / inbox propio** (como sí 2Chat). Para nosotros da igual: la bandeja y la IA ya las tenemos en AURA.
- **Precio mínimo 49€/mes** (incluye 10 cuentas). Para 1-2 clínicas es "caro por cuenta"; a partir de 10 ya cunde.
- **No es la más barata por número** (5€ vs 6$ WasenderApi vs 3$ Wazzap), pero la diferencia se paga en protección/cumplimiento.

---

## 4. Comparativa final del sector (resumen)

| | Oficial (Meta/360dialog) | **Unipile** | WasenderApi | Wazzap | Evolution self-host |
|---|---|---|---|---|---|
| Empezar ya (sin papeleo) | ❌ (días) | ✅ | ✅ | ✅ | ✅ |
| Pensado para SaaS | ✅ | ✅✅ | ✅ | ❌ (GHL) | a medias |
| Protección IP/anti-baneo | N/A (oficial) | ✅✅ (proxies+cuotas) | básica | básica | ❌ (la sufrimos) |
| Cumplimiento (GDPR/SOC2/UE) | ✅ | ✅✅ | ❌ | ❌ | ❌ |
| Servidor que mantienes | No | **No** | No | Sí (Chatwoot) | Sí |
| €/número | por mensaje | ~5€ | ~6$ | ~3$ | "gratis"+lío |
| Riesgo baneo | nulo | bajo | medio | medio | alto |

**Unipile gana en lo que nos importa: empezar ya + protección anti-baneo + cumplimiento + sin servidor + pensada para SaaS.** Es el mejor equilibrio.

---

## 5. Qué MÁS podemos construir en AURA con Unipile (lo potente)

Como su API es rica, encaja con cosas que ya tienes y abre otras nuevas:

**Encaja directo con lo que ya construimos:**
- **Bandeja de WhatsApp** (la tenemos) → conectada a sus webhooks en tiempo real.
- **Ficha del paciente ligada al chat** (la tenemos) → cruzar número con leads.
- **IA que responde sola + hand-off a recepción** (lo teníamos planeado) → su API de enviar/recibir lo permite.

**Lo nuevo que habilita Unipile:**
1. **Notas de voz**: la paciente manda audio → AURA lo transcribe (ya tienes transcripción) → la IA responde. Muy potente para clínicas.
2. **"¿Este número tiene WhatsApp?"**: antes de mandar SMS, comprobар si el lead tiene WhatsApp y elegir el canal más barato/efectivo.
3. **Multicanal futuro**: el día que quieras, Instagram DM y LinkedIn de la clínica con la MISMA bandeja (su API ya lo hace).
4. **Recall por WhatsApp** (cuando el cliente ya escribió): continuar la conversación dentro de la ventana, con la IA.
5. **Geolocalización de proxy en España**: poner las IPs en España para que el número de la clínica española "parezca" local → menos fricción/baneo.

---

## Veredicto
**Unipile es la opción correcta para AURA.** Es lo que pediste: empezar ya (no oficial QR), pensada para SaaS, fácil de integrar (días), sin servidor que mantengamos, y —lo más importante— **trae la protección de IP/cuotas que nos faltaba** y cumplimiento serio para datos de clínicas. Lo que le "falta" (ser oficial, bot builder propio) no nos afecta porque la bandeja/IA ya son de AURA y el uso es de bajo riesgo.

**Siguiente paso:** en cuanto tengas la API key + DSN de tu cuenta Unipile, integro AURA y probamos recibir+responder. Y activamos primero las mejoras que encajan directo (bandeja en tiempo real, ficha del paciente, notas de voz con transcripción).
