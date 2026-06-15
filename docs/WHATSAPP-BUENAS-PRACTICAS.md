# WhatsApp para AURA — Prácticas oficiales y mejores prácticas (guía clara)

Basado en la **WhatsApp Business Messaging Policy**, la **Commerce Policy** y el sistema de sanciones oficial de Meta (doc. de developers.facebook.com), más mejores prácticas de la industria.

---

## Las 5 reglas NO NEGOCIABLES de Meta (romperlas = baneo)

| Regla | Qué significa | Si la rompes |
|---|---|---|
| **1. Opt-in (consentimiento)** | El cliente debe aceptar antes de que le escribas | Suben los reportes de spam, cae tu calidad, te limitan o bloquean |
| **2. Ventana de 24h** | Solo puedes escribir texto libre dentro de las 24h desde el último mensaje del cliente | Fuera de 24h, el mensaje se bloquea salvo plantilla aprobada |
| **3. Plantillas aprobadas** | Para iniciar tú la conversación (fuera de 24h) hay que usar plantillas que Meta aprueba | Mensajes no aprobados no salen; reincidir marca tu cuenta |
| **4. Opt-out (darse de baja)** | Todo mensaje saliente debe permitir dejar de recibir | Mucho bloqueo = baja tu calidad y tu capacidad de envío |
| **5. Contenido prohibido** | Nada de apuestas, contenido adulto, sustancias reguladas, engaños | Suspensión inmediata |

> Nota clave: estas reglas son del **canal oficial**. Con una vía tipo Evolution (no oficial) no hay "plantillas" ni "ventana" técnica, PERO **el espíritu es el mismo** y Meta igualmente banea por comportamiento de spam o por reportes de usuarios. Así que las seguimos igual.

---

## Cómo sanciona Meta (escalado real)
1. **Aviso** con la política incumplida.
2. **Bloqueo 1-3 días** de envío de plantillas / añadir números.
3. **Bloqueo 5, 7 o 30 días** de TODO envío.
4. **Bloqueo de cuenta** indefinido (solo se quita por apelación).
5. **Expulsión permanente** si sigue tras varios avisos.
> Señal nº1 que dispara todo: **feedback negativo de usuarios** (que te bloqueen o te reporten).

---

## Las mejores prácticas que SÍ aplicamos en AURA

### Consentimiento y entrada
- **Que el cliente escriba primero** (tu planteamiento) → es la mejor protección. Sin envío en frío.
- **Opt-in claro:** en el embudo/portal, una casilla "Quiero recibir mensajes por WhatsApp".
- **Nunca importar listas compradas** ni difundir a quien no te conoce (es el error nº1 que destruye cuentas).

### Tono y formato (WhatsApp es espacio personal)
- **Mensajes cortos** (~20-30 palabras). Nada de parrafadas.
- **Tono conversacional y cercano**, en primera persona, con el nombre del paciente. "Hola Marta, ¿te ayudo a reservar?" — no "Estimada clienta, le informamos…".
- **Personalizar con datos** (nombre, tratamiento). Lo genérico parece spam.
- **Botones / respuestas rápidas** cuando se pueda (menos fricción).

### Tiempos y frecuencia
- **Responder en minutos** (la IA puede dar la primera respuesta en segundos).
- **Mensajes salientes en horario comercial**, nunca de madrugada.
- **Frecuencia baja:** 1-2 promociones por semana como techo. Más = bajas y bloqueos.
- **Aprovechar la ventana de 24h:** termina tus mensajes con una pregunta para que el cliente responda y mantenga la conversación abierta.

### Salud de la cuenta / número
- **Calentar el número nuevo:** los primeros días, poco volumen y subir gradualmente.
- **Usar el número real de la clínica** con su nombre y foto (transmite confianza).
- **Opt-out fácil:** que puedan decir "baja" y se respete al instante.
- **Vigilar la "calidad" del número** (verde/amarillo/rojo): si baja, frenar envíos.
- **Siempre una salida a humano:** si el bot no sabe, pasa a una persona (no dejar callejones sin salida).

---

## Lo que AURA YA hace bien (encaja con la política)
- El **spam y los recordatorios masivos van por SMS**, no por WhatsApp → el WhatsApp queda solo para conversación.
- En WhatsApp, **el cliente inicia** → sin envío en frío.
- Mensajes personalizados (nombre, tratamiento) y respuesta rápida (IA + recepción).

## Lo que NO debemos hacer NUNCA (resumen)
- ❌ Mandar el primer mensaje en frío a listas.
- ❌ Difusión masiva por WhatsApp (eso es SMS o, si algún día, API oficial).
- ❌ Mensajes largos, genéricos o de madrugada.
- ❌ Ignorar a quien pide la baja.
- ❌ Reutilizar números ya baneados.

---

## En una frase
**Trata WhatsApp como una conversación personal, no como un buzón de marketing:** el cliente acepta y escribe primero, respondes rápido y personalizado, frecuencia baja, opt-out fácil y número cuidado. Si seguimos esto, AURA cumple el espíritu de la política de Meta y el riesgo de baneo es bajo — aunque usemos una vía no oficial como Evolution.
