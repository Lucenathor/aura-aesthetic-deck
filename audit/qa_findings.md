# Auditoría de regresión de AURA en auracrm.co

## Hallazgos iniciales

La auditoría de rutas públicas confirmó que la raíz, el panel, las rutas legales, los favicons y los recursos estáticos esenciales responden correctamente desde `https://auracrm.co`.

Durante la primera carga visual del dashboard se detectó un error de sintaxis JavaScript que impedía evaluar todo el script inline y, por tanto, bloqueaba las cargas de datos y la navegación funcional. Se localizó un cierre `}` sobrante inmediatamente antes del módulo de contenido viral. Se ha eliminado, la sintaxis se ha validado con `node --check`, se ha desplegado la corrección y se ha purgado la caché de Cloudflare.

También se detectaron tres scripts de procesamiento (`chroma.py`, `compose.py` y `cut_migracion.py`) que habían quedado expuestos dentro de `/assets`. No eran necesarios para la web y se han retirado del directorio público antes del redespliegue.

La auditoría de API de solo lectura devolvió respuestas correctas para los módulos principales usando el tenant de demostración: CRM, agenda, pipeline, métricas, caja, inventario, ajustes, portal, embudos, contenido viral, equipo, WhatsApp y configuración de llamadas.

## Recorrido del panel autenticado

Tras la corrección de sintaxis, la vista `#pacientes` se ha abierto con una sesión de superadministración válida y ha cargado correctamente la tabla de pacientes, los controles de búsqueda, los filtros, la exportación CSV y la navegación lateral. La vista de Pipeline quedó disponible en el mismo recorrido y las peticiones de su fuente de datos fueron correctas.

El tenant de demostración contiene registros creados durante pruebas de seguridad previas, incluidos contactos etiquetados como `Spam` y entradas de validación de inyección. No afectan a otras clínicas por el aislamiento de tenant, pero ensucian la demo comercial y conviene depurarlos con una acción explícitamente autorizada.

Las vistas de Agenda y WhatsApp se han abierto desde el panel autenticado sin error de ruta. El navegador de auditoría entrega el texto de todas las secciones —incluidas las ocultas—, por lo que la comprobación funcional de sus fuentes de datos se respalda además con las respuestas directas y autenticadas del Worker. Las API de calendario, citas, profesionales, vacaciones, estado de WhatsApp y chats respondieron correctamente durante la auditoría; no se enviaron mensajes ni se alteraron reservas.

## Hallazgos del recorrido E2E independiente

La prueba E2E con Chromium y Playwright confirmó que el dashboard se renderiza y que la vista de resumen queda activa, pero también reveló dos regresiones que requieren investigación antes de cerrar la auditoría: al abrir URLs con hash de módulos, las vistas esperadas no quedaban activas y persistía `v-resumen`; además, las llamadas de datos del navegador devolvieron respuestas 403 durante el recorrido automatizado. Se ha detectado asimismo un intento de petición hacia `evil.com/steal` procedente de un dato histórico de pentesting incluido en el tenant de demo. La política CORS bloqueó la salida, pero hay que revisar la renderización de campos de lead para confirmar que se escapan correctamente.
