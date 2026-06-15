# Informe de auditoría · Plataforma AURA

**Fecha:** 4 de junio de 2026
**Alcance:** backend (Worker + D1 + Cron + R2), embudo público, dashboard del propietario, coherencia multi-tenant y calendarios.
**Resultado global:** la plataforma está sana. No se encontró nada crítico roto. Se detectaron y corrigieron 4 detalles menores de consistencia.

---

## 1. Backend (Cloudflare Worker)

El Worker expone **72 endpoints**, todos con su método HTTP correcto. La compilación es limpia (sin errores ni warnings) y **no hay endpoints duplicados**. El enrutado sigue un patrón uniforme y el manejo de errores está centralizado en un `try/catch` que devuelve `500` con detalle controlado.

Se probaron en producción **18 endpoints de lectura clave** y todos respondieron correctamente:

| Resultado | Endpoints verificados |
|---|---|
| 18 OK / 0 fallos | tenant, slots, schedule-by-day, vacations, appointments, appointments por profesional, calendar, professionals, blocks, waitlist, leads, pipeline, sms-templates, sms-credits, funnel-metrics, treatments, dashboard, auth/me |

El motor de automatizaciones (`run-automations`) y el backup manual (`backup-now`) se ejecutaron sin errores.

## 2. Cron / tareas programadas

La configuración de Cron es correcta: un único trigger horario (`0 * * * *`). Dentro del handler programado, cada hora se ejecutan las **automatizaciones de SMS** y, cuando la hora UTC es las 03:00, además se ejecuta el **backup diario**. El índice de backups confirma que el backup automático corrió hoy (03:00:20 UTC) y días anteriores, es decir, el cron funciona realmente en producción, no solo en teoría.

## 3. Base de datos (D1)

El esquema está íntegro y poblado de forma coherente. Conteos actuales: tenants 5, leads 6, appointments 4, schedule_by_day 7, vacations 0, professionals 1, sessions 4, messages 22, treatments_log 3. La tabla de horario por día (`schedule_by_day`) y la de vacaciones existen y responden. El pipeline usa correctamente `pipeline_config`.

## 4. Embudo público

Carga sin errores de consola. La landing premium se ve correcta (antes/después, reseñas de Google) y el quiz arranca bien (pregunta 1/5 con barra de progreso). Los huecos del calendario respetan el horario: con la demo en L-V, el embudo ofreció solo viernes y **cero fines de semana**.

## 5. Dashboard del propietario

Todas las secciones cargan sin errores de consola:

- **Resumen:** KPIs y tendencia.
- **Pacientes:** tabla con pestañas, columna Gastado, orden y ficha.
- **Pipeline:** Kanban completo con columnas "Llamar urgente", "Llamar para nueva venta", etc.
- **Agenda:** vistas Día/Semana/Mes; en Semana, **sábado y domingo aparecen en gris con etiqueta "cerrado"** (integración horario→calendario verificada).
- **Embudo:** editor con vista previa en vivo, campos editables, undo/redo y autoguardado.
- **Equipo y Ajustes:** operativos.

## 6. Coherencia de calendarios y automatizaciones

Verificado de extremo a extremo: el horario por día y las vacaciones gobiernan los huecos del embudo, el calendario del dashboard y el motor de SMS. Los SMS de captación/recall apuntan al próximo día abierto (`{proximo_dia}`), y los recordatorios respetan que la cita no caiga en día cerrado.

---

## Hallazgos y correcciones aplicadas

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | El backup listaba `pipeline_stages` (tabla inexistente); el código real usa `pipeline_config`. | Baja (cosmético en backup) | Corregido: backup exporta `pipeline_config`; dump sin errores. |
| 2 | En Pacientes, los walk-ins mostraban "Invalid Date" porque guardaban `created_at` como epoch numérico. | Baja (visual) | Corregido: el walk-in guarda fecha ISO. |
| 3 | El formateo de fecha del dashboard no toleraba formatos mixtos. | Baja (visual) | Corregido: `fmtTime` robusto (ISO o epoch), nunca muestra "Invalid Date". |
| 4 | El id del lead walk-in tenía doble prefijo (`l_l_...`). | Muy baja (interno) | Corregido: id con prefijo único. |

Tras las correcciones se redesplegaron Worker y Pages, se re-ejecutó la auditoría (**18/18 OK**), se validó que un walk-in nuevo guarda fecha ISO y que el backup exporta 19 tablas sin errores.

---

## Conclusión

La plataforma está estable y coherente: endpoints sanos, cron operativo (automatizaciones horarias + backup diario verificados), base de datos íntegra, embudo y dashboard funcionando, y los calendarios/automatizaciones correctamente sincronizados con el horario y las vacaciones de cada clínica. Los detalles encontrados eran menores y ya están resueltos.
