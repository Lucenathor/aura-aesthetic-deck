# Historia clínica en SaaS estéticos líderes (Pabau, Aesthetic Record)

## Componentes clave que tienen los mejores
1. **Datos clínicos del paciente (intake / ficha médica)**: alergias, antecedentes médicos, medicación actual, contraindicaciones, tipo de piel (Fitzpatrick), notas de salud. Editable.
2. **Notas de evolución por visita (charting / SOAP)**: cada visita = una entrada con fecha, profesional, tratamiento, notas (motivo, observación, plan), producto usado, lote, zonas tratadas, cantidad/unidades.
3. **Fotos antes/después por visita**: galería vinculada a la visita; comparador.
4. **Consentimientos vinculados** al tratamiento/episodio (ya tenemos consents_signed).
5. **Plantillas por tratamiento** (botox, relleno, láser…) con campos específicos (zonas, unidades).
6. **Timeline cronológico**: ver toda la historia del paciente de un vistazo.
7. **Seguridad**: acceso por rol; datos sensibles de salud (RGPD art. 9).

## Lo que AURA ya tiene
- Pacientes (leads), tratamientos cobrados (treatments_log), consentimientos (consents_signed), galería de fotos (patient_media), catálogo de tratamientos.

## Lo que falta (a construir)
- **Ficha médica del paciente** (alergias, antecedentes, medicación, tipo de piel, notas) -> tabla `patient_clinical`.
- **Notas de evolución/visitas clínicas** -> tabla `clinical_notes` (fecha, profesional, tratamiento, zonas, producto, lote, unidades, nota SOAP).
- **Módulo en la ficha del paciente**: resumen clínico + timeline de visitas + galería + consentimientos.

## Decisión de alcance (MVP potente, no sobre-ingeniería)
- Tabla `patient_clinical`: 1 fila por paciente con alergias, antecedentes, medicación, tipo de piel, notas generales.
- Tabla `clinical_notes`: N filas por paciente (visitas), con fecha, profesional, título/tratamiento, zonas, producto, lote, unidades, nota, foto opcional.
- UI integrada en Pacientes (ficha del lead) con pestaña "Historia clínica": resumen editable + añadir visita + timeline + galería existente.
- Acceso: cualquier rol con acceso al panel del paciente (médico/recepción según clínica), pero respetando que datos de salud son sensibles.
