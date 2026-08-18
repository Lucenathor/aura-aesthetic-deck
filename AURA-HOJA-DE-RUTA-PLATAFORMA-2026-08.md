# Hoja de ruta de evolución de AURA

**Fecha:** 18 de agosto de 2026  
**Ámbito:** SaaS operativo para clínicas estéticas en España.  
**Método:** Inventario de módulos reales de AURA, contraste con CRMs clínicos y SaaS de estética, y priorización interna por impacto comercial, riesgo operativo y complejidad. Las puntuaciones de esta hoja de ruta son una valoración de producto, no datos de mercado.

## Diagnóstico ejecutivo

AURA ya tiene una base diferencial sólida para captar y convertir demanda: embudos por tratamiento, chat de setting con IA, CRM, agenda multiespecialista, facturación, bonos, panel Staff, croquis, inventario, WhatsApp/SMS, contenido viral y analítica de embudo. La oportunidad ya no está en sumar pantallas aisladas, sino en **conectar cada fase del ciclo de vida de una clínica con reglas, trazabilidad y decisiones de negocio**.

> El objetivo del siguiente ciclo debe ser que una clínica pueda entrar en AURA, importar sus datos, configurar equipo y tratamientos, captar un lead, reservarlo, atenderlo, cobrarlo, hacer seguimiento y conocer el margen real de esa relación sin salir de AURA.

## Mapa de madurez actual

| Frente | Base actual de AURA | Madurez interna | Principal brecha |
|---|---|---:|---|
| Captación y embudos | Embudos por tratamiento, slugs, píxel, chat IA y estadísticas básicas. | 8/10 | Atribución de lead a ingreso real y automatizaciones de recuperación. |
| CRM y paciente | Pipeline, ficha, tratamientos, notas, fotos, croquis y búsqueda global. | 7/10 | Presupuestos, plan de tratamiento y línea temporal clínica-comercial única. |
| Agenda | Vistas, drag & drop, intervalos, duración, buffer, bloques y panel Staff. | 8/10 | Gabinetes/aparatología, lista de espera operativa y motor de reubicación. |
| Núcleo clínico | Notas, consentimientos, media y trazabilidad de algunos activos. | 7/10 | Firma de consentimiento robusta, comparación clínica antes/después y permisos sanitarios granulares. |
| Cobros y facturación | Cobro rápido, split payment, descuentos, facturas, bonos, caja y exportación. | 7/10 | Presupuestos, enlaces de pago, rentabilidad neta y preparación formal SIF/VERI*FACTU. |
| Comunicaciones | WhatsApp, SMS, confirmación, reseñas y Setter Brain. | 7/10 | Orquestador de secuencias por eventos y bandeja compartida fiable con SLA. |
| Dirección | KPIs, LTV, embudos, caja, facturas e inventario. | 6/10 | Margen neto por tratamiento, fuente de captación y profesional. |
| Onboarding y administración | Importador, ajustes y panel de administración. | 5/10 | Wizard guiado, checklist de activación y permisos por rol auditables. |

## Prioridad 1 · Antes de ampliar pilotos

| Mejora | Por qué cambia el negocio | Riesgo que resuelve | Complejidad |
|---|---|---|---:|
| **Wizard de onboarding y checklist de lanzamiento** | Reduce el tiempo entre firma y primera operación útil. Configura clínica, equipo, PINs, tratamientos, horario, mensajes, facturación, embudo y recursos del Setter Brain. | Clientes que pagan setup y no llegan a valor en la primera semana. | Media |
| **Permisos granulares y auditoría clínica** | Separa recepción, doctor/a, esteticista, administración y propietario por acción y dato, no solo por pantalla. Registra lectura, descarga y edición de información de salud. | Acceso excesivo a datos clínicos y falta de trazabilidad. | Media-alta |
| **Consentimiento informado con firma y evidencia** | Plantilla por tratamiento, versión, firma, fecha, IP/dispositivo y documento inalterable vinculado a la visita. | Riesgo médico-legal y documentos incompletos. | Alta |
| **Presupuestos, planes de tratamiento y enlace de pago** | Convierte una valoración en una propuesta con partidas, fases, validez, aceptación, anticipo y pago remoto. | Fuga entre consulta, aceptación y cobro. | Media |
| **Atribución lead → cita → cobro** | Permite saber qué campaña, embudo y canal generan ingreso y no solo clics o leads. | Invertir en marketing sin conocer retorno real. | Media |

## Prioridad 2 · Diferenciación operativa y efecto “wow”

