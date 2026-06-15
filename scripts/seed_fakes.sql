-- Limpiar datos previos de prueba para no duplicar
DELETE FROM leads WHERE tenant_id='clinica-elvira' AND name LIKE 'Fake %';
DELETE FROM appointments WHERE tenant_id='clinica-elvira' AND lead_id IN (SELECT id FROM leads WHERE name LIKE 'Fake %');
DELETE FROM treatments_log WHERE tenant_id='clinica-elvira' AND lead_id IN (SELECT id FROM leads WHERE name LIKE 'Fake %');
DELETE FROM consents_signed WHERE tenant_id='clinica-elvira' AND lead_id IN (SELECT id FROM leads WHERE name LIKE 'Fake %');

-- 1. Leads en distintas fases
INSERT INTO leads (id, tenant_id, name, phone, treatment, status, temperature, chatted, wa_opened, created_at, recover_state, call_priority) VALUES
('l_fake1', 'clinica-elvira', 'Fake Laura M.', '34600111001', 'Aumento de labios', 'new', 'warm', 1, 1, strftime('%s','now','-2 hours')*1000, null, 'urgent'),
('l_fake2', 'clinica-elvira', 'Fake Ana S.', '34600111002', 'Botox', 'booked', 'hot', 1, 1, strftime('%s','now','-1 day')*1000, null, null),
('l_fake3', 'clinica-elvira', 'Fake Carmen R.', '34600111003', 'Peeling', 'client', 'cold', 1, 1, strftime('%s','now','-30 days')*1000, null, null),
('l_fake4', 'clinica-elvira', 'Fake Elena G.', '34600111004', 'Láser', 'lost', 'cold', 0, 0, strftime('%s','now','-15 days')*1000, null, null),
('l_fake5', 'clinica-elvira', 'Fake Sara T.', '34600111005', 'Aumento de labios', 'booked', 'hot', 1, 1, strftime('%s','now','-2 days')*1000, null, 'urgent'),
('l_fake6', 'clinica-elvira', 'Fake Paula V.', '34600111006', 'Botox', 'booked', 'hot', 1, 1, strftime('%s','now','-5 days')*1000, 'noshow', 'urgent'),
('l_fake7', 'clinica-elvira', 'Fake Lucía P.', '34600111007', 'Láser', 'client', 'cold', 1, 1, strftime('%s','now','-180 days')*1000, null, null),
('l_fake8', 'clinica-elvira', 'Fake Marta D.', '34600111008', 'Peeling', 'new', 'cold', 0, 1, strftime('%s','now','-10 minutes')*1000, null, null);

-- 2. Citas en la agenda
INSERT INTO appointments (id, tenant_id, lead_id, professional_id, date_iso, status, created_at) VALUES
('a_fake1', 'clinica-elvira', 'l_fake2', 'pro_1', strftime('%Y-%m-%dT10:00:00.000Z','now'), 'confirmed', strftime('%s','now','-1 day')*1000),
('a_fake2', 'clinica-elvira', 'l_fake5', 'pro_1', strftime('%Y-%m-%dT11:30:00.000Z','now','+1 day'), 'pending', strftime('%s','now','-2 days')*1000),
('a_fake3', 'clinica-elvira', 'l_fake6', 'pro_1', strftime('%Y-%m-%dT09:00:00.000Z','now','-1 day'), 'cancelled', strftime('%s','now','-5 days')*1000);

-- 3. Cobros en la Caja (hoy)
INSERT INTO treatments_log (id, tenant_id, lead_id, name, amount, method, cost, created_at) VALUES
('t_fake1', 'clinica-elvira', 'l_fake3', 'Peeling facial', 120, 'tarjeta', 15, strftime('%s','now','-1 hour')*1000),
('t_fake2', 'clinica-elvira', 'l_fake7', 'Bono Láser 5 sesiones', 450, 'bizum', 0, strftime('%s','now','-3 hours')*1000),
('t_fake3', 'clinica-elvira', 'l_fake4', 'Crema post-tratamiento', 45, 'efectivo', 20, strftime('%s','now','-5 hours')*1000);

-- 4. Consentimientos
INSERT INTO consents_signed (id, tenant_id, lead_id, template_id, title, status, signer_name, signer_dni, signed_at, created_at) VALUES
('cs_fake1', 'clinica-elvira', 'l_fake2', 'def_1', 'Consentimiento Botox', 'signed', 'Ana Sánchez', '87654321B', strftime('%Y-%m-%dT09:50:00.000Z','now'), strftime('%s','now','-1 day')*1000),
('cs_fake2', 'clinica-elvira', 'l_fake5', 'def_0', 'Consentimiento Labios', 'pending', null, null, null, strftime('%s','now','-2 hours')*1000);

