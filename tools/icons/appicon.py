# Иконка приложения «Dead Line»: кардиограмма на мониторе, которая уходит в прямую линию. Пиксель-арт 64x64.
#   python3 tools/icons/appicon.py pwa
import sys, os
from PIL import Image, ImageDraw
out = sys.argv[1] if len(sys.argv) > 1 else 'pwa'
BG, GRID, GLOW, LINE, TIP = '#0b1012', '#14241e', '#5a1210', '#ff3b30', '#ffd6cf'
ECG = [(3, 34), (14, 34), (17, 29), (20, 34), (23, 34), (25, 39), (28, 11), (31, 51), (34, 34),
       (39, 34), (41, 31), (43, 34), (60, 34)]   # два удара и прямая
def art():
    im = Image.new('RGBA', (64, 64), BG); d = ImageDraw.Draw(im)
    for i in range(4, 64, 8):   # сетка монитора
        d.line([(i, 0), (i, 63)], fill=GRID); d.line([(0, i), (63, i)], fill=GRID)
    d.line(ECG, fill=GLOW, width=5, joint='curve')
    d.line(ECG, fill=LINE, width=2, joint='curve')
    x, y = ECG[-1]; d.rectangle([x - 1, y - 2, x + 2, y + 1], fill=TIP)   # точка-курсор в конце
    return im
a = art(); os.makedirs(out, exist_ok=True)
for s in (192, 512): a.resize((s, s), Image.NEAREST).save(f'{out}/icon-{s}.png')
bg = Image.new('RGBA', (80, 80), BG); bg.paste(a, (8, 8)); bg.resize((512, 512), Image.NEAREST).save(f'{out}/icon-maskable.png')  # запас под маску Android
a.resize((180, 180), Image.NEAREST).save(f'{out}/apple-touch-icon.png')
print('ok')
