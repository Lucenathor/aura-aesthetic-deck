# Decisión de arquitectura: captación fija en AURA frente a embudo variable con WhatsApp

**Autor:** Manus AI  
**Fecha:** 22 de agosto de 2026

## Veredicto ejecutivo

La mejor arquitectura para lanzar y escalar AURA es **mantener una captación única y estable dentro del embudo web de AURA**, y utilizar WhatsApp como canal principal de conversación posterior cuando el tenant lo tenga conectado. Mientras el número no esté operativo, SMS garantiza la continuidad. El estado de WhatsApp debe cambiar el **canal de seguimiento**, pero no la forma principal de captar.

> **Regla definitiva:** anuncio o tráfico → landing y asistente AURA → lead registrado → agenda. Después, AURA elige WhatsApp o SMS para continuar. No se cambia el embudo por el estado de aprobación de cada clínica.

Esta decisión no implica renunciar a WhatsApp. Al contrario: con **WhatsApp Coexistence**, la clínica puede seguir usando su WhatsApp Business App habitual y, al mismo tiempo, AURA puede recibir los mensajes, automatizar acciones y mantener el historial en el CRM. 360dialog y Meta confirman que los mensajes enviados desde la API aparecen en la app y los enviados desde la app pueden reflejarse en el CRM mediante `smb_message_echoes`.[1] [2]

## Las dos opciones comparadas

| Criterio | Opción A: captación fija en AURA | Opción B: embudo variable con WhatsApp |
|---|---|---|
| Experiencia del lead | Siempre reconoce el mismo recorrido: landing, quiz, asistente y agenda. | El recorrido cambia por clínica, campaña y estado del número. |
| Lanzamiento de un tenant | Puede captar desde el primer día, aunque Meta aún no haya aprobado el número. | Parte del embudo queda condicionada al alta y salud de WhatsApp. |
| Datos de cualificación | Estructurados y comparables entre todos los tenants. | Pueden quedar repartidos entre respuestas conversacionales, app móvil y web. |
| Atribución | Pixel/CAPI web y eventos de agenda bajo control de AURA. | Es viable, pero exige guardar `ctwa_clid` y añadir CAPI Business Messaging.[3] |
| Operación de la clínica | AURA entrega un lead con contexto; después el equipo continúa por WhatsApp. | La recepción debe entender varios puntos de entrada y estados de conversación. |
| Dependencias externas | WhatsApp no puede romper la captura del lead. | Un problema de onboarding, calidad o desconexión puede afectar la entrada del embudo. |
| Potencial de baja fricción | Bueno si la landing móvil y el chat son rápidos. | Muy alto para campañas Click-to-WhatsApp y demanda impulsiva. |
| Complejidad de soporte | Baja y previsible. | Alta: más bifurcaciones, pruebas, copys y casos de recuperación. |
| Recomendación | **Arquitectura base de AURA.** | **Experimento opcional posterior, no arquitectura principal.** |

## Por qué la opción fija tiene más sentido para AURA

### 1. AURA controla el activo más importante: el lead

En el embudo actual, el teléfono y las respuestas se guardan antes de continuar la conversación. El lead queda asociado al tenant, tratamiento, fuente, referencia, puntuación y temperatura. La conversación se persiste como `chat_web` y la reserva se crea directamente en la agenda. Por tanto, si el visitante abandona, AURA conserva el contexto y puede recuperarlo.

Si el recorrido cambia prematuramente a WhatsApp, AURA debe reconstruir ese mismo contexto desde webhooks, mensajes libres y referencias publicitarias. Meta ofrece la infraestructura necesaria mediante `ctwa_clid` y CAPI Business Messaging, de modo que no es una caja negra; sin embargo, requiere una integración adicional por WABA, dataset, permisos, deduplicación y eventos.[3] Es una capacidad valiosa para una fase avanzada, no una razón para complicar el producto base.

### 2. La aprobación de WhatsApp deja de bloquear el onboarding

