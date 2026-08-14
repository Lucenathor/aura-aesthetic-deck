
import Lenis from 'https://cdn.jsdelivr.net/npm/lenis@1.1.18/+esm';
window.__lenis = new Lenis({ smoothWheel: true, lerp: 0.08, duration: 1.1 });
function raf(t){ window.__lenis.raf(t); requestAnimationFrame(raf); }
requestAnimationFrame(raf);



const WORKER='https://aura-chat-worker.adrian-7b9.workers.dev';

/* Tabs */
const tabs = document.querySelectorAll('.tab');
const rowUrl = document.getElementById('rowUrl');
const rowPrompt = document.getElementById('rowPrompt');
const rowName = document.getElementById('rowName');
const dropzone = document.getElementById('dropzone');
let mode = 'name';

tabs.forEach(t => t.onclick = () => {
  tabs.forEach(x=>x.classList.remove('on'));
  t.classList.add('on');
  mode = t.dataset.mode;
  if(rowName) rowName.style.display = mode==='name' ? 'flex' : 'none';
  rowUrl.style.display = mode==='url' ? 'flex' : 'none';
  rowPrompt.style.display = mode==='prompt' ? 'flex' : 'none';
  dropzone.classList.toggle('show', mode==='logo');
});

(function(){
  const btn=document.getElementById('goNameBtn'); const inp=document.getElementById('nameIn');
  if(!btn||!inp) return;
  async function crear(){
    const name=inp.value.trim();
    if(!name){ inp.focus(); return; }
    btn.disabled=true; const orig=btn.innerHTML; btn.innerHTML='Creando tu embudo...';
    try{
      const r=await fetch(WORKER+'/api/clinic-signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clinic_name:name})});
      const d=await r.json();
      if(d&&d.ok&&d.slug){ window.location.href='/c/'+d.slug+'?demo=1'; return; }
      btn.innerHTML=orig; btn.disabled=false; alert('No se pudo crear el embudo. Intenta de nuevo.');
    }catch(e){ btn.innerHTML=orig; btn.disabled=false; alert('Error de conexion.'); }
  }
  btn.onclick=crear;
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter') crear(); });
})();

/* Examples */
document.querySelectorAll('.examples button').forEach(b=>b.onclick=()=>{
  if(mode!=='url'){ const ut=document.querySelector('.tab[data-mode="url"]'); if(ut) ut.click(); }
  document.getElementById('urlIn').value = b.dataset.u;
  document.getElementById('urlIn').focus();
});

/* Logo upload + palette */
const fileIn = document.getElementById('fileIn');
const logoImg = document.getElementById('logoImg');
const logoName = document.getElementById('logoName');
const paletteSpan = document.getElementById('paletteSpan');
let extractedPalette = null;

dropzone.onclick = ()=>fileIn.click();
dropzone.ondragover = (e)=>{e.preventDefault();dropzone.classList.add('over');};
dropzone.ondragleave = ()=>dropzone.classList.remove('over');
dropzone.ondrop = (e)=>{e.preventDefault();dropzone.classList.remove('over');if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0]);};
fileIn.onchange = (e)=>{if(e.target.files[0])handleFile(e.target.files[0]);};

function handleFile(f){
  if(!f.type.startsWith('image/')){alert('Tiene que ser una imagen');return;}
  if(f.size > 5*1024*1024){alert('Máximo 5MB');return;}
  const reader = new FileReader();
  reader.onload = (ev)=>{
    logoImg.src = ev.target.result;
    logoName.textContent = f.name;
    dropzone.classList.add('with-logo');
    extractPalette(ev.target.result);
  };
  reader.readAsDataURL(f);
}

function extractPalette(imgSrc){
  paletteSpan.textContent = 'detectando colores...';
  if(typeof Vibrant === 'undefined'){paletteSpan.textContent='paleta lista';return;}
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = ()=>{
    try{
      Vibrant.from(img).getPalette().then(palette=>{
        const colors = [];
        ['Vibrant','DarkVibrant','Muted','LightVibrant','DarkMuted'].forEach(k=>{ if(palette[k]) colors.push(palette[k].hex); });
        extractedPalette = colors.slice(0,4);
        paletteSpan.innerHTML = 'paleta detectada: ' + extractedPalette.map(c=>`<i style="background:${c}"></i>`).join('');
      }).catch(()=>{paletteSpan.textContent='paleta por defecto';});
    }catch{paletteSpan.textContent='paleta por defecto';}
  };
  img.src = imgSrc;
}

/* Generate flow */
async function generate(payload){
  const ov = document.getElementById('genOv');
  ov.classList.add('show');
  const steps = document.querySelectorAll('.gen-step');
  steps.forEach(s=>s.classList.remove('in','done'));
  let i = 0;
  steps[0].classList.add('in');
  const tick = setInterval(()=>{
    if(i < steps.length-1){steps[i].classList.add('done');i++;steps[i].classList.add('in');}
  }, 2400);

  let data;
  try{
    const r = await fetch(WORKER+'/api/generate', {method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify(payload)});
    data = await r.json();
  }catch(e){data={error:'network'};}

  clearInterval(tick);
  steps.forEach(s=>s.classList.add('done','in'));
  document.getElementById('genTitle').textContent = 'Tu embudo está listo';
  document.getElementById('genSub').textContent = '2 segundos…';
  await new Promise(r=>setTimeout(r,1500));
  ov.classList.remove('show');

  if(data && data.tenant_id){showDemoReady(data);}
  else{alert('No pudimos generar el embudo: '+(data?.error||'error desconocido'));}
}

