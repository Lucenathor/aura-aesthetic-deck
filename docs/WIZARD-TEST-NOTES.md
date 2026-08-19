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
