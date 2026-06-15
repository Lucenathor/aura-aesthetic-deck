# Chat de WhatsApp dentro de AURA — ¿se puede? ¿cómo? ¿sin baneos?

**Respuesta corta: SÍ, es totalmente viable y existe.** Cada clínica podría tener su WhatsApp con una bandeja de chat dentro de AURA para hablar con sus pacientes y enviar mensajes. La clave es elegir bien la "vía", porque hay dos caminos y uno te puede banear.

---

## Los dos caminos para conectar WhatsApp

### Camino A — API OFICIAL (WhatsApp Cloud API de Meta) ✅ recomendado
Es la vía legal y aprobada por Meta. La que usan las empresas serias.
- **Cómo funciona:** la clínica conecta su número a través de Meta (vía un proveedor "BSP" como 360dialog, Twilio, etc.). No se escanea un QR del móvil; el número queda "elevado" a número de empresa.
- **Bandeja multi-cliente:** cada clínica = su propio número + su bandeja. Se gestiona perfecto en multi-tenant (justo lo que es AURA).
- **NO te banean** si cumples las normas (es el canal oficial).
- **Coste (modelo nuevo, desde julio 2025): por mensaje.** Aproximado:
  - Mensajes de *utilidad* (recordatorios, confirmaciones): ~0,004–0,045 €
  - Mensajes de *marketing* (promos): ~0,025–0,137 €
  - Las respuestas dentro de una conversación que **inicia el cliente** (atención al cliente) son muy baratas o gratis las primeras 1.000/mes.
- **Limitación:** para enviar tú el primer mensaje (fuera de 24h desde que te escribió el cliente) hay que usar **plantillas aprobadas** por Meta. Dentro de la ventana de 24h (cliente te escribió), respondes libre.

### Camino B — NO OFICIAL (tipo Wazzap, Baileys, Evolution API, WAHA) ⚠️ riesgo de baneo
Es lo que vende **Wazzap.mx**: escaneas un QR (como WhatsApp Web) y mandas mensajes "ilimitados" sin API oficial, sin plantillas, sin regla de 24h, tarifa fija (~19–199$/mes).
- **Ventaja:** barato, sin aprobaciones, mensajes ilimitados, conecta en 30 segundos.
- **El gran problema:** **va contra los términos de WhatsApp.** Meta detecta y **banea** estos números (sobre todo si mandas muchos mensajes o te reportan). Wazzap intenta mitigarlo con "anti-ban" (proxies, retrasos aleatorios, spintax que cambia el texto), pero **el riesgo de baneo nunca desaparece**: si banean el número de una clínica, pierde su WhatsApp entero (sus chats, su número de toda la vida). Las librerías base (Baileys) han tenido sustos de discontinuación y Meta ha intensificado los baneos en 2025-2026.
- **Para una clínica esto es MUY peligroso:** su número de WhatsApp es su activo. Un baneo = pierde el contacto con todas sus pacientes.

---

## Comparativa rápida

| | API Oficial (Cloud API) | No oficial (Wazzap/QR) |
|---|---|---|
| Legal / aprobado por Meta | ✅ Sí | ❌ No |
| Riesgo de baneo | Muy bajo | **Alto** |
| Coste | Por mensaje (variable) | Fijo mensual barato |
| Primer mensaje libre | No (plantillas) | Sí (sin límite) |
| Multi-cliente (cada clínica su número) | ✅ Perfecto | ✅ Posible |
| Adecuado para clínicas (activo crítico) | ✅ Sí | ⚠️ Arriesgado |

---

## ¿Cómo se montaría dentro de AURA? (cada clínica su WhatsApp + chat)

Técnicamente es un módulo nuevo: **"Bandeja WhatsApp"** en el panel, junto a Pipeline/Pacientes.
1. **Conexión por clínica (multi-tenant):** cada clínica conecta su número una vez. Con API oficial, mediante onboarding embebido (360dialog tiene el más sencillo). Cada número queda atado a su tenant.
2. **Bandeja de chat unificada:** una pantalla tipo WhatsApp Web dentro de AURA con la lista de conversaciones y el chat. Los mensajes entran por *webhook* y se guardan en la base de datos de AURA (así el chat queda ligado a la ficha de cada paciente → trazabilidad total con el pipeline y la agenda).
3. **Envío de mensajes:** desde la bandeja o automáticos (confirmaciones, recordatorios, recall) — encaja con lo que AURA ya hace por SMS, pero por WhatsApp (más barato y mejor tasa de lectura).
4. **IA opcional:** un bot que responde solo en la ventana de 24h (igual que el chat del embudo actual).

**Importante (limitación de la plataforma actual):** este módulo necesita un proceso que esté "siempre escuchando" los webhooks de WhatsApp y mantener conexiones. El sandbox/WebDev actual de AURA está pensado para web; para un WhatsApp 24/7 robusto convendría un pequeño servicio dedicado (o usar un proveedor como 360dialog/Twilio que hospeda la conexión y solo nos manda webhooks). Es desarrollable, pero es un proyecto en sí mismo (no un retoque).

---

## Mi recomendación honesta para AURA

1. **Para clínicas: ir por la API OFICIAL.** Su WhatsApp es sagrado; no podemos arriesgarnos a que Meta les banee el número. El coste por mensaje es asumible (y se puede repercutir como los SMS actuales: "saldo de WhatsApp").
2. **Empezar simple:** integrar un proveedor BSP (360dialog es el más cómodo para multi-cliente y onboarding embebido) y construir la bandeja de chat dentro de AURA, ligada a la ficha del paciente.
3. **Reglas anti-baneo (aunque sea oficial, hay que cuidarlas):**
   - No comprar listas ni mandar mensajes masivos no solicitados.
   - Pedir consentimiento (opt-in) antes de escribir.
   - Usar plantillas aprobadas para iniciar conversación; texto libre solo dentro de la ventana de 24h.
   - Ritmo natural, no miles de mensajes de golpe; calidad del número (que no te marquen como spam).
4. **El modelo "Wazzap" (QR no oficial)** lo usaría solo como **opción barata para quien lo asuma**, avisando del riesgo. No lo pondría como opción por defecto para clínicas serias.

**En una frase:** sí se puede y sería un módulo potentísimo para AURA (WhatsApp + chat + IA por clínica), pero hazlo con la **API oficial** para no jugarte el número de tus clientes; lo de Wazzap es tentador por el precio, pero el baneo es un riesgo demasiado grande para una clínica.

---

### Siguiente paso (si quieres avanzar)
Puedo prepararte: (a) un **plan técnico** de cómo integrar 360dialog/Cloud API en AURA con la bandeja de chat multi-cliente, y (b) un **prototipo visual** de la pantalla "Bandeja WhatsApp" dentro del panel para que veas cómo quedaría. Dímelo y lo monto.
