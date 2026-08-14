
/* ============== DATA: 6 verticales modulares ============== */
const VERT={
  aesthetics:{
    label:"Estética",
    theme:{bg:"#FBF7F2",ink:"#1a0b10",berry:"#5e1a2a",berry2:"#8B2A3F",rose:"#D4A574",gold:"#caa05a",cream:"#f5ecdc",muted:"#7a5d63",line:"rgba(94,26,42,.15)",accent:"rgba(212,165,116,.18)"},
    h1:`El SaaS escalable que <em>llena la agenda</em> de tu clínica estética.`,
    sub:"El embudo Meta Ads que más convierte en 2026, montado en 10 minutos. Sin Done-For-You, sin agencia, sin reels personalizados.",
    business:"Clínica Elvira",
    leadName:"Marta",
    callerName:"Asistente Elvira",
    offerName:"Valoración gratuita + 50€ en tu primer tratamiento",
    metaAdHook:"Tu mejor versión empieza aquí.",
    metaAdCta:"Reserva tu valoración gratis",
    chat:[
      {who:"ai",t:"¡Hola Marta! Soy de Clínica Elvira. Vengo por tu solicitud de la valoración gratuita."},
      {who:"me",t:"Hola, estoy entre labios y rinomodelación 🙂"},
      {who:"ai",t:"Te entiendo, son dos tratamientos muy elegidos. Te paso la agenda para que reserves tu valoración 1:1 con la Dra. Elvira."}
    ],
    funnel:[
      ["Meta Ads · objetivo Leads externos","Anuncio UGC del banco mensual + oferta. 70% retargeting, 30% prospecting. Pixel + Conversion API server-side."],
      ["Landing premium + Quiz de 5 preguntas","NO Instant Form. La clínica capta lead 3-5× más cualificado con quiz interactivo. Coste por cita reservada hasta 60% más bajo."],
      ["Chat IA que reserva la cita en <5 min","Toma el control con el contexto del quiz, resuelve objeciones y abre calendario embebido. El lead reserva sin hablar con nadie."],
      ["Recordatorios IA SOLO para confirmar","SMS al instante + voz IA 24h antes + voz IA 2h antes. No-show baja del 22% a <9%. La IA NO vende."],
      ["Cita + venta humana en clínica","Tu equipo cierra en consulta. Post-visita: review request + membership upsell."]
    ],
    market:[["27€-55€","CPL Meta Ads estética inyectables"],["3-5×","leads contactados &lt;5 min convierten"],["40-60%","menos no-show con recordatorios voz IA"]],
    pricing:{a:"4.000 €",b:"+ 497 €/mes desde el mes 4"},
    valueTotal:"12.300 €",
    closing:"Cargamos tu URL y en 10 minutos verás tu embudo Meta Ads listo."
  },
  dental:{
    label:"Dental",
    theme:{bg:"#F5F8FB",ink:"#0e1e2c",berry:"#0b2a4a",berry2:"#143a66",rose:"#5fa8d3",gold:"#c8a35a",cream:"#eef3f8",muted:"#5a6d7a",line:"rgba(20,58,102,.15)",accent:"rgba(95,168,211,.16)"},
    h1:`El SaaS escalable que <em>llena la agenda</em> de tu clínica dental.`,
    sub:"Quiz de diseño de sonrisa + chat IA que reserva la cita + recall higiene automatizado.",
    business:"Clínica Dental Lumière",
    leadName:"Sara",
    callerName:"Asistente Lumière",
    offerName:"Estudio 3D gratis de tu sonrisa",
    metaAdHook:"Diseña tu sonrisa en 30 minutos.",
    metaAdCta:"Estudio 3D gratis",
    chat:[
      {who:"ai",t:"Hola Sara, vengo de Lumière. Vi tu cuestionario."},
      {who:"me",t:"¿Cuánto cuesta la ortodoncia invisible?"},
      {who:"ai",t:"Tenemos planes desde 89€/mes. ¿Te abro el calendario para una valoración 3D gratis?"}
    ],
    funnel:[
      ["Meta Ads · Leads externos","UGC paciente real + oferta 'estudio 3D gratis'. Hyper-local con Pin Drop."],
      ["Landing + Quiz de 5 preguntas","NO Instant Form. Cualifica antes: motivo, plazo, presupuesto, miedo. ×3 conversión a cita."],
      ["Chat IA reserva cita en <5 min","Con contexto del quiz, resuelve dudas y reserva valoración 3D."],
      ["Recordatorios IA confirmación","SMS + voz IA 24h y 2h antes. No-show dental baja del 30% a 6%."],
      ["Cita + venta humana","Higienista cierra plan + financiación."]
    ],
    market:[["18-42€","CPL Meta Ads tratamientos dentales"],["600%","ROI Holly Nimblr en dental"],["30-39%","no-show medio antes de IA"]],
    pricing:{a:"4.000 €",b:"+ 497 €/mes desde el mes 4"},
    valueTotal:"12.300 €",
    closing:"Carga la web dental y en 10 min ves tu embudo dental Meta Ads funcionando."
  },
  legal:{
    label:"Abogados",
    theme:{bg:"#F6F4EE",ink:"#1c180f",berry:"#3d2f17",berry2:"#5f4623",rose:"#b88a4a",gold:"#caa05a",cream:"#efe9da",muted:"#6e6555",line:"rgba(95,70,35,.15)",accent:"rgba(184,138,74,.18)"},
    h1:`El despacho que <em>cualifica y reserva</em> a las 3am.`,
    sub:"Chat IA que reserva consulta de pago + IA confirma 24h antes. Filtra time-wasters.",
    business:"Despacho Vega",
    leadName:"Carlos",
    callerName:"Asistente Vega",
    offerName:"Primera consulta de evaluación 1h",
    metaAdHook:"¿Tu caso merece un despacho boutique?",
    metaAdCta:"Evaluación 1h",
    chat:[
      {who:"ai",t:"Buenas tardes Carlos, soy del Despacho Vega."},
      {who:"me",t:"Tengo herencia con problemas entre hermanos."},
      {who:"ai",t:"Es nuestra especialidad. ¿Le agendo la primera consulta de pago con el socio?"}
    ],
    funnel:[
      ["Meta Ads · Leads externos","Anuncio educativo + retargeting orgánico."],
      ["Landing + Quiz cualificador","Tipo de caso · plazo · expectativa · presupuesto · urgencia. Filtra time-wasters antes de la consulta."],
      ["Chat IA reserva consulta de pago","El socio solo ve casos cualificados."],
      ["Recordatorios IA confirmación","SMS + voz IA 24h y 2h antes."],
      ["Consulta + propuesta","El socio cierra."]
    ],
    market:[["35-120€","CPL Meta Ads servicios legales"],["3-12 m","decision window cliente premium"],["180k€","gasto medio marketing legal/año"]],
    pricing:{a:"4.000 €",b:"+ 497 €/mes desde el mes 4"},
    valueTotal:"12.300 €",
    closing:"Carga la web del despacho y en 10 min ves tu embudo legal funcionando."
  },
  fitness:{
    label:"Fitness",
    theme:{bg:"#F8F6F1",ink:"#181a14",berry:"#2a3320",berry2:"#3d5226",rose:"#c79e3b",gold:"#caa05a",cream:"#eee8d8",muted:"#5d6754",line:"rgba(61,82,38,.15)",accent:"rgba(199,158,59,.18)"},
    h1:`El SaaS que <em>llena clases</em> de tu estudio.`,
    sub:"Meta Ads + chat IA que reserva clase prueba + onboarding automatizado.",
    business:"Estudio Hara",
    leadName:"Lucía",
    callerName:"Asistente Hara",
    offerName:"Clase de prueba + plan de 4 semanas",
    metaAdHook:"30 días para que vuelvas a sentirte tú.",
    metaAdCta:"Clase de prueba gratis",
    chat:[
      {who:"ai",t:"Hola Lucía, soy del Estudio Hara."},
      {who:"me",t:"Quiero perder peso, no sé por dónde empezar."},
      {who:"ai",t:"Empezamos con clase prueba gratis. ¿Te reservo martes a las 18:30?"}
    ],
    funnel:[
      ["Meta Ads · Leads externos","Anuncio UGC cliente real + oferta clase prueba."],
      ["Landing + Quiz de transformación","Objetivo · plazo · experiencia · hábitos · presupuesto. Pre-cualifica."],
      ["Chat IA reserva clase prueba","Recomienda plan personalizado y abre calendario."],
      ["Recordatorios IA confirmación","SMS + voz IA 24h y 2h antes. No-show de 25% a 8%."],
      ["Clase + venta del plan","Coach cierra el pack."]
    ],
    market:[["8-25€","CPL Meta Ads fitness"],["18%","cancelan en mes 1"],["29%","new clients rebooks"]],
    pricing:{a:"4.000 €",b:"+ 497 €/mes desde el mes 4"},
    valueTotal:"12.300 €",
    closing:"Carga el IG del centro y en 10 min ves tu embudo fitness funcionando."
  },
  realestate:{
    label:"Inmobiliaria",
    theme:{bg:"#F4F4F0",ink:"#10141a",berry:"#1f2c3c",berry2:"#2e4263",rose:"#c5a36b",gold:"#caa05a",cream:"#e9eaee",muted:"#5a6470",line:"rgba(46,66,99,.15)",accent:"rgba(197,163,107,.18)"},
    h1:`Captura propietarios <em>antes que la competencia</em>.`,
    sub:"Meta Ads '¿Cuánto vale tu casa?' + chat IA que reserva tasación + confirmación IA.",
    business:"Inmobiliaria Cordel",
    leadName:"Javier",
    callerName:"Asistente Cordel",
    offerName:"Tasación gratuita + informe de mercado",
    metaAdHook:"¿Cuánto vale tu casa en 2026?",
    metaAdCta:"Tasación gratuita",
    chat:[
      {who:"ai",t:"Hola Javier, soy de Inmobiliaria Cordel."},
      {who:"me",t:"Mi piso de 90m² en Eixample, ¿cuánto?"},
      {who:"ai",t:"En tu zona 6.000-7.200€/m². ¿Te abro el calendario para tasación gratis?"}
    ],
    funnel:[
      ["Meta Ads · Leads externos","'¿Cuánto vale tu casa?' como hook."],
      ["Landing + Quiz tasación rápida","Tipo · m² · zona · plazo · motivo. Estimación IA personalizada."],
      ["Chat IA reserva tasación","Explica el rango y abre calendario."],
      ["Recordatorios IA confirmación","SMS + voz IA 24h y 2h antes."],
      ["Visita + exclusiva","Agente cierra."]
    ],
    market:[["45-95€","CPL Meta Ads captación propietarios"],["3-9 m","funnel del comprador"],["$15-50k","comisión venta media"]],
    pricing:{a:"4.000 €",b:"+ 497 €/mes desde el mes 4"},
    valueTotal:"12.300 €",
    closing:"Carga la web de la agencia y en 10 min ves tu embudo inmobiliario funcionando."
  },
  hospitality:{
    label:"Restauración",
    theme:{bg:"#F6F1EC",ink:"#1c1310",berry:"#3a1a14",berry2:"#5e2a20",rose:"#c98a5a",gold:"#caa05a",cream:"#efe2d3",muted:"#7a5d50",line:"rgba(94,42,32,.15)",accent:"rgba(201,138,90,.18)"},
    h1:`<em>Llena mesas</em> incluso fuera de horario.`,
    sub:"Meta Ads + chat IA que reserva mesa + IA confirma + upsell post-reserva.",
    business:"Mediterráneo",
    leadName:"Pablo",
    callerName:"Asistente Mediterráneo",
    offerName:"Menú degustación con maridaje incluido",
    metaAdHook:"Tu cena de viernes empieza aquí.",
    metaAdCta:"Reservar mesa",
    chat:[
      {who:"ai",t:"Hola Pablo, soy de Mediterráneo."},
      {who:"me",t:"¿Menú degustación sábado?"},
      {who:"ai",t:"Sí, 8 pasos a 89€. ¿Te reservo mesa para 2 a las 21h?"}
    ],
    funnel:[
      ["Meta Ads · Leads externos","UGC del plato slow-motion + oferta degustación."],
      ["Landing + Quiz experiencia","Ocasión · personas · alergias · presupuesto · fecha."],
      ["Chat IA reserva mesa","Recomienda mesa, maridaje y abre calendario."],
      ["Recordatorios IA confirmación","SMS + voz IA 24h y 2h antes."],
      ["Mesa + experiencia","Equipo de sala cierra."]
    ],
    market:[["3-12€","CPL Meta Ads restauración"],["15-25%","cancelaciones tardías"],["80-150€","ticket menú degustación"]],
    pricing:{a:"4.000 €",b:"+ 497 €/mes desde el mes 4"},
    valueTotal:"12.300 €",
    closing:"Carga la web del restaurante y en 10 min ves tu embudo de reservas funcionando."
  }
};