async function showDemoReady(data){
  document.getElementById('demoName').textContent = data.name || 'tu clínica';
  const url = `${location.origin}/c/${data.tenant_id}`;
  const dashUrl = `${location.origin}/dashboard?t=${data.tenant_id}`;
  document.getElementById('demoUrl').textContent = url;
  document.getElementById('demoLink').href = url;
  document.getElementById('demoDashLink').href = dashUrl;
  document.getElementById('demoMod').classList.add('show');
  // resetear thumbnails
  document.querySelectorAll('.img-thumb').forEach(t=>{t.classList.remove('ready');t.style.backgroundImage='';});
  // Generar imágenes en paralelo
  generateTenantImagesFromClient(data.tenant_id, data.name);
}

async function generateTenantImagesFromClient(tenantId, name){
  const tone = 'warm cream walls, brushed brass details, polished marble, peonies, hardwood floor, golden hour daylight';
  const prompts = {
    hero: `Cinematic editorial photo for landing of aesthetic clinic ${name}. Mediterranean Spanish woman age 33, natural elegant beauty, looking softly to her left side off-camera. Soft cream silk camisole. Background: luxurious modern clinic with ${tone}. RIGHT side, leaving LEFT third more empty. Photorealistic skin texture, magazine quality, 8k. NO text, NO logo. Bright luminous mood.`,
    advisor: `Square close-up profile photo of male advisor age 32 for chat avatar at clinic ${name}. Shaved short hair, dark eyebrows, calm trustworthy expression, light beige merino sweater. Background: softly blurred clinic interior with ${tone}. Subtle warm half-smile, looking at camera. Photorealistic, 8k. NO text, NO logo.`,
    room: `Hyperrealistic interior of luxurious aesthetic clinic treatment room at ${name}. Modern minimalist room with cream leather treatment chair, ${tone}, soft natural daylight, vase with pink peonies. Empty room. Editorial magazine quality, 8k. NO text, NO logo.`,
  };
  const slots = [
    {slot:'hero', prompt: prompts.hero, size:'1536x1024'},
    {slot:'advisor', prompt: prompts.advisor, size:'1024x1024'},
    {slot:'room', prompt: prompts.room, size:'1536x1024'},
  ];
  slots.forEach(async s=>{
    try{
      const r = await fetch(WORKER+'/api/generate-image',{method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({prompt:s.prompt, size:s.size, tenant_id:tenantId, slot:s.slot})});
      const d = await r.json();
      const ph = document.querySelector('.img-thumb[data-slot="'+s.slot+'"]');
      if(ph && d.url){
        ph.style.backgroundImage = `url('${WORKER+d.url}')`;
        ph.classList.add('ready');
      }
    }catch{}
  });
}

function closeDemo(){document.getElementById('demoMod').classList.remove('show');}

/* CTAs */
document.getElementById('goBtn').onclick = ()=>{
  const v = (document.getElementById('urlIn').value||'').trim();
  if(!v){document.getElementById('urlIn').focus();return;}
  generate({url: v.startsWith('http') ? v : 'https://'+v});
};
document.getElementById('goPromptBtn').onclick = ()=>{
  const v = (document.getElementById('promptIn').value||'').trim();
  if(!v){document.getElementById('promptIn').focus();return;}
  generate({prompt: v});
};
document.getElementById('goLogoBtn').onclick = ()=>{
  if(!logoImg.src){return;}
  const palStr = extractedPalette ? ' Paleta del logo: '+extractedPalette.join(', ') : '';
  generate({prompt: 'Clínica estética premium.'+palStr});
};

document.getElementById('urlIn').addEventListener('keypress',e=>{if(e.key==='Enter')document.getElementById('goBtn').click();});
document.getElementById('promptIn').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('goPromptBtn').click();}});

document.getElementById('ctaFocus').onclick = (e)=>{
  e.preventDefault();
  document.getElementById('urlIn').focus();
  if(window.__lenis){window.__lenis.scrollTo('#composer', {offset:-100});}
  else{document.getElementById('composer').scrollIntoView({behavior:'smooth',block:'center'});}
};

/* Reveals + headline blur-in */
const io = new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
},{threshold:.18});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* b-card float-in para iPhone */
const cardIO = new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');cardIO.unobserve(e.target);}});
},{threshold:.25});
document.querySelectorAll('.b-card').forEach(el=>cardIO.observe(el));
const stepIO=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');stepIO.unobserve(e.target);}});},{threshold:.35});
document.querySelectorAll('.flow-step').forEach(el=>stepIO.observe(el));
/* Metricas Meta Ads: clase in + conteo del generado */
(function(){
  function cu(el){ var to=parseInt(el.getAttribute('data-to')||'0',10); if(to<=0){el.textContent='0€';return;} var dur=1100,t0=null; function st(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1); var v=Math.round(to*(1-Math.pow(1-p,3))); el.textContent=v+'€'; if(p<1)requestAnimationFrame(st);} requestAnimationFrame(st); }
  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); var r=e.target.querySelector('.um-ret'); if(r) cu(r); io.unobserve(e.target); } }); },{threshold:.4});
  document.querySelectorAll('.ugc').forEach(function(el){ if(el.querySelector('.um-ret')||el.classList.contains('ugc-next')) io.observe(el); });
})();
/* Agenda viva en bucle: la reserva va saltando de hora en hora mientras es visible */
(function liveAgenda(){
  var ag=document.getElementById('liveAgenda'); if(!ag) return;
  var rows=[].slice.call(ag.querySelectorAll('.row'));
  var order=[2,0,3,1]; var i=0; var visible=false; var timer=null;
  function tick(){
    rows.forEach(function(r){r.classList.remove('booked');});
    rows[order[i%order.length]].classList.add('booked');
    i++;
  }
  function start(){ if(timer) return; tick(); timer=setInterval(function(){ if(visible) tick(); }, 2200); }
  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ visible=e.isIntersecting; if(visible) start(); }); },{threshold:.3});
  io.observe(ag);
})();

