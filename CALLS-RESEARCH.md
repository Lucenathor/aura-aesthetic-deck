# Investigación: llamadas desde el CRM de AURA (click-to-call + grabación + transcripción + reporte IA)

## Requisitos del usuario
- Llamar al paciente DESDE el CRM (click-to-call).
- Grabar la llamada.
- Transcribir la llamada.
- Generar reporte/resumen IA para el DUEÑO.
- Número español (+34) imprescindible (si no, la gente no lo coge).
- Vía API, integrable. Lógica clara, no muy difícil, con efecto wow.

## TWILIO — España (datos oficiales, jun 2026)
Fuente: twilio.com/en-us/guidelines/es/voice y /voice/pricing/es

### Reglas números España (+34)
- Outbound doméstico permitido USANDO un número Twilio español.
- PROHIBIDO: salientes desde prefijo +34902.
- Números MÓVILES españoles NO se pueden usar para marketing no solicitado ni atención no solicitada (cuidado legal). → mejor número FIJO local +34.
- Caller ID se preserva en +E.164.
- Números internacionales desde 1,15 $/mes (los locales ES suelen requerir verificación de dirección local / bundle regulatorio).

### Precios voz España (pay-as-you-go)
- Llamar a fijo España: **$0,0178/min**
- Llamar a MÓVIL España: **$0,0486/min** (tarifa "From EEA"; la "mobile" base figura 0,18 pero la aplicable EEA es 0,0486)
- Browser/app (WebRTC, tramo cliente→Twilio): **$0,0040/min** (entrada y salida)
- SIP / BYOC: $0,0040/min

### Grabación y transcripción (Intelligent services)
- Call recording: **$0,0025/min** + almacenamiento **$0,0005/min/mes**
- Transcripción (clásica): **$0,05/min**
- Conversational Intelligence (mejor calidad):
  - Batch transcription: $0,024/min
  - Streaming real-time: $0,027/min
  - Language operators / generative operators: extra (resúmenes, análisis)

### Cómo funciona click-to-call con Twilio (patrón estándar)
- Opción A (la más fácil, "no app"): API REST `Calls.create` con dos patas:
  1. Twilio llama PRIMERO al móvil del recepcionista/dueño.
  2. Al descolgar, conecta (dial) con el número del paciente, mostrando el número ES de la clínica como Caller ID.
  - Grabación con `record=true` (o Dial record). Transcripción vía Conversational Intelligence o webhook a Whisper.
  - Ventaja: NO necesita micrófono del navegador ni WebRTC; funciona con el teléfono real del usuario. Muy simple.
- Opción B (WebRTC, "llamar desde el navegador"): Twilio Voice SDK (JS) → el recepcionista habla por el ordenador con auriculares. Tramo navegador $0,004/min + tramo a móvil ES. Requiere token, micro, etc. Más "wow" pero más complejo.

## TELNYX (alternativa)
- Voz desde $0,002/min, grabación $0,002/min. API completa. Números y transcripción disponibles.
- Suele ser más barato que Twilio pero con menos "ecosistema"/docs en español.

## Notas legales España (grabación)
- Grabar llamadas: en España se permite grabar una conversación en la que participas, pero para USO/almacenamiento de datos personales (RGPD) hay que INFORMAR al interlocutor ("esta llamada puede ser grabada con fines de calidad") y tener base legal. → Añadir aviso automático al inicio de la llamada + consentimiento.

## Pendiente de investigar
- Coste/forma de conseguir número local ES en Twilio (bundle regulatorio, dirección).
- Alternativas más simples tipo Aircall/CloudTalk (caras) vs API pura.
- Mejor stack de transcripción+resumen (Whisper + LLM ya integrados en AURA worker).


## Hallazgos en foros / documentación oficial (cómo lo hace la gente)

### Twilio "What is Click-to-Call" (doc oficial)
- Confirma 2 patrones estándar (los mismos que propuse):
  1. **Within App/Browser (WebRTC):** se llama desde el navegador por internet (VoIP). Ejemplo real: **Airbnb "Voice Connect"** — anfitrión llama al huésped pulsando un botón, con **números enmascarados** (se oculta el teléfono personal de ambos). 
  2. **Receive a Call Back (dos patas):** un botón inicia una llamada saliente al teléfono del usuario; mientras se establece, se pasa contexto del cliente (nombre, etc.) al representante. → Es el patrón "te llama a ti y conecta".
- **Click-to-Call dentro de un CRM:** Twilio ofrece "dialer integrado" (ej. Salesforce Lightning Dialer): un clic llama al cliente y abre su ficha; el rep toma notas, **registra la llamada automáticamente**, deja buzones pregrabados, etc. → exactamente nuestro caso.
- Dato comercial: añadir click-to-call puede subir conversión hasta **+200%**; en **móvil el 70%** prefiere llamar (vs chat).

### Reddit r/twilio (experiencias reales)
- "Dialing clients from a web browser": Twilio no trae un marcador de navegador "llave en mano"; o usas el **Voice SDK (WebRTC)** tú mismo o **partner solutions**. Confirma que el navegador funciona pero hay que construirlo.
- "Has anyone made a web interface to make calls?": el **WebRTC del navegador hoy da audio de alta calidad** (es viable), pero requiere implementación.
- "Twilio Dialer setup advice" (2026): hay herramientas que usan Twilio por debajo y permiten llamar desde el navegador con tu propio Caller ID.
- Transcripción: el `<Record>` clásico + add-on transcribe; para transcribir **toda** la conversación lo habitual es **grabar y luego transcribir el audio** (con add-on o, mejor, con tu propio Whisper). Stack Overflow confirma que conviene grabar la llamada completa (record-from-answer / Dial record) y transcribir el archivo.

### Conclusión documentada
- Las dos vías son legítimas y usadas en producción. La de **"call back / dos patas"** es la más simple y fiable y la que usan los CRMs para click-to-call con teléfono real. La de **navegador (WebRTC)** es la que usa Airbnb con números enmascarados; da buena calidad pero requiere micro/SDK.
- Para **grabar y transcribir toda la llamada**: grabar el audio completo (record-from-answer) y transcribirlo después (Whisper propio recomendado para español y coste).
