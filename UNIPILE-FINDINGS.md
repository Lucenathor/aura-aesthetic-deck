# Diagnóstico WhatsApp/Unipile — hallazgos de la doc oficial

## 1. Fotos / logos de contactos (lo que NO carga)
- Endpoint fiable: `GET /api/v1/chat_attendees/{id}/picture` → devuelve la imagen (binario). Para grupos vale el `chat_id`.
- Hoy el código intenta sacar la foto de `users/{public_identifier}` (profile_picture_url), pero **los attendees NO traen public_identifier** (la doc lo dice explícito en "Retrieving users"). Por eso muchas fotos no salen.
- ARREGLO: usar el proxy a `/chat_attendees/{attendee_id}/picture` (o `{chat_id}/picture` para grupos). Servirlo desde el worker como `/api/wa-avatar?aid=...` con caché.

## 2. Nombres "Contacto sin nombre"
- `GET /chats` devuelve chats; los nombres reales vienen de attendees (`name`) y, para WhatsApp, del `provider_id`/`specifics`.
- El attendee tiene `name`. Si la sync solo mira los primeros 25 chats y a veces el attendee no trae name, queda vacío.
- ARREGLO: en syncChats guardar SIEMPRE el name del attendee no-self; si falta, intentar `provider_id`→teléfono; subir el límite y no quedarnos en 25.

## 3. Tiempo real (no se actualiza solo)
- Unipile RECOMIENDA **Webhook** `source=messaging` (evento `message_received`, incluye también los enviados desde otro dispositivo).
- El payload del webhook trae: account_id, chat_id, message_id, message (texto), sender{attendee_id, attendee_name, attendee_provider_id}, attendees[], attachments[] (con id, mimetype, type, url `att://...`).
- IMPORTANTE: responder 200 en <30s o reintenta 5 veces.
- Webhook creado por API **no** trae Content-Type JSON por defecto → hay que añadir header `Content-Type: application/json`.
- ARREGLO: registrar el webhook (una vez) apuntando a `/api/wa-webhook` con header content-type. Hoy el webhook existe pero hay que confirmar que está dado de alta en Unipile y que parsea bien el payload (sender/attachments). Mientras, subir la frecuencia del polling y mejorar el merge.

## 4. Medios (fotos/vídeos/docs) "Unipile cannot display this type of message yet"
- En el webhook, cada attachment trae `id`, `type` (img/video/file...), `mimetype` y `url` tipo `att://...`.
- Para DESCARGAR: `GET /api/v1/messages/{message_id}/attachments/{attachment_id}` → binario.
- El historial `GET /chats/{id}/messages` también trae attachments[]; hay que leer `att.id` y `att.type/mimetype` y NO marcar como "no soportado".
- El mensaje "Unipile cannot display this type of message yet" es texto que mete AURA cuando no reconoce el tipo → hay que mapear correctamente los tipos (img, video, audio, file, **sticker**, **gif**, **location**, **contact**, etc.) y, si hay attachment, construir la URL del proxy.
- ARREGLO: en wa-messages, para cada attachment usar att.id como attachment_id y att.type/mimetype para decidir cómo pintar; el proxy /api/wa-media ya descarga por messages/{mid}/attachments/{aid}. Asegurar que att_id se guarda bien.

## Endpoints base
- DSN del tenant (ej. api50.unipile.com:18013). X-API-KEY en header.
- `GET /chats?account_id=&limit=250`
- `GET /chats/{chat_id}/attendees`
- `GET /chat_attendees/{id}/picture`  ← FOTO
- `GET /chats/{chat_id}/messages?limit=`
- `GET /messages/{message_id}/attachments/{attachment_id}`  ← MEDIO
- `POST /webhooks {request_url, source:"messaging", headers:[{key:Content-Type,value:application/json}]}`
