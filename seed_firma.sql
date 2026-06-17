-- Clínica de demostración para enseñar el proceso de firma (idempotente)
DELETE FROM legal_acceptances WHERE tenant_id='demo-firma';
DELETE FROM sessions WHERE tenant_id='demo-firma';
DELETE FROM owners WHERE tenant_id='demo-firma';
DELETE FROM tenants WHERE id='demo-firma';

INSERT INTO tenants (id,name,city,owner_name,doctor_name,brand_primary,brand_accent,google_rating,google_reviews,status,plan,sms_credits,created_at,updated_at)
VALUES ('demo-firma','Clínica Demo Firma','Madrid','Sergi','Dra. Demo','#C8745A','#9B7BFF',4.9,128,'active','trial',100,'2026-06-17T08:00','2026-06-17T08:00');

INSERT INTO owners (email,tenant_id,code,code_exp,created_at,role)
VALUES ('firma-demo@aura.com','demo-firma','000000',9999999999999,'2026-06-17 08:00:00','owner');

INSERT INTO sessions (token,email,tenant_id,created_at)
VALUES ('firmademo2026','firma-demo@aura.com','demo-firma',1781000000000);
