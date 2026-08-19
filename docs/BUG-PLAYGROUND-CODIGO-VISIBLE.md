# Bug: Código JS del Playground visible en la página de Embudos

## Síntoma
Al final de la sección de Embudos, se ve el código fuente de las funciones
del Playground (openPlayground, closePlayground, sendPlayground, etc.)
renderizado como texto visible en la página.

## Causa probable
El bloque de funciones del Playground se insertó FUERA del tag `<script>` principal
del dashboard, o hay un cierre prematuro de `</script>` antes de las funciones.

## Acción
Verificar que las funciones del playground están DENTRO del bloque `<script>` del dashboard.
