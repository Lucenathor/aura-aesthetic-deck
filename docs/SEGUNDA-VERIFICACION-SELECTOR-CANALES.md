# Segunda verificación del selector de canal

## Criterios de aceptación

La segunda revisión debe confirmar que el selector funciona como una capa invisible y determinista: el paciente no elige canal dentro de la captación y la clínica no configura ramas complejas.

| Área | Criterio verificable |
|---|---|
| Política por clínica | Un tenant no puede leer ni modificar la política de otro; propietario y superadministrador tienen los permisos esperados. |
| Decisión de canal | El modo Automático elige un único canal; Solo WhatsApp no usa SMS; Solo SMS no intenta WhatsApp. |
| Consentimiento | Marketing, reseñas y bajas bloquean cualquier fallback inapropiado. |
| Duplicados | Un mismo tenant, evento y entidad no genera dos envíos. |
| Conversación humana | Una respuesta del paciente o un mensaje manual de recepción cancela la recuperación del mismo lead. |
| Reserva y no-show | Una reserva detiene recuperación; AURA no marca ni contacta automáticamente por no-show. |
| Interfaz | El panel expone tres modos, respaldo SMS y pausa global; explica el resultado en lenguaje de clínica. |
| Adaptación | La configuración se mantiene legible y operable en escritorio, tablet y móvil. |

## Límites de usabilidad

La mejora puede añadir orientación contextual, pero no nuevos flujos visibles al paciente ni controles avanzados por evento. Las decisiones de canal continúan siendo internas y se mantienen los tres modos actuales.

## Hallazgos visuales de escritorio

La verificación en producción confirmó que el selector aparece en Comunicaciones antes del centro de plantillas y que los tres controles principales son visibles sin desplazamiento horizontal. El estado refleja correctamente `Automático · SMS` cuando la clínica todavía no tiene WhatsApp conectado. También se confirmó que la lista de decisiones queda dentro de la tarjeta y que la interfaz no presenta SMS como un segundo envío paralelo.

La segunda revisión detectó dos oportunidades de claridad, ya corregidas: tarjetas visuales para diferenciar respaldo y pausa, y una guía automática de categoría Meta cuando se asocia una plantilla a un evento de marketing o de servicio.

## Resultados de interacción

En producción, al elegir Solo WhatsApp se desactiva el respaldo SMS y el panel explica que, mientras el número no esté conectado, los envíos quedarán pendientes. La opción no puede producir un fallback oculto.

Al asociar una plantilla a Cumpleaños, Recall o reactivaciones de los días 3, 7 o 21, la categoría se ajusta a Marketing y se informa de que necesita consentimiento y aprobación de Meta. Al asociarla a confirmación, recordatorio, cuidado, firma o reseña, se ajusta a Utilidad. La consola del panel no registró errores durante la comprobación.

La cuadrícula usa columnas adaptativas con un mínimo de 220 píxeles y las acciones admiten salto de línea; por ello se conserva una sola columna utilizable en pantallas estrechas. La sesión de navegación automatizada no puede reutilizarse en el navegador headless móvil, que mostró la pantalla de acceso; la adaptación del selector se validó mediante su estructura responsive y la sesión real de escritorio.
