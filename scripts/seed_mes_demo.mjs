import fs from 'fs';
const TID='aura-demo';
const pad=n=>String(n).padStart(2,'0');
const now=new Date();
const Y=now.getFullYear(), M=now.getMonth();
const todayDay=now.getDate();
function iso(day,h,m){return Y+'-'+pad(M+1)+'-'+pad(day)+'T'+pad(h)+':'+pad(m)+':00.000Z';}
const TR=[['Aumento de labios',350,45],['Botox (1 zona)',220,60],['Láser facial',180,10],['Peeling químico',120,10],['Rinomodelación',450,45],['Mesoterapia facial',150,10],['Hidratación facial',90,8],['Limpieza facial',60,5]];
const METODOS=['tarjeta','tarjeta','bizum','efectivo','transferencia'];
const out=[];
// limpia los cobros mensuales sembrados previos (id 'tm_'), conserva los de hoy 'th_' y los originales
out.push(`DELETE FROM treatments_log WHERE tenant_id='${TID}' AND id LIKE 'tm_%';`);

let id=0, total=0, leadIdx=0;
// repartir cobros del día 1 hasta ayer (no tocamos hoy, ya tiene 2040€)
// volumen realista de clínica con 3 profesionales: ~9-11 tickets/día laborable
for(let day=1; day<todayDay; day++){
  const dow=new Date(Y,M,day).getDay();
  if(dow===0) continue; // domingo cerrado
  const nVentas = dow===6 ? 6 : 11; // sábados menos
  for(let k=0;k<nVentas;k++){
    const tr=TR[(day*3+k)%TR.length];
    const m=METODOS[(day+k)%METODOS.length];
    const lead='l_ademo'+(leadIdx++%55);
    const h=9+(k)%10, min=(k%2)*30;
    out.push(`INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('tm_${id++}','${TID}','${lead}','${tr[0].replace(/'/g,"''")}',${tr[1]},'paid','${iso(day,h,min)}','${m}',${tr[2]});`);
    total+=tr[1];
  }
}
fs.writeFileSync('seed_mes_demo.sql', out.join('\n')+'\n');
console.log('Cobros del mes (sin contar hoy):', id, '| total mes aprox:', total+2040, '€ (incluye 2040 de hoy)');