/* ============== SLIDE BUILDERS ============== */
const SL=(V)=>([
  // 1 HERO
  {dark:true,build:()=>`
    <div class="hero-bg"></div>
    <div class="container" style="position:relative;z-index:2;text-align:center;padding:2rem 0">
      <span class="pill r"><span class="dot"></span> Pitch deck animado · v9</span>
      <h1 class="r" style="margin-top:1rem">${V.h1}</h1>
      <p class="r muted" style="margin-top:.9rem;font-size:1rem;max-width:520px;margin-left:auto;margin-right:auto">${V.sub}</p>
      <div class="r" style="margin-top:1.6rem;display:flex;flex-direction:column;align-items:center;gap:.7rem">
        <div style="position:relative;width:80px;height:80px;margin:0 auto"><div class="gold-orb" style="position:relative;width:80px;height:80px;margin:0;top:0;left:0;transform:none"></div></div>
        <span class="kicker">desliza ↓ para ver cómo funciona</span>
      </div>
    </div>`},

  // 2 EL EMBUDO META ADS GANADOR EN ESTÉTICA
  {dark:false,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> El embudo Meta Ads que funciona</span>
      <h2 class="r" style="margin-top:.7rem">5 pasos. <em>Sin agencia.</em> Sin Done-For-You.</h2>
      <p class="r muted" style="margin-top:.5rem;font-size:.92rem">El que usan Med Spa Magic Marketing, Glow, Clinic Grower y todas las agencias top del sector en 2026.</p>
      <div class="gold-line r"></div>
      <div class="funnel r" style="margin-top:1rem">
        ${V.funnel.map((f,i)=>`<div class="fstep"><div class="fnum">${i+1}</div><div><strong>${f[0]}</strong><p>${f[1]}</p></div></div>`).join('')}
      </div>
      <p class="muted r" style="margin-top:.8rem;font-size:.74rem">Fuentes: Consentz, Med Spa Magic Marketing, TooPixels, Scale30x, Ringlyn AI.</p>
    </div>`},

  // 3 META AD MOCK (banco mensual de anuncios)
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Paso 1 · Banco mensual de anuncios</span>
      <h2 class="r" style="margin-top:.7rem">5 anuncios al mes con <em>actor real</em>. Sin grabar nada.</h2>
      <p class="r muted" style="margin-top:.4rem;font-size:.88rem">Sin logos. Sin nombre de clínica. Sin personalizar. Cada clínica añade su ciudad y CTA al final. Escalable a 1.000 cuentas.</p>
      <div class="adbank r" id="adbank" style="margin-top:.9rem"></div>
      <div class="r" style="margin-top:1rem;display:flex;justify-content:center">
        <div style="max-width:280px;width:100%" class="metaad">
          <div class="head-ad">
            <div class="ad-av"></div>
            <div><strong>${V.business}</strong><small>Patrocinado · 7h</small></div>
          </div>
          <div class="ad-img" data-text='${V.metaAdHook}'></div>
          <div class="cta-ad"><div><strong>Reserva</strong><small>${V.offerName}</small></div><div class="cta-btn">${V.metaAdCta}</div></div>
        </div>
      </div>
    </div>`},

  // 4 LANDING + QUIZ CUALIFICADOR (en lugar del Instant Form)
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Paso 2 · Landing + Quiz cualificador</span>
      <h2 class="r" style="margin-top:.7rem">La clave: <em>quiz interactivo</em>, no Instant Form.</h2>
      <p class="r muted" style="margin-top:.4rem;font-size:.88rem">El quiz convierte al 30-40% (vs 2-3% de un formulario estático) y los leads que llegan a la clínica son 3-5× más cualificados.</p>
      <div class="r" style="margin-top:1rem;display:flex;justify-content:center">
        <div class="phone">
          <div class="notch"></div>
          <div class="screen">
            <div class="header"><span class="av"></span><span>${V.business}<small>Quiz · paso <i id="qstep">1</i> de 5</small></span></div>
            <div class="metaform">
              <div class="meta-head"><div class="meta-logo" style="background:linear-gradient(135deg,#D4A574,#8B2A3F)">Q</div><span id="qTitle">¿Qué te llevaría a dar el paso?</span></div>
              <div id="qOptions" style="display:flex;flex-direction:column;gap:5px">
                <span class="opt">Quiero sentirme mejor conmigo</span>
                <span class="opt">Tengo un evento próximo</span>
                <span class="opt">Aún me estoy informando</span>
                <span class="opt">Llevo años pensándolo</span>
              </div>
              <div class="field" style="margin-top:.6rem"><label>Progreso</label><div style="height:4px;border-radius:2px;background:rgba(212,165,116,.18);overflow:hidden"><div id="qBar" style="height:100%;width:20%;background:linear-gradient(90deg,#D4A574,#8B2A3F);transition:width .5s var(--ease)"></div></div></div>
            </div>
          </div>
        </div>
      </div>
      <p class="r muted" style="margin-top:.7rem;font-size:.72rem;text-align:center">Fuentes: Interact Quiz Report 2026 (40,1% vs 6,6%) · Dashform 2026 · Adfirm Meta Lead Gen 2026.</p>
    </div>`},

  // 4a ANUNCIOS REALES QUE ESTÁN CORRIENDO
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Anuncios reales que están corriendo</span>
      <h2 class="r" style="margin-top:.7rem">Lo que el sector lanza <em>hoy</em> en Meta.</h2>
      <p class="r muted" style="margin-top:.4rem;font-size:.88rem">Sacados de Meta Ad Library, BrandMov, Evolut Agency y We Run Ads. Patrón claro: hook íntimo + objeto del deseo + CTA suave.</p>
      <div class="r" style="margin-top:.9rem;display:grid;gap:.7rem;grid-template-columns:1fr">
        <div class="metaad"><div class="head-ad"><div class="ad-av"></div><div><strong>Winter Garden Aesthetics</strong><small>Patrocinado · Florida · Hydrafacial</small></div></div><div class="ad-img" data-text='"The results are in!" — Best Hydrating Facial 2026'></div><div class="cta-ad"><div><strong>Reserva</strong><small>HydroGlow Facial · oferta de lanzamiento</small></div><div class="cta-btn">Más información</div></div></div>
        <div class="metaad"><div class="head-ad"><div class="ad-av"></div><div><strong>Glow Aesthetics London</strong><small>Patrocinado · Reels · Lip Filler</small></div></div><div class="ad-img" data-text="I didn't expect this to work…"></div><div class="cta-ad"><div><strong>UGC reveal</strong><small>Cliente real · 36s sin cortes</small></div><div class="cta-btn">Reserva valoración</div></div></div>
        <div class="metaad"><div class="head-ad"><div class="ad-av"></div><div><strong>Symmetry Aesthetics</strong><small>Patrocinado · Gift Card 100€</small></div></div><div class="ad-img" data-text='Tu mejor versión empieza con 100€ de regalo'></div><div class="cta-ad"><div><strong>Lead magnet</strong><small>100€ en tu primer tratamiento</small></div><div class="cta-btn">Quiero el cheque</div></div></div>
      </div>
      <p class="r muted" style="margin-top:.9rem;font-size:.72rem">Patrón: hooks UGC en primera persona + premio tangible + texto que evita afirmaciones médicas. Sin antes/después split-screen (Meta lo veta). Fuentes: Meta Ad Library, BrandMov 2026 (9 hooks dominantes), Evolut 500 top beauty ads, DigitalMedSpa 2026.</p>
    </div>`},

  // 4b POR QUÉ EL QUIZ BATE AL INSTANT FORM
  {dark:false,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Por qué bate al Instant Form</span>
      <h2 class="r" style="margin-top:.7rem">CPL más caro al inicio. <em>Cost-per-booked</em> más barato al final.</h2>
      <div class="gold-line r"></div>
      <div class="row r" style="margin-top:1rem">
        <div class="feat"><div class="ic">×3-5</div><strong>cualificación del lead</strong><p>El quiz obliga a leer, pensar y elegir. La fricción ES la cualificación. Instant Form pre-rellena y atrae curiosos.</p></div>
        <div class="feat"><div class="ic">40,1%</div><strong>conversión media del quiz</strong><p>Interact 2026: quizzes convierten al 40,1% vs 6,6% landings estáticas. Y 10× una contact form.</p></div>
        <div class="feat"><div class="ic">-60%</div><strong>cost-per-booked</strong><p>El show-rate y el cierre en consulta suben. Show × close × LTV gana sobre CPL en estética.</p></div>
        <div class="feat"><div class="ic">★</div><strong>efecto wow</strong><p>El lead vive una experiencia personalizada con su recomendación, no un formulario gris de Meta.</p></div>
        <div class="feat"><div class="ic">📊</div><strong>data rica</strong><p>Recoges preferencias, plazo, presupuesto y objeción. La IA llega al chat con contexto que el Instant Form no da.</p></div>
        <div class="feat"><div class="ic">⚙</div><strong>tu dato, no Meta</strong><p>El quiz vive en tu dominio, en tu CRM, con tu pixel + CAPI server-side. Si Meta sube precios o cierra tu cuenta, conservas todo.</p></div>
      </div>
      <p class="r muted" style="margin-top:1rem;font-size:.78rem">El Instant Form gana solo si el equipo de ventas absorbe leads pobres y los limpia por teléfono. En estética no aplica: la doctora cobra por consulta, no quiere atender 30 curiosos para sacar 3 clientes. AURA monta el embudo correcto.</p>
    </div>`},

  // 4c CHAT IA POST-QUIZ: PROS Y CONTRAS
  {dark:false,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Chat IA justo después del quiz</span>
      <h2 class="r" style="margin-top:.7rem">No es magia. Tiene <em>pros y contras</em> reales.</h2>
      <div class="gold-line r"></div>
      <div class="row r" style="margin-top:1rem">
        <div class="feat"><div class="ic">+</div><strong>Speed-to-lead &lt;30 s</strong><p>Hyperleap data: el chat responde 4× más rápido que humano. Llegas al hot lead antes que tu competencia.</p></div>
        <div class="feat"><div class="ic">+</div><strong>Educa sobre tratamientos</strong><p>Explica Botox vs filler, tiempos, dudas comunes. El lead llega a la consulta ya pre-vendido.</p></div>
        <div class="feat"><div class="ic">+</div><strong>Reserva con calendario embebido</strong><p>Calendly / Cal.com en el propio chat. Sin teléfonos, sin ida y vuelta.</p></div>
        <div class="feat"><div class="ic">+</div><strong>Captura datos extra</strong><p>Alergias, presupuesto, plazo. El equipo presencial llega cualificado y eficiente.</p></div>
        <div class="feat"><div class="ic">−</div><strong>Riesgo médico-legal</strong><p>NUNCA debe dar consejo médico ni claims FDA/FTC. Mitigación: prompt con guardrails + handoff humano.</p></div>
        <div class="feat"><div class="ic">−</div><strong>Robotiza la marca premium</strong><p>Si suena frío, mata el ticket alto. Mitigación: voz humana del negocio + audio del dueño al inicio.</p></div>
        <div class="feat"><div class="ic">−</div><strong>HIPAA / GDPR</strong><p>Datos sensibles en el chat. Mitigación: cifrado at-rest, no entrenar con datos del paciente, auditoría.</p></div>
        <div class="feat"><div class="ic">−</div><strong>Lead nocturno reserva, no aparece</strong><p>Workee 2026: 40% reservas son fuera de horario, pero sube no-show. Mitigación: depósito 30-50€ + recordatorio voz IA 24h.</p></div>
      </div>
      <p class="r muted" style="margin-top:1rem;font-size:.78rem">Conclusión: el chat IA post-quiz funciona <strong>si</strong> tiene guardrails médicos, tono humano, calendario nativo, depósito y handoff a humano cuando toca. AURA lo trae configurado.</p>
    </div>`},

  // 4d QUIÉN LO ESTÁ HACIENDO YA EN EL MUNDO
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Quién lo está haciendo ya</span>
      <h2 class="r" style="margin-top:.7rem">El embudo Quiz → Chat IA → Cita <em>ya existe</em>. Pero parcial.</h2>
      <p class="r muted" style="margin-top:.4rem;font-size:.88rem">Nadie lo entrega completo y modular para 1.000 clínicas. AURA es el primer SaaS que lo empaqueta así.</p>
      <div class="list r" style="margin-top:1rem">
        <div class="item"><span class="num">🇬🇧</span><div><strong>Hyperleap (UK + US)</strong><p>Chat IA en Instagram DM y web para medspas. Reserva en Cal.com. <em>Falta el embudo Meta Ads completo y el quiz cualificador previo.</em></p></div></div>
        <div class="item"><span class="num">🇺🇸</span><div><strong>PxlPeak (US)</strong><p>Agentes IA + voz + 45 herramientas para medspas. Done-For-You por agencia. <em>No es SaaS escalable, es servicio.</em></p></div></div>
        <div class="item"><span class="num">🇺🇸</span><div><strong>Workee (US)</strong><p>AI booking + reminders + outreach para medspas y salones. <em>Falta el quiz pre-cualificador y el embudo Meta Ads.</em></p></div></div>
        <div class="item"><span class="num">🇬🇧</span><div><strong>ClinicGrower (UK)</strong><p>Agencia con embudo y quiz para clínicas estéticas. <em>Es servicio, no producto. No incluye chat IA ni recordatorios voz.</em></p></div></div>
        <div class="item"><span class="num">🇪🇸</span><div><strong>Glow Marketing (Sevilla)</strong><p>Máx 30 clínicas/mes. Done-For-You con quiz y CRM. 7× ROI 90d. <em>Tope de capacidad humana. No escala.</em></p></div></div>
        <div class="item"><span class="num">🇺🇸</span><div><strong>Holly Nimblr (US)</strong><p>Voz IA para dental con garantía 600% ROI. <em>Solo voz, no embudo completo.</em></p></div></div>
        <div class="item"><span class="num">🇪🇸</span><div><strong>ClinicGrowth (Madrid)</strong><p>Setup + 3 meses + ad spend 900-2000€/mes. <em>Servicio, no SaaS. Cap humano de clínicas.</em></p></div></div>
      </div>
      <p class="r muted" style="margin-top:1rem;font-size:.78rem">El hueco: <strong>nadie ofrece SaaS escalable con quiz + chat IA + calendario + recordatorios voz + banco de anuncios + webinars diarios</strong>, todo en un solo producto, replicable a 6 verticales. Ahí entra AURA.</p>
    </div>`},

  // 4d2 MAPA DE ESTADOS DEL LEAD
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Mapa de estados del lead</span>
      <h2 class="r" style="margin-top:.7rem">11 estados. 5 puntos de fuga. <em>0 leads perdidos</em>.</h2>
      <p class="r muted" style="margin-top:.4rem;font-size:.88rem">Cada estado tiene su flow, su KPI y su disparador de recuperación. Documentado entero en el Playbook.</p>
      <div class="gold-line r"></div>
      <div class="funnel r" style="margin-top:1rem">
        <div class="fstep"><div class="fnum">0</div><div><strong>Impresión del anuncio</strong><p>Meta Ads. CTR &gt;1,5% · CPM &lt;12€.</p></div></div>
        <div class="fstep"><div class="fnum">1</div><div><strong>Clic → Landing</strong><p>Landing &lt;1,2s en Android. Click → Quiz start &gt;65%.</p></div></div>
        <div class="fstep"><div class="fnum">2</div><div><strong>Quiz cualificador 5 preguntas</strong><p>Móvil en pregunta 2. Quiz complete &gt;55%.</p></div></div>
        <div class="fstep"><div class="fnum">3</div><div><strong>Pantalla de resultado</strong><p>Recomendación IA personalizada + casos before/after.</p></div></div>
        <div class="fstep"><div class="fnum">4</div><div><strong>Chat IA con contexto</strong><p>Conoce su nombre, plazo y objeción. Reserva en &lt;5 min.</p></div></div>
        <div class="fstep"><div class="fnum">5</div><div><strong>Calendario + confirmación inmediata</strong><p>Reserva al instante. Sin depósito en v1.0. Email .ics + SMS.</p></div></div>
        <div class="fstep"><div class="fnum">6</div><div><strong>Pre-cita 24h + 4h + 1h</strong><p>Voz IA + SMS + WhatsApp utility. No-show de 22% a &lt;9%.</p></div></div>
        <div class="fstep"><div class="fnum">7</div><div><strong>Día de la cita</strong><p>Recepción humana con ficha cualificada. Cierre &gt;60%.</p></div></div>
        <div class="fstep"><div class="fnum">8</div><div><strong>Aftercare 24h</strong><p>Email + WhatsApp template + NPS.</p></div></div>
        <div class="fstep"><div class="fnum">9</div><div><strong>Reseña 72h</strong><p>FTC compliant. NPS≥9 → Google. ≤6 → gerente.</p></div></div>
        <div class="fstep"><div class="fnum">10</div><div><strong>Membership / reactivación</strong><p>14d upsell. 90d nurture estacional.</p></div></div>
      </div>
    </div>`},

  // 4d3 LOS 5 PUNTOS DE FUGA
  {dark:false,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> 5 puntos de fuga · 5 protocolos de rescate</span>
      <h2 class="r" style="margin-top:.7rem">Cada lugar donde un lead se va, una <em>red de seguridad</em>.</h2>
      <div class="gold-line r"></div>
      <div class="row r" style="margin-top:1rem">
        <div class="feat"><div class="ic">A</div><strong>Abandona el anuncio</strong><p>Retargeting Meta con hook distinto durante 14 d. Si sigue sin clic, sale para no quemar audiencia.</p></div>
        <div class="feat"><div class="ic">B</div><strong>Abandona el quiz a mitad</strong><p>Tras pregunta 2 ya tenemos móvil. SMS link mágico +1 min, email +30 min, voz IA +24 h. Vuelve a la pregunta exacta donde se fue. Recovery &gt;35%.</p></div>
        <div class="feat"><div class="ic">C</div><strong>Abandona el chat IA</strong><p>4 disparadores: inactividad 90 s, pérdida de foco, exit-intent, mensaje sin respuesta. Cross-device memory. Recovery 30-40%.</p></div>
        <div class="feat"><div class="ic">D</div><strong>Termina chat pero no agenda</strong><p>Objeción detectada por IA. VSL personalizado por objeción (precio/miedo/plazo). 18-25% reservan en 21 d.</p></div>
        <div class="feat"><div class="ic">E</div><strong>Reserva pero no se presenta</strong><p>WhatsApp utility +30 min, voz IA empatíca +2 h, email reprogramación +24 h. 2 no-shows = depósito ampliado. 40% reprograman.</p></div>
        <div class="feat"><div class="ic">✓</div><strong>Trazabilidad cross-canal</strong><p>Thread único con token persistente. Equipo humano ve TODO en un timeline. STOP en un canal = STOP en todos.</p></div>
      </div>
      <p class="r muted" style="margin-top:1rem;font-size:.78rem">Detalle completo + flow + KPIs + reglas anti-baneo en el Playbook: <a href="./PLAYBOOK.md" target="_blank" style="color:var(--berry2);text-decoration:underline">aura-aesthetic-deck/PLAYBOOK.md</a></p>
    </div>`},

  // 4e CADENCIA INFALIBLE DE FOLLOW-UP
  {dark:false,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Cadencia infalible · 21 días · 10 toques</span>
      <h2 class="r" style="margin-top:.7rem">El lead <em>nunca</em> se pierde. Solo cambia de canal.</h2>
      <p class="r muted" style="margin-top:.4rem;font-size:.88rem">Basado en HBR (×21 conversión si contactas en &lt;5 min), ScaleHaven 2026 (cosmetic clinic) y LeadHaste 2026 (8-12 toques 14-21 días es óptimo).</p>
      <div class="gold-line r"></div>
      <div class="funnel r" style="margin-top:1rem">
        <div class="fstep"><div class="fnum">1</div><div><strong>0-60 s · Chat IA web</strong><p>El lead reserva sin salir del chat. Si reserva, fin. Si se va, salta el resto.</p></div></div>
        <div class="fstep"><div class="fnum">2</div><div><strong>+1 min · SMS con link mágico</strong><p>"Te he guardado el sitio. Sigue aquí: aura.link/m/9xK3" — abre la sesión exacta donde la dejó.</p></div></div>
        <div class="fstep"><div class="fnum">3</div><div><strong>+2 min · Email con resumen del quiz</strong><p>Recomendación personalizada + 2 fotos before/after + botón "continuar".</p></div></div>
        <div class="fstep"><div class="fnum">4</div><div><strong>+1 h · SMS recordatorio suave</strong><p>"Marta, teníamos hueco esta semana — mira aquí".</p></div></div>
        <div class="fstep"><div class="fnum">5</div><div><strong>+24 h · Voz IA breve (sólo si abrió el SMS)</strong><p>"Hola Marta, soy de Clínica Elvira, ¿quieres que cerremos la cita en 2 min?"</p></div></div>
        <div class="fstep"><div class="fnum">6</div><div><strong>+3 días · Email valor puro</strong><p>Guía PDF del tratamiento + caso real + link de cita.</p></div></div>
        <div class="fstep"><div class="fnum">7</div><div><strong>+7 días · SMS testimonio</strong><p>Audio de 20 s del dueño "esto es lo que decimos a Marta" — humaniza.</p></div></div>
        <div class="fstep"><div class="fnum">8</div><div><strong>+14 días · Email break-up</strong><p>"Voy a cerrar tu ficha. Si aún te interesa, dime cuándo". 10-15% de respuestas extra (LeadHaste 2026).</p></div></div>
        <div class="fstep"><div class="fnum">9</div><div><strong>+30 días · Reactivación estacional</strong><p>"Hidratación tras verano", "rejuvenecer antes de Navidad".</p></div></div>
      </div>
    </div>`},

  // 4f DIAGRAMA DE DECISIÓN: SI EL LEAD SE VA
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Si el lead se va · árbol de decisión</span>
      <h2 class="r" style="margin-top:.7rem">La lógica que <em>nunca pierde</em> trazabilidad.</h2>
      <div class="gold-line r"></div>
      <div class="list r" style="margin-top:1rem">
        <div class="item"><span class="num">→</span><div><strong>Si abandona el chat</strong> (90 s sin teclear, cierre de pestaña, exit-intent)<p>→ SMS "link mágico" + página con 3 botones: 1) Seguir aquí 2) WhatsApp 3) Te llamo yo en 2 min.</p></div></div>
        <div class="item"><span class="num">→</span><div><strong>Si abre el SMS pero no clica</strong> (medible con shortlink)<p>→ Email con resumen del quiz + recomendación IA personalizada + Calendly embebido.</p></div></div>
        <div class="item"><span class="num">→</span><div><strong>Si pulsa "WhatsApp"</strong><p>→ Se abre wa.me con el token 9xK3 — <em>el lead escribe el primer mensaje</em>. Cero baneo. Meta abre la ventana de 24 h.</p></div></div>
        <div class="item"><span class="num">→</span><div><strong>Si no abre el SMS en 1 h</strong><p>→ Segundo SMS desde otro short-link diferente para esquivar filtros. Mismo deeplink.</p></div></div>
        <div class="item"><span class="num">→</span><div><strong>Si no responde en 24 h</strong><p>→ Voz IA breve (3 frases). Si descuelga, ofrece cerrar cita. Si no descuelga, deja audio de 15 s.</p></div></div>
        <div class="item"><span class="num">→</span><div><strong>Si rebota el email</strong><p>→ Se quema esa dirección para esa lista, se reintenta solo via SMS y voz IA. Protege la reputación del dominio.</p></div></div>
        <div class="item"><span class="num">→</span><div><strong>Si responde "STOP" / "BAJA"</strong><p>→ Sale automáticamente de TODOS los canales. Cumplimiento LSSI + GDPR + Meta.</p></div></div>
        <div class="item"><span class="num">→</span><div><strong>Si llega a día 14 sin reaccionar</strong><p>→ Break-up email ("voy a cerrar tu ficha") + cambio de cohorte a re-engagement estacional.</p></div></div>
      </div>
      <p class="r muted" style="margin-top:1rem;font-size:.74rem">Cada paso queda en el thread único con token persistente. Cuando el equipo humano abre la ficha, ve TODA la historia cronológica en un solo timeline.</p>
    </div>`},

  // 4g CHAT WEB vs WHATSAPP · POR FASE
  {dark:false,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Chat web vs WhatsApp · por fase</span>
      <h2 class="r" style="margin-top:.7rem">No es uno u otro. <em>Es secuencia</em>.</h2>
      <div class="gold-line r"></div>
      <div class="row r" style="margin-top:1rem">
        <div class="feat"><div class="ic">1</div><strong>Captación inicial → Chat web</strong><p>El chat hereda el contexto exacto del quiz, abre calendario embebido y reserva. Sin opt-in WhatsApp todavía. Cumple GDPR sin esfuerzo.</p></div>
        <div class="feat"><div class="ic">2</div><strong>Si abandona → SMS link mágico</strong><p>El SMS no necesita opt-in marketing si va dentro de la "continuación de servicio iniciada por el lead". Trustworthy y rápido.</p></div>
        <div class="feat"><div class="ic">3</div><strong>Continuación premium → WhatsApp</strong><p>Sólo si <strong>el lead</strong> pulsa el botón y inicia. Meta abre ventana de 24 h y todo es session conversation. Free-form.</p></div>
        <div class="feat"><div class="ic">4</div><strong>Pre-cita → SMS + voz IA</strong><p>SMS + recordatorio voz IA 24 h y 2 h antes. Sin tocar WhatsApp para no quemar la ventana.</p></div>
        <div class="feat"><div class="ic">5</div><strong>Post-visita → WhatsApp (template aprobado)</strong><p>Review request + upsell de membership con template marketing pre-aprobado por Meta. Permitido y con consentimiento ya documentado.</p></div>
        <div class="feat"><div class="ic">6</div><strong>Reactivación &gt;60 días → Email + SMS</strong><p>WhatsApp solo si hay opt-in explícito y template aprobado. Si no, email + SMS.</p></div>
      </div>
      <p class="r muted" style="margin-top:1rem;font-size:.78rem">Regla de oro: <strong>WhatsApp solo cuando el lead lo elige</strong>. Email para contenido extenso. SMS para acción inmediata. Voz IA para confirmar y romper objeción.</p>
    </div>`},

  // 4h ANTI-BANEO POR CANAL
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Anti-baneo por canal</span>
      <h2 class="r" style="margin-top:.7rem">Reglas que evitan <em>quemar la cuenta</em>.</h2>
      <div class="gold-line r"></div>
      <div class="row r" style="margin-top:1rem">
        <div class="feat"><div class="ic">SMS</div><strong>SMS · LSSI/TCPA compliant</strong><p>Opt-in registrado al rellenar el quiz. "STOP" funcional. Sender ID estable. Máx 3 SMS/día. Doble short-link para esquivar filtros. Mensaje breve sin emojis spam.</p></div>
        <div class="feat"><div class="ic">WA</div><strong>WhatsApp · Meta API 2026</strong><p>NUNCA iniciar nosotros. Siempre el lead pulsa wa.me. Ventana 24 h activa. Templates marketing pre-aprobados. Quality rating verde. Privacy policy URL pública. Verificación de negocio.</p></div>
        <div class="feat"><div class="ic">@</div><strong>Email · reputación SPF/DKIM/DMARC</strong><p>Calentado del dominio 30 días antes. SPF + DKIM + DMARC. List-Unsubscribe header. Asunto sin spam-words. Texto/HTML ratio sano. Bounce rate &lt;3%. Reply rate medible.</p></div>
        <div class="feat"><div class="ic">📞</div><strong>Voz IA · STIR/SHAKEN</strong><p>Número local con verificación. Máx 2 intentos por lead. NO marcar fuera de 9-21h. Identificarse en los primeros 5 s. Audio del dueño opcional pero no clonado sin permiso.</p></div>
        <div class="feat"><div class="ic">META</div><strong>Meta Ads · Conversion API</strong><p>Pixel + CAPI server-side. Sin claims médicos. Evitar split-screen before/after. Privacy policy URL accesible. Audiencias broad + lookalike, no targeting de salud sensible.</p></div>
        <div class="feat"><div class="ic">CRM</div><strong>Trazabilidad · thread único</strong><p>Cada lead = un thread con token. Si responde STOP en cualquier canal, sale de TODOS. Log de consentimiento auditable. Cumplimiento LSSI + GDPR + Meta + CAN-SPAM en una sola capa.</p></div>
      </div>
      <p class="r muted" style="margin-top:1rem;font-size:.74rem">Fuentes: AuditSocials WhatsApp API 2026, Meta WhatsApp Policy Feb-2026 (opt-in activo + verificación + privacy URL), LSSI-CE España, TCPA US, CAN-SPAM, ScaleHaven 2026.</p>
    </div>`},

  // 5 CHAT IA QUE RESERVA LA CITA
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Paso 3 · Chat IA que reserva la cita</span>
      <h2 class="r" style="margin-top:.7rem">En <em>menos de 5 min</em>. Tasa de conversión ×3-5.</h2>
      <p class="r muted" style="margin-top:.4rem;font-size:.88rem">El chat IA toma el control: resuelve dudas, abre el calendario y reserva la cita en la agenda. Sin venta a presión. Sin esperar al recepcionista.</p>
      <div class="r" style="margin-top:1rem;display:flex;justify-content:center">
        <div class="phone">
          <div class="notch"></div>
          <div class="screen">
            <div class="header"><span class="av"></span><span>${V.callerName}<small>en línea · responde en 30 s</small></span></div>
            <div id="chatBox" style="display:flex;flex-direction:column;gap:6px;flex:1;overflow:hidden;min-height:0"></div>
            <div id="calBox" class="cal" style="display:none">
              <div class="cal-head"><span>Esta semana</span><span style="font-size:.65rem;color:#c9b8b3">Mar 4 jun</span></div>
              <div class="grid">
                <div class="slot taken">10:00</div><div class="slot">11:30</div><div class="slot">13:00</div><div class="slot">17:00</div>
                <div class="slot">17:30</div><div class="slot taken">18:00</div><div class="slot sel" id="calSel">19:00</div><div class="slot">20:00</div>
              </div>
              <div class="confirm hidden" id="calConfirm">✓ Cita confirmada · jue 6 jun · 19:00</div>
            </div>
          </div>
        </div>
      </div>
    </div>`},

  // 6 RECORDATORIOS IA (24h + 2h)
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Paso 4 · Recordatorios IA</span>
      <h2 class="r" style="margin-top:.7rem">SMS + <em>voz IA</em> que confirma. No para vender.</h2>
      <p class="r muted" style="margin-top:.4rem;font-size:.88rem">La IA solo llama para confirmar 24h y 2h antes. Baja el no-show de 22% a menos de 9%. Lo confirma Ringlyn AI.</p>
      <div class="timeline-rem r" style="margin-top:1rem">
        <div class="tline"><div class="ic">✓</div><div class="when">Al instante</div><div class="what">SMS de confirmación<small>+ enlace de Google Maps + WhatsApp</small></div></div>
        <div class="tline"><div class="ic">✓</div><div class="when">24h antes</div><div class="what">Llamada IA "¿confirmas?"<small>Reagenda si dice que no puede</small></div></div>
        <div class="tline success"><div class="ic">📞</div><div class="when">2h antes</div><div class="what">Llamada IA recordatorio<small>"Te esperamos a las 19:00"</small></div></div>
      </div>
      <div class="row r" style="margin-top:1rem">
        <div class="feat"><div class="ic">-60%</div><strong>no-show</strong><p>Voz IA inbound vs SMS solo.</p></div>
        <div class="feat"><div class="ic">+24%</div><strong>show rate</strong><p>Llamada IA 24h + 2h combinadas.</p></div>
      </div>
    </div>`},

  // 7 LO QUE NO HACEMOS (sin DFY)
  {dark:false,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Lo que <strong>NO</strong> hacemos</span>
      <h2 class="r" style="margin-top:.7rem">Cero Done-For-You. <em>Margen del 80%</em>.</h2>
      <div class="gold-line r"></div>
      <div class="row r" style="margin-top:1rem">
        <div class="feat"><div class="ic">✗</div><strong>Reels personalizados por clínica</strong><p>No grabamos avatares ni clonamos voces. Eso no escala. Usamos banco mensual genérico.</p></div>
        <div class="feat"><div class="ic">✗</div><strong>Caller IA de venta</strong><p>Nadie pagaría una llamada IA para reserva inicial. La IA solo confirma 24h y 2h antes.</p></div>
        <div class="feat"><div class="ic">✗</div><strong>Reactivación BBDD manual</strong><p>No hacemos llamadas a fuego. Reactivación = email + SMS + chatbot automático.</p></div>
        <div class="feat"><div class="ic">✗</div><strong>12 sesiones 1:1 por cliente</strong><p>Hacemos webinars en directo ilimitados. Un consultor sirve a 1.000 clínicas.</p></div>
        <div class="feat"><div class="ic">✗</div><strong>Lanzar campañas a mano</strong><p>El cliente lanza las suyas siguiendo plantillas. Nosotros formamos en webinar.</p></div>
        <div class="feat"><div class="ic">✗</div><strong>Setup individual por sector</strong><p>Templates listos. Cambia 5 campos y está vivo.</p></div>
      </div>
    </div>`},

  // 8 LO QUE SÍ ENTREGAMOS (todo escalable)
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Lo que <strong>SÍ</strong> entregamos</span>
      <h2 class="r" style="margin-top:.7rem">Todo escalable a coste marginal <em>≈ 0</em>.</h2>
      <div class="gold-line r"></div>
      <div class="list r" style="margin-top:1rem">
        <div class="item"><span class="num">①</span><div><strong>Banco mensual de 5 anuncios genéricos</strong><p>Grabados con actor/actriz. Sin logo. La clínica añade ciudad y CTA. Lo mismo para todas. Sale 60€/anuncio amortizado entre 200 clínicas.</p></div></div>
        <div class="item"><span class="num">②</span><div><strong>Plantillas de Meta Ads listas</strong><p>Campaña Leads + Instant Form + audiencias + hooks copiables. La clínica clica "lanzar".</p></div></div>
        <div class="item"><span class="num">③</span><div><strong>Constructor de embudo "pegar URL"</strong><p>Quiz, chat IA, calendario y CRM montados en 10 min con la URL del cliente. Coste marginal 0.</p></div></div>
        <div class="item"><span class="num">④</span><div><strong>Chat IA con prompt configurable</strong><p>El cliente edita su prompt en 2 min. Reserva en el calendario. Servido con LLM compartido.</p></div></div>
        <div class="item"><span class="num">⑤</span><div><strong>Recordatorios IA 24h + 2h</strong><p>SMS instantáneo + voz IA con cuota mensual incluida (350 min). Excedente a 0,15€/min.</p></div></div>
        <div class="item"><span class="num">⑥</span><div><strong>Webinars diarios en directo · sin límite</strong><p>Mañana: lanzamiento Meta Ads. Mediodía: optimización. Tarde: CRM y embudo. Un consultor → 1.000 cuentas a la vez. Si satura, dobla franja.</p></div></div>
        <div class="item"><span class="num">⑦</span><div><strong>Comunidad Skool</strong><p>Los clientes se ayudan entre sí. Caso de uso, plantillas, dudas. Más escalable imposible.</p></div></div>
        <div class="item"><span class="num">⑧</span><div><strong>Dashboard CRM SDR-first</strong><p>Lee leads, agenda, score, reserva. Conexión nativa con Meta Conversion API.</p></div></div>
      </div>
    </div>`},

  // 9 WEBINARS LIVE
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Webinars diarios sin límite</span>
      <h2 class="r" style="margin-top:.7rem">Un consultor. <em>Mil clínicas</em>. Tres franjas al día.</h2>
      <p class="r muted" style="margin-top:.4rem;font-size:.88rem">Asisten los nuevos clientes en su semana 1 y los veteranos cuando quieran refrescar. Quedan grabados para los que no puedan.</p>
      <div class="r" style="margin-top:1rem">
        <div class="webinar">
          <div class="live-tag">EN DIRECTO</div>
          <h4>Cómo lanzar tu primera campaña Meta Ads</h4>
          <div class="speaker">Iván Cortés · consultor performance</div>
          <div class="session"><div class="hour">10:00</div><div class="topic">Meta Ads desde 0<small>Lanzamiento de campaña paso a paso</small></div></div>
          <div class="session"><div class="hour">13:30</div><div class="topic">Optimización<small>Cómo bajar el CPL y limpiar leads</small></div></div>
          <div class="session"><div class="hour">17:30</div><div class="topic">CRM + embudo<small>Chat IA, agenda, recordatorios</small></div></div>
          <div class="viewers"><span>👥</span><span class="views-num" id="viewerCount">0</span><span>clínicas viendo ahora</span></div>
        </div>
      </div>
    </div>`},

  // 10 DASHBOARD QUE SE LLENA
  {dark:false,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Paso 5 · Dashboard SDR-first</span>
      <h2 class="r" style="margin-top:.7rem">Ves el lead caliente y la cita <em>reservada</em>.</h2>
      <div class="r" style="margin-top:1rem">
        <div class="dash">
          <div class="head"><span class="av"></span> ${V.business} · panel</div>
          <div class="body">
            <div class="stats">
              <div class="stat"><b id="kLeads">0</b><span>Leads/mes</span></div>
              <div class="stat"><b id="kBook">0</b><span>Citas reservadas</span></div>
              <div class="stat"><b id="kShow">0%</b><span>Show rate</span></div>
            </div>
            <div id="leadList"></div>
          </div>
        </div>
      </div>
    </div>`},

  // 11 REPLICABILIDAD
  {dark:false,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> Una infra, 6 verticales</span>
      <h2 class="r" style="margin-top:.7rem">Cambia el <em>playbook</em>, no la arquitectura.</h2>
      <div class="vlist r" style="margin-top:1rem">
        ${Object.entries(VERT).map(([k,v])=>`<div class="vcard" data-go="${k}"><b>${v.label}</b><span>${(v.sub||'').split('.')[0]}</span></div>`).join('')}
      </div>
      <p class="muted r" style="margin-top:.8rem;font-size:.78rem">Toca cualquier vertical para ver su pitch entero adaptado.</p>
    </div>`},

  // 12 OFERTA
  {dark:true,build:()=>`
    <div class="container">
      <span class="pill r"><span class="dot"></span> La oferta</span>
      <h2 class="r" style="margin-top:.7rem">90 días <em>para llenar tu agenda</em>. O regalamos el siguiente trimestre.</h2>
      <div class="r" style="margin-top:1rem">
        <table class="offer-table">
          <tr><td>① Embudo Meta Ads + Instant Form + plantillas</td><td>1.500 €</td></tr>
          <tr><td>② Chat IA que reserva la cita</td><td>2.000 €</td></tr>
          <tr><td>③ Recordatorios IA (350 min/mes)</td><td>1.500 €</td></tr>
          <tr><td>④ Banco mensual de 5 anuncios + plantillas</td><td>2.500 €</td></tr>
          <tr><td>⑤ CRM + dashboard SDR-first</td><td>1.500 €</td></tr>
          <tr><td>⑥ Webinars diarios ilimitados (90 días)</td><td>1.800 €</td></tr>
          <tr><td>⑦ Comunidad Skool privada</td><td>500 €</td></tr>
          <tr><td>⑧ Onboarding express en 1 sesión grupal</td><td>500 €</td></tr>
          <tr><td>⑨ Garantía 90 días o trimestre extra gratis</td><td>—</td></tr>
          <tr class="total"><td>Valor declarado</td><td>${V.valueTotal}</td></tr>
        </table>
      </div>
      <div class="price-box r" style="margin-top:1rem">
        <div class="kicker" style="color:var(--rose)">Inversión 90 días</div>
        <div class="big">${V.pricing.a}</div>
        <div style="font-size:.85rem;color:var(--rose);margin-top:.2rem">${V.pricing.b}</div>
      </div>
    </div>`},

  // 13 CIERRE
  {dark:true,build:()=>`
    <div class="container" style="text-align:center">
      <span class="pill r"><span class="dot"></span> Próximo paso</span>
      <h2 class="r" style="margin-top:.7rem">${V.closing.replace(/10 minutos|10 min/,m=>`<em>${m}</em>`)}</h2>
      <div class="gold-line r" style="margin:1rem auto"></div>
      <p class="r" style="font-size:1rem;color:#f5ecdc;max-width:520px;margin:.5rem auto 0">Demo grupal 30 min. Te dejo el embudo listo. <strong style="color:var(--rose)">Tú lanzas las campañas, tú recibes los pacientes, tú cobras.</strong></p>
      <a class="btn-cta r" href="#" id="cta" style="margin-top:1.4rem">Reservar demo</a>
      <p class="r" style="margin-top:1.4rem;font-family:'Cormorant Garamond';font-size:1.4rem;color:var(--rose)">"Si esto lo enchufas, alucinas."</p>
    </div>`}
]);

