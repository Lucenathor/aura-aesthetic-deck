# Protocolo de trabajo multi-zona para AURA

## Propósito

Permitir que AURA avance en dos o tres frentes sin introducir cambios incompatibles, duplicar lógica ni desplegar una versión incompleta.

## Principio operativo

> Se pueden investigar y probar varias zonas en paralelo; los cambios de código solo se integran en paralelo cuando no comparten archivos críticos, datos ni rutas.

Un carril es una unidad de trabajo con resultado verificable, propietario de archivos y criterio de aceptación. Un carril no es una lista genérica de ideas.

## Zonas de AURA

| Zona | Archivos propietarios habituales | Ejemplos de trabajo compatibles |
|---|---|---|
| Captación pública | `mvp/_t/index.html`, embudos, assets | Quiz, copy, UX de reserva, Pixel, consentimiento web |
| Panel y CRM | `mvp/dashboard.html`, `mvp/croquis.html` | Agenda, ficha de paciente, UX de comunicaciones, métricas |
| Núcleo y datos | `worker/src/index.ts`, `worker/src/setterBrain.ts`, D1 | API, seguridad, reglas, automatizaciones, IA |
| Diseño, legal y documentación | `mvp/legal/*`, `docs/*` | Textos legales, playbooks, informes, organigramas |
| QA y observabilidad | `scripts/*`, pruebas de navegador, registros | Matrices de prueba, revisión de rutas, controles de regresión |

## Regla de archivos críticos

`worker/src/index.ts` y `mvp/dashboard.html` son archivos críticos porque concentran gran parte del producto. Dos cambios que modifiquen el mismo archivo no se integran a la vez. Se preparan por separado, se validan y se integran en un único pase controlado.

Esto no ralentiza la investigación: mientras un cambio de núcleo se está implementando, se puede avanzar en investigación, pruebas, documentación y un cambio aislado del embudo público.

## Forma recomendada de pedir varios frentes

El usuario puede enviar un bloque como este:

```text
Ronda AURA — prioridad semanal

Carril 1 · Embudo público
Objetivo: mejorar la reserva de valoración de labios.
No tocar: dashboard ni lógica de WhatsApp.
Éxito: más claridad y una reserva completada en la prueba.

Carril 2 · Agenda del CRM
Objetivo: mejorar la vista semanal de recepción.
No tocar: la ficha de paciente.
Éxito: crear, mover y cancelar una cita en la prueba.

Carril 3 · Núcleo
Objetivo: añadir una regla de seguimiento post-cita.
No tocar: envío real hasta tener plantilla aprobada.
Éxito: vista previa por tenant y prueba sin mensajes reales.
```

Antes de editar, se devuelve una matriz con los archivos propietarios, riesgos y orden de integración. Si dos carriles comparten un archivo crítico, se convierten en subfases del mismo carril.

## Ciclo de una ronda

| Paso | Resultado |
|---|---|
| 1. Triage | Se concreta el objetivo, la métrica y los archivos que no se deben tocar. |
| 2. Mapa de impacto | Se detectan rutas, tablas, componentes y automatizaciones afectadas. |
| 3. Trabajo aislado | Se investiga y desarrolla cada carril sin tocar la propiedad de otro. |
| 4. Pase de integración | Se consolidan los cambios de archivos críticos de forma secuencial. |
| 5. Prueba de regresión | Se validan sintaxis, rutas, permisos y el recorrido de usuario afectado. |
| 6. Despliegue y checkpoint | Solo se publica una ronda que haya pasado las pruebas; se registra commit, informe y punto de retorno. |

## Límites que evitan el caos

No se hacen despliegues parciales de carriles dependientes. No se cambian a la vez el mismo endpoint y su consumidor sin una prueba integrada. No se mezclan mejoras visuales con migraciones de datos destructivas. No se reutilizan datos de una clínica para probar otra.

Las tareas de lectura, investigación, auditoría y QA sí pueden avanzar a la vez. Las tareas de código aisladas también, siempre que cada una tenga su conjunto de archivos propietario. La integración final de cualquier archivo crítico se realiza una vez y se prueba antes de publicar.

## Propuesta inicial para AURA

Para las próximas rondas, la división más segura es:

| Carril | Responsable funcional | Dependencia |
|---|---|---|
| Captación y embudos | Landing, quiz, Setter Brain y atribución | No tocar `dashboard.html` salvo integración final |
| Operativa clínica | Agenda, pacientes, caja y UX del panel | No tocar Worker salvo contrato de API acordado |
| Comunicaciones y núcleo | 360dialog, SMS, IA, permisos, automatizaciones | Propietario temporal de `worker/src/index.ts` |

La primera semana con pilotos debe priorizar un carril de estabilidad y uno de conversión. El tercer carril puede ser QA, documentación o preparación de onboarding, no otra modificación simultánea del mismo núcleo.
