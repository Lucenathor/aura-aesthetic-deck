# Investigación: Código robusto para AURA

**Fuentes consultadas:** Cloudflare Workers Best Practices (developers.cloudflare.com), ResearchGate paper "Best Practices for Building Scalable SPAs" (Karka, 2025), Reddit r/threejs refactoring de archivo monolítico, Reddit r/ClaudeCode refactoring 50k líneas, Grizzly Peak Software "Vanilla JS Patterns for Modern Browsers" (2026), Hacker News "Build the Modular Monolith First", "Mistakes engineers make in large codebases".

## Diagnóstico del dashboard de AURA

- **dashboard.html**: ~7.300 líneas en un solo archivo HTML con todo el JS inline.
- **worker/src/index.ts**: ~4.500+ líneas con 130+ endpoints en un solo archivo.
- Sin módulos ES, sin separación de responsabilidades, sin tests de regresión.
- Sin debounce/throttle en eventos de scroll, resize o input de búsqueda.
- Sin retry ni timeout en las llamadas fetch al worker.
- Sin caché de respuestas frecuentes (leads, tratamientos, métricas).
- Sin limpieza de listeners al destruir modales/overlays.

## Mejoras prioritarias según la investigación

### 1. Modularización del monolito (Reddit + HN + ResearchGate)
- Separar el JS del dashboard en módulos por dominio: navegación, agenda, CRM, embudos, caja, WhatsApp, inventario, admin.
- Usar el patrón Module/IIFE para encapsular estado privado y exponer API pública.
- Archivo de estado compartido (store) que todos los módulos leen y actualizan.
- Cargar módulos bajo demanda con dynamic import() o script tags diferidos.

### 2. Fetch wrapper con retry, timeout y caché (Grizzly Peak + Cloudflare)
- Retry con backoff exponencial para errores 5xx y de red.
- Timeout configurable (10s por defecto).
- Caché en memoria con TTL para endpoints de lectura frecuente (leads, tratamientos, métricas).
- Deduplicación de peticiones idénticas en vuelo.

### 3. Event delegation y limpieza de listeners (Grizzly Peak)
- Un solo listener por sección en vez de uno por elemento.
- Función destroy() en cada modal/overlay que elimine sus listeners.
- Usar data-action en el HTML y un dispatcher central.

### 4. Debounce y throttle (Grizzly Peak)
- Debounce en búsqueda global (300ms).
- Throttle en scroll y resize (100ms).
- Debounce en guardado automático de formularios.

### 5. Estado centralizado ligero (Grizzly Peak + ResearchGate)
- Store simple con getState/setState/subscribe (30 líneas).
- Los módulos se suscriben solo a los cambios que les afectan.
- Evita el acoplamiento directo entre secciones.

### 6. Worker: separar endpoints en archivos (Cloudflare Best Practices)
- Extraer grupos de endpoints a archivos separados: auth, admin, leads, appointments, billing, funnels, setter, viral.
- Router central que importa cada módulo.
- Usar ctx.waitUntil() para trabajo post-respuesta (analytics, caché).
- Prepared statements con .bind() en todas las consultas D1.

### 7. Manejo de errores global (Reddit + Cloudflare)
- try/catch en cada handler del worker con respuesta JSON consistente.
- Error boundary en el frontend que muestre un mensaje amigable.
- Logging estructurado para diagnóstico.

### 8. Tests de caracterización (Reddit r/ClaudeCode)
- Antes de refactorizar, escribir tests que capturen el comportamiento actual.
- Ejecutar tests después de cada cambio para detectar regresiones.

## Plan de aplicación para AURA

### Fase 1 — Refuerzo inmediato (sin romper nada)
1. Fetch wrapper con retry/timeout/caché → reemplazar todas las llamadas fetch del dashboard.
2. Debounce en búsqueda global y throttle en scroll.
3. Limpieza de listeners en modales.
4. Error boundary global (window.onerror + unhandledrejection).

### Fase 2 — Modularización progresiva
1. Extraer la navegación y el estado a un módulo independiente.
2. Extraer cada sección (agenda, CRM, embudos, caja) a su propio bloque IIFE.
3. Cargar secciones bajo demanda cuando el usuario navega a ellas.

### Fase 3 — Worker robusto
1. Separar endpoints en archivos por dominio.
2. Middleware de autenticación centralizado.
3. Rate limiting por tenant.
4. Caché de lectura en KV para métricas agregadas.