/* === QUIZ MOCK ANIMACIÓN EN BUCLE === */
(function quizLoop(){
  const steps = [
    {q:'¿Qué quieres mejorar?', opts:['💫 Mis labios','✨ Mi piel','🌙 Mis ojeras'], sel:0},
    {q:'¿Cómo los quieres?', opts:['Muy naturales','Con algo de volumen','No lo tengo claro'], sel:0},
    {q:'¿Para cuándo?', opts:['Tengo un evento','Este mes','Solo me informo'], sel:0},
    {q:'¿Tu principal duda?', opts:['Que se note natural','El precio','El dolor'], sel:0},
    {q:'¿Tu móvil para confirmar?', opts:['📱 Escribir mi número...'], sel:0},
  ];
  const qQ = document.getElementById('qQuestion');
  const qOptsWrap = document.getElementById('qOpts');
  const qStep = document.getElementById('qStep');
  const qBar = document.getElementById('qBar');
  const qDone = document.getElementById('qDone');
  const screen = document.querySelector('.quiz-mock .screen');
  if(!qQ) return;
  let idx = 0;
  let timer;

  function renderStep(i){
    const s = steps[i];
    qStep.textContent = i+1;
    qBar.style.width = ((i+1)/5*100)+'%';
    qQ.textContent = s.q;
    qOptsWrap.innerHTML = s.opts.map((o,k)=>`<div class="qopt ch" style="background:#fff;border:1.5px solid var(--line);color:${k===0?'var(--ink)':'var(--ink-soft)'};max-width:100%;${k===0?'font-weight:600;':''}transition:all .3s var(--ease)">${o}</div>`).join('');
  }

  function run(){
    renderStep(idx);
    // tras 900ms seleccionar opción
    timer = setTimeout(()=>{
      const opts = qOptsWrap.querySelectorAll('.qopt');
      const pick = steps[idx].sel;
      if(opts[pick]) opts[pick].classList.add('sel');
      // avanzar
      timer = setTimeout(()=>{
        if(idx < steps.length-1){
          // fade transición
          screen.style.opacity = '.4';
          setTimeout(()=>{ idx++; renderStep(idx); screen.style.opacity='1'; run2(); }, 320);
        }else{
          // mostrar done
          qDone.style.opacity = '1';
          timer = setTimeout(()=>{
            qDone.style.opacity = '0';
            idx = 0;
            setTimeout(run, 500);
          }, 2600);
        }
      }, 1100);
    }, 900);
  }
  // helper para no duplicar el primer render dentro de run tras avanzar
  function run2(){
    timer = setTimeout(()=>{
      const opts = qOptsWrap.querySelectorAll('.qopt');
      const pick = steps[idx].sel;
      if(opts[pick]) opts[pick].classList.add('sel');
      timer = setTimeout(()=>{
        if(idx < steps.length-1){
          screen.style.opacity = '.4';
          setTimeout(()=>{ idx++; renderStep(idx); screen.style.opacity='1'; run2(); }, 320);
        }else{
          qDone.style.opacity = '1';
          timer = setTimeout(()=>{ qDone.style.opacity='0'; idx=0; setTimeout(run,500); }, 2600);
        }
      }, 1100);
    }, 900);
  }

  // arrancar solo cuando es visible
  const startIO = new IntersectionObserver(es=>{
    es.forEach(e=>{
      if(e.isIntersecting){ run(); startIO.disconnect(); }
    });
  },{threshold:.4});
  startIO.observe(document.querySelector('.quiz-mock'));
})();

