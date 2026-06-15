import fs from 'fs';
const esc = s => String(s).replace(/'/g, "''");
const pad = n => String(n).padStart(2,'0');
const now = new Date();
function dISO(off,h,m){const d=new Date(now);d.setDate(d.getDate()+off);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(h)+':'+pad(m);}
function sqlDate(off){const d=new Date(now);d.setDate(d.getDate()+off);return d.toISOString();}

const NOMBRES=['María García','Laura Fernández','Carmen Ruiz','Ana Martín','Lucía López','Paula Sánchez','Sara Gómez','Marta Díaz','Elena Moreno','Cristina Jiménez','Sofía Álvarez','Natalia Romero','Andrea Navarro','Beatriz Torres','Raquel Ramos','Patricia Gil','Nuria Serrano','Silvia Castro','Eva Ortega','Rocío Rubio','Alba Molina','Irene Delgado','Marina Suárez','Clara Ortiz','Daniela Vega','Carla Ramírez','Julia Morales','Valeria Ortiz','Noelia Iglesias','Lorena Medina'];
const TRATAMIENTOS=[['Aumento de labios',350],['Botox (1 zona)',220],['Láser facial',180],['Peeling químico',120],['Rinomodelación',450],['Mesoterapia facial',150]];
const ESTADOS=['new','new','whatsapp','booked','booked','attended','client','client','client','lost','noshow'];
const TEMPS=['hot','warm','cold'];
const METODOS=['efectivo','tarjeta','tarjeta','bizum','transferencia'];

// clave corta única por clínica (evita colisiones de id/teléfono)
const TENANTS = {
  'clinica-qa2':                       { key:'q2', tel:'630', n:24 },
  'clinica-estetica-premium-barcelona':{ key:'bc', tel:'631', n:28 },
  'clinica-londres':                   { key:'ld', tel:'632', n:20 },
  'clinica-qa':                        { key:'qa', tel:'633', n:18 },
};

const out=[];
for(const [TID,cfg] of Object.entries(TENANTS)){
  const K=cfg.key;
  // limpieza idempotente (solo lo que sembramos)
  out.push(`DELETE FROM points_ledger WHERE tenant_id='${TID}' AND lead_id LIKE 'sc_${K}_%';`);
  out.push(`DELETE FROM treatments_log WHERE tenant_id='${TID}' AND lead_id LIKE 'sc_${K}_%';`);
  out.push(`DELETE FROM appointments WHERE tenant_id='${TID}' AND lead_id LIKE 'sc_${K}_%';`);
  out.push(`DELETE FROM bonos WHERE tenant_id='${TID}' AND lead_id LIKE 'sc_${K}_%';`);
  out.push(`DELETE FROM leads WHERE tenant_id='${TID}' AND source='seed-prueba';`);

  const leads=[];
  for(let i=0;i<cfg.n;i++){
    const id=`sc_${K}_${pad(i)}`;
    const name=NOMBRES[i%NOMBRES.length];
    const tr=TRATAMIENTOS[i%TRATAMIENTOS.length];
    const st=ESTADOS[i%ESTADOS.length];
    const temp=TEMPS[i%TEMPS.length];
    const phone=cfg.tel+String(1000000+i*317).slice(-6);
    const created=sqlDate(-(i%45)-1);
    const score=40+(i*7)%60;
    let cp='none'; if(st==='whatsapp'&&temp==='hot')cp='urgent';
    let recover=null; if(st==='noshow'){recover='noshow';cp='urgent';}
    const tags=(i%9===0)?'VIP':(i%7===0?'Recurrente':'');
    out.push(`INSERT INTO leads (id,tenant_id,name,phone,treatment,quiz_score,temperature,status,source,created_at,call_priority,recover_state,tags,chatted) VALUES ('${id}','${TID}','${esc(name)}','${phone}','${esc(tr[0])}',${score},'${temp}','${st}','seed-prueba','${created}','${cp}',${recover?`'${recover}'`:'NULL'},'${tags}',${st==='new'?0:1});`);
    leads.push({id,tr});
  }
  // citas hoy
  const horasHoy=[[10,0],[10,30],[11,30],[12,30],[16,0],[17,0],[18,0]];
  let ai=0;
  horasHoy.forEach((hm,idx)=>{
    const l=leads[idx%leads.length];
    const status=idx<3?'attended':'booked';
    out.push(`INSERT INTO appointments (id,tenant_id,lead_id,treatment,date_iso,duration_min,status,confirmed,created_at) VALUES ('ap_${K}_${ai++}','${TID}','${l.id}','${esc(l.tr[0])}','${dISO(0,hm[0],hm[1])}',30,'${status}',${idx%2},'${sqlDate(-2)}');`);
  });
  // próximos días
  for(let d=1;d<=5;d++){
    for(let k=0;k<2;k++){
      const l=leads[(d*2+k)%leads.length];const hm=[[11,0],[17,0]][k];
      out.push(`INSERT INTO appointments (id,tenant_id,lead_id,treatment,date_iso,duration_min,status,confirmed,created_at) VALUES ('ap_${K}_${ai++}','${TID}','${l.id}','${esc(l.tr[0])}','${dISO(d,hm[0],hm[1])}',30,'booked',${k%2},'${sqlDate(-1)}');`);
    }
  }
  // cobros (caja + beneficio): algunos hoy, resto repartidos
  let pi=0;
  const nCobros=Math.floor(cfg.n*0.8);
  for(let i=0;i<nCobros;i++){
    const l=leads[i%leads.length];const tr=TRATAMIENTOS[i%TRATAMIENTOS.length];
    const off=i<6?0:-(i%28)-1;
    const amt=tr[1];const m=METODOS[i%METODOS.length];
    const cost=tr[0].includes('labio')||tr[0].includes('Rino')?45:(tr[0].includes('Botox')?60:10);
    out.push(`INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('tl_${K}_${i}','${TID}','${l.id}','${esc(tr[0])}',${amt},'paid','${sqlDate(off)}','${m}',${cost});`);
    out.push(`INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES ('pl_${K}_${pi++}','${TID}','${l.id}',${amt},'compra','${sqlDate(off)}');`);
  }
  // bienvenida para variar saldos
  for(let i=0;i<Math.min(12,cfg.n);i++){
    out.push(`INSERT INTO points_ledger (id,tenant_id,lead_id,delta,reason,created_at) VALUES ('plb_${K}_${i}','${TID}','${leads[i].id}',100,'bienvenida','${sqlDate(-(i%20)-1)}');`);
  }
  // bonos
  out.push(`INSERT INTO bonos (id,tenant_id,lead_id,name,total_sessions,used_sessions,amount,status,created_at) VALUES ('bo_${K}_1','${TID}','${leads[5].id}','Pack 5 sesiones láser',5,2,800,'active','${sqlDate(-20)}');`);
  out.push(`INSERT INTO bonos (id,tenant_id,lead_id,name,total_sessions,used_sessions,amount,status,created_at) VALUES ('bo_${K}_2','${TID}','${leads[8].id}','Pack 10 mesoterapia',10,4,1200,'active','${sqlDate(-10)}');`);
}

fs.writeFileSync('seed_clinicas_prueba.sql', out.join('\n')+'\n');
console.log('SQL generado:', out.length, 'sentencias para', Object.keys(TENANTS).length, 'clínicas');
