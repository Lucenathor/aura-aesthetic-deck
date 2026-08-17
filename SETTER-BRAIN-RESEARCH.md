# Investigación aplicada: Setter Brain para clínicas estéticas

## Decisiones de diseño

El Setter Brain debe **conversar antes de cerrar**, no limitarse a repetir una llamada a la reserva. La investigación coincide en que el primer contacto debe ser rápido, que una respuesta aislada no basta y que el flujo debe aportar información relevante, prueba social y una siguiente acción clara. Sin embargo, la IA no debe fingir ser una profesional médica, afirmar resultados clínicos, fabricar escasez ni sustituir una valoración.

| Hallazgo contrastado | Decisión en AURA |
|---|---|
| La rapidez en el primer contacto importa, pero el interés inicial no equivale a intención de reserva. | Respuesta inmediata y fase posterior de descubrimiento, en lugar de cierre inmediato. |
| Las conversaciones de valor empiezan por entender el objetivo, el plazo y la principal duda. | Una pregunta útil por turno; se conserva el contexto de tratamiento, objetivo, plazo y objeción. |
| Prueba social y recursos reducen incertidumbre en fase de consideración. | Enviar un solo recurso contextual: caso autorizado, vídeo médico, reseña verificada, guía o rango de precios. |
| La presión o la escasez falsa perjudican la confianza. | Solo se muestran huecos, promociones o urgencia que estén configurados y sean reales. |
| La información clínica exige prudencia y criterio profesional. | Señales de embarazo/lactancia, alergias, contraindicaciones, efectos adversos o petición de diagnóstico activan derivación humana/médica. |
| La reserva es una secuencia de microcompromisos, no una única pregunta final. | El cerebro propone la siguiente mejor acción según fase: descubrir, informar, validar, resolver, reservar o derivar. |

## Arquitectura conversacional propuesta

1. **Apertura**: confirmar interés y plantear una sola pregunta amable sobre objetivo o prioridad.
2. **Descubrimiento**: identificar tratamiento, resultado deseado, experiencia previa, plazo y principal duda.
3. **Información**: responder con información aprobada por la clínica; no diagnosticar ni prometer resultados.
4. **Validación**: ofrecer una pieza de prueba social o educativa correspondiente al tratamiento.
5. **Resolución de objeciones**: reconocer la preocupación, responder de forma concreta y comprobar si queda algo sin resolver.
6. **Reserva**: plantear una acción clara y real —enlace de reserva, dos huecos disponibles o intervención de recepción— solo cuando hay suficiente interés.
7. **Derivación/nutrición**: escalar a equipo humano o mantener un seguimiento de valor cuando no sea el momento de reservar.

## Fuentes revisadas

| Fuente | Hallazgo útil | URL |
|---|---|---|
| Ricky Shockley, Med Spa Magic Marketing (vídeo) | Describe rapidez de contacto, secuencias de validación, recursos de confianza y seguimiento; su rechazo total a IA bidireccional se trata como opinión, no como regla. | https://www.youtube.com/watch?v=WT8t60Z531c |
| Conversión de leads de med spa (vídeo) | Señala que el setter debe combinar respuesta rápida con preguntas de descubrimiento y diferenciación frente a competencia. | https://www.youtube.com/watch?v=u2jjMIXpd6o |
| SalesRoads | Propone escuchar, entender, responder y comprobar la resolución de una objeción; también recomienda entregar información ligada a una siguiente conversación. | https://salesroads.com/tactics/appointment-setting-objections/ |
| Salesforce | Promueve venta consultiva, curiosidad sobre necesidades y cierre como una serie de siguientes pasos; advierte contra el hard close. | https://www.salesforce.com/blog/sales/sales-closing-techniques/ |
| AestheticSource | Recomienda consultas personalizadas, servicio cálido, formación del equipo y contenidos que establezcan autoridad. | https://www.aestheticsource.com/blogs/news-press/top-strategies-for-aesthetic-clinics-to-drive-sales |
| Aesthetix CRM | Destaca seguimiento estructurado, respuesta rápida, cualificación y CTA claros para med spas. | https://aesthetixcrm.com/top-reasons-your-med-spa-leads-are-not-converting-into-patients/ |
| Growth99 | Distingue la fase de consideración (guías, precios y educación) de la decisión (seguimiento personalizado y reserva). | https://growth99.com/blog/industry-leading-med-spa-lead-generation-tactics/ |

## Reglas de seguridad y experiencia

- Los casos, reseñas, fotografías, cifras y ofertas deben ser **reales, autorizados y configurados por la clínica**. Los recursos demo se etiquetan como material de ejemplo y nunca se muestran públicamente como testimonios reales.
- El chat no diagnostica, no confirma la idoneidad de un tratamiento, no da garantías de resultado ni sustituye el consentimiento informado.
- Solicitudes de profesional humano, información clínica sensible o señales de riesgo se encaminan a una persona de la clínica.
- No se repite el mismo enlace ni la misma llamada a la acción en cada turno. La naturalidad exige recordar lo ya enviado y elegir la siguiente acción más útil.

## Verificación de interfaz

- El panel de producción muestra la nueva entrada **Setter IA** entre Comunicaciones y Reservas dentro de Ajustes. La navegación lateral mantiene su comportamiento fijo en escritorio y no altera las demás categorías.
- La interfaz permite configurar nombre, tono, longitud, momento de reserva, seguimiento y derivación humana. La biblioteca de tratamiento muestra los cinco recursos de demo existentes como **Borrador / bloqueado**, por lo que no se presentan al paciente como material real hasta que la clínica confirme su autenticidad y autorización.
