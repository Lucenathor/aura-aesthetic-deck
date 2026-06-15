import fs from 'fs';
const TID='aura-demo';
const pad=n=>String(n).padStart(2,'0');
const now=new Date();
const today=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
function isoAt(h,m){return today+'T'+pad(h)+':'+pad(m)+':00.000Z';}
const out=[];
// limpia cobros de hoy previos sembrados (idempotente)
out.push(`DELETE FROM treatments_log WHERE tenant_id='${TID}' AND id LIKE 'th_%' AND substr(date_iso,1,10)='${today}';`);
// 8 ventas de hoy con métodos variados
const ventas=[
  ['l_ademo0','Aumento de labios',350,'tarjeta',45,10,0],
  ['l_ademo1','Botox (1 zona)',220,'bizum',60,10,30],
  ['l_ademo2','Láser facial',180,'tarjeta',10,11,0],
  ['l_ademo3','Mesoterapia facial',150,'efectivo',10,11,30],
  ['l_ademo4','Peeling químico',120,'tarjeta',10,12,30],
  ['l_ademo5','Rinomodelación',450,'transferencia',45,16,0],
  ['l_ademo6','Botox (1 zona)',220,'tarjeta',60,17,0],
  ['l_ademo7','Aumento de labios',350,'bizum',45,18,0],
];
ventas.forEach((v,i)=>{
  out.push(`INSERT INTO treatments_log (id,tenant_id,lead_id,name,amount,pay_status,date_iso,method,cost) VALUES ('th_${i}','${TID}','${v[0]}','${v[1].replace(/'/g,"''")}',${v[2]},'paid','${isoAt(v[5],v[6])}','${v[3]}',${v[4]});`);
});
fs.writeFileSync('seed_caja_hoy.sql', out.join('\n')+'\n');
const total=ventas.reduce((s,v)=>s+v[2],0);
console.log('Ventas hoy:', ventas.length, '| total', total+'€', '| fecha', today);
