# AURA · Rediseño de Disponibilidad (horarios + vacaciones)

## Backend (worker/src/index.ts + schema.sql)
- [x] Tabla schedule_by_day (tenant_id, dow 0-6, is_open, t1_start, t1_end, t2_start, t2_end)
- [x] Tabla vacations (id, tenant_id, start_date, end_date, reason)
- [x] DDL idempotente (ensureAvailabilitySchema) + migración del calendar_config global
- [x] GET /api/schedule-by-day?tenant= → 7 filas (rellena por defecto si vacío)
- [x] POST /api/schedule-by-day (guarda las 7 filas + slot_min + profesional)
- [x] GET /api/vacations?tenant=
- [x] POST /api/vacations (alta rango) + delete por id
- [x] Helpers isDateClosed / nextOpenDate / getDaySlots (zona Madrid con DST)

## Conexión con automatizaciones
- [x] /api/slots respeta horario por día (2 tramos) + salta vacaciones/días cerrados + no ofrece huecos pasados/ocupados
- [x] /api/appt-create devuelve closed_warning si el día está cerrado (no bloquea walk-in)
- [x] runAutomations recall: si recall_date cae en día cerrado/vacaciones → desplaza al siguiente día abierto
- [x] GET /api/appointments admite filtro &professional= (ver pacientes por profesional)
- [x] Backup diario incluye schedule_by_day y vacations

## UI dashboard.html (Ajustes)
- [x] 7 filas L-D con toggle + tramo mañana + tramo tarde opcional + slot/profesional
- [x] Atajo "aplicar el horario del primer día abierto a todos"
- [x] Bloque "Vacaciones y días cerrados": añadir rango, listar, eliminar
- [x] Feedback "Horario guardado" / "Periodo añadido"
- [x] Calendario: pintar días cerrados/vacaciones en gris (Día/Semana/Mes) + aviso al crear cita en día cerrado
- [x] Filtro por profesional ya operativo en la agenda

## Deploy + verificación
- [x] Migrar D1 (tablas creadas en remoto), desplegar worker, desplegar Pages
- [x] Verificado: /api/slots no ofrece huecos en vacaciones (5-12 jun → salta al 15)
- [x] Verificado: horario partido respeta el descanso (10-13 y 16-19)
- [x] Verificado en producción: embudo solo ofrece L-V, cero fines de semana
