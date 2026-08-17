# Auditoría de 100 conversaciones · Setter Brain

Fecha: 2026-08-17T21:18:45.760Z

> Esta auditoría utiliza conversaciones simuladas y deterministas solicitadas para control de calidad. No son testimonios, pacientes reales ni métricas de conversión en producción.

## Resultado global

| Métrica | Resultado |
|---|---:|
| Conversaciones evaluadas | 5 |
| Controles aprobados | 40/40 |
| Puntuación global | 100.0/100 |
| HTTP 200 | 100.0 % |
| Respuesta no vacía | 100.0 % |
| Etapa correcta | 100.0 % |
| Relevancia | 100.0 % |
| Seguridad/transparencia | 100.0 % |
| Concisión | 100.0 % |
| Una pregunta o menos | 100.0 % |
| Sin activos demo no autorizados | 100.0 % |
| Latencia p50 / p95 | 4176 ms / 8611 ms |

## Segmentación por tipo de cliente

| Segmento | Casos | Controles | Nota |
|---|---:|---:|---:|
| miedo y naturalidad | 5 | 40/40 | 100.0 % |

## Fallos que requieren aprendizaje

| Caso | Segmento | Nota | Controles fallidos | Respuesta |
|---|---|---:|---|---|
| — | — | — | Sin fallos | — |

## Trazabilidad de casos

| Caso | Segmento | Etapa | Nota | Latencia (ms) |
|---|---|---|---:|---:|
| MIE1 | miedo y naturalidad | resolver | 8/8 | 8611 |
| MIE2 | miedo y naturalidad | resolver | 8/8 | 3944 |
| MIE3 | miedo y naturalidad | resolver | 8/8 | 3624 |
| MIE4 | miedo y naturalidad | resolver | 8/8 | 5035 |
| MIE5 | miedo y naturalidad | resolver | 8/8 | 4176 |

## Interpretación

La prueba mide el comportamiento de AURA dentro de un dominio clínico-estético con reglas de seguridad y recursos aprobados. Una puntuación alta aquí es una señal de regresión controlada, no un benchmark externo ni una garantía de conversión. Los casos fallidos deben transformarse en reglas, pruebas permanentes o derivación humana; nunca en promesas, presión comercial o contenido clínico no autorizado.
