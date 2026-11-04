"""Иконки и заставка для Android-проекта из pwa/icon-512.png и pwa/icon-maskable.png.

Запуск: python3 tools/android/icons.py  (из корня, после `npx cap add android`; нужен Pillow)
Заменяет то, что Capacitor кладёт по умолчанию (свой логотип):
  • mipmap-*/ic_launcher.png, ic_launcher_round.png — обычная и круглая иконка;
  • mipmap-*/ic_launcher_foreground.png + цвет фона — адаптивная иконка (Android 8+);
  • drawable*/splash.png — заставка при запуске: тёмный фон и иконка по центру.
"""
import os
import sys
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
BG = (0x0c, 0x0f, 0x12)
LEGACY = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}

if not os.path.isdir(RES):
    sys.exit('Нет android/app/src/main/res — сначала npx cap add android')

icon = Image.open(os.path.join(ROOT, 'pwa', 'icon-512.png')).convert('RGBA')
mask_icon = Image.open(os.path.join(ROOT, 'pwa', 'icon-maskable.png')).convert('RGBA')
mask_bg = mask_icon.getpixel((2, 2))[:3]


def round_icon(size):
    im = icon.resize((size, size), Image.LANCZOS)
    m = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0), m.resize((size, size), Image.LANCZOS))
    return out


def foreground(size):
    # видимая часть адаптивной иконки — 72 из 108 dp; картинку ставим чуть крупнее (0.72), чтобы её фон закрыл всю видимую область
    s = round(size * 0.72)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(mask_icon.resize((s, s), Image.LANCZOS), ((size - s) // 2, (size - s) // 2))
    return out


n = 0
for dens, px in LEGACY.items():
    d = os.path.join(RES, 'mipmap-' + dens)
    if not os.path.isdir(d):
        continue
    icon.resize((px, px), Image.LANCZOS).save(os.path.join(d, 'ic_launcher.png'))
    round_icon(px).save(os.path.join(d, 'ic_launcher_round.png'))
    foreground(round(px * 108 / 48)).save(os.path.join(d, 'ic_launcher_foreground.png'))
    n += 1

# фон адаптивной иконки
vals = os.path.join(RES, 'values')
os.makedirs(vals, exist_ok=True)
with open(os.path.join(vals, 'ic_launcher_background.xml'), 'w', encoding='utf8') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
            '    <color name="ic_launcher_background">#%02X%02X%02X</color>\n</resources>\n' % mask_bg)

# заставки: тот же размер, что у файлов Capacitor
splashes = 0
for root, _, files in os.walk(RES):
    if 'splash.png' in files:
        p = os.path.join(root, 'splash.png')
        w, h = Image.open(p).size
        out = Image.new('RGB', (w, h), BG)
        s = round(min(w, h) * 0.32)
        out.paste(icon.resize((s, s), Image.LANCZOS), ((w - s) // 2, (h - s) // 2), icon.resize((s, s), Image.LANCZOS))
        out.save(p)
        splashes += 1

print(f'Иконки: {n} плотностей, заставок: {splashes}')
