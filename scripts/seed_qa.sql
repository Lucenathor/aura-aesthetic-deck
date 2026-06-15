-- ===== SIEMBRA DATOS QA (tenant clinica-qa) =====
-- Limpieza previa (idempotente)
DELETE FROM treatments_log WHERE tenant_id='clinica-qa';
DELETE FROM appointments WHERE tenant_id='clinica-qa';
DELETE FROM messages WHERE tenant_id='clinica-qa';
DELETE FROM bonos WHERE tenant_id='clinica-qa';
DELETE FROM products WHERE tenant_id='clinica-qa';
DELETE FROM professionals WHERE tenant_id='clinica-qa';
DELETE FROM leads WHERE tenant_id='clinica-qa';
DELETE FROM pipeline_config WHERE tenant_id='clinica-qa';
DELETE FROM schedule_by_day WHERE tenant_id='clinica-qa';
DELETE FROM vacations WHERE tenant_id='clinica-qa';
DELETE FROM calendar_config WHERE tenant_id='clinica-qa';
DELETE FROM sms_templates WHERE tenant_id='clinica-qa';
DELETE FROM tenants WHERE id='clinica-qa';

-- Tenant
INSERT INTO tenants (id,name,city,address,whatsapp,doctor_name,advisor_name,brand_primary,brand_accent,google_rating,google_reviews,treatments_done,status,plan,sms_credits)
VALUES ('clinica-qa','Clínica QA Test','Valencia','Calle Colón 22, Valencia','34600111000','Dra. Marta Ruiz','Adrián','#5e1a2a','#D4A574',4.8,210,5400,'active','demo',97);

-- Horario por día (L-V abierto, S medio, D cerrado)
INSERT INTO schedule_by_day (tenant_id,dow,is_open,t1_start,t1_end,t2_start,t2_end) VALUES
('clinica-qa',1,1,'10:00','19:00',NULL,NULL),
('clinica-qa',2,1,'10:00','14:00','16:00','20:00'),
('clinica-qa',3,1,'10:00','19:00',NULL,NULL),
('clinica-qa',4,1,'10:00','19:00',NULL,NULL),
('clinica-qa',5,1,'10:00','19:00',NULL,NULL),
('clinica-qa',6,1,'10:00','14:00',NULL,NULL),
('clinica-qa',0,0,'10:00','19:00',NULL,NULL);

INSERT INTO calendar_config (tenant_id,days,start_hour,end_hour,slot_min,professional) VALUES ('clinica-qa','1,2,3,4,5,6',10,19,60,'Dra. Marta Ruiz');

-- Profesionales
INSERT INTO professionals (id,tenant_id,name,color,created_at) VALUES
('pro_qa1','clinica-qa','Dra. Marta Ruiz','#C8745A',1780600000000),
('pro_qa2','clinica-qa','Lucía (estética)','#7C9CB0',1780600000000);

-- Leads/pacientes en varios estados y temperaturas
INSERT INTO leads (id,tenant_id,name,phone,email,treatment,motivo,plazo,objecion,quiz_score,temperature,status,source,notes,chatted,created_at) VALUES
('qa_l1','clinica-qa','Carmen Soler','34611111111','carmen@mail.com','Aumento de labios','verse mejor','este mes','precio',82,'hot','new','meta','prefiere tardes',1,'2026-06-04T09:10:00.000Z'),
('qa_l2','clinica-qa','Andrea Gil','34622222222','andrea@mail.com','Botox','arrugas frente','sin prisa','miedo aguja',55,'warm','chatting','google','',1,'2026-06-03T11:00:00.000Z'),
('qa_l3','clinica-qa','Paula Marín','34633333333',NULL,'Aumento de labios',NULL,NULL,NULL,30,'cold','new','meta','',0,'2026-06-02T16:30:00.000Z'),
('qa_l4','clinica-qa','Rocío Díaz','34644444444','rocio@mail.com','Hidratación facial','piel apagada','esta semana',NULL,70,'warm','booked','direct','clienta recurrente',1,'2026-05-28T10:00:00.000Z'),
('qa_l5','clinica-qa','Elena Ts','34655555555','elena@mail.com','Aumento de labios','retoque','ya',NULL,90,'hot','attended','meta','',1,'2026-05-20T10:00:00.000Z'),
('qa_l6','clinica-qa','Marta León','34666666666','marta@mail.com','Rinomodelación','perfil','un mes','precio',60,'warm','client','google','VIP',1,'2026-05-10T10:00:00.000Z'),
('qa_l7','clinica-qa','Sara Vidal','34677777777',NULL,'Botox',NULL,NULL,NULL,20,'cold','lost','meta','no contesta',0,'2026-05-15T10:00:00.000Z'),
('qa_l8','clinica-qa','Lucía Romero','34688888888','lucia@mail.com','Peeling','manchas','sin prisa',NULL,65,'warm','client','direct','',1,'2026-05-25T10:00:00.000Z');