Una clínica puede empezar a captar con AURA mientras prepara sus documentos y conecta el número. Si el embudo dependiera de WhatsApp, cada tenant tendría una versión diferente del producto durante la verificación, una incidencia o una restricción. Con la arquitectura fija, el embudo continúa funcionando y solo cambia el canal posterior:

| Estado del tenant | Captación | Continuidad |
|---|---|---|
| WhatsApp no solicitado | Embudo AURA | SMS con enlace mágico |
| WhatsApp en verificación | Embudo AURA | SMS mientras se configura |
| WhatsApp operativo | Embudo AURA | WhatsApp como canal principal |
| WhatsApp con incidencia | Embudo AURA | SMS temporal y tarea a recepción |

### 3. Que la clínica use WhatsApp no obliga a captar dentro de WhatsApp

La clínica seguirá trabajando por WhatsApp porque es su canal cotidiano. Esto no contradice una captación web fija. La landing y el asistente hacen el trabajo de marketing: filtrar, educar, recoger datos y ofrecer huecos. WhatsApp hace el trabajo relacional: responder dudas, enviar recursos, confirmar, cambiar una cita y mantener el contacto.

La novedad decisiva es Coexistence. 360dialog indica que la empresa mantiene acceso a WhatsApp Business App, puede enviar mensajes uno a uno desde el móvil y utilizar la API a escala; los mensajes se reflejan entre ambos entornos.[1] Meta confirma que pueden sincronizarse los chats uno a uno y hasta seis meses de historial si la empresa lo autoriza.[2] Por tanto, no hace falta obligar a la recepción a abandonar su hábito desde el primer día.

> En una demostración práctica de Coexistence, un mensaje entrante apareció a la vez en el móvil y en el CRM; una respuesta desde el CRM apareció en la aplicación y una respuesta desde el móvil apareció en el CRM. El ponente resumió el valor como: “Don't choose between convenience and scale. Have both.”[4]

### 4. Menos fricción no significa automáticamente mejor negocio

Click-to-WhatsApp puede generar muchas conversaciones y Meta ofrece optimización específica para leads. Meta publica que, en un experimento global, la optimización para leads en campañas Click-to-WhatsApp obtuvo un coste por lead medio un 24 % inferior al de optimizar para conversaciones.[5] Ese dato **no compara WhatsApp contra una landing**, no pertenece específicamente al sector estético y no garantiza pacientes cualificados.

En foros de anunciantes también aparecen casos de consultas irrelevantes y baja intención cuando WhatsApp actúa como único punto de conversión.[6] [7] Son experiencias anecdóticas, no pruebas universales, pero muestran el riesgo: bajar la fricción aumenta el volumen de contactos y también puede aumentar el ruido. Para AURA, cuyo valor diferencial es cualificar y convertir, es preferible conservar un pequeño filtro antes de entregar la conversación a la clínica.

## La arquitectura que recomiendo fijar

### Fase 1: captación universal

Todos los anuncios y rutas orgánicas de AURA deben llevar a una landing por tratamiento con quiz y asistente. El sistema captura el teléfono, consentimiento, fuente y respuestas antes del tramo conversacional. El asistente puede resolver objeciones y abrir la agenda sin depender de WhatsApp.

### Fase 2: continuidad automática

Después de capturar el lead, el sistema consulta el estado del tenant. Si WhatsApp está operativo y existe una base válida para contactar, continúa por WhatsApp. Si no lo está, envía un SMS con enlace mágico al punto exacto del chat o de la agenda. **Nunca se envían ambos a la vez por defecto.**

### Fase 3: atención cotidiana con Coexistence

La clínica puede seguir contestando desde su WhatsApp Business App. AURA recibe los ecos, guarda la conversación y evita duplicar respuestas. La bandeja de AURA es el registro y centro de automatización; el móvil sigue siendo una interfaz válida para la recepción.

### Fase 4: experimentos de crecimiento

Click-to-WhatsApp debe añadirse más adelante como **tipo de campaña opcional** para promociones sencillas, huecos de última hora, tratamientos conocidos o audiencias de remarketing. No debe convertirse en una bifurcación silenciosa por tenant. Cada prueba necesita una campaña separada, CAPI Business Messaging, `ctwa_clid`, un bot de cualificación breve y una comparación por citas asistidas y cobros, no por conversaciones iniciadas.

