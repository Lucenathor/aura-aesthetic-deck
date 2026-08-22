# Investigación del sistema visual premium de AURA

**Fecha:** 22 de agosto de 2026  
**Objetivo:** eliminar la apariencia de plantilla generada por IA y convertir el logo coral, rosa y violeta de AURA en un sistema de producto consistente.

## Conclusión ejecutiva

AURA no necesita importar un dashboard completo. Eso sustituiría una plantilla genérica por otra. Necesita un sistema propio construido con cuatro capas: **tokens semánticos**, una tipografía de producto con carácter, una única familia de iconos SVG y reglas estrictas para aplicar el degradado.

La dirección recomendada para los conceptos es **Instrument Sans + Iconoir modificado para AURA + superficies perla + degradado del logo como luz ambiental y señal de estado**. Instrument Sans es OFL 1.1, variable y ofrece alternativas estilísticas; Iconoir es MIT, dispone de más de 1.600 SVG y puede cargarse directamente en HTML/CSS.[1] [2]

## Qué reutilizar y qué no

| Sistema | Decisión para AURA | Motivo |
|---|---|---|
| Instrument Sans | Finalista principal | Abierta, precisa y con alternativas que permiten una voz propia sin sacrificar legibilidad.[1] |
| Satoshi | Finalista secundario | Muy buena presencia editorial, pero es closed source bajo la licencia gratuita de ITF; requiere una gestión de archivos y licencia más cuidadosa.[3] |
| Iconoir | Finalista principal | Trazos limpios sobre cuadrícula 24×24, CSS/SVG directo y licencia MIT.[2] |
| Phosphor | Reserva para casos especiales | Gran cobertura y seis pesos; su popularidad exige personalización para no parecer genérico.[4] |
| Tabler Core | Biblioteca de patrones, no tema completo | Es responsive, MIT y compatible con HTML/CSS, pero importar el tema entero haría que AURA pareciera otro dashboard Tabler.[5] |
| Radix/Park UI | No importar en el AURA actual | Encajan mejor en aplicaciones React y complicarían innecesariamente el dashboard estático. |
| Emojis Unicode | Retirar de navegación y acciones | Cambian entre sistemas operativos, mezclan estilos y transmiten improvisación visual. |

## Regla cromática

El degradado del logo no debe asignar un color diferente a cada módulo. Se utilizará como una sola firma de marca:

| Uso | Aplicación recomendada |
|---|---|
| Fondo general | Perla cálida casi blanca, sin degradado visible dominante. |
| Superficies | Blanco cálido y cristal muy sutil; contraste por elevación, no por colores distintos. |
| Navegación activa | Línea, halo o pequeño indicador con el degradado completo. |
| Acción primaria | Degradado completo únicamente en el botón principal o estado de progreso. |
| Gráficos | Escala continua coral → rosa → violeta, no colores arbitrarios por tarjeta. |
| Iconos | Monocromos por defecto; degradado solo en selección, logro o elemento protagonista. |
| Ambiente | Dos masas de luz desenfocadas con 6–10 % de opacidad, nunca fondos saturados. |

## Sistema de tokens propuesto

| Token | Valor conceptual |
|---|---|
| `--aura-pearl` | Fondo perla cálido |
| `--aura-surface` | Superficie blanca |
| `--aura-ink` | Ciruela casi negra |
| `--aura-muted` | Gris malva |
| `--aura-coral` | Coral melocotón del logo |
| `--aura-rose` | Rosa luminoso del logo |
| `--aura-lilac` | Lila intermedio |
| `--aura-violet` | Violeta final |
| `--aura-gradient` | Coral → rosa → lila → violeta |

Los tokens permiten cambiar toda la identidad desde una fuente de verdad en lugar de acumular colores duros dispersos. Atlassian define los tokens como pares nombre‑valor para decisiones repetibles de color, elevación, espaciado, tipografía o movimiento.[6]

## Reglas de iconografía

La interfaz usará una sola familia. Se partirá de Iconoir y se creará un subconjunto AURA para navegación, acciones y estados. Todos los iconos compartirán cuadrícula, grosor, esquinas y tamaño óptico. Los símbolos universales se mantendrán reconocibles; la diferenciación debe venir del tratamiento, no de inventar metáforas difíciles. Una guía de Untitled UI destaca que la consistencia, la cobertura suficiente y el reconocimiento inmediato son más importantes que hacer iconos extraños.[7]

## Tres direcciones para mockup

| Dirección | Idea | Riesgo que evita |
|---|---|---|
| **A · Pearl Gradient** | Producto luminoso, perla cálida, gradiente como halo y tipografía Instrument Sans. | Evita el glassmorphism exagerado y el dashboard genérico. |
| **B · Editorial Clinic** | Más editorial, títulos amplios, jerarquía sobria y sidebar ciruela con acento gradual. | Evita el aspecto de software frío o de plantilla hospitalaria. |
| **C · Luminous Operations** | Panel operativo más denso, navegación oscura y señales graduales en KPIs, agenda y actividad. | Evita que el efecto wow perjudique la lectura diaria. |

## Referencias

[1] [Instrument Sans — repositorio y licencia OFL](https://github.com/Instrument/instrument-sans)

[2] [Iconoir — repositorio, SVG y licencia MIT](https://github.com/iconoir-icons/iconoir)

[3] [Fontshare — Satoshi y licencia ITF Free Font](https://www.fontshare.com/fonts/satoshi)

[4] [Phosphor Icons — familia y licencia MIT](https://phosphoricons.com/)

[5] [Tabler — dashboard HTML/CSS de código abierto](https://github.com/tabler/tabler)

[6] [Atlassian Design System — Design tokens](https://atlassian.design/tokens/design-tokens)

[7] [Untitled UI — criterios para seleccionar un set de iconos](https://www.untitledui.com/blog/free-icon-sets)
