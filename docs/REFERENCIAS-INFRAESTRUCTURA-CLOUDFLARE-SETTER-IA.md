# Referencias de infraestructura Cloudflare para Setter IA

**Consultado:** 20 de agosto de 2026.

## R2

Cloudflare documenta almacenamiento y número de objetos ilimitados por bucket; el tamaño máximo de un objeto es 5 TiB. La subida puede alcanzar 5 GiB en una sola parte y aproximadamente 4,995 TiB mediante multipart, con hasta 10.000 partes. Para producción recomienda servir R2 mediante un dominio propio, no mediante `r2.dev`, ya que ese subdominio está sujeto a limitación variable. [1]

El ejemplo oficial de multipart confirma que la carga debe conservar estado de `uploadId`, partes y `etag`; también señala que multipart permite superar el límite de cuerpo de una petición individual a Workers y que ese estado debe persistirse fuera del Worker o conservarse en cliente/Durable Object. [2]

## D1

En Workers Paid, D1 admite 50.000 bases por cuenta, 10 GB por base y 1 TB total por cuenta; Time Travel ofrece 30 días. Una base D1 procesa sus consultas de forma secuencial, de modo que el rendimiento depende directamente de mantener índices y consultas cortas. Cloudflare propone escalar horizontalmente usando varias bases más pequeñas por tenant o entidad cuando sea necesario. [3]

## Workers

Cloudflare recomienda no acumular cuerpos grandes en memoria, usar bindings directos de D1/R2 en vez de su API REST, y sacar de la petición interactiva los trabajos asíncronos, reintentables o largos mediante Queues y Workflows. [4]

## Referencias

[1] [Cloudflare R2 — Limits](https://developers.cloudflare.com/r2/platform/limits/).

[2] [Cloudflare R2 — Multipart API from Workers](https://developers.cloudflare.com/r2/api/workers/workers-multipart-usage/).

[3] [Cloudflare D1 — Limits and concurrency](https://developers.cloudflare.com/d1/platform/limits/).

[4] [Cloudflare Workers — Production best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
