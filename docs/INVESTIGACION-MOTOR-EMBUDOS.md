# Investigación: Motor de Embudos de Venta para AURA

## Fecha: 19 agosto 2026

---

## 1. GoHighLevel — Funnel Builder

**Modelo:** Constructor visual drag-and-drop con template library por vertical.

**Features clave para AURA:**
- **Template Library por vertical:** Embudos preconstruidos por sector (clínica estética = labios, botox, facial, corporal, peeling).
- **Custom Values:** `{{location.name}}`, `{{today}}` → un embudo se despliega para múltiples clínicas personalizando nombre, logo, colores, ciudad automáticamente.
- **Version Control:** Historial de cambios con revert en un clic.
- **Global Sections:** Editar un bloque (header, CTA, footer) y que se actualice en todos los embudos que lo usan.
- **In-Editor HTML Rendering:** Ver el embudo renderizado en tiempo real sin abrir preview aparte.
- **Page Toggle:** Saltar entre pasos del embudo sin salir del editor.
- **Stats por embudo:** Visitas, conversiones, tasa por paso.
- **Funnel AI:** Generación asistida por IA de páginas y copy.

**Aplicación a AURA:**
- Cada clínica tiene embudos preconfigurados por tratamiento.
- El panel muestra un preview real del embudo (no código).
- Se puede editar el copy, la promo, la ciudad y el Meta Pixel sin tocar código.
- Stats integradas: visitas → quiz completado → chat → reserva.

---

## 2. ClickFunnels

**Modelo:** Funnel steps visualizados como workflow + editor de páginas + stats filtradas.

**Features clave:**
- **Funnel Workflow Builder:** Vista bird's-eye de todos los pasos (landing → quiz → chat → booking).
- **Stats filtradas:** Por fecha, por paso, por fuente de tráfico.
- **Preview y Copy:** Botón de preview en cada paso + copiar embudo completo.
- **A/B Testing:** Variantes por paso para optimizar conversión.

**Aplicación a AURA:**
- Visualizar el embudo como flujo: Landing → Quiz → Chat IA → Reserva.
- Stats por paso con tasas de conversión entre cada uno.
- Posibilidad de duplicar un embudo y adaptarlo a otra ciudad/promo.

---

## 3. Intercom — Batch Test para IA Conversacional

**Modelo:** Playground de pruebas del agente IA con evaluación y refinamiento.

**Features clave:**
- **Batch Test:** Simular 50 preguntas reales y ver cómo responde el agente.
- **Evaluate Answer Panel:** Ver qué contenido usó, qué personalidad aplicó, qué guidance siguió.
- **Rating system:** Good / Acceptable / Poor con razones específicas.
- **Improve this answer:** Recomendaciones dinámicas para mejorar cada respuesta.
- **Test as User/Audience/Preview:** Simular como un paciente específico o genérico.
- **Test Groups:** Guardar conjuntos de preguntas para re-ejecutar después de cambios.
- **Language testing:** Verificar que responde en el idioma correcto.

**Aplicación a AURA:**
- **Playground del Setter Brain:** Escribir mensajes como si fueras un paciente y ver cómo responde el setter en tiempo real.
- **Panel de evaluación:** Ver qué etapa detectó, qué señales identificó, qué recurso envió.
- **Historial de pruebas:** Guardar conversaciones de prueba para comparar antes/después de cambios.
- **Configuración visible:** Ver y editar las reglas del cerebro, los recursos por tratamiento, el tono.

---

## 4. ManyChat — Flow Builder

**Modelo:** Editor visual de flujos conversacionales con preview en tiempo real.

**Features clave:**
- **Canvas visual:** Nodos conectados que representan cada paso de la conversación.
- **Preview button:** Probar el flujo completo sin publicar.
- **Conditions y triggers:** Bifurcaciones según respuestas del usuario.
- **Analytics por nodo:** Ver dónde se caen los usuarios en el flujo.

**Aplicación a AURA:**
- Visualizar el flujo del Setter Brain como diagrama: Descubrimiento → Informar → Resolver → Reservar.
- Ver en qué etapa se pierden más pacientes.

---

## 5. Diseño propuesto para AURA — Motor de Embudos

### Panel de Embudos (rediseño completo):

**Vista principal:** Grid de embudos activos con:
- Thumbnail del embudo (screenshot real, no código)
- Nombre del tratamiento
- Ciudad/promoción activa
- Stats rápidas: visitas | leads | reservas | tasa de conversión
- Estado: Activo / Pausado / Borrador
- Botones: Editar | Preview | Duplicar | Stats | Playground IA

**Editor de embudo (sin código):**
- Campos editables: título, subtítulo, descripción, promoción, ciudad, imagen hero
- Meta Pixel ID
- Slug personalizado
- Preview en vivo al lado (split screen: editor izquierda, preview derecha)
- Guardar + publicar

**Stats por embudo:**
- Visitas totales
- Quiz completados
- Conversaciones con IA iniciadas
- Reservas generadas
- Tasa de conversión por paso (funnel chart)
- Fuente de tráfico (si hay UTM)

**Playground del Setter Brain:**
- Chat en tiempo real contra el setter de ese embudo/tratamiento
- Panel lateral: etapa detectada, señales, recurso enviado, prompt activo
- Botón "Reiniciar conversación"
- Historial de pruebas guardadas
- Evaluación: ¿respondió bien? Sí/No + nota

**Configuración del cerebro IA:**
- Personalidad y tono
- Recursos por tratamiento (fotos, vídeos, reseñas, precios)
- Reglas de derivación
- Velocidad de respuesta
- Enlace de reserva

**Segmentación por ciudad/promoción:**
- Crear variante de embudo para una ciudad específica
- Aplicar promoción temporal (ej: "20% en labios hasta el 30 de agosto")
- La promoción se muestra en el embudo y el setter la menciona

---

## 6. Prioridad de implementación

| Orden | Feature | Impacto |
|---|---|---|
| 1 | Preview real del embudo (no código) | Elimina el bug actual |
| 2 | Editor de contenido sin código (copy, promo, ciudad, imagen) | Autonomía de la clínica |
| 3 | Stats por embudo (visitas → leads → reservas) | Demuestra ROI |
| 4 | Playground del Setter Brain | Permite afinar el IA sin desplegar |
| 5 | Configuración visible del cerebro IA | Control total del comportamiento |
| 6 | Segmentación por ciudad y promociones temporales | Personalización por mercado |
| 7 | Duplicar embudo y crear variantes | Escalabilidad |
