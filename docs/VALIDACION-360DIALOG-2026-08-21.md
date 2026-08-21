# Validación técnica de 360dialog — 21 de agosto de 2026

## Estado de Partner

La cuenta de Partner de Thor Group (`IGw6FhPA`) está activa y no tiene canales registrados aún. Se confirmó que la URL de webhook de Partner apunta al Worker de AURA y que el retorno de onboarding apunta al dashboard de AURA.

## Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| Rechazo de evento de Partner sin autenticación | Correcto: HTTP 401. |
| Evento de Partner con cabecera compartida válida | Correcto: HTTP 200 y persistencia en D1. |
| Reintento del mismo evento de Partner | Correcto: HTTP 200 con `duplicate: true`; no se procesa dos veces. |
| Mensaje Cloud API de prueba con cabecera válida | Correcto: HTTP 200. |
| Persistencia de chat y mensaje en bandeja AURA | Correcto: el chat y el mensaje fueron devueltos por `/api/wa-chats` y `/api/wa-messages`. |
| Limpieza posterior a la prueba | Correcto: mensaje, chat, lead y configuración temporal se eliminaron; `aura-demo` quedó sin canal activo de WhatsApp. |
| Carga de la tarjeta en Ajustes → Comunicaciones | Correcto: se muestra el componente oficial `dialog-connect-button`, definido y asociado al Partner ID `IGw6FhPA`. |
| Comprobación visual posterior al despliegue | Correcto: el dashboard recargado conserva la navegación de Ajustes y permite abrir Comunicaciones sin recargar el documento. |
| Retirada de QR y conexión heredada | Correcto: la ruta heredada devuelve HTTP 410 y la bandeja ofrece solo conexión oficial con 360dialog y Meta. |
| Biblioteca de plantillas | Correcto: rechaza peticiones sin sesión con HTTP 403 y responde para el tenant autenticado. |

## Medidas aplicadas

Las credenciales de Partner se trasladaron a secretos del Worker. Se eliminaron los valores de API Key embebidos en el código. El webhook de Partner usa una cabecera aleatoria configurada también en 360dialog; el webhook de mensajes exige esa cabecera o la firma HMAC oficial cuando se configure el Platform Secret. La aplicación usa 360dialog como único proveedor operativo, con persistencia propia de chats, estados de entrega, enlaces temporales para medios, consentimientos y plantillas.

## Límite de esta validación

No es posible probar el envío real, las plantillas aprobadas, los adjuntos reales ni la recepción desde un dispositivo físico hasta que exista un canal/número de WhatsApp Business activo. A fecha de validación, el Partner no tiene ningún canal registrado.
