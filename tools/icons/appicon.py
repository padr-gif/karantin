# Иконка приложения «Нулевой день»: листок календаря с нулём и кровавыми подтёками, пиксель-арт 64x64.
#   python3 tools/icons/appicon.py pwa
import sys, os
from PIL import Image, ImageDraw
out = sys.argv[1] if len(sys.argv) > 1 else 'pwa'
BG, PAGE, INK, RED = '#3d1414', '#efe8da', '#1f1a17', '#c8322b'
RECTS = [  # x, y, w, h, цвет
    (0, 0, 64, 64, BG), (14, 12, 40, 46, '#2a0d0d'),                               # фон, тень листка
    (12, 10, 40, 46, PAGE), (12, 10, 40, 11, RED),                                 # листок и красная шапка
    (19, 7, 3, 6, '#1f0a0a'), (42, 7, 3, 6, '#1f0a0a'),                             # кольца
    (17, 21, 2, 3, RED), (17, 24, 1, 2, RED), (38, 21, 2, 5, RED), (38, 26, 1, 2, RED), (47, 21, 1, 2, RED),  # подтёки
    (24, 27, 16, 25, INK),                                                          # цифра 0
    (24, 27, 2, 2, PAGE), (38, 27, 2, 2, PAGE), (24, 50, 2, 2, PAGE), (38, 50, 2, 2, PAGE),
    (29, 31, 6, 17, PAGE), (33, 33, 2, 3, INK), (31, 36, 2, 4, INK), (29, 40, 2, 4, INK),
    (12, 55, 40, 1, '#cfc6b4'),
]
def art():
    im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
    for x, y, w, h, c in RECTS: d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)
    return im
a = art(); os.makedirs(out, exist_ok=True)
for s in (192, 512): a.resize((s, s), Image.NEAREST).save(f'{out}/icon-{s}.png')
bg = Image.new('RGBA', (80, 80), BG); bg.paste(a, (8, 8)); bg.resize((512, 512), Image.NEAREST).save(f'{out}/icon-maskable.png')  # запас под маску Android
a.resize((180, 180), Image.NEAREST).save(f'{out}/apple-touch-icon.png')
print('ok')
