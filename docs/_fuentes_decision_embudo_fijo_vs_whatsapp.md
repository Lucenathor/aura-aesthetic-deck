# Hallazgos externos: decisión embudo fijo AURA vs WhatsApp variable

## Coexistencia oficial entre WhatsApp Business App y Cloud API

Fuente 360dialog: https://docs.360dialog.com/docs/resources/phone-numbers/coexistence

- WhatsApp Coexistence permite conectar a la plataforma el número que la clínica ya usa en WhatsApp Business App sin perder el acceso a la aplicación, el número, el historial ni la audiencia.
- Los mensajes enviados por API aparecen en la aplicación; los enviados desde la app se entregan al webhook mediante `smb_message_echoes`, lo que permite reflejarlos en AURA.
- La aplicación debe abrirse al menos una vez cada 13 días.
- Los mensajes enviados desde la app siguen siendo gratuitos; los mensajes por Cloud API siguen el precio de Meta/360dialog.
- Tras el onboarding se desvinculan los dispositivos complementarios y hay que volver a enlazar los compatibles. Windows y WearOS no están soportados según 360dialog.
- Coexistence tiene limitaciones: OBA no soportado, migración entre WABAs no soportada, calling API no soportada y actualización de foto de perfil no soportada después del onboarding.

Fuente 360dialog Partner: https://docs.360dialog.com/partner/onboarding/whatsapp-coexistence

- Confirma que las dos interfaces pueden coexistir con el mismo número y que los mensajes se reflejan mediante ecos.
- El caso principal son pymes que ya usan de forma activa WhatsApp Business App y desean escalar con API.

Fuente Meta: https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users

- Meta denomina esta función Coexistence y permite usar WhatsApp Business App y Cloud API con el mismo número.
- Los mensajes 1:1 se sincronizan; pueden sincronizarse hasta seis meses de historial si la empresa autoriza.
- La integración requiere suscribirse a webhooks `history`, `smb_app_state_sync` y `smb_message_echoes`.
- Existe un plazo de 24 horas después del onboarding para iniciar la sincronización de contactos/historial; si no, hay que desincorporar y repetir el flujo.
- Los mensajes enviados desde la app no crean ni amplían la ventana de servicio de 24 h de Cloud API.
- Embedded Signup v2 se depreca el 15 de octubre de 2026; la integración debe usar v4.
- La app debe usar la versión 2.24.17 o posterior y el throughput de números coexistentes queda fijado en 20 mps.

## Atribución de anuncios Click-to-WhatsApp

Fuente Meta: https://developers.facebook.com/documentation/ads-commerce/conversions-api/business-messaging

- Meta ofrece Conversions API específica para Business Messaging; no es cierto que WhatsApp sea necesariamente una caja negra.
- Para WhatsApp se usan WABA ID, Dataset ID y `ctwa_clid`, que llega en el objeto referral del webhook del mensaje originado por anuncio.
- Se pueden enviar eventos como LeadSubmitted, QualifiedLead, Purchase, RatingProvided y ReviewProvided.
- Meta no deduplica eventos de Business Messaging: el partner debe implementar deduplicación.
- Las conversiones que ocurren en la web deben enviarse por CAPI Web; las que ocurren dentro del hilo de mensajería por CAPI Business Messaging.

Fuente Meta: https://www.facebook.com/business/business-messaging/optimizations-for-ads-that-click-to-whatsapp

- Meta ofrece optimización de leads y compras para anuncios Click-to-WhatsApp.
- Meta publica un experimento global de una semana: las campañas CTWA con optimización de leads tuvieron un CPL medio 24% inferior al de optimización para conversaciones; no compara contra landing y no debe extrapolarse como garantía para AURA.
- Puede habilitarse optimización de leads mediante señales y etiquetas de WhatsApp Business App o mediante Conversions API.

Fuente Meta: https://whatsappbusiness.com/products/ads-that-click-to-whatsapp/

- CTWA está diseñado para captar conversaciones y puede medirse más allá del chat mediante Pixel, CAPI u Offline Conversions.

## Experiencias de comunidad y riesgos prácticos

Fuente Reddit: https://www.reddit.com/r/FacebookAds/comments/1qchrp5/bad_lead_quality_whatsapp_as_landing_page/

- Un anunciante relata baja calidad, consultas irrelevantes y coste elevado cuando WhatsApp es el único punto de conversión. Es una experiencia individual, no evidencia causal.

Fuente Reddit: https://www.reddit.com/r/FacebookAds/comments/1r6y83q/low_quality_leads_with_whatsapp_messaging_in_dubai/

- Otro anunciante de Dubái reporta consultas de baja calidad y mensajes ajenos al servicio al dirigir Meta Ads directamente a WhatsApp. Es anecdótico, pero demuestra que menos fricción puede elevar volumen sin asegurar calidad.

Fuente Reddit: https://www.reddit.com/r/WhatsappBusinessAPI/comments/1ustd4w/whatsapp_cloud_api_in_2026_the_you_lose_your/

- Un desarrollador señala que la creencia «al usar Cloud API se pierde la app móvil» está desactualizada por Coexistence; también advierte que el onboarding no es un interruptor trivial y puede requerir recuperación si se ejecuta mal. Sus afirmaciones deben contrastarse con Meta/360dialog.

Fuente Reddit: https://www.reddit.com/r/WhatsappBusinessAPI/comments/1rx50hk/using_whatsapp_business_api_coexistence_for_small/

- Un constructor para pymes plantea como riesgos reales la calidad, restricciones, acciones manuales del propietario y cambios operativos tras conectar Coexistence. No aporta resultados, pero confirma que la preocupación operativa existe en pymes que manejan WhatsApp desde el móvil.

## Implicación para la decisión de AURA

- La posible «doble bandeja» no obliga a elegir entre app móvil y API: Coexistence permite mantener ambas. AURA debe ingerir ecos y sincronizar historial para que la bandeja del CRM refleje la actividad del móvil.
- La captación directa a WhatsApp no es técnicamente imposible ni opaca si AURA implementa CAPI Business Messaging y guarda `ctwa_clid`.
- Sin embargo, hacer que el embudo dependa del estado de WhatsApp por tenant aumenta la variabilidad y soporte. Un embudo web fijo protege captación y datos estructurados.
- La opción más sencilla y sólida es una captación fija en AURA, con WhatsApp como destino posterior y coexistente para el equipo. CTWA puede existir más adelante como tipo de campaña adicional, no como camino principal ni condición del producto.

## Demostración práctica de Coexistence

Vídeo: https://www.youtube.com/watch?v=JPCbcEBlA50

- La demostración conecta un número existente de WhatsApp Business App a Cloud API desde un CRM sin cerrar la sesión móvil.
- Comprueba visualmente sincronización bidireccional: mensaje entrante aparece en móvil y CRM; respuesta desde CRM aparece en la app; respuesta desde móvil aparece en el CRM.
- El historial disponible puede abarcar hasta seis meses si la empresa autoriza compartirlo; los grupos no se sincronizan.
- El ponente advierte que la app debe abrirse aproximadamente cada 14 días; 360dialog especifica oficialmente al menos una vez cada 13 días.
- La conclusión comercial del vídeo es «Don't choose between convenience and scale. Have both», pero es la opinión del proveedor de CRM y no demuestra por sí sola que WhatsApp deba ser el embudo principal.
- La demostración sí invalida una premisa anterior importante: conectar Cloud API no obliga actualmente a que la clínica abandone su WhatsApp Business App. La recomendación final debe asumir Coexistence, no el modelo antiguo de migración excluyente.
