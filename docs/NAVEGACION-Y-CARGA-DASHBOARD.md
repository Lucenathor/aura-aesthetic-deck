# Navegación y carga del dashboard

**Fecha:** 19 de agosto de 2026  
**Objetivo:** evitar el salto visual a la home y conservar el contexto del usuario al moverse entre clínicas, secciones y configuraciones.

## Problema detectado

El selector de clínica, los accesos de Administración y el Wizard usaban `location.href` para cambiar de tenant. Eso descargaba y reconstruía el documento completo. Aunque la URL terminaba en la pestaña correcta, durante el arranque se veía brevemente la pantalla por defecto y se reiniciaban el estado visual, la posición de scroll y las cargas en curso.

## Arquitectura aplicada

| Capa | Cambio aplicado | Resultado |
|---|---|---|
| Navegación | `switchTenant()` pasa a usar el History API y a actualizar solo el estado dependiente de la clínica. | No se desmonta el dashboard ni hay salto a la home. |
| Contexto | Se guarda por clínica y por pestaña de navegador en `sessionStorage`: sección, scroll, embudo, pantalla de editor y subpestaña de Ajustes. | Al volver se puede recuperar el punto de trabajo. |
| URLs | El router interno conserva los parámetros actuales y solo actualiza `t` y el hash de sección. | Enlaces compartibles sin perder contexto de ruta. |
| Administración | Entrar a una clínica y los accesos rápidos del Wizard usan navegación interna asíncrona. | Configurar una clínica no reinicia el flujo. |
| Concurrencia en cliente | Se añade un contador de epoch al cambio de clínica. | Una respuesta tardía de la clínica anterior no puede sobrescribir la actual. |
| Carga | Las secciones visibles cargan bajo demanda; los datos secundarios se precalientan cuando el navegador queda libre. | Menos ráfagas simultáneas al iniciar sesión o cambiar de clínica. |

## Validación realizada

1. Apertura directa en `#embudo` de `aura-demo`.
2. Cambio interno a `clinica-estetica-lumiere` conservando la sección **Embudos**.
3. Regreso interno a `aura-demo` conservando la sección **Embudos**.
4. En ambas transiciones, `performance.getEntriesByType('navigation').length` permaneció en **1**: no se realizó navegación de documento ni recarga completa.
5. Se comprobó que el nombre y las métricas correspondían al tenant activo tras cada cambio.
6. La validación de sintaxis de los scripts inline terminó correctamente antes del despliegue.

## Límite consciente

Esta mejora refuerza la navegación del cliente. Cloudflare Workers y Pages absorben concurrencia de red; para una siguiente etapa de escala conviene añadir observabilidad de latencia, límites por sesión en endpoints costosos y caché de lectura para métricas agregadas. No se ha cambiado ninguna regla de acceso ni se han debilitado las verificaciones de tenant.
