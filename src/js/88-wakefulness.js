// ================= бодрость: потолок от времени без сна, отдых сидя, отключка на месте =================
// Чем дольше герой не спит, тем ниже потолок бодрости: проснулся — 100, через 12 игровых часов — 75, через сутки — 50,
// через полтора дня — 25, через двое суток — 0, и герой засыпает там, где стоит (так же — если бодрость кончилась).
// Потолок ограничивает только восстановление: кофе и энергетик бодрят как раньше. Без сна бодрость восстанавливается, только когда сидишь или лежишь (стул, кресло, диван, кровать: «Отдохнуть»),
// и только до потолка. Сон сбрасывает счётчик: каждый час сна снимает четыре часа без сна.
// В кольце бодрости красным — недоступная часть.
const AWAKE_ZERO = 2880;                                                       // минут без сна до потолка 0
const REST_FURN = new Set(['chair', 'armchair', 'sofa', 'bed']);
const enCap = () => P ? Math.max(0, 100 * (1 - (P.awake || 0) / AWAKE_ZERO)) : 100;

// ---- счётчик без сна, потолок, отключка ----
// один шаг на gm игровых минут (вызывается каждый кадр; тесты зовут напрямую)
function wakeTick(gm) {
    if (!P || mode !== 'play') return;
    if (P.sleep) { P.awake = Math.max(0, (P.awake || 0) - gm * 4); P._capMsg = 0; return; }
    P.awake = (P.awake || 0) + gm;
    const cap = enCap();
    // отдых: бодрость растёт до потолка; дошла — встаёт сам
    const A = P.act;
    if (A && A.kind === 'job' && A.rest) {
      if (P.en < cap) P.en = Math.min(cap, P.en + gm * .8);
      A.t = A.dur * Math.min(.999, A.e0 >= cap ? 1 : (P.en - A.e0) / (cap - A.e0));
      if (P.en >= cap - .05) { P.act = null; toast(cap >= 99 ? 'Отдохнул. Бодрость полная' : 'Отдохнул сколько мог. Дальше поможет только сон — ' + Math.round(cap) + '% предел'); }
    }
    if (cap < 50 && !P._capMsg) { P._capMsg = 1; toast('Ты давно не спал: без сна бодрость больше не поднимется выше ' + Math.round(cap) + '%'); }
    // отключка: потолок 0 или бодрость кончилась — засыпает прямо здесь
    if ((cap <= 0 || P.en <= 0) && !P.car && !(typeof TUT !== 'undefined' && TUT.on)) {
      P.en = Math.max(0, P.en); P.act = null; P.sleep = true; P.bed = null; joy.id = null; joy.x = joy.y = 0; $('stick').hidden = true;
      $('sleep').hidden = false; $('ctrl').hidden = true; if (typeof sleepAlarmUI === 'function') sleepAlarmUI();
      toast('Глаза закрылись сами. Ты вырубился прямо здесь'); if (typeof logEv === 'function') logEv('Не выдержал без сна и уснул прямо на месте');
    }
}
{
  let gm0 = null;
  onUpdate(() => {
    if (!P || mode !== 'play') { gm0 = null; return; }
    const gm = gm0 == null ? 0 : Math.max(0, gameMin - gm0); gm0 = gameMin;
    wakeTick(gm);
  });
}

// ---- «Отдохнуть» у стула, кресла, дивана, кровати ----
function restFurnNear() {
  let best = null, bd = 1.5;
  for (const f of furns) if (!f.gone && REST_FURN.has(f.type)) { const d = Math.hypot(f.cx - P.x, f.cy - P.y); if (d < bd) { bd = d; best = f; } }
  return best;
}
addActions(out => {
  if (!P || P.car || P.sleep || (P.act && P.act.rest)) return;
  const f = restFurnNear(); if (!f) return;
  out.push({kind:'rest', label:'Отдохнуть', f});
});
defAction('rest', {name:a => (CONT[a.f.type] && CONT[a.f.type].name) || 'Мебель', run:a => {
  $('actMenu').hidden = true;
  if (zs.some(z => z.state === 'chase' && Math.hypot(z.x - P.x, z.y - P.y) < 12)) { toast('Не до отдыха: мертвецы рядом'); return; }
  const cap = enCap();
  if (P.en >= cap - 1) { toast(cap >= 99 ? 'Ты и так бодр' : 'Отдыхом больше не взбодриться — нужен сон (предел ' + Math.round(cap) + '%)'); return; }
  P.act = {kind:'job', rest:true, f:a.f, t:0, dur:1e9, e0:P.en, loopAn:'sneakidle', fn:() => {}};
  P.face = P.fd = Math.atan2(a.f.cy - P.y, a.f.cx - P.x);
  toast('Отдыхаешь… Двинешься — встанешь');
}});

// ---- кольцо бодрости: недоступная без сна часть — красной дугой ----
{
  const el = typeof statEls !== 'undefined' && statEls.en, svg = el && el.querySelector('svg.ring');
  if (svg) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('class', 'capArc'); c.setAttribute('cx', '20'); c.setAttribute('cy', '20'); c.setAttribute('r', '17');
    svg.appendChild(c);
    const st = document.createElement('style');
    st.textContent = '.gauge .capArc{fill:none;stroke:rgba(214,64,52,.75);stroke-width:4;stroke-dasharray:0 200;transition:stroke-dasharray .4s,stroke-dashoffset .4s}';
    document.head.appendChild(st);
    let last = -1;
    setInterval(() => {
      if (!P || mode !== 'play') return;
      const cap = Math.round(enCap()); if (cap === last) return; last = cap;
      const C = GAUGE_C, on = C * (1 - cap / 100);
      c.style.strokeDasharray = on.toFixed(1) + ' ' + (C * 2).toFixed(1); c.style.strokeDashoffset = (-C * cap / 100).toFixed(1);
    }, 1000);
  }
}

// ---- сохранение ----
onStartNew(() => { if (P) P.awake = 0; });
onSave(d => { if (P) d.xAwake = Math.round(P.awake || 0); });
onLoad(d => { if (P) P.awake = (d && d.xAwake) || 0; });
