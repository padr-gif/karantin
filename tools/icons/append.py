# Дорисовать в готовый атлас значков те, которых в нём ещё нет (атлас дополнялся и вне gen.py,
# поэтому целиком его не пересобираем). Запуск: python3 tools/icons/append.py
import json, math, os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import gen
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
png, js = os.path.join(ROOT, 'assets/sprites/icons.png'), os.path.join(ROOT, 'assets/icons.json')
meta = json.load(open(js)); sheet = Image.open(png).convert('RGBA')
new = [n for n in gen.ICONS if n not in meta]
if not new: print('нечего добавлять'); sys.exit()
S, cols = 96, sheet.width // 96
used = {(v[0] // S, v[1] // S) for v in meta.values()}
free = [(x, y) for y in range(sheet.height // S) for x in range(cols) if (x, y) not in used]
rows = sheet.height // S
while len(free) < len(new): free += [(x, rows) for x in range(cols)]; rows += 1
out = Image.new('RGBA', (cols * S, rows * S), (0, 0, 0, 0)); out.paste(sheet, (0, 0))
for n, (x, y) in zip(new, free):
    ic = gen.Ic(); gen.ICONS[n](ic); ic.outline()
    out.paste(ic.im.resize((S, S), Image.NEAREST), (x * S, y * S)); meta[n] = [x * S, y * S, S, S]
out.save(png, optimize=True); json.dump(meta, open(js, 'w'))
print('добавлено:', ', '.join(new), '· атлас', out.size)