/* ============== RUNTIME ============== */
const deck=document.getElementById('deck');
const vsw=document.getElementById('vsw');
const progress=document.getElementById('progress');
let i=0,slides=[],V=null,timers=[];

Object.entries(VERT).forEach(([k,v])=>{
  const b=document.createElement('button');
  b.dataset.k=k;b.textContent=v.label;
  b.onclick=()=>setVertical(k);
  vsw.appendChild(b);
});

function setVertical(key){
  V=VERT[key];
  document.body.dataset.vertical=key;
  const t=V.theme,r=document.documentElement.style;
  r.setProperty('--bg',t.bg);r.setProperty('--ink',t.ink);
  r.setProperty('--berry',t.berry);r.setProperty('--berry2',t.berry2);
  r.setProperty('--rose',t.rose);r.setProperty('--gold',t.gold);
  r.setProperty('--cream',t.cream);r.setProperty('--muted',t.muted);
  r.setProperty('--line',t.line);r.setProperty('--accent',t.accent);
  document.title=`AURA ${V.label} · pitch deck`;
  [...vsw.children].forEach(b=>b.classList.toggle('on',b.dataset.k===key));

  slides=SL(V);
  deck.innerHTML='';progress.innerHTML='';
  slides.forEach((s,k)=>{
    const sec=document.createElement('section');
    sec.className='slide'+(s.dark?' dark':'');
    sec.innerHTML=s.build();
    deck.appendChild(sec);
    const dot=document.createElement('span');progress.appendChild(dot);
    sec.querySelectorAll('[data-go]').forEach(c=>c.addEventListener('click',()=>{setVertical(c.dataset.go);go(0)}));
  });
  go(Math.min(i,slides.length-1));
}

