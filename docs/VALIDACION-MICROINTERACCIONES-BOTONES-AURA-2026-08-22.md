# Validación de microinteracciones de botones en AURA

**Fecha:** 22 de agosto de 2026  
**Autor:** Manus AI

## Alcance

La mejora diferencia botones primarios, secundarios, terciarios e iconográficos sin alterar sus acciones. Los CTA principales `Ver mi embudo` y `Nueva cita` reciben una elevación breve, sombra cromática controlada, reflejo interior y movimiento mínimo del símbolo. Los controles secundarios se elevan un píxel y los terciarios desplazan únicamente su flecha.

## Primera comprobación en producción

Se abrió Inicio con una sesión real y se activó el hover de `Ver mi embudo`. El control conservó dimensiones y posición en el flujo, elevó su superficie sin mover elementos vecinos y desplazó la flecha dentro del propio botón.

Capturas:

- Estado base: `/home/ubuntu/screenshots/auracrm_co_2026-08-22_15-25-10_3930.webp`
- Estado hover: `/home/ubuntu/screenshots/auracrm_co_2026-08-22_15-25-30_1400.webp`

La navegación llegó correctamente a Agenda y el botón `Nueva cita` conserva posición, dimensiones y texto antes de aplicar hover. Captura base: `/home/ubuntu/screenshots/auracrm_co_2026-08-22_15-26-14_7293.webp`.

Se activó el hover de `Nueva cita`: el botón mantuvo su caja y elevó la superficie sin reordenar los filtros ni la agenda. Captura hover: `/home/ubuntu/screenshots/auracrm_co_2026-08-22_15-26-40_8582.webp`.

La pulsación abrió el formulario `Nueva cita` correctamente. No se rellenó ni envió el formulario, por lo que no se creó ningún dato. Captura funcional: `/home/ubuntu/screenshots/auracrm_co_2026-08-22_15-26-57_6360.webp`.

El formulario se cerró con su acción `Cancelar` y el foco regresó programáticamente a `Nueva cita`. El control mantiene las clases `aura-cta aura-cta-create` y conserva un indicador de foco visible. El entorno de prueba no solicitaba reducción de movimiento; la hoja incluye una rama `prefers-reduced-motion: reduce` que elimina transición y transformación para los nuevos componentes.

## Responsive

Se capturó Agenda con una sesión real en móvil `375 × 812` y tablet `768 × 1024`. En móvil, `Nueva cita` mantiene un tamaño táctil cómodo, queda visible antes de los estados de cita y no desborda la tarjeta. En tablet, se alinea con profesionales y vistas sin comprimir el resto de controles.

- Móvil: `/home/ubuntu/screenshots/button-micro-premium/mobile-agenda.png`
- Tablet: `/home/ubuntu/screenshots/button-micro-premium/tablet-agenda.png`

## Consola y resultado final

La consola no mostró errores de JavaScript asociados al cambio. Las pruebas manuales confirmaron que los CTA conservan sus acciones originales, los estados de hover no desplazan el layout, el foco sigue siendo visible y la variante de reducción de movimiento neutraliza transformaciones y transiciones.

**Resultado:** validación superada para `Ver mi embudo`, `Nueva cita`, controles secundarios de Agenda y enlaces terciarios del dashboard.

## Referencias

[1] [Nielsen Norman Group — Button States: Communicate Interaction](https://www.nngroup.com/articles/button-states-communicate-interaction/)

[2] [Material Design 3 — Applying interaction states](https://m3.material.io/foundations/interaction/states/applying-states)

[3] [W3C WAI — Understanding SC 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)
