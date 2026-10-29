// ================= текстуры домов — заранее, по кусочку в каждом кадре =================
// У каждого дома свой цвет обшивки, обоев и крыши, а текстура цвета считалась целиком при первом появлении дома на экране:
// на планшете игра замирала у каждого нового дома. Теперь текстуры домов вокруг героя считаются заранее, ~4 мс за кадр (texJob).
function houseTex(H) {
  const out = [];
  if (H.paper) out.push(() => TX.paper(H.paper, H.pstyle));
  if (H.wallC) out.push(H.planks || H.kind === 'shed' ? () => TX.planksV(H.wallC) : () => TX.siding(H.wallC));
  if (H.roofC) for (const r of [0, 1]) out.push(H.kind === 'house' ? () => TX.shingles(H.roofC, r) : () => TX.metal(H.roofC, r));
  return out;
}
{ let scanT = 0, queue = [], job = null, qKey = '';
  onUpdate(dt => {
    if (!P || mode !== 'play') return;
    scanT -= dt;
    if (scanT <= 0) {                                                          // раз в 2 с: что понадобится рядом
      scanT = 2; const k = HDQ + ':' + Math.round(P.x / 12) + ',' + Math.round(P.y / 12);
      if (k !== qKey) { qKey = k; queue = []; for (const H of houses) if (Math.abs(H.x + H.w / 2 - P.x) < 40 && Math.abs(H.y + H.h / 2 - P.y) < 40) queue.push(...houseTex(H)); }
    }
    const t0 = performance.now(), more = () => performance.now() - t0 < 4;
    while (more()) {
      if (!job) { const call = queue.shift(); if (!call) break; job = texJob(call); continue; }
      if (job(more)) job = null;
    }
  });
}
