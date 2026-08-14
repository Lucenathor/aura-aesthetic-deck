# Validación de hora local y calendario semanal

La carga de Bella Madrid confirmó que las cinco piezas de TikTok programadas se muestran para un tenant distinto de `aura-demo` en la semana del 10 al 14 de agosto de 2026.

El reloj de AURA obtiene la fecha, la hora y la zona horaria directamente del dispositivo del cliente mediante `Intl.DateTimeFormat` y `Date`. Por tanto, un dispositivo ubicado en Dubái muestra su propia hora local, mientras que el entorno de prueba en UTC muestra UTC.

Se corrigió el cálculo del lunes: la versión anterior sumaba indebidamente el día del mes y desplazaba la vista a la semana del 23 al 27 de agosto. La versión publicada sitúa correctamente el lunes en el día 10.
