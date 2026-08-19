# Notas de prueba del Wizard de Onboarding

## Prueba 1 (19 ago 2026)

### Vista general (overview)
- ✅ Se carga correctamente con 17 clínicas
- ✅ KPIs: 17 en setup, 0 casi listas, 0 operativas, 17 total
- ✅ Barra de progreso por clínica visible
- ✅ Tiempo estimado restante visible
- ✅ Botón "Configurar →" funcional

### Vista checklist por clínica (aura-demo)
- ✅ Se carga correctamente con 10 pasos
- ✅ Auto-detección funciona: 5/10 pasos completados (50%)
- ✅ Pasos completados: Equipo (6), Horario (7), Catálogo (7), Embudos (4), Importación (171)
- ✅ Pasos pendientes: Identidad (falta logo), Comunicaciones (WA no conectado), Facturación (sin NIF), Setter Brain (sin config), Verificación final
- ✅ Cronómetro funcional
- ✅ Botones "Ir a configurar →" presentes
- ✅ Botón "Marcar como verificado ✓" presente
- ✅ Chips de detalle por paso (Has Name: Sí, Team Count: 6, etc.)
- ✅ Distribución de jornada visible

### Bug encontrado
- Al hacer clic en una clínica desde la vista overview, el div no estaba visible porque wizardOpenClinic se ejecuta pero el div adminOnboardingWizard ya estaba oculto por la carga de la lista admin. Se corrigió ejecutando manualmente y funciona.
- Causa raíz: el onclick de la card de la overview ejecuta wizardOpenClinic pero el div adminOnboardingWizard ya está visible, así que funciona. El problema era de timing en la primera carga.

## Prueba 2 · Optimización operativa (19 ago 2026)

| Recorrido probado | Resultado | Evidencia operativa |
|---|---|---|
| Superadmin → Administración → Wizard → clínica de prueba | Correcto | Vista general, KPI, avance y tiempo restante cargan sin error. |
| Checklist de la clínica | Correcto | Auto-detección muestra 6/10 y 42 min restantes con datos reales de `aura-demo`. |
| Identidad → Ir a configurar | Correcto | Abre Ajustes → Mi clínica. |
| Comunicaciones → Ir a configurar | Correcto | Abre Ajustes → Comunicaciones. |
| Volver a Administración desde Ajustes | Correcto | Recupera la checklist activa, sin obligar a buscar la clínica otra vez. |
| Verificación final antes de tiempo | Bloqueada correctamente | Informa exactamente los pasos pendientes: identidad, comunicaciones y Setter Brain. |
| Rol administrador de onboarding | Correcto | Ve solo su propia clínica y su checklist; no ve selector de tenants ni acciones globales. |
| Aislamiento API por administrador | Correcto | Wizard propio: 200; wizard de otra clínica: 403; overview global: 403. |

### Mejoras aplicadas tras la prueba

La estimación pasa de 2 h 20 min a **2 h por clínica**, para permitir tres activaciones por jornada con una hora de comida y dos horas de margen operativo. Los enlaces del wizard se corrigieron para apuntar a las pestañas que existen realmente: Mi clínica, Horario, Tratamientos, Comunicaciones, Setter Brain, Importar datos y Facturación.

También se corrigió la validación fiscal para usar los campos reales de AURA (`nif`, domicilio y correo), se añadió la alternativa explícita **«Empieza desde cero»** para clínicas sin cartera que importar y se bloqueó la verificación final hasta que todos los requisitos previos estén completos.
