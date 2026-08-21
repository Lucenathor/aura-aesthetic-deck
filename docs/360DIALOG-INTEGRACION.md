# Integración 360dialog WhatsApp — AURA

## Datos de la cuenta
- **Partner ID:** IGw6FhPA
- **Partner Name:** Thor Group
- **Partner API Key:** almacenada exclusivamente como secreto `D360_PARTNER_KEY` del Worker; nunca versionar ni mostrar el valor.
- **País:** UAE
- **Modelo de pago:** Partner-paid (PBS)
- **Cliente creado:** Thor Group Client (ID: rMfUbVyDCL)
- **Canales:** 0 (ningún número registrado aún)

## Arquitectura de la API

### 1. Partner API (gestión de clientes y canales)
- **Base URL:** `https://hub.360dialog.io/api/v2`
- **Auth:** Header `x-api-key: <PARTNER_API_KEY>`
- **Endpoints principales:**
  - `GET /partners/{partner_id}` — Info del partner
  - `PATCH /partners/{partner_id}` — Actualizar webhook_url y redirect_url
  - `GET /partners/{partner_id}/channels` — Listar canales
  - `GET /partners/{partner_id}/clients` — Listar clientes
  - `POST /partners/{partner_id}/channels/{channel_id}/api_keys` — Generar Number API Key

### 2. Messaging API (enviar/recibir mensajes)
- **Base URL:** `https://waba-v2.360dialog.io`
- **Auth:** Header `D360-API-KEY: <NUMBER_API_KEY>`
- **Endpoints principales:**
  - `POST /messages` — Enviar mensaje (texto, media, template)
  - `GET /v1/configs/webhook` — Ver webhook del número
  - `POST /v1/configs/webhook` — Configurar webhook del número

### 3. Formato de mensajes (Cloud API de Meta)
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "34612345678",
  "type": "text",
  "text": { "body": "Hola, ¿cómo estás?" }
}
```

### 4. Formato de webhook entrante (Cloud API de Meta)
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "PHONE_NUMBER",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "contacts": [{"profile": {"name": "NAME"}, "wa_id": "PHONE_NUMBER"}],
        "messages": [{
          "from": "PHONE_NUMBER",
          "id": "wamid.ID",
          "timestamp": "TIMESTAMP",
          "text": {"body": "MESSAGE_BODY"},
          "type": "text"
        }]
      },
      "field": "messages"
    }]
  }]
}
```

## Flujo de integración para AURA

### A. Onboarding de una clínica (Connect Button)
1. Clínica pulsa "Conectar WhatsApp" en AURA → se abre el Connect Button de 360dialog
2. Clínica crea/conecta su WABA y número en el flujo de Meta
3. 360dialog redirige a AURA con `client_id` y `channel_ids`
4. AURA recibe webhook de Partner: `channel_created` → `channel_status_running`
5. AURA genera la Number API Key via Partner API
6. AURA configura el webhook del número apuntando a su worker
7. Listo: mensajes fluyen entre el número de la clínica y el CRM de AURA

### B. Envío de mensajes desde AURA
```
POST https://waba-v2.360dialog.io/messages
Headers: D360-API-KEY: <number_api_key_del_tenant>
Body: { messaging_product: "whatsapp", to: "...", type: "text", text: { body: "..." } }
```

### C. Recepción de mensajes en AURA
- Webhook del número → `POST https://aura-chat-worker.adrian-7b9.workers.dev/api/wa-webhook`
- Formato: Cloud API de Meta (mismo que ya usa Unipile internamente)

## Configuración pendiente en 360dialog
1. ✅ Partner API Key verificada
2. ⬜ Configurar `webhook_url` del Partner → recibir eventos de canales
3. ⬜ Configurar `partner_redirect_url` → redirigir tras onboarding
4. ⬜ Registrar primer número de prueba
5. ⬜ Generar Number API Key para ese número
6. ⬜ Configurar webhook del número → worker de AURA
7. ⬜ Probar envío y recepción de mensajes
