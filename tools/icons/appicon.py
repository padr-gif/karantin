# Иконка приложения: голова мертвеца за карантинной лентой, пиксель-арт 32x32.
#   python3 tools/icons/appicon.py pwa
import sys, os
from PIL import Image, ImageDraw
out = sys.argv[1] if len(sys.argv) > 1 else 'pwa'
def art():
    im = Image.new('RGBA', (32, 32), (12, 15, 18, 255)); d = ImageDraw.Draw(im)
    for y in range(32):  # night sky
        d.line([(0, y), (31, y)], fill=(14 + y // 3, 20 + y // 4, 26 + y // 3, 255))
    d.ellipse([3, 2, 7, 6], fill=(220, 214, 190, 255)); d.ellipse([4, 2, 8, 6], fill=(14, 20, 27, 255))  # moon
    skin, dk = (128, 156, 104, 255), (88, 112, 70, 255)
    d.ellipse([8, 5, 24, 25], fill=dk); d.ellipse([8, 5, 23, 24], fill=skin)            # head
    d.rectangle([12, 22, 20, 28], fill=dk); d.rectangle([12, 22, 19, 27], fill=skin)    # jaw / neck
    d.polygon([(8, 11), (11, 5), (16, 4), (21, 5), (24, 10), (20, 8), (15, 9), (11, 8)], fill=(52, 40, 30, 255))  # hair
    for x in (11, 18): d.rectangle([x, 13, x + 3, 16], fill=(20, 14, 12, 255)); d.point((x + 1, 14), fill=(230, 60, 40, 255))  # eyes
    d.line([(12, 21), (20, 21)], fill=(40, 20, 18, 255)); [d.point((x, 20), fill=(40, 20, 18, 255)) for x in (13, 15, 17, 19)]  # mouth
    d.line([(9, 17), (12, 19)], fill=(150, 30, 26, 255)); d.point((22, 18), fill=(150, 30, 26, 255))  # blood
    for x in range(32):  # quarantine tape across the bottom
        for y in range(32):
            t = y + x * .3
            if 27 <= t < 32: d.point((x, y), fill=(232, 196, 52, 255) if ((x + y) // 3) % 2 == 0 else (24, 22, 20, 255))
    return im
a = art(); os.makedirs(out, exist_ok=True)
for s in (192, 512): a.resize((s, s), Image.NEAREST).save(f'{out}/icon-{s}.png')
bg = Image.new('RGBA', (40, 40), (12, 15, 18, 255)); bg.paste(a, (4, 4)); bg.resize((512, 512), Image.NEAREST).save(f'{out}/icon-maskable.png')
a.resize((180, 180), Image.NEAREST).save(f'{out}/apple-touch-icon.png')
print('ok')
