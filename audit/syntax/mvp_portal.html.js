
const WORKER='https://aura-chat-worker.adrian-7b9.workers.dev';
const params=new URLSearchParams(location.search);
const T=params.get('t')||params.get('clinica')||'';
let LEAD=null, CFG=null, CLINIC='', INFO={}, PACKS=[], PTS=0, EURPER100=10, CAT='all';
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400);}
function eur(n){return (Math.round((n||0)*100)/100).toLocaleString('es-ES')+'€';}
function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

function darken(hex,f){try{hex=hex.replace('#','');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');const n=parseInt(hex,16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;r=Math.round(r*(1-f));g=Math.round(g*(1-f));b=Math.round(b*(1-f));return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}catch(e){return hex;}}

async function loadClinicMeta(){
  try{const d=await (await fetch(WORKER+'/api/portal-info?tenant='+T)).json(); INFO=d||{};
    CLINIC=d.name||'Tu clínica';
    document.getElementById('loginClinic').textContent=CLINIC;
    const brand=d.brand_primary||'#5e1a2a'; const acc=d.brand_accent||'#D4A574';
    document.documentElement.style.setProperty('--brand',brand);
    document.documentElement.style.setProperty('--brand2',darken(brand,.45));
    document.documentElement.style.setProperty('--accent',acc);
    document.querySelector('meta[name=theme-color]').content=brand;
    if(d.logo_url){const ll=document.getElementById('loginLogo');ll.src=d.logo_url;ll.style.display='block';}
  }catch(e){}
  try{const c=await (await fetch(WORKER+'/api/loyalty-config?tenant='+T)).json(); CFG=c.config||c||null;}catch(e){}
}
function renderClinicInfo(){
  const hl=document.getElementById('hLogo'), ht=document.getElementById('hLogoTxt');
  if(INFO.logo_url){hl.src=INFO.logo_url;hl.style.display='block';ht.style.display='none';}
  else{ht.textContent=(CLINIC||'C').trim()[0].toUpperCase();ht.style.display='flex';hl.style.display='none';}
  const addr=[INFO.address,INFO.city].filter(Boolean).join(', ');
  if(addr){document.getElementById('appAddrTxt').textContent=addr;document.getElementById('appAddr').style.display='flex';}
  const box=document.getElementById('clinicInfoBox'); if(!box)return; let h='';
  if(addr){h+='<a href="https://maps.google.com/?q='+encodeURIComponent(addr+' '+CLINIC)+'" target="_blank"><span class="ci-ic">📍</span><span>'+esc(addr)+'</span></a>';}
  const tel=(INFO.whatsapp||'').trim();
  if(tel){h+='<a href="https://wa.me/'+tel.replace('+','').replace(/\s/g,'')+'" target="_blank"><span class="ci-ic">💬</span><span>Escríbenos por WhatsApp</span></a>';h+='<a href="tel:'+tel+'"><span class="ci-ic">📞</span><span>Llamar a la clínica</span></a>';}
  if(INFO.email){h+='<a href="mailto:'+INFO.email+'"><span class="ci-ic">✉️</span><span>'+esc(INFO.email)+'</span></a>';}
  box.innerHTML=h||'<div class="empty" style="padding:.6rem">Tu clínica añadirá sus datos pronto.</div>';
}
async function doLogin(){
  const phone=document.getElementById('phone').value.trim();
  const name=document.getElementById('name').value.trim();
  if(phone.replace(/[^0-9]/g,'').length<9){toast('Pon un móvil válido');return;}
  try{const d=await (await fetch(WORKER+'/api/loyalty-find',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenant_id:T,phone,name})})).json();
    if(!d.ok){toast('No se pudo entrar');return;}
    LEAD=d.lead_id; localStorage.setItem('portal_lead_'+T,LEAD);
    if(d.welcome)toast('🎁 +'+d.welcome+' puntos de bienvenida');
    enterApp();
  }catch(e){toast('Error de conexión');}
}
async function enterApp(){
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('appClinic').textContent=CLINIC;
  renderClinicInfo();
  document.getElementById('bookLink').href='/c/'+T;
  await refreshCard(); await loadPacks(); loadAppts(); loadBonos();
}
async function refreshCard(){
  const d=await (await fetch(WORKER+'/api/loyalty-card?tenant='+T+'&lead='+LEAD)).json();
  CFG=d.config||CFG;
  document.getElementById('uName').textContent=(d.name||'').split(' ')[0]||'';
  PTS=d.points||0; animate('uPts',PTS);
  EURPER100=(CFG&&CFG.eur_per_100pts)||10;
  const wallet=PTS/100*EURPER100;
  document.getElementById('uWallet').textContent=eur(wallet);
  document.getElementById('qaPts').textContent=PTS+' puntos';
  // niveles
  let tier='Bronce',ic='✦',min=0,max=500; if(PTS>=1500){tier='Oro';ic='♛';min=1500;max=3000;}else if(PTS>=500){tier='Plata';ic='✧';min=500;max=1500;}
  document.getElementById('uTier').textContent=ic+' '+tier;
  document.getElementById('uProg').style.width=Math.min(100,((PTS-min)/(max-min)*100))+'%';
  document.getElementById('uNext').textContent=tier==='Oro'?('Eres clienta VIP · disfruta de tus ventajas exclusivas'):('Te faltan '+(max-PTS)+' pts para nivel '+(tier==='Bronce'?'Plata':'Oro'));
  renderRewards();
}
function animate(id,target){const el=document.getElementById(id);let c=0;const s=Math.max(1,Math.ceil(target/30));const iv=setInterval(()=>{c+=s;if(c>=target){c=target;clearInterval(iv);}el.textContent=c;},22);}
function renderRewards(){
  let rw=[];try{rw=CFG&&CFG.rewards?(typeof CFG.rewards==='string'?JSON.parse(CFG.rewards):CFG.rewards):[];}catch(e){}
  if(!rw.length)rw=[{name:'Descuento '+EURPER100+'€',pts:100},{name:'Producto de regalo',pts:250},{name:'Limpieza facial gratis',pts:500}];
  document.getElementById('rewardsList').innerHTML=rw.map(r=>{const ok=PTS>=r.pts;return '<div class="reward"><div class="rl"><b>'+esc(r.name)+'</b><div style="font-size:.76rem;color:var(--muted)">'+r.pts+' puntos</div></div><span class="rbadge '+(ok?'ok':'')+'">'+(ok?'Disponible ✓':'Te faltan '+(r.pts-PTS))+'</span></div>';}).join('');
}
// ===== OFERTAS / PACKS =====
function packKindLabel(p){return p.recurring?'Membresía':p.kind==='giftcard'?'Tarjeta regalo':(p.sessions>1?'Bono':'Pack');}
function daysLeft(p){ if(!p.valid_until)return null; const end=new Date(p.valid_until+'T23:59:59'); const ms=end-new Date(); if(ms<=0)return 0; return Math.ceil(ms/86400000); }
function catOf(p){ if(p.recurring)return 'membresia'; if(p.kind==='giftcard')return 'regalo'; if(p.sessions>1)return 'bono'; return 'pack'; }
async function loadPacks(){
  try{const d=await (await fetch(WORKER+'/api/packs?tenant='+T)).json(); PACKS=d.packs||[];}catch(e){PACKS=[];}
  renderHero(); renderPills(); renderPacks();
}
function renderHero(){
  const box=document.getElementById('homeHero'); if(!box)return;
  // hero = pack destacado o con oferta limitada
  let hero=PACKS.find(p=>p.featured)||PACKS.find(p=>p.valid_until&&daysLeft(p)>0)||PACKS.find(p=>p.original_price>p.price);
  if(!hero){box.innerHTML='';return;}
  const dl=daysLeft(hero);
  const save=hero.original_price>hero.price?(' · ahorras '+eur(hero.original_price-hero.price)):'';
  box.innerHTML='<div class="heroOffer" onclick="openPack(\''+hero.id+'\')">'
    +'<span class="tag">'+(hero.badge||'Oferta destacada')+'</span>'
    +'<h3>'+esc(hero.name)+'</h3>'
    +'<p>'+esc(hero.tagline||hero.description||'Tu tratamiento favorito, a precio de miembra')+save+'</p>'
    +(dl!=null&&dl>0?'<span class="cd">⏳ Solo '+dl+' día'+(dl>1?'s':'')+'</span>':'<span class="cd">Ver oferta →</span>')
    +'</div>';
}
function renderPills(){
  const box=document.getElementById('catPills'); if(!box)return;
  const cats=[['all','Todo'],['pack','Packs'],['bono','Bonos'],['membresia','Membresías'],['regalo','Regalos']];
  const present=new Set(PACKS.map(catOf));
  box.innerHTML=cats.filter(c=>c[0]==='all'||present.has(c[0])).map(c=>'<div class="pill '+(CAT===c[0]?'on':'')+'" onclick="setCat(\''+c[0]+'\')">'+c[1]+'</div>').join('');
}
function setCat(c){CAT=c;renderPills();renderPacks();}
function renderPacks(){
  const box=document.getElementById('packsList');
  let list=PACKS.filter(p=>CAT==='all'||catOf(p)===CAT);
  if(!list.length){box.innerHTML='<div class="empty">Pronto tendrás ofertas disponibles aquí. ✨</div>';return;}
  box.innerHTML=list.map(p=>{
    const off=p.original_price&&p.original_price>p.price;
    const dl=daysLeft(p);
    const ph=(p.name||'·').trim()[0].toUpperCase();
    let ribbons='';
    if(p.featured)ribbons+='<span class="ribbon gold">★ '+(p.badge||'Más popular')+'</span>';
    else if(p.badge)ribbons+='<span class="ribbon">'+esc(p.badge)+'</span>';
    if(off)ribbons+='<span class="ribbon save">-'+Math.round((p.original_price-p.price)/p.original_price*100)+'%</span>';
    if(dl!=null&&dl>0&&dl<=14)ribbons+='<span class="ribbon timer">⏳ '+dl+'d</span>';
    const img=p.image_url?'<img src="'+esc(p.image_url)+'"/>':'<div class="ph">'+ph+'</div>';
    return '<div class="pcard '+(p.featured?'feat':'')+'">'
      +'<div class="pimg">'+img+'<div class="ribbons">'+ribbons+'</div></div>'
      +'<div class="pbody">'
        +'<div class="pnm">'+esc(p.name)+'</div>'
        +(p.tagline?'<div class="ptag">'+esc(p.tagline)+'</div>':'')
        +'<div class="pds">'+esc(p.description||'')+'</div>'
        +'<div class="prow"><b>'+eur(p.price)+'</b>'+(off?'<s>'+eur(p.original_price)+'</s>':'')+(p.recurring?'<span class="per">/mes</span>':'')+'</div>'
        +(p.sessions>1?'<div class="ppm">'+eur(p.price/p.sessions)+' por sesión · '+p.sessions+' sesiones</div>':'')
        +(dl!=null&&dl>0&&dl<=14?'<div class="cdline">⏳ Oferta acaba en '+dl+' día'+(dl>1?'s':'')+'</div>':'')
        +'<button class="pkbtn '+(p.featured?'gold':'')+'" onclick="openPack(\''+p.id+'\')">Lo quiero</button>'
      +'</div></div>';
  }).join('');
}
function openPack(pid){
  const p=PACKS.find(x=>x.id===pid); if(!p)return;
  const off=p.original_price&&p.original_price>p.price;
  const dl=daysLeft(p);
  let benefits=[];
  if(p.sessions>1)benefits.push('<b>'+p.sessions+' sesiones</b> a '+eur(p.price/p.sessions)+' cada una');
  if(off)benefits.push('Ahorras <b>'+eur(p.original_price-p.price)+'</b> frente al precio normal');
  if(p.recurring)benefits.push('Cuota mensual flexible · cancela cuando quieras');
  benefits.push('Reservas ahora y <b>pagas en tu visita</b>');
  benefits.push('Sumas puntos del club con esta compra');
  const pane=document.getElementById('sheetPane');
  pane.innerHTML='<div class="grab"></div>'
    +'<div style="font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--brand)">'+packKindLabel(p)+'</div>'
    +'<h3>'+esc(p.name)+'</h3>'
    +(p.tagline?'<div style="color:var(--brand);font-weight:600;margin-top:.15rem">'+esc(p.tagline)+'</div>':'')
    +'<p style="font-size:.9rem;color:var(--muted);margin-top:.5rem;line-height:1.4">'+esc(p.description||'')+'</p>'
    +'<div class="prow" style="display:flex;align-items:baseline;gap:.5rem;margin-top:.9rem"><b style="font-size:1.9rem;color:var(--brand);font-weight:800">'+eur(p.price)+'</b>'+(off?'<s style="color:var(--muted)">'+eur(p.original_price)+'</s>':'')+(p.recurring?'<span style="color:var(--muted)">/mes</span>':'')+'</div>'
    +(dl!=null&&dl>0?'<div class="cdline">⏳ Esta oferta acaba en '+dl+' día'+(dl>1?'s':'')+'</div>':'')
    +'<div style="margin-top:.9rem">'+benefits.map(b=>'<div class="benefit"><span class="bk">✓</span><span>'+b+'</span></div>').join('')+'</div>'
    +'<button class="pkbtn '+(p.featured?'gold':'')+'" style="margin-top:1.1rem" onclick="buyPack(\''+p.id+'\')">Reservar ahora · pago en clínica</button>'
    +'<div class="secure">🔒 Sin pago online ahora · te lo guardamos para tu visita</div>';
  document.getElementById('sheet').classList.add('on');
}
function closeSheet(){document.getElementById('sheet').classList.remove('on');}
async function buyPack(pid){
  const p=PACKS.find(x=>x.id===pid); if(!p)return;
  try{const d=await (await fetch(WORKER+'/api/pack-buy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenant_id:T,lead_id:LEAD,pack_id:pid})})).json();
    if(d.ok){closeSheet();toast('✨ ¡Reservado! Te esperamos en la clínica.');loadBonos();}else toast('No se pudo reservar');
  }catch(e){toast('Error');}
}
async function loadAppts(){
  const d=await (await fetch(WORKER+'/api/my-appointments?tenant='+T+'&lead='+LEAD)).json();
  const box=document.getElementById('apptsList');
  if(!d.appointments||!d.appointments.length){box.innerHTML='<div class="empty">No tienes citas todavía. ¡Reserva la primera! 💆‍♀️</div>';return;}
  const stx={booked:'Reservada',attended:'Atendida',noshow:'No asististe',cancelled:'Cancelada'};
  box.innerHTML=d.appointments.map(a=>{const dt=new Date(a.date_iso);const f=dt.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})+' · '+dt.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});return '<div class="tile appt"><div><b>'+esc(a.treatment||'Cita')+'</b><div style="font-size:.8rem;color:var(--muted)">'+f+'</div></div><span class="st '+(a.status||'booked')+'">'+(stx[a.status]||a.status)+'</span></div>';}).join('');
}
async function loadBonos(){
  const d=await (await fetch(WORKER+'/api/my-bonos?tenant='+T+'&lead='+LEAD)).json();
  const box=document.getElementById('bonosList');
  if(!d.bonos||!d.bonos.length){box.innerHTML='<div class="empty">Aún no tienes bonos. Compra uno en la tienda y ahorra. 🛍️</div>';return;}
  box.innerHTML=d.bonos.map(b=>{const total=b.total_sessions||0;const used=b.used_sessions||0;const left=total-used;
    let dots='';for(let i=0;i<total;i++){dots+='<div class="dot '+(i<used?'used':'')+'"></div>';}
    return '<div class="tile bono"><div class="bonoTop"><b>'+esc(b.name)+'</b><span style="font-size:.85rem;color:var(--brand);font-weight:800">'+left+' de '+total+'</span></div><div style="font-size:.78rem;color:var(--muted);margin-top:.2rem">'+left+' sesion'+(left===1?'':'es')+' por usar</div><div class="dots">'+dots+'</div></div>';}).join('');
}
async function checkin(){
  try{const d=await (await fetch(WORKER+'/api/loyalty-checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenant_id:T,lead_id:LEAD})})).json();
    if(d.already)toast('Ya sumaste puntos hoy 😊');else if(d.earned)toast('🎉 +'+d.earned+' puntos por venir');
    refreshCard();
  }catch(e){toast('Error');}
}
async function doRefer(){
  const fn=document.getElementById('fName').value.trim();const fp=document.getElementById('fPhone').value.trim();
  if(fp.replace(/[^0-9]/g,'').length<9){toast('Pon el móvil de tu amiga');return;}
  try{const d=await (await fetch(WORKER+'/api/refer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenant_id:T,lead_id:LEAD,friend_name:fn,friend_phone:fp})})).json();
    if(d.already){toast('Esa persona ya es clienta 💜');}
    else if(d.ok){toast('💜 ¡Invitación enviada! Ganarás puntos cuando venga.');document.getElementById('fName').value='';document.getElementById('fPhone').value='';refreshCard();}
  }catch(e){toast('Error');}
}
function go(s){
  ['home','tienda','citas','prem','referir'].forEach(x=>{document.getElementById('s-'+x).classList.toggle('on',x===s);document.getElementById('n-'+x).classList.toggle('on',x===s);});
  window.scrollTo(0,0);
}
(async function init(){
  if(!T){document.getElementById('loginClinic').textContent='Enlace no válido';return;}
  await loadClinicMeta();
  const saved=localStorage.getItem('portal_lead_'+T);
  if(saved){LEAD=saved;enterApp();}
})();
