#!/usr/bin/env python3
"""Дорисовать в готовый лист иконок только указанные (из gen.py), не пересобирая весь лист.
   python3 tools/icons/add.py cig [ещё id…]
Полная пересборка (npm run icons) теряет иконки, которых нет в gen.py (их в листе больше), поэтому новые — так.
Иконка встаёт в первую пустую клетку 96×96; если такой id уже есть — перерисовывается на своём месте.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE)); sys.path.insert(0, HERE)
import gen
from PIL import Image
PNG, JS, S = os.path.join(ROOT, 'assets/sprites/icons.png'), os.path.join(ROOT, 'assets/icons.json'), 96
meta = json.load(open(JS)); sheet = Image.open(PNG).convert('RGBA')
for n in sys.argv[1:]:
    if n not in gen.ICONS: sys.exit('нет иконки ' + n + ' в gen.py')
    if n in meta: x, y = meta[n][:2]
    else:
        used = {(v[0], v[1]) for v in meta.values()}
        free = [(x, y) for y in range(0, sheet.size[1], S) for x in range(0, sheet.size[0], S) if (x, y) not in used and sheet.crop((x, y, x + S, y + S)).getbbox() is None]
        if not free:                                                      # лист кончился — ещё ряд снизу
            big = Image.new('RGBA', (sheet.size[0], sheet.size[1] + S), (0, 0, 0, 0)); big.paste(sheet, (0, 0)); sheet = big; free = [(0, sheet.size[1] - S)]
        x, y = free[0]
    ic = gen.Ic(); gen.ICONS[n](ic); ic.outline()
    cell = Image.new('RGBA', (S, S), (0, 0, 0, 0)); sheet.paste(cell, (x, y)); sheet.paste(ic.im.resize((S, S), Image.NEAREST), (x, y))
    meta[n] = [x, y, S, S]; print(n, '→', x, y)
sheet.save(PNG, optimize=True); json.dump(meta, open(JS, 'w'))
