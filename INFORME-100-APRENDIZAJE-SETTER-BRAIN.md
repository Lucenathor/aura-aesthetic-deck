# Setter Brain de AURA · Ciclo de aprendizaje con 100 conversaciones

**Fecha:** 17 de agosto de 2026  
**Ámbito:** Chat del embudo para pacientes potenciales de clínicas estéticas.  
**Nota metodológica:** Todas las conversaciones son escenarios de control de calidad simulados. No representan pacientes, testimonios, conversiones ni resultados clínicos reales.

## Resultado del ciclo

| Ejecución | Cobertura | Resultado | Qué se corrigió después |
|---|---:|---:|---|
| Auditoría inicial | 100 conversaciones | **94,5/100** | Manejo de tiempo, petición de persona, urgencias, reserva y memoria aislada por prueba. |
| Segunda auditoría completa | 100 conversaciones | **96,8/100** | Detección de privacidad familiar, miedo a perder rasgos, solicitud explícita de reserva y comparación de clínicas. |
| Validación dirigida | 50 casos de mayor riesgo | **99,0/100** | Confirmación de los cambios en tiempo, humano, seguridad, efectos adversos, privacidad, reserva, memoria, precio, comparación y miedo. |
| Validación final de naturalidad | 5 casos | **100/100** | Clasificación del miedo a perder la forma natural de la cara como objeción a resolver. |

> La batería completa de 100 casos permanece como prueba de regresión. La validación posterior se concentró en los segmentos que habían perdido puntos, por eso no debe leerse como una nueva ejecución completa de 100 casos.

## Tipos de paciente que ya entiende el cerebro

| Tipo de situación | Comportamiento del Setter Brain |
|---|---|
| Resultado natural | Explora el cambio deseado sin prometer un resultado ni presionar para reservar. |
| Precio o presupuesto | Da únicamente datos aprobados; si faltan, explica que depende del caso y pregunta la zona o necesidad. |
| Resultados y confianza | Solicita el recurso adecuado solo si está aprobado; si no, no inventa fotos, reseñas ni experiencia. |
| Primera vez, miedo o indecisión | Valida la preocupación, aclara la barrera concreta y evita una reserva prematura. |
| Evento o fecha | Pide la fecha y recuerda que los tiempos clínicos requieren valoración individual. |
| Falta de tiempo | Distingue entre duración por sesión y número de visitas antes de mandar un enlace de agenda. |
| Comparación de clínicas | Ayuda a comparar formación, valoración, riesgos, expectativas y trazabilidad sin atacar a competidores. |
| Hombre que busca discreción | Normaliza la consulta y explora el objetivo estético, sin asumir preferencias. |
| Promoción o financiación | No inventa campañas ni pago a plazos; deriva al equipo si no están configurados. |
| Solicitud de humano | Deriva a doctora, recepción o equipo, sin seguir intentando cerrar la cita. |
| Embarazo, lactancia, alergias, medicación o patología | Deriva a un profesional; no dicta aptitud clínica. |
| Dolor intenso o posible efecto adverso | Recomienda contacto urgente con la clínica tratante o urgencias, sin hacer diagnóstico. |
| Privacidad | Nunca comparte historial, precio ni tratamiento de una tercera persona. |
| Instrucciones maliciosas | No expone datos internos, instrucciones ni información de clientes. |
| Intención clara de reserva | Comparte el enlace de reserva configurado, sin inventar huecos o disponibilidad. |

## Aprendizajes incorporados al núcleo

El sistema ahora clasifica antes de generar texto. Cada conversación conserva objetivo, plazo, objeción, historial de recursos y etapa. Las etapas son **descubrimiento**, **informar**, **resolver**, **reserva**, **nutrir** y **derivar**.

Las correcciones derivadas de los 100 casos son concretas: se añadieron señales para “no tengo tiempo”, “dando el pecho”, “me duele mucho después”, “prefiero una persona real”, “me pasas el enlace”, “quiero pedir una valoración”, “historial de mi hermana” y “no quiero perder la forma natural de mi cara”. Las señales de miedo se resuelven antes que la búsqueda genérica de resultados para no contestar con un recurso cuando lo que la persona necesita es seguridad.

## Cómo debe escribir el Setter Brain

> **Responder primero a la duda real; después hacer una única pregunta útil o proponer un siguiente paso proporcionado.**

El agente usa un tono cercano y profesional, frases breves y lenguaje natural. No usa urgencia falsa, no repite una fórmula de cierre, no usa recursos como relleno y no persigue una reserva cuando la persona todavía necesita información o tranquilidad. Si pregunta si es un bot, se identifica como asistente de la clínica y ofrece derivación a una persona.

## Regla de recursos por tratamiento

Para cada tratamiento, el panel **Ajustes → Setter IA** permite gestionar antes/después, vídeo de la doctora, reseñas, rango de precio, duración, recuperación y FAQs. Un recurso solo puede enviarse cuando cumple simultáneamente estas tres condiciones:

1. La clínica lo ha marcado como **Aprobado**.
2. La clínica ha confirmado que tiene consentimiento y autorización de uso.
3. Es pertinente para la duda actual y no se ha repetido en la conversación.

Los borradores de demo siguen bloqueados: el chat no puede presentarlos como resultados reales.

## Próximo paso recomendable durante el piloto

El benchmark es una prueba de regresión, no una validación comercial. En las primeras clínicas piloto hay que medir, con consentimiento y anonimización cuando corresponda, tasa de respuesta, tiempo a primera respuesta, derivación humana correcta, reserva iniciada, reserva completada, cancelación y motivo de abandono. Los casos de baja confianza o frustración deben revisarse por el equipo de la clínica y convertirse en nuevas pruebas permanentes.
