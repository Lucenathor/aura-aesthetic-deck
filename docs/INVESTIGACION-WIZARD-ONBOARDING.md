# Investigación: Wizard de Onboarding en SaaS Líderes

## Objetivo
Diseñar una herramienta INTERNA para el equipo de AURA que guíe paso a paso la configuración de cada nueva clínica, basándose en las mejores prácticas de SaaS líderes.

---

## Patrones encontrados en los grandes

### 1. GoHighLevel — SubAccount LaunchPad
- **Tipo:** Panel de onboarding dentro de cada sub-cuenta (equivalente a nuestro tenant).
- **Estructura:** Checklist agrupado por resultados de negocio (Foundational Setup, Marketing, Sales, Website, E-commerce).
- **Cada acción incluye:** Vídeo tutorial, Product Tour Guide (click-by-click), auto-completado al terminar.
- **Progreso visual:** Indicadores por paso y por categoría.
- **Adaptación por rol:** Agency Owner, Admin y User ven pasos diferentes.
- **Accesible siempre:** Se puede reabrir desde el menú lateral en cualquier momento.
- **Lección para AURA:** Es el modelo más cercano a lo que necesitamos. Un LaunchPad por tenant que nuestro equipo usa para configurar cada clínica.

### 2. Mangomint — Get Started Page + Setup Guide
- **Tipo:** Página "Get Started" con Setup Guide integrado.
- **Estructura:** Playground mode con datos de ejemplo → Setup Guide paso a paso → Onboarding session 1:1 de 30 min.
- **Pasos del setup:** Business Setup → Staff → Services → Online Booking → Payments → Automated Messages → Data Import → Launch Date.
- **Importación de datos:** Equipo dedicado importa clientes, productos, gift cards.
- **Lección para AURA:** El playground mode con datos demo es una idea excelente para que la clínica vea cómo queda antes de meter datos reales.

### 3. Pabau — Onboarding en 5 pasos + Post-Import Checklist
- **Tipo:** Proceso guiado por un coordinador dedicado + checklist post-importación de 10 pasos.
- **Estructura:** Kick-off call → Share data → Data validation → Forms & widgets → Go live.
- **Post-Import Checklist:** Staff → Client Details → Attachments → Medical History → Appointments → Services → Products → Packages → Medical Forms → Financial Records.
- **Opción premium:** Full Project Management con plan personalizado, training plan y account manager dedicado.
- **Lección para AURA:** El Post-Import Checklist de 10 pasos es exactamente lo que nuestro equipo necesita para verificar que todo está bien antes de dar el "go live".

### 4. Stripe — Setup Wizard lineal
- **Tipo:** Wizard paso a paso con lista de pasos visible en sidebar.
- **Estructura:** Verify account → Business details → Personal details → Bank details → 2FA → Review.
- **Lección para AURA:** La lista de pasos visible en el lateral con estado (completado/pendiente/actual) es el patrón más claro para un setup complejo.

### 5. Intercom — Checklists in-app
- **Tipo:** Checklist flotante dentro del producto con auto-completado.
- **Características:** No-code setup, integración con Product Tours, personalizable por segmento, auto-tick al completar, métricas de completado.
- **Lección para AURA:** El auto-completado (detectar que un paso ya se hizo) es clave para que el equipo no tenga que marcar manualmente.

### 6. HubSpot — Checklist orientado a resultados
- **Tipo:** Checklist lateral con % de completado.
- **Estructura:** Organizado por resultado de negocio ("Get your first deal into the pipeline"), no por feature.
- **Lección para AURA:** Nombrar los pasos por resultado ("Clínica lista para recibir leads", "Agenda operativa") en vez de por feature ("Configurar horario").

---

## Síntesis: Diseño del Wizard de AURA

### Decisión arquitectónica

| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| Panel de admin separado | Aislado, limpio | Otro panel que mantener | No |
| Sección dentro del dashboard existente | Reutiliza infraestructura, acceso rápido | Puede mezclarse con operación diaria | **Sí** |
| Panel de onboarding independiente por tenant | Cada clínica tiene su propio estado | Más complejo | Parcialmente (estado por tenant en admin) |

### Modelo elegido: Sección "Onboarding" en el panel de Super Admin (`v-admin`)

**Acceso:** Solo con una sesión de superadmin válida, temporal y transmitida mediante cabecera `Authorization`; nunca se documenta ni versiona su valor.

**Vista principal:** Lista de todos los tenants con:
- Nombre de la clínica
- Fecha de alta
- % de completado del onboarding
- Estado: "En setup" / "Lista para operar" / "Activa"
- Botón "Ver checklist"

**Vista de checklist por tenant:** Inspirada en Stripe + GoHighLevel

| Fase | Pasos | Auto-detección |
|---|---|---|
| **1. Identidad de la clínica** | Nombre, dirección, teléfono, logo, colores, zona horaria | Detectar si `clinic_name` y `logo_url` existen en config |
| **2. Equipo y accesos** | Profesionales dados de alta, PINs asignados, roles definidos | Contar registros en `professionals` |
| **3. Horario de trabajo** | Horario semanal configurado, días festivos | Verificar `schedule_by_day` |
| **4. Catálogo de tratamientos** | Tratamientos con precio, duración y buffer | Contar registros en `treatment_catalog` |
| **5. Comunicaciones** | WhatsApp conectado, SMS configurado, plantillas de mensaje | Verificar `wa_config` |
| **6. Facturación** | Logo de factura, serie, NIF/CIF, IVA | Verificar campos de facturación en config |
| **7. Embudos de captación** | Al menos 1 embudo activo con slug | Contar `funnels` activos |
| **8. Setter Brain (IA)** | Configuración del setter, recursos por tratamiento cargados | Verificar `setter_brain_config` y `setter_resources` |
| **9. Importación de datos** | Pacientes importados (si los tienen) | Contar `leads` |
| **10. Verificación final** | Test de embudo, test de reserva, test de cobro | Checklist manual |

### Características clave

1. **Auto-detección:** Cada paso consulta las tablas D1 para saber si ya está completado. No hay que marcar manualmente (excepto la verificación final).
2. **Enlace directo:** Cada paso tiene un botón "Ir a configurar →" que lleva a la sección exacta de Ajustes del dashboard.
3. **Barra de progreso:** Porcentaje visual por tenant, visible en la lista y en el detalle.
4. **Estado "Lista para operar":** Se activa automáticamente cuando todos los pasos obligatorios están completados.
5. **Notas del implementador:** Campo de texto libre por paso para que el equipo anote observaciones.
6. **Historial:** Fecha de completado de cada paso.

### Flujo de uso por el equipo de AURA

1. Equipo crea el tenant nuevo (ya existe esta funcionalidad).
2. Abre el wizard de onboarding del tenant.
3. Sigue los pasos en orden, usando "Ir a configurar →" para cada sección.
4. El wizard auto-detecta qué pasos están completados.
5. Cuando todo está verde, el tenant pasa a "Lista para operar".
6. El equipo hace la verificación final (test manual) y marca el último paso.
7. La clínica está lista para su primer día de operación.
