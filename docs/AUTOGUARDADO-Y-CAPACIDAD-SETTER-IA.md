# Autoguardado y capacidad del Setter IA

**Fecha:** 20 de agosto de 2026  
**Ámbito:** configuración global de Setter por clínica, cerebro por embudo, biblioteca de recursos y la infraestructura Cloudflare que los soporta.

## Garantía de guardado

La configuración se persiste por separado en dos niveles: la estrategia común de la clínica y el cerebro propio de cada embudo. Ningún borrador usa una clave compartida entre clínicas.

| Elemento | Dónde se guarda al sincronizar | Clave de aislamiento |
|---|---|---|
| Estrategia común del Setter | D1, configuración Setter de la clínica | `tenant_id` |
| Cerebro por embudo | D1, `setter_funnel_brain` | combinación única `tenant + treatment` |
| Casos, recursos y estado de autorización | D1, `setter_resources` | índice `tenant_id + treatment` |
| Fotos y vídeos | Cloudflare R2 | ruta `setter/{tenant}/{treatment}/...` |
| Borrador temporal de recuperación | `localStorage` del navegador | `aura:setter-draft:v1:{tenant}:{scope}:{treatment}` |

### Comportamiento del autoguardado

1. Al editar un campo, se muestra **«Cambios sin guardar»** y se crea un borrador local aislado.
2. Tras una pausa breve de escritura, el panel sincroniza con Cloudflare D1.
3. Al recibir confirmación, muestra **«✓ Guardado HH:MM»** y elimina el borrador local.
4. Si la red falla o se cierra la pestaña antes de confirmar, muestra **«Sin conexión · borrador protegido en este dispositivo»**.
5. Al volver a abrir el mismo tenant y embudo, recupera el borrador y lo reintenta automáticamente; no depende de que el usuario pulse un botón.
6. El botón **«Guardar ahora»** sigue disponible como confirmación explícita.

## Prueba de persistencia realizada

En `clinica-qa`, se editaron una estrategia común y el cerebro de Bótox sin usar el botón manual. Tras recargar, ambos valores se recuperaron. El cerebro específico mostró **«✓ Guardado 15:48»** y el borrador local se eliminó después de la sincronización. Los valores de QA se retiraron al terminar la prueba.

## Auditoría de arquitectura Cloudflare

| Capa | Situación actual | Evaluación |
|---|---|---|
| Workers | Stateless; autenticación y validación de tenant antes de las operaciones de Setter. | Adecuado para tráfico concurrente y escalado de peticiones. |
| D1 | Configuraciones pequeñas y metadatos; las consultas Setter están indexadas por clínica y tratamiento. | Adecuado para pilotos y crecimiento inicial; D1 serializa consultas por base, por lo que las escrituras deben mantenerse cortas y agrupadas. |
| R2 | Archivos binarios fuera de la base de datos; multipart persistente para vídeo grande y HTTP Range para reproducción progresiva. | Adecuado para una biblioteca creciente de fotos y vídeo. |
| Aislamiento | Tenant en autorización, D1, cache/borrador local y clave de R2. | Las capas se alinean; cambiar de clínica limpia el estado visible antes de cargar el tenant nuevo. |

La verificación remota de D1 confirmó los índices críticos actuales:

```text
setter_funnel_brain: UNIQUE (tenant, treatment)
setter_resources:      INDEX  (tenant_id, treatment)
setter_upload_sessions: INDEX (tenant_id, updated_at)
```

Cloudflare indica que R2 admite objetos de hasta 5 TiB y subida multipart, mientras que D1 admite hasta 10 GB por base y 1 TB por cuenta en Workers Paid. Para AURA, el primer límite práctico no será el almacenamiento de R2 sino la concentración de escrituras en una sola D1 si se alcanza un volumen alto de clínicas y autoguardados simultáneos.[1] [2]

## Decisión de escalado

La infraestructura actual es sólida para los pilotos y una primera fase comercial: el contenido pesado está en R2, los datos de configuración son pequeños y las lecturas/escrituras relevantes están indexadas. Para una fase de volumen elevado se recomienda, antes de que D1 muestre contención real:

1. Añadir telemetría de latencia y errores por endpoint/tenant.
2. Mover tareas largas —transcripción masiva, indexación de documentos y limpieza de cargas incompletas— a Cloudflare Queues/Workflows.
3. Particionar D1 por grupos de tenants cuando las métricas muestren esperas de escritura sostenidas.
4. Usar URLs de carga directa firmadas para bibliotecas con vídeo muy frecuente, manteniendo el control de autorización en el Worker.

## Referencias

[1] [Cloudflare R2 — Limits](https://developers.cloudflare.com/r2/platform/limits/).

[2] [Cloudflare D1 — Limits and concurrency](https://developers.cloudflare.com/d1/platform/limits/).

[3] [Cloudflare Workers — Production best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