## Qué conservar, qué simplificar y qué descartar

| Acción | Decisión |
|---|---|
| Landing + quiz + asistente AURA | **Conservar como entrada principal.** |
| Captura temprana de teléfono, fuente, tratamiento y respuestas | **Conservar.** Es el seguro de continuidad. |
| Agenda dentro del chat web | **Conservar.** Reduce dependencia de terceros. |
| SMS de recuperación y confirmación | **Conservar como respaldo**, no como canal conversacional principal. |
| WhatsApp después de captar | **Potenciar**: seguimiento, objeciones, recursos, confirmación y post-cita. |
| WhatsApp Business App habitual de la clínica | **Conservar mediante Coexistence** cuando el número sea elegible. |
| Derivar automáticamente el embudo a WhatsApp según el tenant | **Descartar como arquitectura base.** Añade variabilidad sin necesidad. |
| Enviar SMS y WhatsApp simultáneamente | **Descartar.** Un evento, un canal automático pendiente. |
| Click-to-WhatsApp | **Reservar como experimento/campaña avanzada.** |

## Correcciones necesarias antes de desarrollar el orquestador

La integración actual de AURA utiliza el Connect Button de 360dialog, pero el código revisado no declara aún el modo específico de **WhatsApp Business App onboarding / Coexistence** ni implementa los webhooks `history`, `smb_app_state_sync` y `smb_message_echoes` exigidos para reflejar correctamente la app móvil.[2] Esto debe incorporarse antes de prometer a una clínica que todo lo que responda desde su móvil quedará sincronizado en AURA.

El embudo actual ya está cerca del modelo recomendado, pero su automatización necesita una regla central. Hoy el SMS rápido se omite si el lead entra al chat web, mientras que las reactivaciones posteriores tienen condiciones diferentes. El futuro orquestador debe cancelar cualquier secuencia pendiente cuando el paciente responda, reserve o pida baja, y decidir un único canal por evento.

También conviene dejar de describir visualmente el asistente web como “WhatsApp real”. Debe presentarse como **Asistente de la clínica** o **Valoración online**, porque es una experiencia propia de AURA. WhatsApp empieza después y debe reconocerse como el canal oficial de la clínica.

## Conclusión final

La arquitectura híbrida anterior era correcta en el fondo, pero demasiado fácil de interpretar como un embudo que cambia constantemente. La versión simplificada es mejor:

> **Captamos siempre igual en AURA. Después continuamos por WhatsApp si está disponible; si no, por SMS. La clínica puede seguir usando su WhatsApp habitual mediante Coexistence.**

Esto conserva la conversión y la trazabilidad del embudo, evita bloquear altas por Meta, reduce soporte y permite explotar WhatsApp sin convertirlo en una dependencia crítica. AURA no necesita elegir entre web y WhatsApp: necesita asignarles trabajos diferentes y mantener una única fuente de verdad.

## Referencias

[1]: https://docs.360dialog.com/docs/resources/phone-numbers/coexistence "360dialog — WhatsApp Coexistence"
[2]: https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users "Meta — Onboard WhatsApp Business app users"
[3]: https://developers.facebook.com/documentation/ads-commerce/conversions-api/business-messaging "Meta — Conversions API for Business Messaging"
[4]: https://www.youtube.com/watch?v=JPCbcEBlA50 "Seasalt.ai — WhatsApp Coexistence Tutorial"
[5]: https://www.facebook.com/business/business-messaging/optimizations-for-ads-that-click-to-whatsapp "Meta — Optimizations for ads that click to WhatsApp"
[6]: https://www.reddit.com/r/FacebookAds/comments/1qchrp5/bad_lead_quality_whatsapp_as_landing_page/ "Reddit — Bad lead quality, WhatsApp as landing page"
[7]: https://www.reddit.com/r/FacebookAds/comments/1r6y83q/low_quality_leads_with_whatsapp_messaging_in_dubai/ "Reddit — Low-quality WhatsApp leads in Dubai"
