-- Pacientes demo para la agenda (idempotente: borra los seed previos)
DELETE FROM appointments WHERE tenant_id='aura-demo' AND id LIKE 'apdemo_%';
DELETE FROM leads WHERE tenant_id='aura-demo' AND id LIKE 'ldemo_%';

INSERT INTO leads (id,tenant_id,name,phone,email,treatment,temperature,status,source,created_at) VALUES
('ldemo_1','aura-demo','Carmen Vidal','+34611223344','carmen@example.com','Aumento de labios','hot','booked','demo','2026-06-17T08:00'),
('ldemo_2','aura-demo','Paula Serrano','+34622334455','paula@example.com','Botox (1 zona)','warm','booked','demo','2026-06-17T08:00'),
('ldemo_3','aura-demo','Nuria Castro','+34633445566','nuria@example.com','Rinomodelación','hot','booked','demo','2026-06-17T08:00'),
('ldemo_4','aura-demo','Elena Prados','+34644556677','elena@example.com','Láser facial','warm','booked','demo','2026-06-17T08:00'),
('ldemo_5','aura-demo','Marta Gil','+34655667788','marta@example.com','Hidratación facial','hot','booked','demo','2026-06-17T08:00'),
('ldemo_6','aura-demo','Sofía Ramos','+34666778899','sofia@example.com','Peeling químico','warm','booked','demo','2026-06-17T08:00'),
('ldemo_7','aura-demo','Lucía Ferrer','+34677889900','luciaf@example.com','Mesoterapia facial','hot','booked','demo','2026-06-17T08:00'),
('ldemo_8','aura-demo','Andrea Soler','+34688990011','andrea@example.com','Aumento de labios','warm','booked','demo','2026-06-17T08:00');

-- Citas de HOY (2026-06-17)
INSERT INTO appointments (id,tenant_id,lead_id,treatment,date_iso,duration_min,status,professional_id,created_at) VALUES
('apdemo_1','aura-demo','ldemo_1','Aumento de labios','2026-06-17T10:00',45,'booked','pro_demo1','2026-06-17T08:00'),
('apdemo_2','aura-demo','ldemo_2','Botox (1 zona)','2026-06-17T11:00',30,'booked','pro_demo1','2026-06-17T08:00'),
('apdemo_3','aura-demo','ldemo_3','Rinomodelación','2026-06-17T12:00',45,'booked','pro_demo2','2026-06-17T08:00'),
('apdemo_4','aura-demo','ldemo_4','Láser facial','2026-06-17T16:00',30,'booked','pro_demo3','2026-06-17T08:00'),
('apdemo_5','aura-demo','ldemo_5','Hidratación facial','2026-06-17T17:30',45,'booked','pro_demo2','2026-06-17T08:00');

-- Citas de MAÑANA (2026-06-18)
INSERT INTO appointments (id,tenant_id,lead_id,treatment,date_iso,duration_min,status,professional_id,created_at) VALUES
('apdemo_6','aura-demo','ldemo_6','Peeling químico','2026-06-18T10:30',30,'booked','pro_demo1','2026-06-17T08:00'),
('apdemo_7','aura-demo','ldemo_7','Mesoterapia facial','2026-06-18T11:30',45,'booked','pro_demo2','2026-06-17T08:00'),
('apdemo_8','aura-demo','ldemo_8','Aumento de labios','2026-06-18T13:00',45,'booked','pro_demo1','2026-06-17T08:00'),
('apdemo_9','aura-demo','ldemo_3','Revisión rinomodelación','2026-06-18T17:00',30,'booked','pro_demo3','2026-06-17T08:00');