function go(n){
  n=Math.max(0,Math.min(slides.length-1,n));
  timers.forEach(t=>clearTimeout(t));timers=[];
  [...deck.children].forEach((el,k)=>{
    el.classList.remove('exit-left');
    if(k===n){el.classList.add('active');setTimeout(()=>animateContent(k,el),50)}
    else if(k===i){el.classList.remove('active');el.classList.add('exit-left')}
    else{el.classList.remove('active','exit-left')}
  });
  [...progress.children].forEach((el,k)=>el.classList.toggle('active',k===n));
  document.body.classList.toggle('dark-bar',!!slides[n].dark);
  i=n;
}

function animateContent(idx,slide){
  if(slide.querySelector('#adbank'))playAdBank(slide);
  if(slide.querySelector('#qOptions'))playQuizMulti(slide);
  if(slide.querySelector('#chatBox'))playChat(slide);
  if(slide.querySelector('#viewerCount'))playViewers(slide);
  if(slide.querySelector('#leadList'))playDash(slide);
}

/* ANIM: AD BANK */
function playAdBank(slide){
  const bank=slide.querySelector('#adbank');bank.innerHTML='';
  ['Hook 01','Hook 02','Hook 03','Hook 04','Hook 05'].forEach((h,k)=>{
    const c=document.createElement('div');c.className='adcard';c.style.animationDelay=(k*80)+'ms';
    c.innerHTML=`<span class="ad-tag">${h}</span>`;
    bank.appendChild(c);
  });
}

