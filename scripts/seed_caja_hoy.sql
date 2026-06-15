DELETE FROM treatments_log WHERE tenant_id='aura-demo' AND id LIKE 'th_%' AND substr(date_iso,1,10)='2026-06-10';
INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('th_0','aura-demo','l_ademo0','Aumento de labios',350,'paid','2026-06-10T10:00:00.000Z','tarjeta',45);
INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('th_1','aura-demo','l_ademo1','Botox (1 zona)',220,'paid','2026-06-10T10:30:00.000Z','bizum',60);
INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('th_2','aura-demo','l_ademo2','Láser facial',180,'paid','2026-06-10T11:00:00.000Z','tarjeta',10);
INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('th_3','aura-demo','l_ademo3','Mesoterapia facial',150,'paid','2026-06-10T11:30:00.000Z','efectivo',10);
INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('th_4','aura-demo','l_ademo4','Peeling químico',120,'paid','2026-06-10T12:30:00.000Z','tarjeta',10);
INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('th_5','aura-demo','l_ademo5','Rinomodelación',450,'paid','2026-06-10T16:00:00.000Z','transferencia',45);
INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('th_6','aura-demo','l_ademo6','Botox (1 zona)',220,'paid','2026-06-10T17:00:00.000Z','tarjeta',60);
INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('th_7','aura-demo','l_ademo7','Aumento de labios',350,'paid','2026-06-10T18:00:00.000Z','bizum',45);
