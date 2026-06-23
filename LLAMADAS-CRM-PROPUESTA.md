# Llamadas desde el CRM de AURA — Investigación y propuesta

**Objetivo:** que desde la ficha del paciente, con un clic, la recepción/dueña pueda **llamar**, que la llamada se **grabe**, se **transcriba** y AURA genere un **resumen con IA** y un **reporte para el dueño** (de qué se habló, si reservó, próxima acción). Con **número español (+34)** y vía **API**.

---

## 1. Conclusión rápida (qué recomiendo)

Usar **Twilio Programmable Voice** con un **número fijo español (+34)** y el patrón **"click-to-call de dos patas"** (la forma más sencilla y robusta, sin micrófono ni apps):

> Cuando pulsas "Llamar" en la ficha, **Twilio llama primero al teléfono de la clínica** (móvil de recepción). Al descolgar, Twilio **marca al paciente** mostrando el **número de la clínica** como identificador. La llamada se **graba**, y al colgar AURA la **transcribe** y genera un **resumen + reporte** para el dueño.

Por qué esta opción y no "llamar desde el navegador con auriculares" (WebRTC): funciona con el **teléfono normal** de la clínica (cero fricción, cero configuración de micrófono, sin cortes de audio), es **muchísimo más fácil de implementar** y el resultado para el usuario es idéntico: pulsa un botón y suena su teléfono ya conectando con el paciente. El "wow" real no está en hablar por el ordenador, sino en la **grabación + transcripción + resumen IA automático** en la ficha.

---

## 2. Por qué Twilio (y alternativa)

| Criterio | Twilio | Telnyx (alternativa) |
|---|---|---|
| Número español +34 por API | Sí (requiere bundle + dirección local) | Sí (requiere DNI/dirección) |
| Click-to-call por API | Sí, muy documentado | Sí |
| Grabación | $0,0025/min | $0,002/min |
| Transcripción | $0,05/min (clásica) o Conversational Intelligence $0,024/min | Sí |
| Llamar a fijo ES | $0,0178/min | algo más barato |
| Llamar a móvil ES | ~$0,0486/min | algo más barato |
| Madurez / docs / soporte | Muy alta (líder) | Alta, más barato, menos ecosistema |

**Recomendación:** Twilio por madurez y documentación. Telnyx si más adelante quieres recortar costes a escala. En ambos, la transcripción+resumen los puede hacer **el propio worker de AURA** con Whisper + LLM (que ya usamos), así no dependemos de la transcripción del proveedor y sale más barato y en mejor español.

---

## 3. Requisito clave: el número español (+34)

- Hay que dar de alta un **número FIJO local español** en Twilio. Para activarlo, Twilio/España exige un **"regulatory bundle"**: nombre de la empresa/persona, **dirección local en España** con **prueba** (factura/CIF), y a veces documento de identidad. Es un trámite de **una sola vez por número**, se hace en la consola y tarda de horas a pocos días en aprobarse.
- **Importante (legal):** usar **número fijo**, no móvil. Twilio prohíbe usar móviles +34 para llamadas comerciales/atención no solicitada, y el prefijo **+34 902 no se permite** para salientes.
- Cada clínica puede tener **su propio número** (ideal: el paciente ve el número de su clínica) o, para empezar, un **número AURA compartido**. Recomendado a futuro: un número por clínica.

---

## 4. Cómo se ve para el usuario (efecto wow)

1. En la ficha del paciente (o en el pipeline), botón **"Llamar"**.
2. Al pulsar, mensaje: *"Suena tu teléfono… descuelga para hablar con [paciente]"*. El teléfono de la clínica suena, descuelga y ya está hablando con el paciente.
3. Al inicio, un breve aviso automático: *"Esta llamada puede ser grabada por motivos de calidad"* (cumplimiento RGPD).
4. Al colgar, en segundos aparece en la ficha:
   - **Audio** de la llamada (reproducible).
   - **Transcripción** completa.
   - **Resumen IA**: motivo, resultado (¿reservó?, objeciones), y **próxima acción sugerida**.
   - Se registra como actividad en el historial del paciente.
