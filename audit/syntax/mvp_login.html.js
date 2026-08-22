
const WORKER='https://aura-chat-worker.adrian-7b9.workers.dev';
let EMAIL='';
let TURNSTILE_TOKEN='';
function onTurnstile(token){ TURNSTILE_TOKEN=token||''; }
function onTurnstileExpired(){ TURNSTILE_TOKEN=''; }
// chispas doradas
(function(){ if(matchMedia('(prefers-reduced-motion: reduce)').matches)return; for(let i=0;i<14;i++){ const s=document.createElement('div'); s.className='spark'; s.style.left=(Math.random()*100)+'%'; s.style.bottom=(Math.random()*60)+'%'; s.style.animationDuration=(6+Math.random()*6)+'s'; s.style.animationDelay=(Math.random()*6)+'s'; document.body.appendChild(s); } })();
// frase rotativa motivadora
const ROT=['Tus pacientes te esperan dentro','Mira quién quiere reservar hoy','Tu agenda se llena sola','Cada lead, a un clic de ser paciente'];
let _ri=0; const _rl=document.getElementById('rotline');
if(_rl){ _rl.textContent=ROT[0]; setInterval(()=>{ _rl.style.opacity=0; setTimeout(()=>{ _ri=(_ri+1)%ROT.length; _rl.textContent=ROT[_ri]; _rl.style.opacity=1; },400); },3400); }
function confetti(){ if(matchMedia('(prefers-reduced-motion: reduce)').matches)return; const cols=['#C8745A','#C9A86A','#E8C77E','#A4E5CD','#fff']; for(let i=0;i<40;i++){ const c=document.createElement('div'); c.style.cssText='position:fixed;z-index:50;width:8px;height:8px;border-radius:2px;pointer-events:none;left:'+(50+(Math.random()*30-15))+'%;top:42%;background:'+cols[i%cols.length]; document.body.appendChild(c); const ang=Math.random()*Math.PI*2,vel=4+Math.random()*7,vx=Math.cos(ang)*vel,vy=Math.sin(ang)*vel-6; let x=0,y=0,t=0; const id=setInterval(()=>{ t++; x+=vx; y+=vy+t*0.6; c.style.transform='translate('+x+'px,'+y+'px) rotate('+(t*18)+'deg)'; c.style.opacity=Math.max(0,1-t/45); if(t>45){clearInterval(id);c.remove();} },16); } }
const params=new URLSearchParams(location.search);
const nextTenant=params.get('t')||'';
// si ya hay sesión, ir al dashboard
(async function(){
  const tok=localStorage.getItem('aura_token');
  if(tok){ try{ const r=await fetch(WORKER+'/api/auth/me',{headers:{'Authorization':'Bearer '+tok}}); const d=await r.json(); if(d.auth){ location.href='/dashboard?t='+d.tenant_id; } }catch(e){} }
})();
function msg(t,cls){ const m=document.getElementById('msg'); m.textContent=t; m.className='msg '+(cls||''); }
async function sendCode(){
  EMAIL=document.getElementById('email').value.trim();
  if(!EMAIL.includes('@')){ msg('Pon un email válido','err'); return; }
  if(!TURNSTILE_TOKEN){ msg('Completa la verificación de seguridad','err'); return; }
  const b=document.getElementById('sendBtn'); b.disabled=true; b.textContent='Enviando…';
  try{
    const r=await fetch(WORKER+'/api/auth/request-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:EMAIL,turnstile_token:TURNSTILE_TOKEN})});
    const d=await r.json();
    if(d.ok){ confetti(); document.getElementById('step1').classList.remove('on'); document.getElementById('step2').classList.add('on'); document.getElementById('sub').textContent='Revisa tu correo ('+EMAIL+') e introduce el código.'; msg('Código enviado','ok'); document.getElementById('code').focus(); }
    else { msg(d.error||'No se pudo enviar','err'); TURNSTILE_TOKEN=''; if(window.turnstile)turnstile.reset(); }
  }catch(e){ msg('Error de conexión','err'); }
  b.disabled=false; b.textContent='Enviar código';
}
async function verify(){
  const code=document.getElementById('code').value.trim();
  if(code.length<6){ msg('El código tiene 6 dígitos','err'); return; }
  const b=document.getElementById('verifyBtn'); b.disabled=true; b.textContent='Entrando…';
  try{
    const r=await fetch(WORKER+'/api/auth/verify-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:EMAIL,code})});
    const d=await r.json();
    if(d.ok){ localStorage.setItem('aura_token',d.token); localStorage.setItem('aura_tenant',d.tenant_id); msg('Acceso correcto','ok'); location.href='/dashboard?t='+d.tenant_id; }
    else msg(d.error||'Código incorrecto','err');
  }catch(e){ msg('Error de conexión','err'); }
  b.disabled=false; b.textContent='Entrar';
}
function reset(){ document.getElementById('step2').classList.remove('on'); document.getElementById('step1').classList.add('on'); document.getElementById('sub').textContent='Entra con tu email. Te enviamos un código.'; TURNSTILE_TOKEN=''; if(window.turnstile)turnstile.reset(); msg(''); }
document.getElementById('email').addEventListener('keydown',e=>{if(e.key==='Enter')sendCode();});
document.getElementById('code').addEventListener('keydown',e=>{if(e.key==='Enter')verify();});