/* === CHAT MOCK ANIMACIÓN EN BUCLE === */
(function chatLoop(){
  const content = document.getElementById('chatContent');
  if(!content) return;
  const audioBubble = '<div class="ch audio"><div class="play">▶</div><div class="wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span>0:44</span></div>';
  const seq = [
    {t:'in', html:'hola marta, soy adrián de la clínica', delay:400},
    {t:'in', html:'acabo de ver q has terminado el formulario', delay:1400},
    {t:'in', html:audioBubble, delay:1600, raw:true},
    {t:'me', html:'vale, me interesa pero no sé si se nota mucho', delay:2400},
    {t:'in', html:'tranquila, la doctora trabaja muy natural, nadie lo nota', delay:1800},
    {t:'in', html:'te abro hueco esta semana?', delay:1500},
    {t:'me', html:'sí, el jueves mejor', delay:1800},
    {t:'booked', html:'✓ cita reservada · jue 12:00', delay:1400},
  ];
  let i = 0;
  const TYPING = '<div class="ch typing" style="max-width:auto"><span class="typing-dots"><i></i><i></i><i></i></span></div>';

  function clearChat(){ content.innerHTML=''; }

  function addMsg(item){
    return new Promise(resolve=>{
      if(item.t==='me'){
        // mensaje del lead: aparece directo
        const d = document.createElement('div');
        d.className = 'ch me';
        d.textContent = item.html;
        d.style.animation='msgIn .4s var(--ease)';
        content.appendChild(d);
        resolve();
      }else if(item.t==='booked'){
        const d = document.createElement('div');
        d.className='ch booked';
        d.textContent=item.html;
        d.style.animation='msgIn .5s var(--ease)';
        content.appendChild(d);
        resolve();
      }else{
        // mensaje del asesor: typing primero
        const typing = document.createElement('div');
        typing.innerHTML = TYPING;
        const tnode = typing.firstChild;
        content.appendChild(tnode);
        setTimeout(()=>{
          tnode.remove();
          const d = document.createElement('div');
          d.className='ch';
          if(item.raw){ d.className='ch audio'; d.innerHTML=item.html.replace(/^<div class="ch audio">|<\/div>$/g,''); }
          else d.textContent=item.html;
          d.style.animation='msgIn .4s var(--ease)';
          content.appendChild(d);
          resolve();
        }, 900);
      }
    });
  }

  async function loop(){
    clearChat();
    for(const item of seq){
      await new Promise(r=>setTimeout(r, item.delay));
      await addMsg(item);
      // auto-scroll dentro del screen
      content.scrollTop = content.scrollHeight;
    }
    await new Promise(r=>setTimeout(r, 2800));
    loop();
  }

  const cIO = new IntersectionObserver(es=>{
    es.forEach(e=>{ if(e.isIntersecting){ loop(); cIO.disconnect(); } });
  },{threshold:.4});
  cIO.observe(document.querySelector('.chat-mock'));

  // disparar notas manuscritas
  const noteIO = new IntersectionObserver(es=>{
    es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); noteIO.unobserve(e.target); } });
  },{threshold:.3});
  document.querySelectorAll('.chat-note').forEach(n=>noteIO.observe(n));
})();

// Trigger H1 blur-in on load
requestAnimationFrame(()=>{setTimeout(()=>{document.getElementById('h1Anim')?.classList.add('in');},120);});

/* === FUNNEL DEMO INTERACTIVA === */
(function funnelDemo(){
  const chipsWrap = document.getElementById('fdemoChips');
  const stage = document.getElementById('fdemoStage');
  if(!chipsWrap || !stage) return;
  const treatments = [
    {k:'labios', nm:'Labios glow', img:'/assets/ad-labios.webp', hook:'Labios naturales en 30 min', q:'¿Cómo los quieres?', opt:'Muy naturales', citas:8, precio:380},
    {k:'botox', nm:'Botox', img:'/assets/ad-botox.webp', hook:'Adiós arrugas de expresión', q:'¿Qué zona te preocupa?', opt:'Entrecejo y frente', citas:11, precio:280},
    {k:'rino', nm:'Rinomodelación', img:'/assets/ad-rino.webp', hook:'Tu perfil ideal sin cirugía', q:'¿Qué te gustaría cambiar?', opt:'Afinar el perfil', citas:5, precio:480},
    {k:'hidra', nm:'Hidratación', img:'/assets/ad-hidra.webp', hook:'Piel glow para tu evento', q:'¿Para cuándo lo necesitas?', opt:'Tengo un evento', citas:14, precio:90},
  ];
  function euro(n){ return n.toLocaleString('es-ES'); }
  function render(t){
    const total = t.citas * t.precio;
    stage.innerHTML = `
      <div class="fd-flow">
        <div class="fd-mini">
          <div class="fd-screen ad" style="background-image:url('${t.img}')">
            <span class="fd-sponsored">Patrocinado</span>
            <span class="fd-hook">${t.hook}</span>
            <span class="fd-cta2">Más información</span>
          </div>
          <div class="fd-lb">Tu anuncio</div>
        </div>
        <div class="fd-arrow">→</div>
        <div class="fd-mini">
          <div class="fd-screen quiz">
            <div class="fq-q">${t.q}</div>
            <div class="fq-o sel">${t.opt}</div>
            <div class="fq-o">No lo sé aún</div>
            <div class="fq-bar"><i></i></div>
          </div>
          <div class="fd-lb">Cuestionario</div>
        </div>
        <div class="fd-arrow">→</div>
        <div class="fd-mini">
          <div class="fd-screen cita">
            <div class="fc-row"><span>10:30</span><i></i></div>
            <div class="fc-row book"><span>12:00</span><i>✓</i></div>
            <div class="fc-row"><span>13:30</span><i></i></div>
          </div>
          <div class="fd-lb">En tu agenda</div>
        </div>
      </div>
      <div class="fd-result">
        <div class="txt"><b>${t.citas} citas</b><span>de ${t.nm.toLowerCase()} esta semana</span></div>
        <div class="euro"><b>${euro(total)}€</b><span>en tu agenda</span></div>
      </div>`;
  }
  treatments.forEach((t,i)=>{
    const c = document.createElement('button');
    c.className = 'chip' + (i===0?' on':'');
    c.textContent = t.nm;
    c.onclick = ()=>{
      chipsWrap.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
      c.classList.add('on');
      render(t);
    };
    chipsWrap.appendChild(c);
  });
  render(treatments[0]);
  // auto-rotar cada 3.5s mientras no interactuen
  let auto=1, stop=false;
  chipsWrap.addEventListener('click',()=>stop=true);
  const iv=setInterval(()=>{
    if(stop){clearInterval(iv);return;}
    const chips=chipsWrap.querySelectorAll('.chip');
    chips.forEach(x=>x.classList.remove('on'));
    chips[auto%chips.length].classList.add('on');
    render(treatments[auto%treatments.length]);
    auto++;
  }, 3500);
})();

