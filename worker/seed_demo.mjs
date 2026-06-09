import fs from 'fs';
const TID='aura-demo';
const esc=s=>String(s).replace(/'/g,"''");
const out=[];
out.push(`DELETE FROM leads WHERE tenant_id='${TID}';`);
out.push(`DELETE FROM appointments WHERE tenant_id='${TID}';`);
out.push(`DELETE FROM treatments_log WHERE tenant_id='${TID}';`);
out.push(`DELETE FROM points_ledger WHERE tenant_id='${TID}';`);
out.push(`DELETE FROM bonos WHERE tenant_id='${TID}';`);

const nombres=['María García','Laura Fernández','Carmen Ruiz','Ana Martín','Lucía López','Paula Sánchez','Sara Gómez','Marta Díaz','Elena Moreno','Cristina Jiménez','Sofía Álvarez','Natalia Romero','Andrea Navarro','Beatriz Torres','Raquel Ramos','Patricia Gil','Nuria Serrano','Silvia Castro','Eva Ortega','Rocío Rubio','Alba Molina','Irene Delgado','Marina Suárez','Clara Ortiz','Daniela Vega','Carla Ramírez','Julia Morales','Valeria Ortiz','Noelia Iglesias','Lorena Medina','Teresa Cano','Ángela Prieto','Verónica Cruz','Miriam Flores','Inés Herrera','Pilar Peña','Sandra Cabrera','Gloria León','Lola Vidal','Rosa Márquez','Diego Pérez','Javier Soto','Carlos Núñez','Pablo Gallego','Sergio Campos','Adrián Ríos','Hugo Vargas','Marcos Reyes','Iván Crespo','Rubén Santos'];
const tratamientos=[['Aumento de labios',350],['Botox (1 zona)',220],['Láser facial',180],['Peeling químico',120],['Rinomodelación',450],['Mesoterapia facial',150]];
const estados=['new','new','whatsapp','booked','booked','attended','client','client','client','lost','noshow'];
const temps=['hot','warm','cold'];
const pros=['pro_ademo1','pro_ademo2'];
const metodos=['efectivo','tarjeta','tarjeta','bizum','transferencia'];
const pad=n=>String(n).padStart(2,'0');
const now=new Date();
function dISO(daysOffset,h,m){const d=new Date(now);d.setDate(d.getDate()+daysOffset);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(h)+':'+pad(m);}
function sqlDate(daysOffset){const d=new Date(now);d.setDate(d.getDate()+daysOffset);return d.toISOString();}

let leads=[];
for(let i=0;i<55;i++){
  const id='l_ademo'+i;
  const name=nombres[i%nombres.length];
  const tr=tratamientos[i%tratamientos.length];
  const st=estados[i%estados.length];
  const temp=temps[i%temps.length];
  const phone='6'+(10000000+i*137).toString().slice(0,8);
  const created=sqlDate(-(i%45)-1);
  const score=40+(i*7)%60;
  let cp='none'; if(st==='whatsapp'&&temp==='hot')cp='urgent';
  let recover=null; if(st==='noshow'){recover='noshow';cp='urgent';}
  const tags = (i%9===0)?'VIP':(i%7===0?'Recurrente':'');
  out.push(`INSERT INTO leads (id,tenant_id,name,phone,treatment,quiz_score,temperature,status,source,created_at,call_priority,recover_state,tags,chatted) VALUES ('${id}','${TID}','${esc(name)}','${phone}','${esc(tr[0])}',${score},'${temp}','${st}','${i%3===0?'embudo':(i%3===1?'instagram':'referido')}','${created}','${cp}',${recover?`'${recover}'`:'NULL'},'${tags}',${st==='new'?0:1});`);
  leads.push({id,name,tr,st});
}

// Citas: hoy (varias), próximos días, y pasadas atendidas
const horasHoy=[[10,0],[10,30],[11,0],[11,30],[12,30],[16,0],[16,30],[17,30],[18,0]];
let ai=0;
horasHoy.forEach((hm,idx)=>{
  const l=leads[idx];const pro=pros[idx%2];
  const status=idx<3?'attended':(idx<6?'booked':'booked');
  const conf=idx%2===0?1:0;
  out.push(`INSERT INTO appointments (id,tenant_id,lead_id,treatment,date_iso,duration_min,status,professional_id,confirmed,created_at) VALUES ('a_ademo${ai++}','${TID}','${l.id}','${esc(l.tr[0])}','${dISO(0,hm[0],hm[1])}',${l.tr[0].includes('Botox')?15:(l.tr[0].includes('ser')||l.tr[0].includes('Rino')?60:30)},'${status}','${pro}',${conf},'${sqlDate(-2)}');`);
});
// próximos 5 días
for(let d=1;d<=6;d++){ if((new Date(now.getTime()+d*864e5)).getDay()%6===0)continue;
  for(let k=0;k<3;k++){const l=leads[(d*3+k)%leads.length];const pro=pros[k%2];const hm=[[10,0],[12,0],[17,0]][k];
    out.push(`INSERT INTO appointments (id,tenant_id,lead_id,treatment,date_iso,duration_min,status,professional_id,confirmed,created_at) VALUES ('a_ademo${ai++}','${TID}','${l.id}','${esc(l.tr[0])}','${dISO(d,hm[0],hm[1])}',30,'booked','${pro}',${k%2},'${sqlDate(-1)}');`);
  }
}

// Cobros (treatments_log) de las últimas 4 semanas + hoy => Caja y Beneficio
let pi=0;
for(let i=0;i<42;i++){
  const l=leads[i%leads.length];const tr=tratamientos[i%tratamientos.length];
  const off = i<8 ? 0 : -(i%28)-1; // 8 cobros hoy, resto repartidos
  const amt=tr[1];const m=metodos[i%metodos.length];const cost=tr[0].includes('labio')||tr[0].includes('Rino')?45:(tr[0].includes('Botox')?60:10);
  out.push(`INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('t_ademo${i}','${TID}','${l.id}','${esc(tr[0])}',${amt},'paid','${sqlDate(off)}','${m}',${cost});`);
  // puntos por compra (1 pt/€)
  out.push(`INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES ('pt_ademo${pi++}','${TID}','${l.id}',${amt},'compra','${sqlDate(off)}');`);
}
// algunos check-in y bienvenida para variar saldos
for(let i=0;i<15;i++){ out.push(`INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES ('pt_ademob${i}','${TID}','${leads[i].id}',100,'bienvenida','${sqlDate(-(i%20)-1)}');`); }

// Bonos
out.push(`INSERT INTO bonos (id,tenant_id,lead_id,name,total_sessions,used_sessions,amount,status,created_at) VALUES ('b_ademo1','${TID}','${leads[6].id}','Pack 5 sesiones láser',5,2,800,'active','${sqlDate(-20)}');`);
out.push(`INSERT INTO bonos (id,tenant_id,lead_id,name,total_sessions,used_sessions,amount,status,created_at) VALUES ('b_ademo2','${TID}','${leads[7].id}','Bono 3 peelings',3,3,330,'done','${sqlDate(-40)}');`);
out.push(`INSERT INTO bonos (id,tenant_id,lead_id,name,total_sessions,used_sessions,amount,status,created_at) VALUES ('b_ademo3','${TID}','${leads[8].id}','Pack 10 mesoterapia',10,4,1200,'active','${sqlDate(-10)}');`);

fs.writeFileSync('seed_ademo.sql', out.join('\n'));
console.log('SQL generado:', out.length, 'sentencias');
