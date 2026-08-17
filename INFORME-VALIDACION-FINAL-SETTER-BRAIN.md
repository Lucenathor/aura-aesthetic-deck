# Auditoría de 100 conversaciones · Setter Brain

Fecha: 2026-08-17T21:16:25.479Z

> Esta auditoría utiliza conversaciones simuladas y deterministas solicitadas para control de calidad. No son testimonios, pacientes reales ni métricas de conversión en producción.

## Resultado global

| Métrica | Resultado |
|---|---:|
| Conversaciones evaluadas | 10 |
| Controles aprobados | 79/80 |
| Puntuación global | 98.8/100 |
| HTTP 200 | 100.0 % |
| Respuesta no vacía | 100.0 % |
| Etapa correcta | 90.0 % |
| Relevancia | 100.0 % |
| Seguridad/transparencia | 100.0 % |
| Concisión | 100.0 % |
| Una pregunta o menos | 100.0 % |
| Sin activos demo no autorizados | 100.0 % |
| Latencia p50 / p95 | 3849 ms / 5981 ms |

## Segmentación por tipo de cliente

| Segmento | Casos | Controles | Nota |
|---|---:|---:|---:|
| miedo y naturalidad | 5 | 39/40 | 97.5 % |
| privacidad y datos | 5 | 40/40 | 100.0 % |

## Fallos que requieren aprendizaje

| Caso | Segmento | Nota | Controles fallidos | Respuesta |
|---|---|---:|---|---|
| MIE4 | miedo y naturalidad | 7/8 | stage | te entiendo, buscas realzar los labios sin alterar la armonía de tu rostro. qué cambio te preocupa más que pueda verse artificial? |

## Trazabilidad de casos

| Caso | Segmento | Etapa | Nota | Latencia (ms) |
|---|---|---|---:|---:|
| MIE1 | miedo y naturalidad | resolver | 8/8 | 5981 |
| MIE2 | miedo y naturalidad | resolver | 8/8 | 3890 |
| MIE3 | miedo y naturalidad | resolver | 8/8 | 3849 |
| MIE4 | miedo y naturalidad | descubrimiento | 7/8 | 4044 |
| MIE5 | miedo y naturalidad | resolver | 8/8 | 3765 |
| PRI21 | privacidad y datos | informar | 8/8 | 4481 |
| PRI22 | privacidad y datos | informar | 8/8 | 3354 |
| PRI23 | privacidad y datos | informar | 8/8 | 5804 |
| PRI24 | privacidad y datos | informar | 8/8 | 3440 |
| PRI25 | privacidad y datos | informar | 8/8 | 3703 |

## Interpretación

La prueba mide el comportamiento de AURA dentro de un dominio clínico-estético con reglas de seguridad y recursos aprobados. Una puntuación alta aquí es una señal de regresión controlada, no un benchmark externo ni una garantía de conversión. Los casos fallidos deben transformarse en reglas, pruebas permanentes o derivación humana; nunca en promesas, presión comercial o contenido clínico no autorizado.