/* === MINI DASHBOARD ANIM (card SDR) === */
(function miniDash(){
  const wrap = document.querySelector('.mini-dash-wrap');
  const rows = document.getElementById('mdRows');
  if(!wrap || !rows) return;
  const data = [
    {n:'Marta G.', s:'Instagram · labios', t:'hot', tag:'🔥 Caliente', f:'/assets/face1.webp'},
    {n:'Lucía R.', s:'WhatsApp · rino', t:'warm', tag:'Interesada', f:'/assets/face2.webp'},
    {n:'Sara M.', s:'Web · hidratación', t:'booked', tag:'✓ Reservada', f:'/assets/face3.webp'},
    {n:'Ana P.', s:'Facebook · ojeras', t:'hot', tag:'🔥 Caliente', f:'/assets/face4.webp'},
  ];
  function fill(){
    rows.innerHTML='';
    data.forEach((d,i)=>{
      const r=document.createElement('div');
      r.className='md-row';
      r.innerHTML=`<span class="av" style="background-image:url('${d.f}')"></span><span class="info"><b>${d.n}</b><span>${d.s}</span></span><span class="tg ${d.t}">${d.tag}</span>`;
      rows.appendChild(r);
      setTimeout(()=>r.classList.add('show'), 600 + i*350);
    });
  }
  const mc = wrap.querySelectorAll('.mc');
  function countUp(){
    mc.forEach(el=>{
      const to=parseFloat(el.dataset.to);const dur=1200;const st=performance.now();
      function step(t){const p=Math.min((t-st)/dur,1);const e=1-Math.pow(1-p,3);el.textContent=Math.floor(to*e);if(p<1)requestAnimationFrame(step);}
      requestAnimationFrame(step);
    });
  }
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){wrap.classList.add('run');countUp();fill();io.disconnect();}});},{threshold:.3});
  io.observe(wrap);
})();

/* === LOGO WALL render === */
(function logoWall(){
  const track = document.getElementById('logoTrack');
  if(!track) return;
  const brands = [
    {nm:'Skinney', cls:'serif', sym:'<circle cx="13" cy="13" r="4" fill="currentColor"/><circle cx="13" cy="13" r="10" fill="none" stroke="currentColor" stroke-width="1.4"/>'},
    {nm:'HAUS OF AESTHETICS', cls:'wide', sym:'<path d="M13 3 L22 9 L22 18 L13 24 L4 18 L4 9 Z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="13" cy="13.5" r="3" fill="currentColor"/>'},
    {nm:'Clínica Dalia', cls:'serif', sym:'<path d="M13 3 C9 8 9 13 13 16 C17 13 17 8 13 3 Z" fill="currentColor"/><path d="M13 16 L13 23" stroke="currentColor" stroke-width="1.5"/>'},
    {nm:'BERGAMOT', cls:'wide', sym:'<circle cx="13" cy="13" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M13 7 C16 10 16 16 13 19 C10 16 10 10 13 7 Z" fill="currentColor"/>'},
    {nm:'Lumière', cls:'serif', sym:'<path d="M13 2 L15 11 L24 13 L15 15 L13 24 L11 15 L2 13 L11 11 Z" fill="currentColor"/>'},
    {nm:'GLOW MD', cls:'sans', sym:'<circle cx="13" cy="13" r="5" fill="currentColor"/><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 2v3M13 21v3M2 13h3M21 13h3M5 5l2 2M19 19l2 2M19 5l-2 2M5 21l2-2"/></g>'},
    {nm:'Vera Estética', cls:'serif', sym:'<path d="M5 8 C5 16 9 21 13 23 C17 21 21 16 21 8 C17 10 9 10 5 8 Z" fill="currentColor"/>'},
    {nm:'NUDE CLINIC', cls:'wide', sym:'<rect x="3" y="10" width="20" height="6" rx="3" fill="currentColor"/><circle cx="8" cy="13" r="1.7" fill="#FBF8F2"/><circle cx="18" cy="13" r="1.7" fill="#FBF8F2"/>'},
  ];
  function make(b){
    return `<span class="lg"><svg class="sym" viewBox="0 0 26 26">${b.sym}</svg><span class="nm ${b.cls}">${b.nm}</span></span>`;
  }
  track.innerHTML = (brands.map(make).join('')) + (brands.map(make).join(''));
})();

