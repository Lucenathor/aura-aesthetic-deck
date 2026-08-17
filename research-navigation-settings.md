# Investigación: Navegación y Ajustes en CRMs — Mejores Prácticas

## Fuentes consultadas
- UX Planet: Best UX Practices for Designing a Sidebar (Dmitry Sergushkin, 2024)
- Eleken: UX Navigation Design — How to Help Users Find Their Way (2026)
- SaaSFrame: 179 SaaS Settings UI Design Examples
- Mangomint: Business Setup > Advanced Settings (menú contextual)
- Pabau: Settings con sidebar dedicado por categoría

## Principios clave para AURA

### 1. Sidebar contextual para Ajustes
- Al entrar en Ajustes, el sidebar principal se SUSTITUYE por un sidebar dedicado de ajustes
- Incluir botón "← Volver al panel" para regresar al menú principal
- Ancho recomendado: 240-280px fijo a la izquierda
- Siempre visible, no desaparece al hacer scroll

### 2. Agrupación en categorías (como Mangomint/Pabau)
- **General**: Nombre clínica, logo, colores, horario, slug
- **Equipo**: Profesionales, PINs, roles, permisos
- **Agenda**: Duración por defecto, buffer, confirmaciones, no-shows
- **Comunicaciones**: SMS, WhatsApp, plantillas, recordatorios
- **Facturación**: Datos fiscales, numeración, logo factura, exportación
- **Embudos**: Pixel Meta, slugs, configuración de embudos
- **Integraciones**: Unipile, Twilio, LabsMobile, Google Calendar
- **Seguridad**: Contraseña, 2FA, sesiones activas
- **Widget**: Código embed, personalización, tratamientos visibles
- **Avanzado**: Importación/exportación, borrar datos, API keys

### 3. Patrones de diseño
- Cada categoría se abre como una página con sus propios campos
- Formularios con secciones claras separadas por títulos
- Guardar cambios con botón fijo en la parte inferior o superior
- Indicador visual de la categoría activa (fondo resaltado, borde lateral)
- Breadcrumb: Ajustes > Equipo (para orientación)

### 4. Errores a evitar (detectados en AURA actual)
- ❌ Todo en una sola página larga sin separación
- ❌ Pestañas que desaparecen al hacer scroll
- ❌ Demasiados campos juntos sin agrupación lógica
- ❌ Sin indicación de dónde está el usuario
- ❌ Mezclar configuración de diferentes áreas en la misma vista

### 5. Aplicación a otras secciones del panel
- La misma lógica de sidebar fijo + subcategorías se puede aplicar a:
  - Ficha del paciente (datos, historial, consentimientos, fotos, bonos)
  - Métricas (resumen, retención, profesionales, embudos)
  - Inventario (productos, lotes, movimientos, alertas)

### 6. Referencia de competidores
- **Mangomint**: Settings > Business Setup, Staff, Services, Scheduling, Notifications, Integrations
- **Pabau**: Settings con sidebar izquierdo: General, Team, Calendar, Communications, Billing, Marketing, Integrations
- **Fresha**: Settings > Business details, Team, Services, Notifications, Payments, Online booking
- **HubSpot**: Settings con sidebar izquierdo agrupado: Account, Users & Teams, Integrations, Marketing, Sales, Service

## Auditoría de la sección Ajustes actual de AURA (líneas 836-1035)

### Estructura actual (todo en una sola columna, sin menú lateral):
1. Horario de la clínica (días, horas, duración cita, intervalo, profesional)
2. Vacaciones y días cerrados
3. Catálogo de tratamientos
4. Reseñas automáticas en Google
5. Llamadas desde el panel (Twilio)
6. Programa de puntos y recompensas (con QR)
7. Portal del cliente (datos clínica + packs + QR)
8. Previsualización SMS
9. Mensajes automáticos (SMS templates)
10. Saldo de SMS
11. Importar datos
12. Reserva online pública (booking config)
13. Widget embebible
14. Meta Pixel + Slug

### Problemas detectados:
- 14 cards en una sola columna sin separación por categoría
- No hay menú lateral ni pestañas de navegación
- Al hacer scroll, se pierde la referencia de dónde está el usuario
- Mezcla de conceptos: horario + SMS + puntos + importación + pixel en la misma vista
- No hay forma rápida de saltar a una sección específica
- En móvil es un scroll infinito sin orientación

### Nueva estructura propuesta (10 subcategorías):

| Subcategoría | Cards que incluye |
|---|---|
| General | Datos de la clínica (nombre, logo, colores, dirección) |
| Horario | Horario semanal, vacaciones, duración cita, intervalo |
| Equipo | Profesionales, PINs, roles (PENDIENTE de implementar) |
| Tratamientos | Catálogo de tratamientos |
| Comunicaciones | SMS templates, previsualización, saldo SMS, reseñas Google |
| Reservas | Reserva online, widget embebible, booking config |
| Fidelización | Programa de puntos, portal del cliente, packs |
| Marketing | Meta Pixel, slug personalizado |
| Llamadas | Configuración Twilio, teléfono recepción |
| Datos | Importar/exportar datos |
