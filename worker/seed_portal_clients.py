#!/usr/bin/env python3
# Genera SQL para poblar clientes del portal (leads + points_ledger + algunas compras)
# en las clínicas de prueba, para que el panel "Portal cliente" se vea poblado.
import random, datetime

random.seed(42)

NOMBRES = ["Lucía López","Sofía Álvarez","Nuria Serrano","Sara Gómez","Noelia Iglesias",
"Andrea Navarro","Marina Suárez","Inés Herrera","Sandra Cabrera","Eva Ortega","Teresa Cano",
"Daniela Vega","Marta Díaz","Laura Fernández","Beatriz Torres","Raquel Ramos","Elena Moreno",
"Carmen Ruiz","Paula Sánchez","Natalia Romero","Ana Martín","Carla Ramírez","Gloria León",
"Rocío Rubio","Cristina Jiménez","Ángela Prieto","Lola Vidal","Julia Morales","Alba Molina",
"Verónica Cruz","Silvia Castro","Lorena Medina","Clara Ortiz","Pilar Peña","Valeria Ortiz"]

# tenant -> (clave corta única, prefijo de telefono unico, nº de clientes, [(pack_id, pack_name, price)] para alguna compra)
TENANTS = {
  "glow-madrid": ("gm", "620", 22, [("pkg_gm1","Bono 3 láser facial",420),("pkg_gm3","Club Glow",45)]),
  "clinica-elvira": ("el", "621", 20, [("pke_e1","Operación Verano",580),("pke_e3","Membresía Elvira",49)]),
  "clinica-estetica-lumiere": ("lu", "622", 18, [("pkl_l1","Ritual Lumière",330),("pkl_l3","Club Lumière",55)]),
}

REASONS = ["bienvenida","checkin","compra","cumpleaños","referido"]

def iso(daysago):
    d = datetime.datetime.utcnow() - datetime.timedelta(days=daysago, hours=random.randint(0,20))
    return d.strftime("%Y-%m-%dT%H:%M:%S.000Z")

lines = []
for tid,(key,pref,n,packs) in TENANTS.items():
    # limpia datos previos del portal de prueba (solo los que creamos: source='programa-puntos' o 'portal-seed')
    lines.append(f"DELETE FROM points_ledger WHERE tenant_id='{tid}' AND lead_id IN (SELECT id FROM leads WHERE tenant_id='{tid}' AND source='portal-seed');")
    lines.append(f"DELETE FROM pack_orders WHERE tenant_id='{tid}' AND lead_id IN (SELECT id FROM leads WHERE tenant_id='{tid}' AND source='portal-seed');")
    lines.append(f"DELETE FROM leads WHERE tenant_id='{tid}' AND source='portal-seed';")
    nombres = random.sample(NOMBRES, n)
    for i,nm in enumerate(nombres):
        lid = f"ps_{key}_{i:02d}"
        phone = pref + str(1000000 + i*317).zfill(7)[-6:]
        created = iso(random.randint(5,180))
        nm_sql = nm.replace("'","''")
        lines.append(f"INSERT INTO leads (id,tenant_id,name,phone,temperature,status,source,created_at) VALUES ('{lid}','{tid}','{nm_sql}','{phone}','warm','client','portal-seed','{created}');")
        # bienvenida
        lines.append(f"INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES ('pt_{lid}_w','{tid}','{lid}',100,'bienvenida','{created}');")
        # varios movimientos de puntos
        extra = random.randint(1,5)
        for j in range(extra):
            delta = random.choice([25,50,80,120,200])
            reason = random.choice(REASONS)
            lines.append(f"INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES ('pt_{lid}_{j}','{tid}','{lid}',{delta},'{reason}','{iso(random.randint(1,120))}');")
        # ~1 de cada 3 hizo una compra de pack
        if random.random() < 0.35:
            pk = random.choice(packs)
            oid = f"po_{lid}"
            lines.append(f"INSERT INTO pack_orders (id,tenant_id,lead_id,pack_id,pack_name,amount,status,method,created_at) VALUES ('{oid}','{tid}','{lid}','{pk[0]}','{pk[1].replace(chr(39),chr(39)+chr(39))}',{pk[2]},'reserved','portal','{iso(random.randint(1,60))}');")

with open("seed_portal_clients.sql","w") as f:
    f.write("\n".join(lines)+"\n")
print(f"Generadas {len(lines)} sentencias SQL para {len(TENANTS)} clínicas.")
