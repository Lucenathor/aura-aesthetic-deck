# Investigación: Unipile vs 360dialog para WhatsApp en AURA

## 1. Naturaleza de cada servicio

### Unipile
- **Tipo:** API unificada de mensajería (LinkedIn, WhatsApp, Instagram, Telegram, Email, Calendar).
- **Método de conexión WhatsApp:** Código QR o pairing code. El usuario escanea con su app de WhatsApp personal o Business. **No es BSP oficial de Meta.**
- **Certificación Meta:** NO. Se define como "intermediario técnico independiente" que opera por ingeniería inversa.
- **SOC 2:** Sí (octubre 2025). GDPR: Sí.
- **Sede:** Francia.

### 360dialog
- **Tipo:** BSP (Business Solution Provider) oficial de Meta, especializado en WhatsApp Business API.
- **Método de conexión WhatsApp:** Onboarding oficial de Meta (verificación de negocio, WABA, número registrado).
- **Certificación Meta:** SÍ. BSP certificado.
- **Sede:** Berlín, Alemania.
- **Trustpilot:** 4.0/5 (29 reseñas). 90% de 5 estrellas. Soporte bien valorado.
- **Twilio (comparación):** 1.1/5 en Trustpilot (939 reseñas).

## 2. Modelo de precios

### Unipile
| Cuentas vinculadas | EUR/cuenta/mes | USD/cuenta/mes |
|---|---|---|
| Hasta 10 | 49€ total | $55 total |
| 11-50 | 5€ | $5.50 |
| 51-200 | 4.50€ | $5.00 |
| 201-1000 | 4€ | $4.50 |
| 1001-5000 | 3.50€ | $4.00 |
| 5001+ | 3€ | $3.50 |

- **Sin coste por mensaje.** Mensajes ilimitados.
- **Sin verificación de Meta Business.** Sin plantillas aprobadas.
- **Sin tasas de Meta.** (porque no pasa por la API oficial).

### 360dialog (Partner Platform — lo que tiene AURA)
| Plan | Mensual EUR | Canales incluidos | Canal adicional regular |
|---|---|---|---|
| Starter | 250€ | 5 | 49€/canal |
| Growth | 500€ | 10 | 25€/canal |
| Premium | 1.000€ | 20 | 15€/canal |

- **+ Tasas de Meta por mensaje** (marketing, utility, authentication). Sin markup de 360dialog.
- **Requiere verificación de Meta Business** para cada clínica.
- **Requiere aprobación de plantillas** para mensajes proactivos.

### Coste estimado para AURA con 10 clínicas

**Unipile:** 10 cuentas × 5€ = 49€/mes (mínimo). Sin coste por mensaje.
**360dialog Growth:** 500€/mes (10 canales incluidos) + tasas de Meta por mensaje enviado.

## 3. Riesgo de baneo

### Unipile
- **RIESGO ALTO.** Usa ingeniería inversa (no API oficial). Meta puede banear números conectados por QR.
- Reddit (r/WhatsappBusinessAPI): "I am worried I will get my account banned because I am using the QR code connection" — usuario real.
- Respuesta de la comunidad: "If you use it to send messages to users then your number might get banned."
- Unipile lo reconoce implícitamente: "Unipile is NOT affiliated with, endorsed by, or sponsored by Meta or WhatsApp."
- **Para un SaaS que vende a clínicas:** si el número de una clínica se banea, AURA pierde al cliente.

### 360dialog
- **RIESGO BAJO.** Es BSP oficial de Meta. Los números están registrados oficialmente.
- Meta no banea números que usan la API oficial correctamente.
- El riesgo existe solo por mal uso (spam, plantillas rechazadas, baja calidad).
- Trustpilot: 1 queja de offboarding difícil, 1 de cobro doble. Resto positivo.

## 4. Funcionalidades comparadas

| Característica | Unipile | 360dialog |
|---|---|---|
| Mensajes de texto | Sí | Sí |
| Mensajes multimedia | Sí | Sí |
| Plantillas aprobadas por Meta | No necesario | Sí (obligatorio para proactivos) |
| Mensajes proactivos (sin que el cliente escriba primero) | Sí (pero riesgo de baneo) | Sí (con plantilla aprobada) |
| Grupos | Sí | Sí (limitado) |
| Notas de voz | Sí | Sí |
| Read receipts | Sí | Sí |
| Webhooks | Sí | Sí |
| Multi-canal (LinkedIn, Email, etc.) | Sí | No (solo WhatsApp) |
| Verificación de negocio | No necesaria | Obligatoria |
| Tick verde oficial | No posible | Posible (solicitar a Meta) |
| Coexistencia (app + API) | Sí (nativo) | Sí (WhatsApp Coexistence) |
| Soporte 24/7 | Chat | Chat + email + account manager |
| Residencia de datos EU | Francia | Alemania |

## 5. Opiniones reales (foros, Trustpilot, Reddit)

### Unipile
- Usuarios preocupados por baneos al usar QR code.
- Funciona bien para LinkedIn (su fuerte).
- Para WhatsApp: solución rápida pero arriesgada.
- Sin reseñas de Trustpilot significativas.

### 360dialog
- Trustpilot 4.0/5 — soporte muy bien valorado.
- 1 queja de offboarding difícil (migrar número fuera).
- 1 queja de cobro doble (Pre-Usage fees).
- Reddit: "360dialog is pretty expensive. It's got everything."
- Reddit: "I recommend staying away from 360 Dialog because they have serious uptime and deliverability problems" (1 usuario, 2025).
- Engrana.es (comparativa profesional): "For a Spanish SMB doing high-volume utility and marketing on WhatsApp, 360dialog usually wins on price and time to live."

## 6. Adecuación para SaaS multi-tenant (AURA)

### Unipile
- ✅ Barato (49€ para 10 clínicas).
- ✅ Sin verificación de Meta (onboarding rápido).
- ✅ Multi-canal (podría añadir Instagram, Telegram).
- ❌ Riesgo de baneo del número de la clínica.
- ❌ Sin plantillas oficiales (no puede enviar recordatorios proactivos de forma segura).
- ❌ Sin tick verde.
- ❌ Si Meta endurece la detección, todos los clientes se quedan sin WhatsApp.
- ❌ No es escalable para un SaaS profesional que cobra 497€/mes.

### 360dialog
- ✅ BSP oficial de Meta (sin riesgo de baneo por la plataforma).
- ✅ Plantillas aprobadas (recordatorios, confirmaciones, marketing).
- ✅ Tick verde posible.
- ✅ Partner Platform diseñada para SaaS multi-tenant.
- ✅ Connect Button para que cada clínica conecte su número.
- ✅ Residencia de datos en EU (Alemania).
- ✅ Soporte dedicado para partners.
- ❌ Más caro (250-500€/mes + tasas de Meta).
- ❌ Requiere verificación de Meta Business por clínica.
- ❌ Plantillas necesitan aprobación (puede tardar horas).
- ❌ Onboarding más lento (verificación de negocio).
