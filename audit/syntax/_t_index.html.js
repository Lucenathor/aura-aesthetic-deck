
/* ============ CONFIG (personalizable por clínica) ============ */
function openSalesCall(){ window.open('/activar?t='+TENANT_ID,'_blank'); }
const TENANT_ID = (function(){
  const m = location.pathname.match(/\/c\/([^\/?#]+)/);
  if(m&&m[1]) return decodeURIComponent(m[1]);
  return (new URLSearchParams(location.search).get('tenant'))||'clinica-elvira';
})();
const WORKER='https://aura-chat-worker.adrian-7b9.workers.dev';
const TREATMENT_ID = new URLSearchParams(location.search).get('t') || 'labios';
let CFG={ name:'Clínica Elvira', advisor:'Adrián', doctor:'la Dra. Elvira', price:380, whatsapp:'34600000000', treatment:'Aumento de labios' };
/* ============ META PIXEL ============ */
function initMetaPixel(pixelId){
  if(!pixelId||window.fbq)return;
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', pixelId);
  fbq('track', 'PageView');
  // ViewContent al cargar el embudo
  fbq('track', 'ViewContent', {content_name: CFG.treatment, content_category: 'clinica_estetica', value: CFG.price, currency: 'EUR'});
}
function pixelTrack(event, params){
  if(window.fbq) fbq('track', event, params||{});
}
function trackFunnelEvent(event, extra){
  try{ fetch(WORKER+'/api/funnel-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenant_id:TENANT_ID,treatment:TREATMENT_ID,event:event,lead_id:state.lead_id||null,ref:state.ref,...(extra||{})})}); }catch(e){}
}
// Track pageview on load
setTimeout(()=>{ trackFunnelEvent('pageview'); },500);
function genRef(){ const s='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r=''; for(let i=0;i<5;i++)r+=s[Math.floor(Math.random()*s.length)]; return 'AURA-'+r; }
const state={ name:'', phone:'', a:{}, lead_id:null, ref:genRef() };

/* ============ LINK MÁGICO: reanudar conversación guardada ============ */
(async function resumeIfMagic(){
  const qs=new URLSearchParams(location.search); const lead=qs.get('lead'); const k=qs.get('k');
  if(!lead||!k) return;
  state._bookMode = qs.get('book')==='1';
  try{
    const r=await fetch(WORKER+'/api/resume?lead='+encodeURIComponent(lead)+'&k='+encodeURIComponent(k));
    const d=await r.json();
    if(!d.ok) return;
    state.lead_id=lead; if(d.lead){ state.name=d.lead.name||''; state.phone=d.lead.phone||''; }
    state._resumed=true; state._history=d.messages||[];
    // comprobar si tiene cita para mostrar confirmación
    try{ const ar=await fetch(WORKER+'/api/appt-status?lead='+encodeURIComponent(lead)+'&k='+encodeURIComponent(k)); const ad=await ar.json(); if(ad.ok&&ad.appointment&&ad.appointment.status==='booked'){ state._appt=ad.appointment; state._apptKey=k; } }catch(e){}
    // esperar a que existan las funciones del embudo y saltar directo al chat (poll robusto)
    let _tries=0;
    const _tryGo=function(){ _tries++; if(typeof go==='function' && typeof startChat==='function'){ go('vChat'); startChat(); } else if(_tries<60){ setTimeout(_tryGo,100); } };
    setTimeout(_tryGo, 200);
  }catch(e){}
})();

/* ============ QUIZ DE LABIOS ============ */
const QUIZ=[
  { k:'objetivo', q:'¿Qué te gustaría conseguir?', help:'Elige lo que más se acerque a tu idea.',
    opts:[
      {em:'💧',t:'Más hidratación y jugosidad'},
      {em:'✨',t:'Un poco más de volumen, natural'},
      {em:'💋',t:'Definir mejor el contorno'},
      {em:'⚖️',t:'Corregir asimetría'},
    ]},
  { k:'datos', form:true, q:'Tu plan de labios, gratis', help:'Te decimos qué técnica te va mejor y el precio exacto, antes de pisar la clínica.' },
  { k:'estilo', q:'¿Cómo los quieres?', help:'Tranquila, trabajamos siempre resultados naturales.',
    opts:[
      {em:'🌿',t:'Muy naturales, que no se note'},
      {em:'💄',t:'Con un toque más marcado'},
      {em:'🤔',t:'No lo tengo claro aún'},
    ]},
  { k:'plazo', q:'¿Para cuándo te gustaría?', help:'Así te damos prioridad de agenda.',
    opts:[
      {em:'🔥',t:'Lo antes posible'},
      {em:'📅',t:'Tengo un evento próximo'},
      {em:'🗓️',t:'En las próximas semanas'},
      {em:'👀',t:'Solo me estoy informando'},
    ]},
  { k:'duda', q:'¿Cuál es tu mayor duda?', help:'La doctora te la resolverá en la valoración.',
    opts:[
      {em:'😬',t:'Que se note artificial'},
      {em:'💉',t:'Que duela'},
      {em:'💶',t:'El precio'},
      {em:'🙂',t:'Ninguna, lo tengo claro'},
    ]},
];

/* ============ preguntas editables del content ============ */
function applyQuizContent(){
  try{ const cq=window.CONTENT_QUIZ||{}; const map=['q1','q2','q3','q4','q5'];
    // q1->objetivo(idx0), q2 es datos(form, idx1 no se toca), q3->estilo(idx2), q4->plazo(idx3), q5->duda(idx4)
    const idxByQ={q1:0,q3:2,q4:3,q5:4};
    Object.keys(idxByQ).forEach(k=>{ const c=cq[k]; const i=idxByQ[k]; if(c&&QUIZ[i]){ if(c.pregunta)QUIZ[i].q=c.pregunta; if(c.opciones&&c.opciones.length)QUIZ[i].opts=c.opciones.map(t=>({em:'',t})); } });
  }catch(e){}
}
/* ============ preview: navegar pantallas desde el editor ============ */
window.addEventListener('message',function(ev){ try{ const d=ev.data||{}; if(d.aura==='goto'){ if(d.screen==='hero')go('vHero'); else if(d.screen==='quiz'){go('vQuiz');startQuiz();} else if(d.screen==='result')go('vResult'); else if(d.screen==='chat')go('vChat'); } }catch(e){} });
/* ============ NAV ============ */
function go(id){ document.querySelectorAll('.view').forEach(v=>v.classList.remove('on')); var el=document.getElementById(id); if(el)el.classList.add('on'); window.scrollTo(0,0); }
let qi=0;

function quizBack(){ if(qi===0){ go('vHero'); return;} qi--; renderQ(); }
function renderQ(){
  const Q=QUIZ[qi];
  document.getElementById('qBar').style.width=((qi+1)/QUIZ.length*100)+'%';
  document.getElementById('qCount').textContent=(qi+1)+'/'+QUIZ.length;
  const body=document.getElementById('qBody');
  if(Q.form){
    body.innerHTML=`
      <div class="qq">${Q.q}</div>
      <p class="qhelp">${Q.help}</p>
      <div class="qfield"><label>Tu nombre</label><input class="qinput" id="fName" placeholder="Marta" autocomplete="given-name"/></div>
      <div class="qfield"><label>Tu móvil</label><input class="qinput" id="fPhone" type="tel" inputmode="tel" placeholder="600 00 00 00" autocomplete="tel"/></div>
      <button class="qsubmit" id="fSubmit" onclick="submitData()">Continuar
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
      <div class="recip"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7S9 2 6 4s2 3 6 3M12 7s3-5 6-3-2 3-6 3"/></svg> Verás cómo quedarían tus labios + cuánto costaría (te gustará 😏)</div>
      <p class="priv"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Datos cifrados · 100% confidencial · sin spam</p>`;
    const n=document.getElementById('fName'),p=document.getElementById('fPhone'),s=document.getElementById('fSubmit');
    function chk(){ s.classList.toggle('ready', n.value.trim().length>1 && p.value.replace(/\D/g,'').length>=9); }
    n.oninput=chk; p.oninput=chk;
    return;
  }
  body.innerHTML=`
    <div class="qq">${Q.q}</div>
    <p class="qhelp">${Q.help}</p>
    <div class="qopts">${Q.opts.map((o,i)=>`<button class="qopt" onclick="pick('${Q.k}','${o.t.replace(/'/g,"")}',this)"><span class="em">${o.em}</span>${o.t}<span class="rb"></span></button>`).join('')}</div>`;
}
function pick(k,val,el){
  state.a[k]=val;
  el.parentNode.querySelectorAll('.qopt').forEach(x=>x.classList.remove('sel'));
  el.classList.add('sel');
  const body=document.getElementById('qBody');
  const hide=document.querySelector('.qtop');
  const isLast = qi >= QUIZ.length-1;
  setTimeout(()=>{ body.innerHTML=nurture(k,val); const dwell=nurtureTime(k);
    setTimeout(()=>{ if(isLast){ finishQuiz(); } else { qi++; renderQ(); } }, dwell);
  }, 300);
}
function submitData(){
  state.name=document.getElementById('fName').value.trim();
  state.phone=document.getElementById('fPhone').value.trim().replace(/\s/g,'');
  persistLead();
  // Meta Pixel: Lead event con Advanced Matching
  pixelTrack('Lead', {value: CFG.price, currency: 'EUR', content_name: CFG.treatment});
  if(window.fbq){ try{ fbq('init', window._auraPixelId, {ph: state.phone.replace(/[^0-9]/g,'')}); }catch(e){} }
  // Track lead event
  trackFunnelEvent('lead');
  qi++; renderQ();
}
function nurtureTime(k){ return k==='objetivo'?6800 : 5400; }
function nurture(k,val){
  // P1 objetivo -> galería de labios de clientas, rotadas, progresivas
  if(k==='objetivo'){
    const lips=['lips1','lips2','lips3','lips4'];
    const rots=[-6,4,-3,7];
    const cards=lips.map((l,i)=>`<div class="gl-card" style="--r:${rots[i]}deg;--gd:${.25+i*.5}s;background-image:url('/assets/${l}.webp')"></div>`).join('');
    return `<div class="nrt"><div class="nrt-h">Mira los labios de nuestras pacientes</div><div class="gl">${cards}</div><div class="nrt-sub">Resultados naturales · todas en una sola sesión</div></div>`;
  }
  // estilo -> review de paciente similar (prueba social)
  if(k==='estilo'){
    return `<div class="nrt"><div class="nrt-rev"><div class="nrt-rev-h"><i style="background-image:url('/assets/rev1.webp')"></i><div><b>Laura M.</b><span class="nrt-stars">★★★★★</span></div></div><p>“Yo también los quería naturales y quedé encantada, nadie nota que me los hice.”</p></div><div class="nrt-tag">+1.200 pacientes han elegido lo mismo</div></div>`;
  }
  // plazo -> escasez honesta + foto de la clínica (familiaridad / lugar real)
  if(k==='plazo'){
    return `<div class="nrt"><div class="nrt-clinic" style="background-image:url('/assets/clinica-quiz.webp')"><span class="nrt-clinic-tag">Velázquez 84 · Madrid</span></div><p class="nrt-big">Estamos en <b>Velázquez 84</b>, Madrid</p><div class="nrt-sub">Aquí es donde te atendería la doctora</div></div>`;
  }
  // duda -> objeción resuelta + autoridad
  if(k==='duda'){
    const map={
      'Que se note artificial':'La doctora trabaja microcantidades. El 94% dice que <b>nadie nota</b> que se los hizo.',
      'Que duela':'Usamos anestesia y cánula. La mayoría lo describe como <b>una molestia mínima</b>.',
      'El precio':'Te damos el <b>plan y el precio claro</b> en la valoración, sin sorpresas ni compromiso.',
      'Ninguna, lo tengo claro':'Genial. La doctora te abrirá hueco esta misma semana.'
    };
    const txt=map[val]||'La doctora te lo resuelve en la valoración, sin compromiso.';
    return `<div class="nrt"><div class="nrt-doc"><div class="nrt-doc-pic" style="background-image:url('/assets/doctora-quiz.webp')"></div></div><p class="nrt-big">${txt}</p><div class="nrt-sub">— Dra. Elvira, tu médico estético</div></div>`;
  }
  return `<div class="nrt"><p class="nrt-big">Perfecto</p></div>`;
}
function finishQuiz(){
  buildResult();
  // Actualizar el lead con las respuestas completas del quiz
  updateLeadAnswers();
  // pantalla analizando que nutre el valor percibido
  go('vQuiz');
  const body=document.getElementById('qBody');
  document.querySelector('.qtop').style.visibility='hidden';
  body.innerHTML=`<div class="analyzing">
    <div class="an-ring">
      <svg viewBox="0 0 120 120"><circle class="an-bg" cx="60" cy="60" r="52"/><circle class="an-fg" id="anFg" cx="60" cy="60" r="52"/></svg>
      <div class="an-pct" id="anPct">0%</div>
    </div>
    <div class="an-t">Analizando tu perfil…</div>
    <div class="an-steps">
      <div class="an-step" id="as0"><i></i><span>Cruzando con +1.200 casos reales</span></div>
      <div class="an-step" id="as1"><i></i><span>Calculando tu resultado ideal</span></div>
      <div class="an-step" id="as2"><i></i><span>Preparando tu plan personalizado</span></div>
    </div>
  </div>`;
  const fg=document.getElementById('anFg'), pct=document.getElementById('anPct');
  const C=2*Math.PI*52; fg.style.strokeDasharray=C; fg.style.strokeDashoffset=C;
  const t0=performance.now(), DUR=4800;
  function frame(t){ let p=Math.min((t-t0)/DUR,1); const e=1-Math.pow(1-p,2.2); fg.style.strokeDashoffset=C*(1-e); pct.textContent=Math.round(e*100)+'%';
    if(p>=.30)document.getElementById('as0')?.classList.add('done');
    if(p>=.62)document.getElementById('as1')?.classList.add('done');
    if(p>=.95)document.getElementById('as2')?.classList.add('done');
    if(p<1)requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  setTimeout(()=>{ document.querySelector('.qtop').style.visibility='visible'; go('vRes'); }, 5200);
}

/* ============ RESULT ============ */
function buildResult(){
  document.getElementById('resH').innerHTML=`${state.name||'Hola'}, este es <em>tu resultado ideal</em>`;
  const est=state.a.estilo||'';
  let name='Aumento de labios técnica glow', desc='Ácido hialurónico de última generación con técnica glow: volumen sutil e hidratación. Resultado natural, nada exagerado.';
  if((state.a.objetivo||'').includes('hidrat')){ name='Hidratación profunda de labios'; desc='Skinbooster específico para labios: jugosidad e hidratación sin apenas volumen. Ideal si buscas un efecto muy sutil.'; }
  if((state.a.objetivo||'').includes('contorno')){ name='Perfilado y definición de labios'; desc='Definimos el contorno y el arco de cupido con microcantidades. Resultado armónico y natural.'; }
  document.getElementById('resName').textContent=name;
  document.getElementById('resDesc').textContent=desc;
  document.getElementById('mPrice').textContent=CFG.price+'€';
}

/* ============ TENANT LOAD ============ */
(async function load(){
  try{
    const r=await fetch(WORKER+'/api/tenant/'+TENANT_ID);
    if(r.ok){ const d=await r.json(); const t=d.tenant||d;
      if(t.name){ CFG.name=t.name; document.getElementById('bName').textContent=t.name; document.getElementById('cName').textContent=(t.advisor_name||'Adrián')+' · '+t.name; }
      if(t.doctor_name) CFG.doctor='la '+t.doctor_name;
      if(t.whatsapp) CFG.whatsapp=t.whatsapp;
      if(t.advisor_name) CFG.advisor=t.advisor_name;
      // colores de marca reales
      if(t.brand_primary){ document.documentElement.style.setProperty('--terra', t.brand_primary); }
      if(t.brand_accent){ document.documentElement.style.setProperty('--champ', t.brand_accent); }
      // Meta Pixel: inicializar si el tenant tiene pixel configurado
      if(t.meta_pixel_id){ window._auraPixelId=t.meta_pixel_id; initMetaPixel(t.meta_pixel_id); }
      // imágenes generadas reales (hero, sala, asesor)
      if(t.hero_image_url){ document.querySelectorAll('[data-img="hero"]').forEach(el=>{ if(el.tagName==='IMG')el.src=t.hero_image_url; else el.style.backgroundImage='url('+t.hero_image_url+')'; }); }
      if(t.doctor_image_url){ document.querySelectorAll('[data-img="doctor"]').forEach(el=>{ if(el.tagName==='IMG')el.src=t.doctor_image_url; }); }
      if(t.room_image_url){ document.querySelectorAll('[data-img="room"]').forEach(el=>{ if(el.tagName==='IMG')el.src=t.room_image_url; }); }
      // reseñas personalizadas con el nombre de la clínica + nº dinámico
      try{
        const cl = t.name || 'la clínica';
        const nrev = t.google_reviews || 312;
        const gsub = document.querySelector('.gc-sub'); if(gsub) gsub.innerHTML='Excelente · <u>'+nrev+' reseñas en Google</u>';
        const gname = document.querySelector('.gc-name, .gcard b'); if(gname) gname.textContent=cl;
        const revs = document.querySelectorAll('.rev p');
        if(revs[0]) revs[0].innerHTML='“Fui a '+cl+' con miedo de que se notara artificial y es justo lo contrario. Naturales, me encantan.”';
        if(revs[1]) revs[1].innerHTML='“En '+cl+' me respondieron en 2 minutos por WhatsApp y reservé al momento. Trato exquisito.”';
      }catch(e){}
      // modo demo: mostrar badge de activación si el tenant no ha pagado
      if(t.status==='demo' || t.plan==='trial'){
        window.DEMO_SALES = true;
        window.DEMO_CLINIC_NAME = t.name || 'tu clínica';
        const badge=document.getElementById('demoBadge');
        if(badge){ badge.style.display='flex'; document.getElementById('demoBadgeName').textContent=t.name||'tu clínica'; document.body.style.paddingTop='2.4rem'; }
      }
    }
    // CONTENIDO editable (textos/quiz/imágenes) — solo contenido, nunca estructura
    try{
      const cr=await fetch(WORKER+'/api/content?tenant='+TENANT_ID+'&treatment='+TREATMENT_ID); const cd=await cr.json(); const c=cd.content||{};
      const setTxt=(sel,v)=>{ if(v==null)return; document.querySelectorAll(sel).forEach(el=>el.innerHTML=v); };
      if(c.hero_title) setTxt('[data-c="hero_title"]', c.hero_title);
      if(c.hero_sub) setTxt('[data-c="hero_sub"]', c.hero_sub);
      if(c.cta) setTxt('[data-c="cta"]', c.cta);
      if(c.lead_magnet) setTxt('[data-c="lead_magnet"]', c.lead_magnet);
      if(c.img_before){ document.querySelectorAll('[data-img="before"]').forEach(el=>{ if(el.tagName==='IMG')el.src=c.img_before; }); }
      if(c.img_after){ document.querySelectorAll('[data-img="after"]').forEach(el=>{ if(el.tagName==='IMG')el.src=c.img_after; }); }
      // preguntas del quiz editables: c.q1..c.q5 = {pregunta, opciones:[]}
      window.CONTENT_QUIZ = {};
      ['q1','q2','q3','q4','q5'].forEach(k=>{ if(c[k]) window.CONTENT_QUIZ[k]=c[k]; });
      if(c.advisor_name) CFG.advisor=c.advisor_name;
      if(c.clinic_name){ CFG.name=c.clinic_name; document.getElementById('bName').textContent=c.clinic_name; }
      if(c.treatment_name) CFG.treatment=c.treatment_name;
      if(c.price) CFG.price=parseInt(c.price)||CFG.price;
    }catch(e){}
  }catch(e){}
})();

/* ============ PERSIST ============ */
async function persistLead(){
  try{
    // Mapear respuestas del quiz a campos del backend
    const a=state.a||{};
    const motivo=a.objetivo||null;
    const plazo=a.plazo||null;
    const objecion=a.duda||null;
    // Calcular score (0-100) basado en respuestas
    let score=30; // base por completar el quiz
    if(plazo==='Lo antes posible') score+=40;
    else if(plazo==='Tengo un evento próximo') score+=30;
    else if(plazo==='En las próximas semanas') score+=15;
    if(objecion==='Ninguna, lo tengo claro') score+=30;
    else if(objecion==='El precio') score+=10;
    else if(objecion==='Que duela') score+=15;
    else if(objecion==='Que se note artificial') score+=15;
    // Temperatura basada en score
    let temperature='cold';
    if(score>=70) temperature='hot';
    else if(score>=45) temperature='warm';
    const r=await fetch(WORKER+'/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tenant_id:TENANT_ID,name:state.name,phone:state.phone,treatment:CFG.treatment,motivo,plazo,objecion,quiz_score:score,temperature,source:'embudo_'+TREATMENT_ID,ref:state.ref})});
    if(r.ok){ const d=await r.json(); state.lead_id=d.lead_id||d.id||null; }
  }catch(e){}
}
async function updateLeadAnswers(){
  if(!state.lead_id) return;
  try{
    const a=state.a||{};
    const motivo=a.objetivo||null;
    const plazo=a.plazo||null;
    const objecion=a.duda||null;
    let score=30;
    if(plazo==='Lo antes posible') score+=40;
    else if(plazo==='Tengo un evento próximo') score+=30;
    else if(plazo==='En las próximas semanas') score+=15;
    if(objecion==='Ninguna, lo tengo claro') score+=30;
    else if(objecion==='El precio') score+=10;
    else if(objecion==='Que duela') score+=15;
    else if(objecion==='Que se note artificial') score+=15;
    let temperature='cold';
    if(score>=70) temperature='hot';
    else if(score>=45) temperature='warm';
    await fetch(WORKER+'/api/lead-quiz-update',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({lead_id:state.lead_id,motivo,plazo,objecion,quiz_score:score,temperature})});
  }catch(e){}
}
async function persistMsg(role,content){
  try{ await fetch(WORKER+'/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({tenant_id:TENANT_ID,lead_id:state.lead_id,role,content,channel:'chat_web'})}); }catch(e){}
}

/* ============ CHAT ============ */
const cBody=()=>document.getElementById('cBody');
function nowT(){ const d=new Date(); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); }
function addThem(html,save){ const b=document.createElement('div'); b.className='b them'; b.innerHTML=html+`<div class="tm">${nowT()}</div>`; cBody().appendChild(b); scroll(); if(save) persistMsg('assistant',html.replace(/<[^>]+>/g,'')); }
function addMe(txt){ const b=document.createElement('div'); b.className='b me'; b.innerHTML=txt+`<div class="tm">${nowT()} ✓✓</div>`; cBody().appendChild(b); scroll(); persistMsg('user',txt); }
function addRaw(html){ const d=document.createElement('div'); d.innerHTML=html; cBody().appendChild(d.firstElementChild); scroll(); }
function scroll(){ const c=cBody(); requestAnimationFrame(()=>{ c.scrollTop=c.scrollHeight; setTimeout(()=>{c.scrollTop=c.scrollHeight;},60); }); }
function typing(){ const b=document.createElement('div'); b.className='b typing'; b.id='typing'; b.innerHTML='<span></span><span></span><span></span>'; cBody().appendChild(b); scroll(); }
function unType(){ const t=document.getElementById('typing'); if(t)t.remove(); }
const wait=ms=>new Promise(r=>setTimeout(r,ms));

let chatStarted=false;
async function startChat(){
  if(chatStarted) return; chatStarted=true;
  // ── modo reserva (link de recall): directo al calendario de revisión ──
  if(state._resumed && state._bookMode){
    await wait(300); typing(); await wait(900); unType();
    addThem(`hola ${state.name? state.name.toLowerCase().split(' ')[0]:''}, me alegra que quieras mantener tu resultado`.trim(),true);
    await wait(700); typing(); await wait(900); unType();
    addThem('te dejo los huecos para tu revisión. elige el que mejor te venga',true);
    await wait(500); showCal(); await wait(300); showFixedCta();
    return;
  }
  // ── reanudación por link mágico: pintar historial guardado ──
  if(state._resumed && state._history && state._history.length){
    state._history.forEach(m=>{
      if(m.channel==='sms') return;
      if(m.role==='assistant') addThem((m.content||'').replace(/\n/g,'<br>'),false);
      else if(m.role==='user'){ const b=document.createElement('div'); b.className='b me'; b.innerHTML=(m.content||'')+`<div class="tm">✓✓</div>`; cBody().appendChild(b); scroll(); }
    });
    await wait(400); typing(); await wait(900); unType();
    if(state._appt){
      const dt=new Date(state._appt.date_iso); const f=dt.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'}); const h=dt.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
      addThem(`hola otra vez ${state.name? state.name.toLowerCase():''}, tu cita es el ${f} a las ${h}`.trim(),true);
      await wait(500); showApptConfirm(f,h);
    } else {
      addThem(`hola otra vez ${state.name? state.name.toLowerCase():''}, seguimos donde lo dejamos. ¿te abro hueco para tu valoración?`.trim(),true);
      await wait(500); showCal(); await wait(400); showFixedCta();
    }
    return;
  }
  await wait(500); typing(); await wait(1300); unType();
  addThem(`hola ${state.name? state.name.toLowerCase():''}, soy adrián de ${CFG.name.toLowerCase()}`.trim(),true);
  await wait(700); typing(); await wait(1100); unType();
  addThem('he visto tus respuestas, tienes muy buen caso para labios glow',true);
  await wait(700); typing(); await wait(900); unType();
  addThem('te dejo un audio de 15s y, si lo tienes claro, te abro hueco ya mismo',true);
  await wait(500);
  // audio opcional, NO bloquea
  addRaw(`<div class="b-audio" id="aBub" onclick="playAud()"><div class="pl"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div><div class="wv">${Array(18).fill('<i></i>').join('')}</div><span style="font-size:.7rem;color:#8696a0">0:15</span></div>`);
  scroll();
  await wait(700); typing(); await wait(1100); unType();
  addThem('si ahora no puedes escucharlo no pasa nada, te lo resumo: muy buen caso para labios glow y la valoración es gratis. lo importante es que cojas hueco y lo vemos en persona',true);
  // calendario inmediato
  await wait(600);
  showCal();
  await wait(500); typing(); await wait(800); unType();
  addThem('te dejo los huecos de esta semana. si te surge cualquier duda antes de elegir, escríbeme por aquí y te la resuelvo',true);
  showFixedCta();
}
/*__APPTCSS__*/
function showApptConfirm(f,h){
  const html='<div class="appt-card" id="apptCard"><div class="ac-h">Tu cita</div><div class="ac-d">'+f+' · '+h+'</div><div class="ac-btns"><button class="ac-ok" onclick="apptAct(\'confirm\')">Confirmar cita</button><button class="ac-ch" onclick="apptAct(\'change\')">Necesito cambiarla</button></div></div>';
  addRaw(html); scroll();
}
async function apptAct(action){
  const card=document.getElementById('apptCard'); if(card) card.querySelector('.ac-btns').innerHTML='<span style="font-size:.82rem;color:#8696a0">guardando…</span>';
  try{ await fetch(WORKER+'/api/appt-confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lead:state.lead_id,k:state._apptKey,action})}); }catch(e){}
  await wait(400); typing(); await wait(800); unType();
  if(action==='confirm'){ if(card)card.querySelector('.ac-btns').innerHTML='<span style="color:#25d366;font-weight:700;font-size:.9rem">✓ Cita confirmada</span>'; addThem('perfecto, queda confirmada. te esperamos. cualquier cosa me escribes por aquí',true); }
  else { if(card)card.querySelector('.ac-btns').innerHTML='<span style="color:var(--terra);font-weight:700;font-size:.9rem">te ayudamos a cambiarla</span>'; addThem('sin problema, dime qué día te viene mejor y te busco otro hueco',true); }
}
function showFixedCta(){
  if(document.getElementById('fixCta'))return;
  const f=document.querySelector('.chat-foot');
  const bar=document.createElement('div'); bar.id='fixCta'; bar.className='fix-cta';
  bar.innerHTML='<button onclick="jumpCal()">'+(state._bookMode?'Reservar mi revisión':'Reservar mi valoración gratis')+'</button>';
  f.parentNode.insertBefore(bar, f);
}
function jumpCal(){ const c=document.querySelector('.cal'); if(c){ c.scrollIntoView({behavior:'smooth',block:'center'}); c.classList.add('flash'); setTimeout(()=>c.classList.remove('flash'),900);} }
function playAud(){ const a=document.getElementById('aud'),b=document.getElementById('aBub'); if(!a)return; if(a.paused){a.play();b.classList.add('playing');}else{a.pause();b.classList.remove('playing');} a.onended=()=>b.classList.remove('playing'); }

var SETTER_HISTORY=[];
var SETTER_CONVERSATION_ID=sessionStorage.getItem('aura_setter_'+TENANT_ID+'_'+TREATMENT_ID);
if(!SETTER_CONVERSATION_ID){SETTER_CONVERSATION_ID='web_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);sessionStorage.setItem('aura_setter_'+TENANT_ID+'_'+TREATMENT_ID,SETTER_CONVERSATION_ID);}
async function sendMsg(){
  const inp=document.getElementById('cInput'); const v=inp.value.trim(); if(!v)return;
  addMe(v); SETTER_HISTORY.push({role:'user',content:v}); inp.value='';
  // marcar que conversó en el chat (prioridad de llamada punto B)
  if(!state._chatted){ state._chatted=true; try{ if(state.lead_id) fetch(WORKER+'/api/lead-chatted',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lead_id:state.lead_id})}); }catch(e){} }
  await wait(350); typing();
  try{
    const r=await fetch(WORKER+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages:SETTER_HISTORY,tenant_id:TENANT_ID,lead_id:state.lead_id,context:{name:state.name,treatment:CFG.treatment,goal:state.a?.motivo||'',plazo:state.a?.plazo||'',objecion:state.a?.objecion||'',lead_id:state.lead_id,conversation_id:SETTER_CONVERSATION_ID,mode:window.DEMO_SALES?'sales_demo':'patient'},brain_state:state.setter_brain||{}})});
    const d=await r.json(); await wait(300); unType();
    SETTER_HISTORY.push({role:'assistant',content:d.content||''}); state.setter_brain=d.brain_state||state.setter_brain||{};
    addThem((d.content||'perdona, dame un segundo').replace(/\n/g,'<br>'),true);
    if(!document.querySelector('.cal')){ await wait(500); showCal(); }
  }catch(e){ unType(); addThem('se me ha ido la conexión un momento, me lo repites?',true); }
}
async function showCal(){
  if(document.querySelector('.cal'))return;
  let slots=[];
  const slotTenant = window.DEMO_SALES ? 'focus-ventas' : TENANT_ID;
  try{ const r=await fetch(WORKER+'/api/slots?tenant='+slotTenant); const d=await r.json(); slots=d.slots||[]; }catch(e){}
  if(!slots.length){ slots=[{label:'Jue 12:00'},{label:'Jue 17:30'},{label:'Vie 10:00'},{label:'Vie 18:00'}]; }
  const btns=slots.slice(0,4).map(s=>`<button class="slot" onclick="book(this,'${s.label}','${s.iso||''}')">${s.label}</button>`).join('');
  // Encabezado dinámico: si el primer hueco no es hoy/mañana, lo enmarcamos como exclusividad (agenda muy demandada), nunca como 'cerrado'.
  let titulo = window.DEMO_SALES ? 'Elige hueco para tu consultoría gratuita (1h) con el equipo' : 'Te abro hueco esta semana';
  try{
    const fd=slots[0]&&slots[0].date; if(fd){
      const hoy=new Date(); const hoyStr=hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0')+'-'+String(hoy.getDate()).padStart(2,'0');
      const diff=Math.round((new Date(fd+'T12:00:00')-new Date(hoyStr+'T12:00:00'))/86400000);
      const DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
      const nom=DIAS[new Date(fd+'T12:00:00').getDay()];
      if(diff>=2){ titulo='Tengo mucha demanda estos días. Mi primer hueco libre es el '+nom; }
    }
  }catch(e){}
  addRaw(`<div class="cal"><h5>${titulo}</h5><div class="slots">${btns}</div></div>`);
}
async function book(el,slot,iso){
  el.parentNode.querySelectorAll('.slot').forEach(s=>s.classList.remove('sel')); el.classList.add('sel');
  const fc=document.getElementById('fixCta'); if(fc)fc.remove();
  addMe('me viene bien el '+slot.toLowerCase());
  // Meta Pixel: Schedule event
  pixelTrack('Schedule', {content_name: CFG.treatment});
  // Track schedule event
  trackFunnelEvent('schedule');
  await wait(400); typing(); await wait(900); unType();
  const esRecall = state._bookMode;
  if(window.DEMO_SALES){
    addThem('genial, te he reservado la consultoría el '+slot.toLowerCase()+'. nuestro equipo te llamará para enseñarte aura con los números de tu clínica. te llega un sms de confirmación',true);
    try{ await fetch(WORKER+'/api/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenant_id:'focus-ventas',lead_id:state.lead_id,treatment:'Consultoría AURA · '+(window.DEMO_CLINIC_NAME||''),date_iso:iso||undefined,duration_min:60,slot,ref:state.ref})}); }catch(e){}
    return;
  }
  addThem('hecho, te he reservado el '+slot.toLowerCase()+(esRecall?' para tu revisión':'')+'. te acaba de llegar un sms de confirmación',true);
  await wait(500); typing(); await wait(800); unType();
  const waText=encodeURIComponent('Hola, soy '+(state.name||'')+'. Acabo de reservar mi '+(esRecall?'revisión':'cita')+' el '+slot.toLowerCase()+' (ref '+state.ref+')');
  addThem('si prefieres que te lo confirme por whatsapp, toca aquí: <a href="https://wa.me/'+CFG.whatsapp+'?text='+waText+'" onclick="markWa()" style="color:#7ee0c2">abrir whatsapp</a>',true);
  try{ await fetch(WORKER+'/api/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenant_id:TENANT_ID,lead_id:state.lead_id,treatment:(esRecall?'Revisión / retoque':CFG.treatment),date_iso:iso||undefined,slot,ref:state.ref})}); }catch(e){}
}
function markWa(){
  try{ fetch(WORKER+'/api/lead-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenant_id:TENANT_ID,lead_id:state.lead_id,ref:state.ref,event:'whatsapp_opened'})}); }catch(e){}
  // Meta Pixel: Contact event (WhatsApp)
  pixelTrack('Contact');
  // Track whatsapp event
  trackFunnelEvent('whatsapp');
}
