// ===== SISTEMA DE FACTURACIÓN =====
async function loadInvoices(){
  const from=document.getElementById('invFrom')?document.getElementById('invFrom').value:'';
  const to=document.getElementById('invTo')?document.getElementById('invTo').value:'';
  const status=document.getElementById('invStatus')?document.getElementById('invStatus').value:'';
  let url=WORKER+'/api/invoices?tenant='+T;
  if(from)url+='&from='+from;
  if(to)url+='&to='+to;
  if(status)url+='&status='+status;
  try{
    const r=await fetch(url,{headers:{'Authorization':'Bearer '+(localStorage.getItem('aura_token')||'')}});
    const d=await r.json();
    const list=d.invoices||[];
    const tb=document.getElementById('invList');tb.innerHTML='';
    document.getElementById('invEmpty').style.display=list.length?'none':'block';
    // Resumen
    const issued=list.filter(i=>i.status!=='voided');
    const totalBase=issued.reduce((s,i)=>s+(i.tax_base||0),0);
    const totalIva=issued.reduce((s,i)=>s+(i.vat_amount||0),0);
    const totalAmount=issued.reduce((s,i)=>s+(i.total||0),0);
    document.getElementById('invSummary').innerHTML=
      '<div style="background:#f8f6f3;padding:.6rem 1rem;border-radius:10px"><span style="font-size:.72rem;color:var(--muted)">Facturas</span><div style="font-weight:700;font-size:1.1rem">'+list.length+'</div></div>'
      +'<div style="background:#f8f6f3;padding:.6rem 1rem;border-radius:10px"><span style="font-size:.72rem;color:var(--muted)">Base imponible</span><div style="font-weight:700;font-size:1.1rem">'+totalBase.toFixed(2)+'€</div></div>'
      +'<div style="background:#f8f6f3;padding:.6rem 1rem;border-radius:10px"><span style="font-size:.72rem;color:var(--muted)">IVA repercutido</span><div style="font-weight:700;font-size:1.1rem">'+totalIva.toFixed(2)+'€</div></div>'
      +'<div style="background:#e8f5ee;padding:.6rem 1rem;border-radius:10px"><span style="font-size:.72rem;color:var(--muted)">Total facturado</span><div style="font-weight:700;font-size:1.1rem;color:#1f6b4f">'+totalAmount.toFixed(2)+'€</div></div>';
    list.forEach(inv=>{
      const tr=document.createElement('tr');
      const items=typeof inv.items==='string'?JSON.parse(inv.items||'[]'):inv.items||[];
      const concept=items.length?items[0].description:'—';
      const statusBadge={issued:'<span class="tag" style="background:#e3f0ff;color:#2563eb">Emitida</span>',sent:'<span class="tag" style="background:#e8f5ee;color:#1f6b4f">Enviada</span>',paid:'<span class="tag" style="background:#e8f5ee;color:#1f6b4f">Pagada</span>',voided:'<span class="tag" style="background:#f3e8e8;color:#888;text-decoration:line-through">Anulada</span>'}[inv.status]||inv.status;
      const isRect=inv.series==='R';
      tr.innerHTML='<td style="font-family:monospace;font-size:.78rem;'+(isRect?'color:#b0432e':'')+'">'+inv.invoice_number+'</td>'
        +'<td>'+inv.date_issued+'</td>'
        +'<td>'+(inv.lead_name||inv.recipient_name||'—')+'</td>'
        +'<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+concept+(items.length>1?' (+' +(items.length-1)+')':'')+'</td>'
        +'<td>'+inv.tax_base+'€</td>'
        +'<td style="font-size:.78rem">'+inv.vat_amount+'€</td>'
        +'<td><b>'+(inv.total<0?'':'')+inv.total+'€</b></td>'
        +'<td>'+statusBadge+'</td>'
        +'<td style="white-space:nowrap">'
          +(inv.status!=='voided'?'<button class="btn" style="padding:.2rem .4rem;font-size:.68rem" onclick="previewInvoice(\''+inv.id+'\')">👁</button>':'')
          +(inv.status!=='voided'?'<button class="btn" style="padding:.2rem .4rem;font-size:.68rem" onclick="editInvoice(\''+inv.id+'\')">✏️</button>':'')
          +(inv.status==='issued'||inv.status==='paid'?'<button class="btn" style="padding:.2rem .4rem;font-size:.68rem" onclick="sendInvoice(\''+inv.id+'\')">📤</button>':'')
          +(inv.status!=='voided'&&inv.series!=='R'?'<button class="btn" style="padding:.2rem .4rem;font-size:.68rem;color:#b0432e" onclick="voidInvoice(\''+inv.id+'\')">✕</button>':'')
        +'</td>';
      tb.appendChild(tr);
    });
  }catch(e){console.error(e);}
}
function openNewInvoice(){
  const ov=document.createElement('div');ov.id='invOv';ov.style='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:300;display:grid;place-items:center;padding:1rem;overflow-y:auto';
  ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;padding:1.6rem;max-height:90vh;overflow-y:auto"><h3 class="serif" style="margin:0 0 1rem">Nueva factura</h3>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">'
    +'<div><label style="font-size:.75rem;font-weight:600">Tipo</label><select id="nfType" style="width:100%;padding:.5rem;border:1px solid var(--line);border-radius:9px"><option value="simplified">Simplificada (ticket)</option><option value="full">Completa (ordinaria)</option><option value="proforma">Proforma</option></select></div>'
    +'<div><label style="font-size:.75rem;font-weight:600">Fecha</label><input id="nfDate" type="date" value="'+new Date().toISOString().slice(0,10)+'" style="width:100%;padding:.5rem;border:1px solid var(--line);border-radius:9px"/></div>'
    +'</div>'
    +'<div style="margin-top:.8rem"><label style="font-size:.75rem;font-weight:600">Paciente</label><input id="nfPatient" placeholder="Buscar paciente..." style="width:100%;padding:.5rem;border:1px solid var(--line);border-radius:9px" oninput="nfSearchPatient(this.value)"/><div id="nfPatientResults" style="max-height:80px;overflow-y:auto;font-size:.8rem"></div><input type="hidden" id="nfLeadId"/></div>'
    +'<div id="nfRecipientFields" style="display:none;margin-top:.5rem;border:1px solid var(--line);border-radius:9px;padding:.6rem">'
    +'<div style="font-size:.72rem;font-weight:700;margin-bottom:.3rem">Datos fiscales del paciente (factura completa)</div>'
    +'<input id="nfRecNif" placeholder="NIF/DNI del paciente" style="width:100%;padding:.4rem;border:1px solid var(--line);border-radius:6px;margin-bottom:.3rem;font-size:.82rem"/>'
    +'<input id="nfRecAddr" placeholder="Domicilio del paciente" style="width:100%;padding:.4rem;border:1px solid var(--line);border-radius:6px;font-size:.82rem"/></div>'
    +'<div style="margin-top:.8rem"><label style="font-size:.75rem;font-weight:600">Líneas de factura</label><div id="nfItems"></div><button type="button" class="btn" style="font-size:.75rem;margin-top:.3rem" onclick="nfAddLine()">+ Añadir línea</button></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin-top:.8rem">'
    +'<div><label style="font-size:.72rem">Descuento €</label><input id="nfDiscount" type="number" value="0" style="width:100%;padding:.4rem;border:1px solid var(--line);border-radius:6px" oninput="nfCalcTotal()"/></div>'
    +'<div><label style="font-size:.72rem">IVA %</label><input id="nfVat" type="number" value="21" style="width:100%;padding:.4rem;border:1px solid var(--line);border-radius:6px" oninput="nfCalcTotal()"/></div>'
    +'<div><label style="font-size:.72rem">Método pago</label><select id="nfMethod" style="width:100%;padding:.4rem;border:1px solid var(--line);border-radius:6px">'+METODOS.map(m=>'<option value="'+m+'">'+m.charAt(0).toUpperCase()+m.slice(1)+'</option>').join('')+'</select></div>'
    +'</div>'
    +'<div style="display:flex;gap:.5rem;margin-top:.5rem"><div><label style="font-size:.72rem">Profesional</label><select id="nfProf" style="width:100%;padding:.4rem;border:1px solid var(--line);border-radius:6px"><option value="">—</option></select></div>'
    +'<div><label style="font-size:.72rem">Notas</label><input id="nfNotes" placeholder="Notas internas" style="width:100%;padding:.4rem;border:1px solid var(--line);border-radius:6px"/></div></div>'
    +'<div id="nfTotalBox" style="margin-top:.8rem;padding:.6rem;background:#f8f6f3;border-radius:9px;text-align:right"><span style="font-size:.78rem;color:var(--muted)">Base: <b id="nfBase">0</b>€ | IVA: <b id="nfIvaAmt">0</b>€</span><div style="font-size:1.3rem;font-weight:700;color:var(--ink)">Total: <span id="nfTotal">0</span>€</div></div>'
    +'<div style="display:flex;gap:.5rem;margin-top:1rem"><button class="btn prim" style="flex:1" onclick="doCreateInvoice()">Crear factura</button><button class="btn" onclick="document.getElementById(\'invOv\').remove()">Cancelar</button></div>'
    +'<p id="nfMsg" style="font-size:.78rem;margin:.5rem 0 0;text-align:center"></p></div>';
  document.body.appendChild(ov);
  nfAddLine();
  // Mostrar/ocultar campos de factura completa
  document.getElementById('nfType').addEventListener('change',function(){document.getElementById('nfRecipientFields').style.display=this.value==='full'?'block':'none';});
  // Cargar profesionales
  fetch(WORKER+'/api/professionals?tenant='+T).then(r=>r.json()).then(d=>{const sel=document.getElementById('nfProf');(d.professionals||[]).forEach(p=>{const o=document.createElement('option');o.value=p.name;o.textContent=p.name;sel.appendChild(o);});}).catch(()=>{});
}
let _nfLines=[];
function nfAddLine(){
  _nfLines.push({description:'',qty:1,unit_price:0});
  nfRenderLines();
}
function nfRenderLines(){
  const box=document.getElementById('nfItems');
  box.innerHTML=_nfLines.map((l,i)=>'<div style="display:flex;gap:.3rem;margin-bottom:.3rem;align-items:center">'
    +'<input placeholder="Descripción" value="'+(l.description||'').replace(/"/g,'&quot;')+'" oninput="_nfLines['+i+'].description=this.value" style="flex:2;padding:.4rem;border:1px solid var(--line);border-radius:6px;font-size:.82rem"/>'
    +'<input type="number" min="1" value="'+(l.qty||1)+'" oninput="_nfLines['+i+'].qty=+this.value;nfCalcTotal()" style="width:50px;padding:.4rem;border:1px solid var(--line);border-radius:6px;font-size:.82rem" placeholder="Ud"/>'
    +'<input type="number" step="0.01" value="'+(l.unit_price||0)+'" oninput="_nfLines['+i+'].unit_price=+this.value;nfCalcTotal()" style="width:80px;padding:.4rem;border:1px solid var(--line);border-radius:6px;font-size:.82rem" placeholder="€/ud"/>'
    +'<button type="button" class="vac-del" onclick="_nfLines.splice('+i+',1);nfRenderLines();nfCalcTotal()">✕</button></div>').join('');
}
function nfCalcTotal(){
  const sub=_nfLines.reduce((s,l)=>s+(l.qty||1)*(l.unit_price||0),0);
  const dto=+(document.getElementById('nfDiscount')||{}).value||0;
  const base=sub-dto;
  const vat=+(document.getElementById('nfVat')||{}).value||21;
  const ivaAmt=Math.round(base*vat/100*100)/100;
  const total=Math.round((base+ivaAmt)*100)/100;
  const el=id=>document.getElementById(id);
  if(el('nfBase'))el('nfBase').textContent=base.toFixed(2);
  if(el('nfIvaAmt'))el('nfIvaAmt').textContent=ivaAmt.toFixed(2);
  if(el('nfTotal'))el('nfTotal').textContent=total.toFixed(2);
}
let _nfDebounce=null;
function nfSearchPatient(q){
  clearTimeout(_nfDebounce);
  if(!q||q.length<2){document.getElementById('nfPatientResults').innerHTML='';return;}
  _nfDebounce=setTimeout(async()=>{
    try{const r=await fetch(WORKER+'/api/leads?tenant='+T+'&q='+encodeURIComponent(q));const d=await r.json();
      document.getElementById('nfPatientResults').innerHTML=(d.leads||[]).slice(0,5).map(l=>'<div style="padding:.3rem .5rem;cursor:pointer;border-radius:6px;border:1px solid var(--line);margin-bottom:.2rem" onclick="nfSelectPatient(\''+l.id+'\',\''+(l.name||'').replace(/'/g,'')+'\',\''+(l.phone||'')+'\',\''+(l.email||'')+'\')"><b>'+(l.name||'—')+'</b> <span style="color:var(--muted)">'+(l.phone||'')+'</span></div>').join('');
    }catch(e){}
  },300);
}
function nfSelectPatient(id,name,phone,email){
  document.getElementById('nfLeadId').value=id;
  document.getElementById('nfPatient').value=name;
  document.getElementById('nfPatientResults').innerHTML='<span style="color:#1f8c69">✓ '+name+'</span>';
}
async function doCreateInvoice(){
  const msg=document.getElementById('nfMsg');
  if(!_nfLines.length||!_nfLines[0].description){msg.style.color='#b0432e';msg.textContent='Añade al menos una línea';return;}
  msg.style.color='var(--terra)';msg.textContent='Creando factura...';
  const body={
    tenant_id:T,
    lead_id:document.getElementById('nfLeadId').value||null,
    type:document.getElementById('nfType').value,
    date_issued:document.getElementById('nfDate').value,
    items:_nfLines.filter(l=>l.description),
    discount:+(document.getElementById('nfDiscount').value)||0,
    vat_rate:+(document.getElementById('nfVat').value)||21,
    payment_method:document.getElementById('nfMethod').value,
    professional:document.getElementById('nfProf').value,
    notes:document.getElementById('nfNotes').value,
    recipient_name:document.getElementById('nfPatient').value||null,
    recipient_nif:document.getElementById('nfRecNif')?document.getElementById('nfRecNif').value:null,
    recipient_address:document.getElementById('nfRecAddr')?document.getElementById('nfRecAddr').value:null
  };
  try{
    const r=await fetch(WORKER+'/api/invoices',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(localStorage.getItem('aura_token')||'')},body:JSON.stringify(body)});
    const d=await r.json();
    if(d.ok){msg.style.color='#1f8c69';msg.textContent='✓ Factura '+d.invoice_number+' creada ('+d.total+'€)';setTimeout(()=>{document.getElementById('invOv').remove();loadInvoices();},1500);}
    else{msg.style.color='#b0432e';msg.textContent=d.error||'Error';}
  }catch(e){msg.style.color='#b0432e';msg.textContent='Error de conexión';}
}
async function previewInvoice(id){
  try{const r=await fetch(WORKER+'/api/invoice?tenant='+T+'&id='+id,{headers:{'Authorization':'Bearer '+(localStorage.getItem('aura_token')||'')}});const d=await r.json();const inv=d.invoice;
    const items=(inv.items||[]).map(it=>'<tr><td>'+it.description+'</td><td style="text-align:center">'+it.qty+'</td><td style="text-align:right">'+it.unit_price+'€</td><td style="text-align:right">'+((it.qty||1)*(it.unit_price||0)).toFixed(2)+'€</td></tr>').join('');
    const w=window.open('','_blank','width=700,height=900');
    w.document.write('<html><head><title>Factura '+inv.invoice_number+'</title><style>body{font-family:system-ui;padding:2rem;max-width:700px;margin:auto}table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{padding:.4rem .6rem;border-bottom:1px solid #eee;text-align:left;font-size:.88rem}th{background:#f8f6f3;font-size:.75rem;text-transform:uppercase}.header{display:flex;justify-content:space-between;margin-bottom:2rem}.total{text-align:right;font-size:1.3rem;font-weight:700;margin-top:1rem}@media print{button{display:none}}</style></head><body>'
      +'<div class="header"><div><h2 style="margin:0">'+(inv.emitter_name||'Tu clínica')+'</h2><p style="margin:.2rem 0;font-size:.82rem;color:#666">'+(inv.emitter_nif?'NIF: '+inv.emitter_nif+'<br>':'')+(inv.emitter_address||'')+'<br>'+(inv.emitter_phone||'')+' · '+(inv.emitter_email||'')+'</p></div>'
      +'<div style="text-align:right"><h3 style="margin:0;color:'+(inv.series==='R'?'#b0432e':'#2563eb')+'">'+({simplified:'FACTURA SIMPLIFICADA',full:'FACTURA',rectification:'FACTURA RECTIFICATIVA',proforma:'PROFORMA'}[inv.type]||'FACTURA')+'</h3><p style="font-family:monospace;font-size:1.1rem;margin:.2rem 0">'+inv.invoice_number+'</p><p style="font-size:.82rem;color:#666">Fecha: '+inv.date_issued+'</p></div></div>'
      +(inv.recipient_name?'<div style="border:1px solid #eee;padding:.6rem;border-radius:8px;margin-bottom:1rem"><b>'+inv.recipient_name+'</b>'+(inv.recipient_nif?' · NIF: '+inv.recipient_nif:'')+(inv.recipient_address?'<br>'+inv.recipient_address:'')+'</div>':'')
      +(inv.rectifies_invoice?'<div style="background:#fde8e4;padding:.5rem;border-radius:6px;margin-bottom:1rem;font-size:.82rem">Rectifica a: <b>'+inv.rectifies_invoice+'</b>'+(inv.rectification_reason?' — '+inv.rectification_reason:'')+'</div>':'')
      +'<table><thead><tr><th>Descripción</th><th style="text-align:center">Ud.</th><th style="text-align:right">Precio</th><th style="text-align:right">Importe</th></tr></thead><tbody>'+items+'</tbody></table>'
      +'<div style="text-align:right;margin-top:1rem;font-size:.88rem">'
      +(inv.discount>0?'<div>Descuento: -'+inv.discount+'€</div>':'')
      +'<div>Base imponible: <b>'+inv.tax_base+'€</b></div>'
      +'<div>IVA ('+inv.vat_rate+'%): '+inv.vat_amount+'€</div></div>'
      +'<div class="total">TOTAL: '+inv.total+'€</div>'
      +'<div style="margin-top:1.5rem;font-size:.78rem;color:#888">Método de pago: '+(inv.payment_method||'—')+' · Profesional: '+(inv.professional||'—')+'</div>'
      +(inv.notes?'<div style="margin-top:.5rem;font-size:.78rem;color:#888">Notas: '+inv.notes+'</div>':'')
      +'<div style="margin-top:2rem;text-align:center"><button onclick="window.print()" style="padding:.5rem 1.5rem;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.88rem">Imprimir / PDF</button></div>'
      +'</body></html>');
    w.document.close();
  }catch(e){toast('Error al cargar factura','error');}
}
async function editInvoice(id){
  try{const r=await fetch(WORKER+'/api/invoice?tenant='+T+'&id='+id,{headers:{'Authorization':'Bearer '+(localStorage.getItem('aura_token')||'')}});const d=await r.json();const inv=d.invoice;
    // Reutilizar el modal de nueva factura pero con datos precargados
    openNewInvoice();
    setTimeout(()=>{
      document.getElementById('nfType').value=inv.type||'simplified';
      document.getElementById('nfDate').value=inv.date_issued||'';
      document.getElementById('nfPatient').value=inv.recipient_name||inv.lead_name||'';
      document.getElementById('nfLeadId').value=inv.lead_id||'';
      if(inv.recipient_nif){document.getElementById('nfRecNif').value=inv.recipient_nif;document.getElementById('nfRecipientFields').style.display='block';}
      if(inv.recipient_address&&document.getElementById('nfRecAddr'))document.getElementById('nfRecAddr').value=inv.recipient_address;
      _nfLines=inv.items||[];nfRenderLines();
      document.getElementById('nfDiscount').value=inv.discount||0;
      document.getElementById('nfVat').value=inv.vat_rate||21;
      document.getElementById('nfMethod').value=inv.payment_method||'efectivo';
      document.getElementById('nfNotes').value=inv.notes||'';
      nfCalcTotal();
      // Cambiar el botón a "Guardar cambios"
      const btn=document.querySelector('#invOv .btn.prim');
      if(btn){btn.textContent='Guardar cambios';btn.onclick=async function(){
        const msg=document.getElementById('nfMsg');msg.style.color='var(--terra)';msg.textContent='Guardando...';
        const body={id:id,tenant_id:T,type:document.getElementById('nfType').value,items:_nfLines.filter(l=>l.description),discount:+(document.getElementById('nfDiscount').value)||0,vat_rate:+(document.getElementById('nfVat').value)||21,payment_method:document.getElementById('nfMethod').value,professional:document.getElementById('nfProf').value,notes:document.getElementById('nfNotes').value,recipient_name:document.getElementById('nfPatient').value,recipient_nif:document.getElementById('nfRecNif')?document.getElementById('nfRecNif').value:null,recipient_address:document.getElementById('nfRecAddr')?document.getElementById('nfRecAddr').value:null};
        try{const r2=await fetch(WORKER+'/api/invoices',{method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(localStorage.getItem('aura_token')||'')},body:JSON.stringify(body)});const d2=await r2.json();
          if(d2.ok){msg.style.color='#1f8c69';msg.textContent='✓ Factura actualizada';setTimeout(()=>{document.getElementById('invOv').remove();loadInvoices();},1000);}
          else{msg.style.color='#b0432e';msg.textContent=d2.error||'Error';}
        }catch(e){msg.style.color='#b0432e';msg.textContent='Error';}
      };}
    },100);
  }catch(e){toast('Error','error');}
}
async function sendInvoice(id){
  const phone=prompt('Teléfono del paciente (con prefijo +34):');
  if(!phone)return;
  try{const r=await fetch(WORKER+'/api/invoice-send',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(localStorage.getItem('aura_token')||'')},body:JSON.stringify({tenant_id:T,id,phone,via:'sms'})});const d=await r.json();
    if(d.ok){toast('Factura enviada por SMS ✓');loadInvoices();}else{toast(d.error||'Error','error');}
  }catch(e){toast('Error','error');}
}
async function voidInvoice(id){
  const reason=prompt('Motivo de la anulación (obligatorio para generar rectificativa):');
  if(!reason||!reason.trim()){alert('Debes indicar un motivo.');return;}
  try{const r=await fetch(WORKER+'/api/invoice-void',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(localStorage.getItem('aura_token')||'')},body:JSON.stringify({tenant_id:T,id,reason,voided_by:localStorage.getItem('aura_user')||'admin'})});const d=await r.json();
    if(d.ok){toast('Factura anulada. Rectificativa '+d.rectification_number+' generada.');loadInvoices();}else{toast(d.error||'Error','error');}
  }catch(e){toast('Error','error');}
}
async function openFiscalConfig(){
  const ov=document.createElement('div');ov.id='fiscOv';ov.style='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:300;display:grid;place-items:center;padding:1rem';
  ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:1.4rem"><h3 class="serif" style="margin:0 0 .8rem">Datos fiscales de la clínica</h3><p style="font-size:.78rem;color:var(--muted);margin:0 0 .8rem">Estos datos aparecerán como emisor en todas tus facturas.</p>'
    +'<input id="fcName" placeholder="Razón social / Nombre" style="width:100%;padding:.5rem;border:1px solid var(--line);border-radius:9px;margin-bottom:.4rem"/>'
    +'<input id="fcNif" placeholder="NIF / CIF" style="width:100%;padding:.5rem;border:1px solid var(--line);border-radius:9px;margin-bottom:.4rem"/>'
    +'<input id="fcAddr" placeholder="Domicilio fiscal" style="width:100%;padding:.5rem;border:1px solid var(--line);border-radius:9px;margin-bottom:.4rem"/>'
    +'<input id="fcPhone" placeholder="Teléfono" style="width:100%;padding:.5rem;border:1px solid var(--line);border-radius:9px;margin-bottom:.4rem"/>'
    +'<input id="fcEmail" placeholder="Email" style="width:100%;padding:.5rem;border:1px solid var(--line);border-radius:9px;margin-bottom:.4rem"/>'
    +'<input id="fcVat" type="number" placeholder="IVA por defecto (%)" value="21" style="width:100%;padding:.5rem;border:1px solid var(--line);border-radius:9px;margin-bottom:.8rem"/>'
    +'<div style="display:flex;gap:.5rem"><button class="btn prim" style="flex:1" onclick="saveFiscalData()">Guardar</button><button class="btn" onclick="document.getElementById(\'fiscOv\').remove()">Cancelar</button></div>'
    +'<p id="fcMsg" style="font-size:.78rem;margin:.5rem 0 0;text-align:center"></p></div>';
  document.body.appendChild(ov);
  // Cargar datos actuales
  try{const r=await fetch(WORKER+'/api/fiscal-data?tenant='+T,{headers:{'Authorization':'Bearer '+(localStorage.getItem('aura_token')||'')}});const d=await r.json();const f=d.fiscal||{};
    if(f.name)document.getElementById('fcName').value=f.name;
    if(f.nif)document.getElementById('fcNif').value=f.nif;
    if(f.address)document.getElementById('fcAddr').value=f.address;
    if(f.phone)document.getElementById('fcPhone').value=f.phone;
    if(f.email)document.getElementById('fcEmail').value=f.email;
    if(f.vat_rate)document.getElementById('fcVat').value=f.vat_rate;
  }catch(e){}
}
async function saveFiscalData(){
  const msg=document.getElementById('fcMsg');
  const body={tenant_id:T,name:document.getElementById('fcName').value,nif:document.getElementById('fcNif').value,address:document.getElementById('fcAddr').value,phone:document.getElementById('fcPhone').value,email:document.getElementById('fcEmail').value,vat_rate:+(document.getElementById('fcVat').value)||21};
  try{const r=await fetch(WORKER+'/api/fiscal-data',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(localStorage.getItem('aura_token')||'')},body:JSON.stringify(body)});const d=await r.json();
    if(d.ok){msg.style.color='#1f8c69';msg.textContent='✓ Datos fiscales guardados';setTimeout(()=>document.getElementById('fiscOv').remove(),1200);}
    else{msg.style.color='#b0432e';msg.textContent='Error';}
  }catch(e){msg.style.color='#b0432e';msg.textContent='Error de conexión';}
}