/* === CHATS ANIMADOS (Copiloto + WhatsApp) en bucle === */
(function animatedChats(){
  function runChat(el, steps, opt){
    if(!el) return; let alive=true;
    el.style.overflowY='auto'; el.style.scrollBehavior='smooth';
    const toEnd=()=>{ el.scrollTop=el.scrollHeight; };
    const bub=(cls,html)=>{ const d=document.createElement('div'); d.className=cls; d.innerHTML=html; d.style.animation='none'; d.style.opacity='0'; d.style.transform='translateY(10px) scale(.98)'; d.style.transition='opacity .35s cubic-bezier(.23,1,.32,1), transform .35s cubic-bezier(.23,1,.32,1)'; el.appendChild(d); requestAnimationFrame(()=>{ d.style.opacity='1'; d.style.transform='none'; toEnd(); }); return d; };
    const typing=()=>{ const d=document.createElement('div'); d.className='co-typing'; d.style.animation='none'; d.style.opacity='1'; d.innerHTML='<span></span><span></span><span></span>'; el.appendChild(d); toEnd(); return d; };
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    async function loop(){
      while(alive){
        el.innerHTML=''; await wait(500);
        for(const s of steps){
          if(!alive) return;
          if(s.me){ bub(opt.meCls, s.t); await wait(s.d||1100); }
          else { const ti=typing(); await wait(s.think||900); if(!alive)return; ti.remove(); bub(opt.aiCls, s.t); await wait(s.d||1500); }
        }
        if(opt.pill){ bub(opt.pillCls, opt.pill); }
        await wait(2600);
      }
    }
    loop();
    return ()=>{alive=false;};
  }
  const coSteps=[
    {me:1,t:'crea un empleado, recepción, 1.500€',d:1000},
    {me:0,t:'Hecho ✓ Marta dada de alta en Equipo. Coste con SS: 1.950€/mes.',think:1000,d:1400},
    {me:1,t:'crea una promo de botox: 3 zonas por 299€ este mes',d:1100},
    {me:0,t:'Promo creada ✓ <b>Botox 3 zonas · 299€</b> activa hasta fin de mes. ¿La anuncio por WhatsApp a tus pacientes?',think:1000,d:1700},
    {me:1,t:'reserva a Laura mañana a las 17:00',d:1000},
    {me:0,t:'Cita reservada ✓ Laura · mañana 17:00. Le he enviado el recordatorio.',think:950,d:1500},
    {me:1,t:'¿cuánto he facturado este mes?',d:1000},
    {me:0,t:'Llevas <b>24.120€</b> en 110 cobros. Beneficio estimado: 9.270€.',think:1100,d:1800}
  ];
  const waSteps=[
    {me:0,t:'Hola, ¿cuánto cuesta el aumento de labios? 💋',think:300,d:1100},
    {me:1,t:'¡Hola Laura! Desde 290€, con valoración previa de la doctora. ¿Te abro hueco esta semana? ✓✓',think:900,d:1500},
    {me:0,t:'Sí porfa, mejor por la tarde',think:600,d:1100},
    {me:1,t:'Hecho ✓ Te dejo el jueves a las 17:00. Te acabo de enviar la confirmación y un recordatorio el día antes 📅',think:950,d:1600},
    {me:0,t:'Genial 🙌 Te paso una foto de cómo los quiero',think:600,d:1100},
    {me:1,t:'📷 Foto guardada en tu ficha. La doctora la verá antes de tu cita. ¡Nos vemos el jueves, Laura!',think:1000,d:1700}
  ];
  let started=false;
  const io=new IntersectionObserver((es)=>{ es.forEach(e=>{ if(e.isIntersecting && !started){ started=true;
    runChat(document.getElementById('coChat'), coSteps, {meCls:'co-b user',aiCls:'co-b ai'});
    runChat(document.getElementById('waChat'), waSteps, {meCls:'wa-b me',aiCls:'wa-b them',pill:'✨ respondido por la IA en 40 seg',pillCls:'wa-pill'});
  }}); },{threshold:.25});
  const tgt=document.getElementById('coChat'); if(tgt) io.observe(tgt);
})();

/* === CIFRAS DE DOLOR: conteo dopamínico === */
(function painCounters(){
  const sec=document.getElementById('dolor'); if(!sec) return;
  let done=false;
  function countUp(el){
    const to=parseFloat(el.getAttribute('data-to')||'0'); const dec=parseInt(el.getAttribute('data-dec')||'0');
    const dur=1100; const t0=performance.now();
    function step(now){ let p=Math.min(1,(now-t0)/dur); const ease=1-Math.pow(1-p,3); const val=to*ease; el.textContent=dec? val.toFixed(dec).replace('.',',') : Math.round(val).toString(); if(p<1){ requestAnimationFrame(step); } else { el.textContent=dec? to.toFixed(dec).replace('.',',') : to.toString(); const card=el.closest('.pain-card'); if(card){ card.style.transition='transform .25s cubic-bezier(.23,1,.32,1)'; card.style.transform='scale(1.04)'; setTimeout(()=>{card.style.transform='none';},220); } } }
    requestAnimationFrame(step);
  }
  const io=new IntersectionObserver((es)=>{ es.forEach(e=>{ if(e.isIntersecting && !done){ done=true; const nums=sec.querySelectorAll('.pn-count'); nums.forEach((n,i)=>setTimeout(()=>countUp(n), 250+i*260)); } }); },{threshold:.4});
  io.observe(sec);
})();

/* === BENEFICIO REAL: animación espectacular === */
(function profitAnim(){
  const card=document.getElementById('pfCard'); if(!card) return;
  let done=false;
  const fmt=v=>{ const s=v<0?'−':''; return s+Math.abs(Math.round(v)).toLocaleString('es-ES')+'€'; };
  function countTo(el,to,dur){ const t0=performance.now(); (function step(now){ const p=Math.min(1,(now-t0)/dur); const e=1-Math.pow(1-p,3); el.textContent=fmt(to*e); if(p<1)requestAnimationFrame(step); else el.textContent=fmt(to); })(performance.now()); }
  async function run(){
    card.classList.add('run');
    const rows=[...card.querySelectorAll('.pf-row')];
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    for(let i=0;i<rows.length-1;i++){ rows[i].classList.add('show'); const n=rows[i].querySelector('.pf-n'); if(n)countTo(n,parseFloat(n.getAttribute('data-to')),900); await wait(650); }
    const bar=document.getElementById('pfBar'); if(bar)bar.style.width='37%';
    await wait(550);
    const tot=rows[rows.length-1]; tot.classList.add('show'); const tn=tot.querySelector('.pf-n'); if(tn)countTo(tn,parseFloat(tn.getAttribute('data-to')),1100);
    await wait(1150); if(tn){ tn.classList.add('pop'); setTimeout(()=>tn.classList.add('glow'),500); }
  }
  const io=new IntersectionObserver((es)=>{ es.forEach(e=>{ if(e.isIntersecting && !done){ done=true; run(); } }); },{threshold:.45});
  io.observe(card);
})();

