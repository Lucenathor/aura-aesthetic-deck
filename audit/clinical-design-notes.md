# Diseño del Núcleo Clínico de AURA — Notas de investigación

## Tablas existentes confirmadas (D1)
- consent_templates: id, tenant_id, title, body, treatment_key, created_at
- consents_signed: id, tenant_id, lead_id, template_id, title, body, status, signature_key, signer_name, signer_dni, signed_at, signed_ip, created_at
- patient_clinical: lead_id (PK), tenant_id, allergies, conditions, medications, skin_type, blood_type, notes, dob, updated_at, updated_by
- clinical_notes: id, tenant_id, lead_id, visit_date, professional, treatment, areas, product, lot, units, note, photo_url, created_at, created_by
- patient_media: id, tenant_id, lead_id, phone, url, mtype, caption, source, created_at
- inventory_lots: (existe, esquema por confirmar)
- inventory_products, inventory_moves, inventory_recipes
- waitlist, packs, bonos, loyalty_config, points_ledger, treatment_catalog
- professionals, consultations, schedule_by_day, vacations, time_blocks

## Endpoints existentes confirmados
- consent-templates (CRUD)
- consent-send (enviar consentimiento a paciente)
- consent-sign (firma con signature_key, signer_name, signer_dni, signed_ip)
- consent-list (listar firmados/pendientes)
- clinical-data (GET/POST anamnesis)
- clinical-note (CRUD notas clínicas)
- close-visit (cierre con cobro, productos, puntos, atribución)
- patient-media (galería)

## Mejoras a implementar (superar competencia)
1. Flujo clínico guiado al cerrar visita: alertas → consentimiento → nota → fotos → lote → cobro
2. Alertas visibles de alergias/contraindicaciones antes de tratar (banner rojo)
3. Comparador de fotos antes/después lado a lado
4. Envío automático de consentimiento antes de la cita (WhatsApp/SMS)
5. Automatizaciones post-care (cuidados, revisión, reseña)
6. Permisos granulares y bitácora de auditoría
7. Reserva online pública con depósito y política de cancelación
8. Trazabilidad mejorada: descontar stock al cerrar, alertar caducidad, búsqueda por lote

## Hallazgos clave de foros (Reddit, Trustpilot, G2)
### Lo que más frustra a los usuarios de competidores:
- Pabau: curva de aprendizaje pronunciada, caídas del sistema, soporte lento
- Flowww: migraciones desastrosas, contratos anuales sin reembolso, agenda rígida 15min
- Zenoti: demasiados clics, soporte 48h+, EMR débil para estética, precio opaco
- Fresha: comisión 20% marketplace, documentación clínica insuficiente, sin EMR
- GoHighLevel: sin EMR, curva técnica, HIPAA $297/mes extra, necesita otro software médico

### Lo que más valoran:
- Todo en uno sin necesidad de otro software
- Automatización de recordatorios y seguimientos
- Facilidad de uso desde el primer día
- Firma digital de consentimientos integrada
- Fotos antes/después vinculadas a la visita
- Trazabilidad de inyectables por lote

## Ventaja competitiva de AURA
AURA ya tiene captación IA + WhatsApp + embudos + contenido viral que NINGÚN CRM clínico ofrece.
Si añadimos el núcleo clínico bien hecho, será el ÚNICO sistema que cubre marketing + operación + clínica.

## URLs de referencia
- https://pabau.com/features/patient-intake-software/
- https://www.flowww.es/medicina-estetica/software-clinicas-medicina-estetica
- https://www.zenoti.com/medical-spa-software/features
- https://www.fresha.com/pricing
- https://help.gohighlevel.com/support/solutions/articles/48000983084-hipaa-compliance-with-highlevel
- https://www.reddit.com/r/MedSpa/comments/1qi01zg/what_medspa_software_are_you_actually_happy_with/
- https://es.trustpilot.com/review/flowww.es (TrustScore 2.5/5)
