# Validación de gráficas reales por tenant — AURA

**Fecha:** 22 de agosto de 2026  
**Entorno:** producción en [auracrm.co](https://auracrm.co)  
**Worker:** `b9e2352c-02bf-41fc-8fce-9c9724f2a7d6`  
**Commit desplegado:** `d6f929d`

## Resultado ejecutivo

Todas las visualizaciones de negocio detectadas en el panel se conectaron a datos reales del tenant. Se eliminaron las alturas CSS fijas, los anchos mínimos de 4% y los desplazamientos de 4 px que simulaban actividad cuando el valor era cero. Los gráficos Chart.js destruyen su instancia anterior y muestran un estado vacío específico cuando no existe un denominador o volumen válido.

Los degradados Pearl Aurora se aplican sin alterar la proporcionalidad: coral–rosa para facturación, lila–azul para conversión, coral–rosa frente a violeta–azul para pacientes y una secuencia coral–rosa–lila–violeta–azul para tratamientos.

## Cobertura funcional

| Visualización | Fuente real | Periodo y fórmula | Estado cero |
|---|---|---|---|
| Sparkline Leads nuevos | `/api/leads` | Conteo por fecha local durante los últimos 7 días; el titular conserva leads de hoy | Sin barras; «Sin actividad reciente» |
| Sparkline Conversión a cita | `/api/leads` | Cohorte diaria de leads creados; convertidos con estado `booked`, `client` o `attended` | Sin barras cuando no hay conversiones recientes |
| Sparkline Facturación | `/api/dashboard/:tenantId` → `revenue_daily` | Cobros `paid` agregados por día; últimos 7 días visibles | Sin barras cuando no hay cobros recientes |
| Miniembudo de Inicio | Leads del tenant | Leads → contactados → cita agendada; porcentajes respecto a leads | 0% y ancho 0, sin mínimo decorativo |
| Tendencia «Leads últimos 7 días» | `/api/leads` | Conteo diario real | Mensaje vacío; cada día cero mantiene altura 0 |
| Embudo principal | `/api/funnel-metrics` | Entradas, cuestionarios, conversaciones, reservas y asistencias por embudo | Mensaje vacío si `entered=0`; cada fase cero mantiene ancho 0 |
| Retención mensual | `/api/retention-report` | Ingresos y pacientes durante 6 meses normalizados, incluidos meses sin datos | Canvas oculto si ambas series suman 0 |
| Facturación mensual | `/api/advanced-metrics` | Cobros `paid` de los últimos 6 meses | Canvas oculto si la suma es 0 |
| Pacientes nuevos vs recurrentes | `/api/advanced-metrics` | Pacientes con cita `booked`, `confirmed` o `attended` este mes; nuevos si su primera cita pertenece al mes, recurrentes si fue anterior | Nunca dibuja un doughnut 0/0 |
| Conversión mensual | `/api/advanced-metrics` | Reservas divididas entre leads del mes; API devuelve `rate`, `total` y `booked` | Vacío solo si no hubo leads; si hubo leads y 0 reservas, muestra 0% real |
| Ingresos por tratamiento | `/api/advanced-metrics` | Suma de cobros `paid` del mes agrupados por tratamiento | Canvas oculto si no hay tratamientos con ingresos |

## Pruebas con datos existentes

Se utilizaron dos tenants existentes sin crear ni alterar datos clínicos. `aura-demo` aportó 171 leads, 1.940 € y 10 cobros del mes. `clinicaespana` aportó el caso completamente vacío. En producción, `aura-demo` mostró facturación mensual 450 €, 0 €, 6.180 €, 25.590 €, 0 € y 1.940 € de marzo a agosto. La tendencia de Retención incluyó explícitamente abril y julio con cero.

| Caso | Resultado esperado | Resultado observado |
|---|---|---|
| Tenant con actividad | Escalas proporcionales y meses cero visibles como cero | Correcto |
| Tenant sin actividad | Ninguna barra, área, punto o doughnut que sugiera volumen | Correcto |
| Conversión de agosto | Tooltip con denominador real | 2 reservas de 97 leads, 2% |
| Facturación diaria | Serie derivada de cobros reales | 720 €, 870 € y 350 € los días 14, 15 y 17 |
| Pacientes 0/0 | Estado vacío en lugar de anillo completo | Correcto |

## Seguridad multi-tenant

Las APIs de métricas avanzadas, retención, embudo y dashboard quedaron bajo la guardia de tenant. La ruta `/api/dashboard/:tenantId` extrae el tenant solicitado desde el path antes de validar la sesión.

| API | Sesión propietario, tenant propio | Sesión propietario, otro tenant | Sin autenticación |
|---|---:|---:|---:|
| `/api/advanced-metrics` | 200 | 403 | 403 |
| `/api/retention-report` | 200 | 403 | 403 |
| `/api/funnel-metrics` | 200 | 403 | 403 |
| `/api/dashboard/:tenantId` | 200 | 403 | 403 |

La prueba se ejecutó con una sesión real de propietario de `demo-firma`. La sesión superadmin conservó acceso a los tenants de soporte, como requiere la arquitectura de AURA.

## Validación visual y responsive

La auditoría reproducible `scripts/audit_graphs_responsive.sh` generó capturas de `aura-demo` y `clinicaespana` en cinco viewports: 1440×1200, 1024×1000, 1024×1900, 390×844 y 390×2600. Las diez cargas conservaron los cinco canvases esperados.

En móvil, la lista de pacientes y la tendencia de Retención se apilan para evitar una gráfica comprimida. El canvas dispone de 220 px de altura. No se observó desbordamiento horizontal en las capturas largas. Las animaciones Chart.js se desactivan cuando el dispositivo declara `prefers-reduced-motion: reduce`.

## Validaciones técnicas

| Comprobación | Resultado |
|---|---|
| `node scripts/check_html_scripts.mjs` | Correcto en las cinco páginas verificadas |
| Worker con esbuild ESM | Correcto, bundle de 513,5 kB |
| `git diff --check` | Sin errores |
| Preflight de landing protegida | Correcto; `mvp/index.html` no fue sustituido |
| Rewrites `/c/*` | Correctos; sirven el embudo del tratamiento |
| Consola durante pruebas locales | Sin errores de Chart.js |

## Limitación consciente

La prueba no modificó datos clínicos ni creó cobros artificiales para forzar formas visuales. Se validó con datos demo ya existentes y un tenant vacío. La definición de «paciente nuevo vs recurrente» queda ligada a citas activas del mes, no al alta histórica del lead; por ello, un tenant puede tener cobros del mes y mostrar esta gráfica vacía si sus citas no están registradas con un estado clínico válido. Ese comportamiento es deliberado y evita inferir recurrencia sin evidencia.