/* === HERO PRODUCT ANIM === */
(function heroAnim(){
  const stage = document.querySelector('.hero-anim');
  if(!stage) return;
  const rowsWrap = document.getElementById('dashRows');
  const leads = [
    {n:'Marta G.', t:'hot', tag:'🔥 Caliente'},
    {n:'Lucía R.', t:'warm', tag:'Interesada'},
    {n:'Sara M.', t:'booked', tag:'✓ Reservada'},
    {n:'Ana P.', t:'hot', tag:'🔥 Caliente'},
  ];
  const faces = ['/assets/face1.webp','/assets/face2.webp','/assets/face3.webp','/assets/face4.webp'];
  function fillRows(){
    rowsWrap.innerHTML = '';
    leads.forEach((l,i)=>{
      const r = document.createElement('div');
      r.className = 'dash-row';
      r.innerHTML = `<span class="av" style="background:url('${faces[i]}') center/cover"></span><span class="nm">${l.n}</span><span class="tg ${l.t}">${l.tag}</span>`;
      rowsWrap.appendChild(r);
      setTimeout(()=>r.classList.add('show'), 4600 + i*450);
    });
  }
  // arrancar al ser visible
  const io2 = new IntersectionObserver(es=>{
    es.forEach(e=>{ if(e.isIntersecting){ stage.classList.add('run'); fillRows(); io2.disconnect(); } });
  },{threshold:.2});
  io2.observe(stage);
})();

// Blur-in on section h2: convertir headlines en spans .word
document.querySelectorAll('.section h2').forEach(h=>{
  if(h.dataset.split) return;h.dataset.split='1';
  // Solo si no tiene HTML interior con spans existentes a preservar
  const html = h.innerHTML;
  // Splitting respetando spans existentes
  const parts = html.split(/(<[^>]+>)/);
  let out = '';let i = 0;
  parts.forEach(p=>{
    if(p.startsWith('<')){out += p;}
    else{
      const words = p.split(/(\s+)/);
      words.forEach(w=>{
        if(w.trim()){out += `<span class="word" style="--i:${i++}">${w}</span>`;}
        else out += w;
      });
    }
  });
  h.innerHTML = out;
});
const hIO = new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');hIO.unobserve(e.target);}});},{threshold:.3});
document.querySelectorAll('.section h2').forEach(el=>hIO.observe(el));

/* === PIPELINE: typing del guion + conteo de € === */
(function(){
  const grid=document.getElementById('plGrid'); if(!grid) return;
  const typeOne=(el,delay)=>{ const full=el.getAttribute('data-text')||''; const card=el.closest('.pl-card'); let i=0;
    setTimeout(()=>{ card&&card.classList.add('typing'); const iv=setInterval(()=>{ el.textContent=full.slice(0,i); i++; if(i>full.length){ clearInterval(iv); card&&card.classList.remove('typing'); } }, 18); }, delay);
  };
  const countEur=(b,delay)=>{ const to=parseInt(b.getAttribute('data-to')||'0',10); const money=b.closest('.pl-money'); setTimeout(()=>{ money&&money.classList.add('pop'); const t0=performance.now(),dur=1000; const step=(n)=>{ const p=Math.min(1,(n-t0)/dur); b.textContent=Math.round(to*(0.15+0.85*(1-Math.pow(1-p,3)))); if(p<1)requestAnimationFrame(step); else { b.textContent=to; if(money){ money.classList.remove('pop'); money.classList.add('done'); /* re-pop periodico para mantener el efecto */ setInterval(()=>{ money.classList.remove('pop'); void money.offsetWidth; money.classList.add('pop'); }, 4200); } } }; requestAnimationFrame(step); }, delay); };
  const io=new IntersectionObserver(es=>{ es.forEach(e=>{ if(!e.isIntersecting)return; io.disconnect();
    grid.querySelectorAll('.pl-card').forEach((card,idx)=>{ const base=300+idx*450; const typed=card.querySelector('.pl-typed'); const eur=card.querySelector('.pl-eur'); if(typed)typeOne(typed,base); if(eur)countEur(eur,base+200); });
  }); },{threshold:.3});
  io.observe(grid);
})();
// Count-up de stats
const countIO = new IntersectionObserver(es=>{
  es.forEach(e=>{
    if(!e.isIntersecting) return;
    const el = e.target;
    const to = parseFloat(el.dataset.to);
    const dec = parseInt(el.dataset.dec||'0');
    const suf = el.dataset.suf||'';
    const dur = 1400;
    const start = performance.now();
    function step(t){
      const p = Math.min((t-start)/dur, 1);
      const eased = 1-Math.pow(1-p, 3);
      const v = to * eased;
      let txt;
      if(to >= 1000){txt = '+' + Math.floor(v).toLocaleString('es-ES');}
      else if(dec){txt = v.toFixed(dec).replace('.', ',') + suf;}
      else{txt = Math.floor(v) + suf;}
      el.textContent = txt;
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    countIO.unobserve(el);
  });
},{threshold:.4});
document.querySelectorAll('.count').forEach(el=>{const cur=el.textContent;el.dataset.orig=cur;el.textContent='0';countIO.observe(el);});

/* Nav scrolled */
window.addEventListener('scroll',()=>{
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 20);
},{passive:true});