| Mejora | Diseño recomendado | Impacto esperado |
|---|---|---|
| **Recursos clínicos en agenda** | Cada cita reserva profesional + gabinete + aparatología + tiempo de limpieza, con conflictos visibles y opción de alternativa. | Menos colisiones operativas y mejor utilización de cabinas. |
| **Lista de espera inteligente** | Paciente indica franjas, profesional y tratamiento; una cancelación propone hueco por SMS/WhatsApp con caducidad y un clic de confirmación. | Recuperación de facturación y ocupación. |
| **Timeline 360º del paciente** | Una línea temporal única con lead, conversación, presupuesto, reserva, consentimiento, tratamiento, foto, factura, bono, no-show y seguimiento. | Una recepción mucho más rápida y contexto completo. |
| **Antes/después comparativo clínico** | Parejas de fotos con consentimiento, misma orientación, zoom sincronizado, fecha, tratamiento, lote y anotación. | Mejor documentación y mayor confianza durante la valoración. |
| **Motor de automatizaciones por evento** | Constructor sencillo: disparador, segmento, canal, espera, condición y salida. Plantillas para no-show, reactivación, post-tratamiento, cumpleaños y reseña. | Reduce trabajo manual y evita perder pacientes tras el primer contacto. |
| **Rentabilidad real por tratamiento** | Ingreso neto menos producto/lote, tiempo profesional, comisión, cabina, descuento y coste de captación atribuible. | Dirección basada en margen, no solo en facturación. |

## Prioridad 3 · Ventajas defensibles tras los pilotos

| Mejora | Valor estratégico | Condición previa |
|---|---|---|
| **Benchmarking anónimo entre clínicas** | Comparar conversión, no-show, recurrencia y ocupación contra cohortes similares sin exponer datos. | Masa crítica y modelo de datos normalizado. |
| **Predicción de huecos y reactivación** | Prioriza leads/pacientes con mayor probabilidad de reservar, volver o cancelar. | Datos limpios de varios meses y supervisión humana. |
| **Plan de mantenimiento inteligente** | Sugiere seguimiento basado en tratamiento realizado, reglas clínicas aprobadas y preferencias, nunca como prescripción automática. | Protocolos validados por cada clínica. |
| **PWA móvil de Staff** | Agenda, llegada, fotos, nota, croquis y consentimiento rápido desde cabina. | Validación de flujos de escritorio e iPad. |

## Secuencia recomendada de desarrollo

| Ola | Resultado demostrable | Entregables |
|---|---|---|
| **Ola A · Preparación de pilotos** | Una clínica se configura y opera de extremo a extremo. | Wizard, permisos/auditoría, consentimiento firmado, presupuesto/anticipo, atribución básica. |
| **Ola B · Operación superior** | La agenda evita pérdidas y la recepción trabaja con contexto único. | Recursos de agenda, lista de espera, timeline 360º, automatizaciones de eventos. |
| **Ola C · Dirección rentable** | El propietario identifica qué vende y qué deja margen. | Costes, comisiones, margen por tratamiento, canal y profesional. |
| **Ola D · Moat de datos** | AURA aprende con datos reales sin automatizar decisiones clínicas. | Benchmarking, predicción con revisión y mantenimiento aprobado. |

## Decisión de producto

La mejora con mejor combinación de **impacto comercial inmediato + valor percibido del setup de 3.990 €** es un paquete único de **Onboarding guiado + presupuesto/anticipo + timeline 360º + seguimiento automático**. Convierte AURA de “muchas funcionalidades” en un sistema que demuestra valor desde el primer lead hasta el cobro.

La mejora con mayor **riesgo operativo** que debe cerrarse antes de vender a escala es la combinación de permisos clínicos, auditoría de accesos y consentimiento firmado. La AEPD destaca la importancia de la trazabilidad de accesos en datos de salud, mientras que los requisitos de los Sistemas Informáticos de Facturación exigen controles y trazabilidad para la facturación.[1] [2]

## Referencias

[1] [AEPD, Acceso a la información de trazabilidad en datos de salud](https://www.aepd.es/informes-y-resoluciones/criterios-juridicos-aepd/acceso-informacion-de-trazabilidad-datos-de-salud-en-relacion-reglamento-ehds).

[2] [Agencia Tributaria, Sistemas Informáticos de Facturación y VERI*FACTU](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html).

[3] [Mangomint, Scheduling](https://www.mangomint.com/features/scheduling/).

[4] [Pabau, Calendar configuration](https://support.pabau.com/en/pabau2/how-to-adjust-calendar-configuration).

[5] [Phorest, Aesthetic clinic software](https://www.phorest.com/industry/aesthetic-clinic-software/).
