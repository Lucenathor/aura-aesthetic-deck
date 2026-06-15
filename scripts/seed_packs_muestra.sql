-- Packs de muestra para clínicas de demostración (portal del cliente)
-- Incluye destacados, etiquetas, taglines y ofertas con fecha límite (cuenta atrás)
-- Se aplica a: glow-madrid, clinica-elvira, clinica-estetica-lumiere

-- Limpia packs previos de estas clínicas (idempotente)
DELETE FROM packs WHERE tenant_id IN ('glow-madrid','clinica-elvira','clinica-estetica-lumiere');

-- ===== GLOW MADRID =====
INSERT INTO packs (id,tenant_id,name,description,sessions,price,original_price,kind,recurring,active,sort_order,tagline,badge,featured,valid_until,created_at) VALUES
('pkg_gm1','glow-madrid','Bono 3 láser facial','3 sesiones de láser de diodo',3,420,540,'bono',0,1,1,'Resultados visibles desde la 1ª sesión','Más vendido',1,date('now','+6 day'),datetime('now')),
('pkg_gm2','glow-madrid','Pack Labios Perfectos','Aumento de labios + retoque a los 30 días',1,360,420,'pack',0,1,2,'Tu sonrisa, realzada con naturalidad','Edición limitada',0,date('now','+10 day'),datetime('now')),
('pkg_gm3','glow-madrid','Club Glow','1 limpieza al mes + 10% en todo + puntos dobles',1,45,0,'membership',1,1,3,'Tu piel cuidada todo el año',NULL,0,NULL,datetime('now')),
('pkg_gm4','glow-madrid','Bono 5 mesoterapias','5 sesiones de mesoterapia facial',5,550,700,'bono',0,1,4,'Piel firme y luminosa',NULL,0,NULL,datetime('now')),
('pkg_gm5','glow-madrid','Tarjeta regalo 100€','Regala belleza a quien quieras',1,100,0,'giftcard',0,1,5,'El regalo que de verdad gusta',NULL,0,NULL,datetime('now'));

-- ===== CLÍNICA ELVIRA =====
INSERT INTO packs (id,tenant_id,name,description,sessions,price,original_price,kind,recurring,active,sort_order,tagline,badge,featured,valid_until,created_at) VALUES
('pke_e1','clinica-elvira','Operación Verano','Pack corporal completo: 4 sesiones',4,580,760,'bono',0,1,1,'Tu mejor versión para el verano','Oferta del mes',1,date('now','+8 day'),datetime('now')),
('pke_e2','clinica-elvira','Bono 3 láser facial','3 sesiones de láser de diodo',3,399,510,'bono',0,1,2,'Adiós al vello, para siempre','-22%',0,date('now','+5 day'),datetime('now')),
('pke_e3','clinica-elvira','Membresía Elvira','1 facial al mes + 10% en tratamientos',1,49,0,'membership',1,1,3,'Cuídate todo el año, sin pensar',NULL,0,NULL,datetime('now')),
('pke_e4','clinica-elvira','Pack Novia','Plan completo pre-boda',1,1150,1450,'pack',0,1,4,'Llega radiante al gran día',NULL,0,NULL,datetime('now')),
('pke_e5','clinica-elvira','Tarjeta regalo 50€','Regala un detalle de belleza',1,50,0,'giftcard',0,1,5,'Sorprende a quien quieras',NULL,0,NULL,datetime('now'));

-- ===== CLÍNICA ESTÉTICA LUMIÈRE =====
INSERT INTO packs (id,tenant_id,name,description,sessions,price,original_price,kind,recurring,active,sort_order,tagline,badge,featured,valid_until,created_at) VALUES
('pkl_l1','clinica-estetica-lumiere','Ritual Lumière','3 limpiezas premium + peeling',3,330,450,'bono',0,1,1,'Piel de revista, luz natural','Más vendido',1,date('now','+7 day'),datetime('now')),
('pkl_l2','clinica-estetica-lumiere','Bono Manchas Cero','4 sesiones contra manchas',4,520,680,'bono',0,1,2,'Repara el daño solar',NULL,0,date('now','+12 day'),datetime('now')),
('pkl_l3','clinica-estetica-lumiere','Club Lumière','Mantenimiento mensual + ventajas VIP',1,55,0,'membership',1,1,3,'Tu rutina premium, siempre lista',NULL,0,NULL,datetime('now')),
('pkl_l4','clinica-estetica-lumiere','Tarjeta regalo 100€','Regala belleza Lumière',1,100,0,'giftcard',0,1,4,'El detalle perfecto',NULL,0,NULL,datetime('now'));