/* ANIM: QUIZ MULTI-STEP */
function playQuizMulti(slide){
  const bar=slide.querySelector('#qBar');
  const step=slide.querySelector('#qstep');
  const title=slide.querySelector('#qTitle');
  const optsBox=slide.querySelector('#qOptions');
  if(!bar||!optsBox)return;
  const questions=[
    {q:'¿Qué te llevaría a dar el paso?',o:['Sentirme mejor conmigo','Tengo un evento próximo','Aún me informo','Llevo años pensándolo']},
    {q:'¿Qué tratamiento te interesa más?',o:['Labios glow','Rinomodelación','HIFU lifting','Otro']},
    {q:'¿En qué plazo lo harías?',o:['Esta semana','Este mes','En 2-3 meses','No tengo prisa']},
    {q:'¿Has hecho algún tratamiento antes?',o:['Nunca','Una vez','Varias veces','Paciente habitual']},
    {q:'¿Cuál es tu mayor preocupación?',o:['Naturalidad','Precio','Recuperación','Resultados']}
  ];
  let s=0;
  const renderOptions=(arr)=>{optsBox.innerHTML=arr.map(o=>`<span class="opt">${o}</span>`).join('');};
  const cycle=()=>{
    const Q=questions[s];
    title.textContent=Q.q;
    renderOptions(Q.o);
    const opts=[...optsBox.querySelectorAll('.opt')];
    bar.style.width=((s+1)*20)+'%';
    if(step)step.textContent=s+1;
    timers.push(setTimeout(()=>{
      const target=opts[Math.floor(Math.random()*opts.length)];
      if(target)target.classList.add('sel');
    },650));
    s=(s+1)%questions.length;
    timers.push(setTimeout(cycle,2400));
  };
  cycle();
}

