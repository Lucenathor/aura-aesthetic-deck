# WhatsApp para AURA — Análisis de foros, riesgos de baneo y recomendación

He leído foros reales (Reddit r/n8n, r/brdev, r/AI_Agents), comparativas y vídeos. Esto es lo que dice la gente que lo usa en producción, no folletos.

---

## Las opciones reales (todas "no oficiales", por QR)

| Solución | Qué es | Pros | Contras |
|---|---|---|---|
| **Evolution API** | Servidor open-source (el estándar de facto en LATAM/España) | Multi-instancia nativa (cada clínica un QR), API REST + webhooks completos, gratis, comunidad enorme, integra con n8n | Mucha doc en portugués; hay que autohospedarlo y mantenerlo |
| **WAHA** | WhatsApp HTTP API, open-source | Muy fácil de desplegar (Docker), doc en inglés, API limpia, multi-sesión, buen nodo n8n | Versión "plus" (multi-sesión seria) es de pago |
| **Baileys** | La librería base (sobre la que se construyen las otras) | Máximo control, ligera | Es una librería, no un producto; tú montas todo; soporte irregular |
| **WPPConnect** | Punto medio librería/servidor | Flexible | Comunidad más pequeña |
| **Wazzap / Wasender / Wipsy (gestionadas)** | "Todo hecho" en la nube | Cero mantenimiento, conectas y ya | Pago mensual, te atan a su panel, menos control para desarrollar |

**Veredicto de los foros:** para **multi-cliente + desarrollar encima por API**, los dos finalistas son **Evolution API** (el más potente y usado) y **WAHA** (el más fácil y en inglés). Baileys solo si quieres bajar al máximo nivel. Las gestionadas, si no quieres servidor.

---

## Lo que de verdad dicen sobre BANEOS (clave)

1. **Cualquier vía no oficial PUEDE banear. Punto.** No hay forma 100% segura que no sea la API oficial. Todos lo repiten.
2. **PERO el riesgo depende casi todo del USO, no de la herramienta:**
   - **Spam / envíos masivos en frío a gente que no te escribió = baneo casi seguro.**
   - **Atención al cliente, bajo volumen, donde el cliente escribe primero = riesgo bajo.** Varios devs lo tienen "en producción funcionando bien" justo con ese patrón.
   - Un dev resumió: *"úsalo para comunicación interna / atención de bajo volumen; para marketing masivo usa la API oficial."* → **es exactamente tu caso.**
3. **Dato a favor tuyo:** en los foros, MUCHOS se quejan más de la **API oficial** (burocracia, número que se pierde si fallas el alta, Meta te sube la categoría del mensaje y triplica el coste, mensajes que devuelven "200 OK" pero nunca llegan). Para tu uso (cliente inicia, sin spam), la no oficial es más práctica y el riesgo es asumible.
4. **El número nuevo recién conectado es el más frágil** (los primeros días es cuando más banean).

---

## Mejores prácticas anti-baneo (sacadas de foros y guías)

1. **Que el cliente escriba primero** (tú ya lo planteas así) → es lo que más baja el riesgo. WhatsApp ve conversación natural, no difusión.
2. **Calentar el número ("warm-up"):** los primeros días, poco volumen y respuestas naturales; subir el ritmo poco a poco. No conectar y disparar 500 mensajes el día 1.
3. **Nada de listas compradas ni difusión masiva** por esta vía (eso, por SMS o API oficial).
4. **Consentimiento (opt-in):** que la paciente haya aceptado que le escriban.
5. **Ritmo humano:** retrasos aleatorios entre mensajes, no envíos idénticos en masa, variar el texto (spintax) si hay que mandar varios.
6. **Usar el número de empresa real de la clínica** (con su foto, su nombre), no números nuevos sospechosos.
7. **Responder a tiempo y que la gente no te bloquee/reporte** (la señal nº1 que usa Meta para banear es que los usuarios te reporten).
8. **No reutilizar un número que ya fue baneado.**

---

## Mi recomendación para AURA

**Opción recomendada: Evolution API autohospedada** (o WAHA si priorizamos sencillez e inglés).
- **Por qué:** es la más potente para lo que quieres —**multi-cliente (cada clínica su QR), configuración fácil (escanear y listo), y API + webhooks para desarrollar todo lo que imagines** encima (bandeja de chat, IA, automatizaciones). Es justo el "conectar por API que fuera increíble para desarrollar" que pediste.
- **Tu uso es el de bajo riesgo:** cliente inicia, sin spam (los recordatorios siguen por SMS). Es el escenario donde la gente la usa sin problemas.
- **Configuración para la clínica:** en el panel de AURA, un botón "Conectar WhatsApp" → muestra el QR → la clínica lo escanea con su móvil → conectado. Igual de fácil que Wazzap.

**Matiz de infraestructura (honesto):** Evolution/WAHA necesitan un **servidor propio siempre encendido** que mantenga las sesiones (no corre en el sandbox web actual de AURA). Es un componente nuevo, pero es estándar y barato (un VPS pequeño aguanta muchas instancias). Si no quieres mantener servidor, la alternativa es una **gestionada** (Wazzap/Wasender), pagando mensual.

**Lo que NO haría:** usar esta vía para marketing masivo o recordatorios en frío. Eso se queda en SMS (como ya está) o, el día que una clínica grande lo pida, API oficial solo para ella.

---

### Resumen en una frase
Sí, es la dirección correcta: **Evolution API (o WAHA)** te da panel sencillo por QR, multi-cliente y API para desarrollar; y como en AURA el cliente escribe primero y el spam va por SMS, **estás justo en el uso de menor riesgo de baneo**. Solo hay que asumir un servicio propio que mantenga las sesiones.

### Siguiente paso (si quieres)
Te preparo: (1) el **plan técnico** (Evolution API en un VPS + cómo conectar cada clínica por QR desde el panel + bandeja de chat ligada a la ficha del paciente), y (2) un **prototipo visual** de la "Bandeja WhatsApp" dentro de AURA. ¿Tiro por Evolution o por WAHA?