5. **Reporte para el dueño**: resumen diario/semanal — nº de llamadas, duración media, cuántas acabaron en cita, temas recurrentes y objeciones más comunes. Notificación al dueño con lo más relevante.

---

## 5. Arquitectura técnica (encaja con AURA actual)

AURA ya tiene worker (Cloudflare), base de datos, Whisper (transcripción) y LLM (resúmenes). Solo añadimos la capa de voz:

1. **Endpoint `call-start`** (worker): recibe `tenant_id` + `patient_id`. Llama a la API de Twilio `Calls.create`:
   - `to` = teléfono de la clínica (recepción), `from` = número ES de la clínica.
   - `url` = TwiML que, al descolgar la clínica, reproduce el aviso de grabación y hace `Dial` al paciente con `record="record-from-answer"`.
2. **Webhook `call-status`** (worker): Twilio avisa cuando la llamada termina y cuando la **grabación** está lista (`RecordingUrl`).
3. **Procesado IA**: el worker descarga el audio, lo pasa por **Whisper** (transcripción) y por el **LLM** (resumen + próxima acción), y guarda todo en una tabla `calls` ligada al paciente.
4. **UI**: en la ficha, botón Llamar + tarjeta con audio, transcripción y resumen. En Resumen/Admin, el reporte para el dueño.
5. **Tablas nuevas**: `calls` (tenant, patient, from, to, duración, estado, audio_url, transcript, resumen, próxima_acción, fecha).

Complejidad: **media-baja**. Lo nuevo es la integración Twilio + 2 webhooks; transcripción/resumen reutilizan lo que ya hay. Estimación: un endpoint de llamada, un webhook de estado, el procesado IA y la UI de la ficha.

---

## 6. Coste aproximado (orientativo)

- **Número español:** ~1–3 $/mes por número.
- **Llamada saliente a móvil ES:** ~0,05 $/min (las dos patas: clínica + paciente ≈ se cuentan los minutos de cada tramo).
- **Grabación:** ~0,0025 $/min + almacenamiento mínimo.
- **Transcripción + resumen:** si lo hace AURA con Whisper+LLM, coste muy bajo por llamada.
- **Ejemplo:** una llamada de 5 min ≈ 0,25–0,50 € de voz + céntimos de grabación/IA. Muy asumible, y se puede repercutir al cliente como bolsa de minutos (igual que ya hacéis con los SMS).

---

## 7. Cumplimiento (RGPD / España)

- Se puede grabar una llamada en la que participa la clínica, **informando** al paciente al inicio ("llamada grabada por calidad") — lo añadimos automáticamente.
- Guardar las grabaciones con base legal, acceso restringido por rol y opción de borrado. Encaja con el modelo de roles que AURA ya tiene.
- Usar número **fijo** y no hacer marketing no solicitado.

---

## 8. Propuesta de fases de implementación

1. **Fase 1 (MVP, lo esencial):** click-to-call de dos patas con un número ES + grabación + transcripción + resumen IA en la ficha. Aviso de grabación. (Es lo que da el "wow".)
2. **Fase 2:** reporte para el dueño (diario/semanal) con métricas y objeciones; número propio por clínica.
3. **Fase 3 (opcional):** llamar desde el navegador con auriculares (WebRTC) para quien lo prefiera; y "siguiente acción" empujada al pipeline automáticamente.

---

## 9. Qué necesito de ti para arrancar

- Confirmar proveedor: **Twilio** (recomendado).
- Una **cuenta de Twilio** (o que la creemos) y los datos para el **número español**: razón social/nombre, **dirección en España** y prueba (factura/CIF) + DNI si lo piden.
- El **teléfono de la clínica** (recepción) al que AURA llamará primero.
- Decidir si empezamos con **un número AURA compartido** o número por clínica.