/* ANIM: CHAT + CALENDAR */
function playChat(slide){
  const box=slide.querySelector('#chatBox');
  const calBox=slide.querySelector('#calBox');
  const calConfirm=slide.querySelector('#calConfirm');
  if(!box)return;
  box.innerHTML='';
  const msgs=V.chat;
  let k=0;
  const next=()=>{
    if(k>=msgs.length){
      // Después del chat, abre el calendario y confirma la cita
      timers.push(setTimeout(()=>{if(calBox)calBox.style.display='block'},700));
      timers.push(setTimeout(()=>{if(calConfirm)calConfirm.classList.remove('hidden')},2200));
      timers.push(setTimeout(()=>{
        // restart loop
        box.innerHTML='';
        if(calBox)calBox.style.display='none';
        if(calConfirm)calConfirm.classList.add('hidden');
        k=0;next();
      },5800));
      return;
    }
    const m=msgs[k];
    if(m.who==='ai'){
      const ty=document.createElement('div');ty.className='typing';ty.innerHTML='<i></i><i></i><i></i>';
      box.appendChild(ty);
      timers.push(setTimeout(()=>{
        ty.remove();
        const b=document.createElement('div');b.className='bubble ai';b.textContent=m.t;box.appendChild(b);
        k++;timers.push(setTimeout(next,m.t.length*22+500));
      },900));
    }else{
      const b=document.createElement('div');b.className='bubble me';b.textContent=m.t;box.appendChild(b);
      k++;timers.push(setTimeout(next,800));
    }
  };
  next();
}

