// ================= замок двери изнутри =================
// Изнутри дома запертую дверь можно отпереть рукой (раньше — только ломом, как снаружи), а незапертую — запереть
// (открытую — закрыть и запереть). Снаружи запертая дверь по-прежнему открывается только ломом.
// Старый замок капризный: в 5% случаев его заклинивает. Заклинило запертым — дверь откроет только лом;
// заклинило открытым — запереть её уже нельзя. Состояние замка сохраняется.
{
  const jam = ob => { if (rng() < .05) { ob.jam = true; return true; } return false; };
  defAction('unlock', {name:() => 'Дверь', icon:() => 'i-door', run:a => {
    if (mode !== 'play' || paused || panel || P.sleep) return;
    const ob = obs[a.o.i]; if (!ob || ob.open || !ob.locked) return;
    SFX.click && SFX.click();
    if (jam(ob)) { toast('Замок заклинило! Теперь дверь откроет только лом'); SFX.knock && SFX.knock(P.x, P.y); return; }
    ob.locked = false; toast('Отпер дверь');
  }});
  defAction('lock', {name:() => 'Дверь', icon:() => 'i-door', run:a => {
    if (mode !== 'play' || paused || panel || P.sleep) return;
    const ob = obs[a.o.i]; if (!ob || ob.dead || ob.locked) return;
    if (ob.open) {
      if (cellOccupied(a.o.x, a.o.y)) { toast('В проёме кто-то стоит'); return; }
      const r = clearDoorway(a.o); if (r === 'z') { toast('В проёме мертвец, не закрыть'); return; } if (r === 'stuck') { toast('Отойди от проёма'); return; }
      ob.open = false; SFX.door(false); noise(P.x, P.y, 2.5); fogDirty = true;
    }
    SFX.click && SFX.click();
    if (jam(ob)) { toast('Ключ провернулся впустую — замок заклинило. Запереть эту дверь больше не выйдет'); return; }
    ob.locked = true; toast('Дверь заперта. Снаружи её откроют только ломом');
  }});
  onSave(d => { d.xJam = []; for (let i = 0; i < NT; i++) if (obs[i] && obs[i].jam) d.xJam.push(i); });
  onLoad(d => { for (const i of (d && d.xJam) || []) if (obs[i]) obs[i].jam = true; });
}
