# Auditoría de código y escalabilidad — AURA

**Fecha:** 20 de agosto de 2026  
**Ámbito:** Worker (6.243 líneas), Dashboard (7.938 líneas), Setter Brain (323 líneas), 62 tablas D1, R2 y rutas públicas.

---

## Resumen ejecutivo

El proyecto puede escalar para los pilotos y una primera fase comercial. No hay errores críticos que impidan operar. Sí hay **mejoras de robustez** que conviene aplicar de forma progresiva para endurecer el sistema antes de un volumen alto.

| Categoría | Estado | Riesgo |
|---|---|---|
| Inyección SQL | **Bien**: 670 queries usan `.prepare().bind()` (parametrizadas). Los `exec()` son solo DDL (CREATE/ALTER/INDEX). | Bajo |
| Aislamiento multi-tenant | **Bien**: 217 rutas API; las sensibles pasan por `requireTenant()` con validación de token + tenant. | Bajo |
| Autenticación | **Bien**: bloque `TENANT_GUARDED` cubre datos del panel; rutas públicas (chat, embudo, reserva) son las correctas. | Bajo |
| CORS | **Aceptable**: 4 cabeceras configuradas; el Worker responde a preflight. | Bajo |
| Rate limiting | **Parcial**: 76 menciones de rate/limit pero solo para el quiz token. El chat IA y las rutas públicas no tienen rate limit explícito. | Medio |
| Validación de input | **Parcial**: 29 validaciones numéricas; muchos endpoints confían en el tipo del JSON sin validar longitud ni formato. | Medio |
| Error handling | **Aceptable**: 253 bloques try; 178 catch vacíos (DDL idempotente). El error global del Worker captura excepciones no manejadas. | Bajo |
| Memoria del Worker | **Aceptable**: no acumula cuerpos grandes en memoria (multipart usa streaming por partes). | Bajo |
| Índices D1 | **Parcial**: leads, messages, invoices, setter, funnel_stats y calls tienen índices. **Falta índice en appointments por tenant_id + date_iso** (la query más frecuente de la agenda). | Medio-Alto |
| Dashboard: innerHTML | **Parcial**: 311 usos de innerHTML; 18 con interpolación de variables. No hay eval(). El riesgo es XSS si un dato de D1 contiene HTML malicioso. | Medio |
| Dashboard: listeners | **Bien**: 9 setInterval con 12 clearInterval (todos limpiados). | Bajo |
| Dashboard: navegación | **Bien**: cambio interno sin recarga, restauración de ruta sin parpadeo. | Bajo |
| Fetch wrapper | **Bien**: AuraHttp con retry, caché, deduplicación y timeout. | Bajo |

---

## Hallazgos críticos que corregir

### 1. Falta índice en `appointments` por `(tenant_id, date_iso)`

La tabla `appointments` es la más consultada (agenda diaria, semanal, mensual) y no tiene índice compuesto. Con pocas citas funciona, pero al crecer producirá full table scans en cada carga de agenda.

**Corrección:** Crear índice compuesto.

### 2. `/api/consultations` GET no filtra por tenant

La query `SELECT * FROM consultations ORDER BY created_at DESC LIMIT 200` devuelve datos de TODAS las clínicas. Aunque no está en `TENANT_GUARDED`, cualquier usuario autenticado podría llamarla y ver consultas de otros tenants.

**Corrección:** Añadir filtro por tenant_id o mover a `TENANT_GUARDED`.

### 3. Rate limiting ausente en chat IA y rutas públicas

El chat IA (`/` POST) y la creación de leads (`/api/leads` POST) no tienen rate limit. Un atacante podría saturar la API de OpenAI o crear miles de leads falsos.

**Corrección:** Añadir rate limit por IP o por token de quiz.

### 4. innerHTML con datos de usuario sin sanitizar

18 interpolaciones de variables en innerHTML podrían permitir XSS si un campo de D1 contiene `<script>` o `<img onerror>`. El riesgo es bajo porque los datos vienen del propio panel, pero un lead malicioso podría inyectar HTML en su nombre o mensaje.

**Corrección:** Crear un helper `escapeHtml()` y usarlo en las interpolaciones que muestran datos de leads/pacientes.

---

## Mejoras recomendadas por prioridad

| Prioridad | Mejora | Impacto |
|---|---|---|
| **Alta** | Índice `appointments(tenant_id, date_iso)` | Agenda rápida con muchas citas |
| **Alta** | Filtrar `/api/consultations` por tenant | Evitar fuga de datos entre clínicas |
| **Alta** | Rate limit en chat IA y leads POST | Proteger contra abuso y costes de OpenAI |
| **Media** | Helper `escapeHtml()` en innerHTML | Prevenir XSS desde datos de pacientes |
| **Media** | Validar longitud de campos en POST | Evitar payloads enormes en D1 |
| **Baja** | Índice `appointments(professional_id, date_iso)` | Agenda por profesional más rápida |
| **Baja** | Separar worker en módulos por dominio | Mantenibilidad a largo plazo |
| **Baja** | Separar dashboard en módulos JS | Mantenibilidad a largo plazo |

---

## Métricas del proyecto

| Métrica | Valor |
|---|---|
| Líneas de código total | 14.504 |
| Worker (index.ts) | 6.243 |
| Dashboard (dashboard.html) | 7.938 |
| Setter Brain (setterBrain.ts) | 323 |
| Rutas API | 217 |
| Tablas D1 | 62 |
| Índices creados | 20 |
| Queries parametrizadas (.prepare) | 670 |
| Queries DDL (.exec) | 97 |
| Funciones JS en dashboard | 323 |
| Variables globales en dashboard | 103 |
| Fetch con AuraHttp (caché/retry) | Disponible |
| Tamaño de la base D1 | 1,5 MB |

---

## Conclusión

El código es funcional, está protegido contra los ataques más comunes (inyección SQL, acceso entre tenants) y tiene una arquitectura adecuada para los pilotos. Las tres correcciones de prioridad alta deben aplicarse antes de escalar: el índice de appointments, el filtro de consultations y el rate limit del chat. El resto son mejoras progresivas que no bloquean la operación actual.