/* CTA flotante: aparece cuando el composer del hero sale de pantalla */
(function(){
  var cta=document.getElementById('stickyCta');
  var comp=document.getElementById('composer');
  if(!cta||!comp) return;
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ cta.classList.toggle('show', !e.isIntersecting && window.scrollY>200); });
  },{threshold:0});
  io.observe(comp);
})();

/* Agendar consultoría */
function buildSlots(){
  const wrap = document.getElementById('aSlots');
  wrap.innerHTML = '';
  const days = ['lun','mar','mié','jue','vie'];
  const today = new Date();
  for(let i=1;i<=6;i++){
    const d = new Date(today.getTime() + i*86400000);
    const day = days[(d.getDay()+6)%7] || days[0];
    const date = d.getDate();
    const hour = ['10:30','12:00','17:30'][i%3];
    const b = document.createElement('button');
    b.innerHTML = `<span class="d">${day} ${date}</span> ${hour}`;
    b.onclick = ()=>{
      wrap.querySelectorAll('button').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel');checkAgendaFilled();
    };
    wrap.appendChild(b);
  }
}
function checkAgendaFilled(){
  const ok = document.getElementById('aName').value.trim() &&
             document.getElementById('aEmail').value.trim() &&
             document.getElementById('aPhone').value.trim() &&
             document.querySelector('#aSlots button.sel');
  document.getElementById('aSubmit').disabled = !ok;
}
['aName','aEmail','aPhone'].forEach(id=>document.getElementById(id).addEventListener('input',checkAgendaFilled));

function openAgend(){
  document.getElementById('agendMod').classList.add('show');
  buildSlots();
  document.getElementById('demoMod').classList.remove('show');
}
function closeAgend(){document.getElementById('agendMod').classList.remove('show');}
window.openAgend = openAgend;window.closeAgend = closeAgend;

document.getElementById('aSubmit').onclick = async ()=>{
  const slot = document.querySelector('#aSlots button.sel');
  if(!slot)return;
  const data = {
    name: document.getElementById('aName').value.trim(),
    email: document.getElementById('aEmail').value.trim(),
    phone: document.getElementById('aPhone').value.trim(),
    slot: slot.textContent.trim()
  };
  try{await fetch(WORKER+'/api/consultations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}catch{}
  document.getElementById('agendCard').innerHTML = `
    <button class="close" onclick="closeAgend()">×</button>
    <div class="agend-success">
      <div class="check">✓</div>
      <h4>Consultoría reservada</h4>
      <p>Te hemos enviado un email a <strong>${data.email}</strong>. Hablamos el ${data.slot}.</p>
    </div>
  `;
};



(function(){
  var KEY='aura_cookie_consent';
  function show(){ var b=document.getElementById('auraCookieBanner'); if(b) b.style.display='block'; }
  function hide(){ var b=document.getElementById('auraCookieBanner'); if(b) b.style.display='none'; }
  window.auraCookies={
    set:function(v){ try{ localStorage.setItem(KEY, v); }catch(e){} hide(); /* aqui se activarian scripts analiticos si v==='accepted' */ },
    reset:function(){ try{ localStorage.removeItem(KEY); }catch(e){} show(); }
  };
  var v=null; try{ v=localStorage.getItem(KEY); }catch(e){}
  if(!v) show();
})();



(function(){
  var box=document.getElementById('plStats'); if(!box) return;
  function cu(el){ var to=parseInt(el.getAttribute('data-to')||'0',10); var pre=el.getAttribute('data-prefix')||''; var suf=el.getAttribute('data-suffix')||''; if(to<=0){ el.textContent=pre+'0'+suf; return; } var dur=900,t0=null; function st(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1); var v=Math.round(to*(1-Math.pow(1-p,3))); el.textContent=pre+v+suf; if(p<1)requestAnimationFrame(st); } requestAnimationFrame(st); }
  var d=false; var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting&&!d){ d=true; box.classList.add('pls-in'); setTimeout(function(){ box.querySelectorAll('.pl-num').forEach(cu); },150); io.disconnect(); } }); },{threshold:.4}); io.observe(box);
})();
(function(){
  var sec=document.getElementById('migracion'); if(!sec) return;
  function countUp(el){
    var to=parseInt(el.getAttribute('data-to')||'0',10); var suf=el.getAttribute('data-suffix')||'';
    if(to<=0){ el.textContent='0'+suf; return; }
    var dur=900, t0=null;
    function step(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1); var v=Math.round(to*(1-Math.pow(1-p,3))); el.textContent=v+suf; if(p<1)requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  var done=false;
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting && !done){ done=true; sec.classList.add('mig-in');
      setTimeout(function(){ sec.querySelectorAll('.mig-num').forEach(countUp); }, 260);
      io.disconnect();
    }});
  },{threshold:.3});
  io.observe(sec);
})();
