# Investigación de microinteracciones para botones de AURA

**Fecha:** 22 de agosto de 2026  
**Autor:** Manus AI

## Criterios aplicables

Nielsen Norman Group recomienda que los botones comuniquen estados diferenciados —habilitado, deshabilitado, hover, foco y pulsado— mediante cambios visuales menores. Para hover propone una señal sutil, mientras el estado pulsado debe responder de forma casi inmediata, dentro de aproximadamente 100–150 ms. También distingue jerarquías primaria, secundaria y terciaria, por lo que la intensidad del efecto no debe ser idéntica en todos los controles.[1]

Material Design coincide en aplicar capas de estado de baja intensidad en hover, indicadores de foco visibles y una respuesta de mayor énfasis al pulsar. El efecto debe recaer en el componente accionable, no en contenedores completos.[2]

W3C advierte que mostrar contenido adicional al hacer hover o foco puede generar problemas de accesibilidad. Por ello, AURA no añadirá tooltips decorativos ni contenido emergente en los CTA; la mejora se limitará a luz, elevación, desplazamiento mínimo e indicación de foco.[3]

Webflow recopila patrones de productos que utilizan sombras, cambios leves de color, desplazamientos pequeños y movimiento de flechas para comunicar interactividad sin competir con el contenido.[4]

## Decisión para AURA

| Jerarquía | Aplicación |
|---|---|
| Primaria | Degradado AURA, elevación de 2 px, reflejo ambiental y pulsación física breve. |
| Secundaria | Elevación de 1 px, borde lila y sombra neutra suave. |
| Terciaria | Cambio de color y movimiento de flecha de 3 px. |
| Icono | Halo leve, elevación corta y escala reducida al pulsar. |
| Foco | Doble anillo blanco-violeta visible por teclado. |
| Movimiento reducido | Sin traslaciones ni animaciones; conserva contraste y foco. |

La interacción no debe modificar el tamaño del componente, desplazar elementos vecinos, mostrar información nueva ni prolongarse más allá de lo necesario para confirmar que el control es accionable.

## Referencias

[1] [Nielsen Norman Group — Button States: Communicate Interaction](https://www.nngroup.com/articles/button-states-communicate-interaction/)

[2] [Material Design 3 — Applying interaction states](https://m3.material.io/foundations/interaction/states/applying-states)

[3] [W3C WAI — Understanding SC 1.4.13: Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)

[4] [Webflow — Microinteraction examples for web design](https://webflow.com/blog/microinteractions)