-- Etiquetas/recall en algunos
UPDATE leads SET tags='VIP,Recurrente', recall_date='2026-11-16', recall_type='venta' WHERE id='qa_l6';
UPDATE leads SET tags='Recurrente' WHERE id='qa_l8';
UPDATE leads SET call_priority='urgent' WHERE id='qa_l1';

-- Citas repartidas (hoy 2026-06-04, mañana 05, +2 06)
INSERT INTO appointments (id,tenant_id,lead_id,treatment,date_iso,duration_min,status,confirmed,professional_id) VALUES
('qa_a1','clinica-qa','qa_l4','Hidratación facial','2026-06-04T11:00',60,'booked',1,'pro_qa1'),
('qa_a2','clinica-qa','qa_l1','Aumento de labios','2026-06-04T17:00',60,'booked',0,'pro_qa1'),
('qa_a3','clinica-qa','qa_l2','Botox','2026-06-05T12:00',60,'booked',0,'pro_qa2'),
('qa_a4','clinica-qa','qa_l8','Peeling','2026-06-06T10:00',60,'booked',1,'pro_qa2'),
('qa_a5','clinica-qa','qa_l5','Revisión labios','2026-06-04T10:00',30,'attended',1,'pro_qa1');

-- Tratamientos / pagos (caja) hoy
INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost,created_at) VALUES
('qa_t1','clinica-qa','qa_l5','Aumento de labios',380,'paid','2026-06-04T10:30:00.000Z','tarjeta',45,1780600000000),
('qa_t2','clinica-qa','qa_l6','Rinomodelación',480,'paid','2026-06-04T12:00:00.000Z','efectivo',60,1780600000000),
('qa_t3','clinica-qa','qa_l8','Peeling',120,'pending','2026-06-04T13:00:00.000Z',NULL,0,1780600000000),
('qa_t4','clinica-qa','qa_l4','Hidratación facial',90,'paid','2026-06-03T11:00:00.000Z','bizum',10,1780500000000);

-- Bonos
INSERT INTO bonos (id,tenant_id,lead_id,name,total_sessions,used_sessions,amount,status,created_at) VALUES
('qa_b1','clinica-qa','qa_l8','Pack 5 peelings',5,2,400,'active',1780600000000),
('qa_b2','clinica-qa','qa_l6','Bono 3 mantenimientos',3,3,300,'done',1780600000000);

-- Inventario (uno con stock bajo)
INSERT INTO products (id,tenant_id,name,stock,unit,cost,low_alert,created_at) VALUES
('qa_p1','clinica-qa','Ácido hialurónico 1ml',12,'ml',45,3,1780600000000),
('qa_p2','clinica-qa','Toxina botulínica vial',2,'vial',90,3,1780600000000),
('qa_p3','clinica-qa','Crema post-tratamiento',25,'ud',8,5,1780600000000);

-- Pipeline por defecto (deja que use el default)
