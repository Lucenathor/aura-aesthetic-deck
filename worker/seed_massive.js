const fs = require('fs');
const now = Date.now();
const DAY = 86400000;
const HOUR = 3600000;

const names = ['María','Laura','Ana','Carmen','Elena','Sara','Paula','Lucía','Marta','Julia','Alba','Noelia','Claudia','Patricia','Silvia','Rosa','Teresa','Beatriz','Nuria','Raquel','Irene','Andrea','Natalia','Sonia','Cristina','Eva','Inés','Marina','Rocío','Alicia'];
const surnames = ['García','Fernández','González','Rodríguez','López','Martínez','Sánchez','Pérez','Gómez','Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez'];
const treatments = ['Aumento de labios','Botox','Láser','Peeling','Hilos tensores','Rinomodelación','Mesoterapia','Limpieza facial'];
const statuses = ['new','chatting','booked','client','lost'];
const temps = ['cold','warm','hot'];
const methods = ['tarjeta','efectivo','bizum','transferencia'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(minDays, maxDays) { return now + (randInt(minDays*24, maxDays*24) * HOUR); }

let sql = `
DELETE FROM leads WHERE tenant_id='clinica-elvira' AND name LIKE 'Demo %';
DELETE FROM appointments WHERE tenant_id='clinica-elvira' AND lead_id IN (SELECT id FROM leads WHERE name LIKE 'Demo %');
DELETE FROM treatments_log WHERE tenant_id='clinica-elvira' AND lead_id IN (SELECT id FROM leads WHERE name LIKE 'Demo %');
DELETE FROM consents_signed WHERE tenant_id='clinica-elvira' AND lead_id IN (SELECT id FROM leads WHERE name LIKE 'Demo %');
`;

// 1. Generar 30 Leads
const leads = [];
for(let i=0; i<30; i++) {
  const id = `l_demo${i}`;
  const name = `Demo ${rand(names)} ${rand(surnames)}`;
  const phone = `34600222${String(i).padStart(3,'0')}`;
  const treatment = rand(treatments);
  const status = rand(statuses);
  const temp = rand(temps);
  const created = randDate(-60, 0);
  let recover = 'null';
  let priority = 'null';
  
  if (status === 'new' && temp === 'hot') priority = "'urgent'";
  if (status === 'booked' && Math.random() > 0.8) { recover = "'noshow'"; priority = "'urgent'"; }
  
  sql += `INSERT INTO leads (id, tenant_id, name, phone, treatment, status, temperature, chatted, wa_opened, created_at, recover_state, call_priority) VALUES ('${id}', 'clinica-elvira', '${name}', '${phone}', '${treatment}', '${status}', '${temp}', 1, 1, ${created}, ${recover}, ${priority});\n`;
  leads.push({id, name, status, created});
}

// 2. Generar 25 Citas
for(let i=0; i<25; i++) {
  const id = `a_demo${i}`;
  const lead = rand(leads);
  const isPast = Math.random() > 0.4;
  const date = isPast ? randDate(-15, -1) : randDate(1, 10);
  const status = isPast ? (Math.random() > 0.2 ? 'confirmed' : 'cancelled') : (Math.random() > 0.5 ? 'confirmed' : 'pending');
  const dateIso = new Date(date).toISOString();
  
  sql += `INSERT INTO appointments (id, tenant_id, lead_id, professional_id, date_iso, status, created_at) VALUES ('${id}', 'clinica-elvira', '${lead.id}', 'pro_1', '${dateIso}', '${status}', ${date - DAY});\n`;
}

// 3. Generar 20 Cobros (algunos hoy, otros pasados)
for(let i=0; i<20; i++) {
  const id = `t_demo${i}`;
  const lead = rand(leads);
  const treatment = rand(treatments);
  const amount = randInt(50, 500);
  const method = rand(methods);
  const cost = Math.floor(amount * 0.15);
  const isToday = Math.random() > 0.5;
  const created = isToday ? randDate(0, 0) - (randInt(1, 10)*HOUR) : randDate(-30, -1);
  
  sql += `INSERT INTO treatments_log (id, tenant_id, lead_id, name, amount, method, cost, created_at) VALUES ('${id}', 'clinica-elvira', '${lead.id}', '${treatment}', ${amount}, '${method}', ${cost}, ${created});\n`;
}

// 4. Generar 15 Consentimientos
for(let i=0; i<15; i++) {
  const id = `cs_demo${i}`;
  const lead = rand(leads);
  const isSigned = Math.random() > 0.3;
  const status = isSigned ? 'signed' : 'pending';
  const signer = isSigned ? `'${lead.name}'` : 'null';
  const dni = isSigned ? `'${randInt(10000000, 99999999)}Z'` : 'null';
  const signedAt = isSigned ? `'${new Date(lead.created + DAY).toISOString()}'` : 'null';
  
  sql += `INSERT INTO consents_signed (id, tenant_id, lead_id, template_id, title, status, signer_name, signer_dni, signed_at, created_at) VALUES ('${id}', 'clinica-elvira', '${lead.id}', 'def_${randInt(0,4)}', 'Consentimiento ${rand(treatments)}', '${status}', ${signer}, ${dni}, ${signedAt}, ${lead.created});\n`;
}

fs.writeFileSync('seed_massive.sql', sql);
