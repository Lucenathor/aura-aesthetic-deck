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
