# Verificación manual del módulo viral

**Fecha:** 12 de agosto de 2026

Se abrió `https://auracrm.co/dashboard?t=aura-demo#contenido` con sesión de superadministración. La interfaz mostró el calendario de la semana del 10 al 14 de agosto, una tarjeta de contenido del lunes, el ranking mensual y el feed de reels.

Al abrir la tarjeta de contenido, se mostró correctamente el reproductor en dos paneles: vídeo de referencia a la izquierda y explicación del consultor a la derecha. El título, la categoría y el texto de explicación coincidieron con el contenido de QA cargado para la prueba.

También se abrió el formulario «Subir mi reel» y se validó que muestra correctamente los campos de enlace, título, views y plataforma. Se ha completado con datos de QA del tenant `aura-demo`; el envío visual queda pendiente de confirmación porque crea una publicación de prueba en el ranking compartido.

Con autorización del propietario se inició el envío del reel de QA desde el formulario. La interacción del navegador agotó su tiempo de espera, por lo que se debe confirmar el estado final mediante la respuesta de red y el feed antes de repetir ninguna acción.

Tras corregir el cálculo de semana ISO, el calendario volvió a mostrar las cinco piezas programadas del 10 al 14 de agosto. Se pulsó el marcado de lunes y la tarjeta quedó atenuada con el símbolo de verificación; el indicador semanal pasó de `0/6` a `1/6`. Este contador señala que aún existe una sexta fila de contenido para la misma semana que debe investigarse antes de cerrar la prueba.

La inspección de la interfaz mostró una sexta fila de QA ya eliminada de D1, mientras que la consulta directa al Worker devolvía las cinco filas correctas. El hallazgo se atribuyó a una respuesta HTTP obsoleta; las cargas de calendario, ranking y feed se han ajustado para enviar una clave de actualización y evitar que la interfaz mantenga datos anteriores.

Con una carga documental nueva del despliegue de producción, el calendario mostró el estado correcto de **1/5** publicaciones semanales y mantuvo el marcado visual del lunes tras recargar. Esto confirma tanto la persistencia local del marcado como la corrección de la semana ISO y de la respuesta obsoleta del calendario.

La consulta directa al endpoint de ranking desde el navegador devolvió los tres tenants y cinco reels correctos. Sin embargo, la función del panel dejaba ranking y feed vacíos porque envolvía la petición en un `try/catch` silencioso; se debe retirar el encabezado `User-Agent` que el navegador no permite establecer en solicitudes `fetch`.

Tras publicar la retirada del encabezado, una carga nueva confirmó el calendario correcto con `1/5`, pero el ranking y el feed siguieron vacíos pese a que el endpoint continúa respondiendo datos. Se mantiene abierta la depuración específica de esta llamada de interfaz.

La petición mínima del ranking desde el navegador devolvió HTTP 200 y los datos correctos. La variante del panel fallaba porque enviaba `Cache-Control: no-cache`, un encabezado no permitido por la lista CORS del Worker y que activa un preflight bloqueado. Se mantendrá `cache: 'no-store'` y el parámetro de actualización, pero sin dicho encabezado.

Después de retirar el encabezado, la interfaz de producción recuperó correctamente el ranking de tres clínicas y el feed de cinco reels. El calendario conservó el estado `1/5` y el formulario «Subir mi reel» abrió con sus cuatro controles visibles y utilizables.

El formulario se rellenó con un reel de QA autorizado, pero el envío mostró `TK is not defined`. No se creó ningún reel de prueba: la acción reveló que las funciones del Challenge Viral referencian una variable de token inexistente en el dashboard.

Tras sustituir esa referencia por el token real almacenado en la sesión del dashboard, una carga nueva conservó correctamente el calendario, el ranking, el feed y la apertura del formulario. Se preparó el reenvío de QA para confirmar el flujo de escritura y la posterior limpieza.

La publicación visual de QA se completó correctamente: apareció la confirmación «Reel añadido al ranking ✓», AURA Demo pasó de dos a tres reels y el total mensual aumentó de 62,8K a 62,9K views. El reel temporal quedó visible en el feed con 123 views y se retira a continuación.

Tras eliminar el reel de QA, el módulo volvió a su estado original: AURA Demo recuperó dos reels y 62,8K views; el ranking y el feed cargaron los datos correctos; el calendario mantuvo el progreso `1/5`. La consola de la vista final no mostró errores.