/* ANIM: VIEWERS COUNTER */
function playViewers(slide){
  const el=slide.querySelector('#viewerCount');
  if(!el)return;
  let n=183;el.textContent=n;
  const tick=()=>{n+=Math.floor(Math.random()*5)-1;if(n<170)n=183;el.textContent=n;timers.push(setTimeout(tick,1100))};
  tick();
}

/* ANIM: DASHBOARD */
function playDash(slide){
  const list=slide.querySelector('#leadList');
  const kL=slide.querySelector('#kLeads');
  const kB=slide.querySelector('#kBook');
  const kS=slide.querySelector('#kShow');
  const sample=[
    ['Camila R.','Instagram · Lips Glow','book'],
    ['María F.','Reels · Skin Boost','book'],
    ['Andrea S.','Facebook · Rinomod.','hot'],
    ['Valentina K.','WhatsApp · Botox','book'],
    ['Daniela P.','Instagram · Full Face','hot'],
    ['Sofía M.','Reels · Hilos','book'],
  ];
  const animCount=(el,end,suf="")=>{
    let n=0;const dur=1100;const t0=performance.now();
    const step=(t)=>{const p=Math.min(1,(t-t0)/dur);n=end*(1-Math.pow(1-p,3));el.textContent=Math.round(n)+suf;if(p<1)requestAnimationFrame(step)};
    requestAnimationFrame(step);
  };
  list.innerHTML='';
  timers.push(setTimeout(()=>animCount(kL,142),200));
  timers.push(setTimeout(()=>animCount(kB,89),400));
  timers.push(setTimeout(()=>animCount(kS,91,'%'),600));
  sample.forEach((s,k)=>{
    timers.push(setTimeout(()=>{
      const row=document.createElement('div');row.className='lead';
      row.innerHTML=`<div class="pic"></div><div class="who">${s[0]}<small>${s[1]}</small></div><span class="tag ${s[2]}">${s[2]==='book'?'reservada':'caliente'}</span>`;
      list.appendChild(row);
    },800+k*220));
  });
}

/* navigation */
document.getElementById('next').onclick=()=>go(i+1);
document.getElementById('prev').onclick=()=>go(i-1);
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' ')go(i+1);
  if(e.key==='ArrowLeft'||e.key==='PageUp')go(i-1);
});
let touchY=0,touchX=0;
document.addEventListener('touchstart',e=>{touchY=e.touches[0].clientY;touchX=e.touches[0].clientX},{passive:true});
document.addEventListener('touchend',e=>{
  const dy=touchY-e.changedTouches[0].clientY;
  const dx=touchX-e.changedTouches[0].clientX;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)){go(i+(dx>0?1:-1));return}
  if(Math.abs(dy)>60)go(i+(dy>0?1:-1));
},{passive:true});

setVertical('aesthetics');
