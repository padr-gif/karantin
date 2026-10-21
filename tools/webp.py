#!/usr/bin/env python3
"""Пережимает PNG-листы в WebP без потерь: картинка совпадает с PNG до пикселя, файл почти вдвое легче.
Нужен для сборки сайта (build.mjs вызывает его сам, когда WebP для листа ещё нет).
   python3 tools/webp.py in.png out.webp [in2.png out2.webp ...]
"""
import sys
from PIL import Image

args = sys.argv[1:]
for src, dst in zip(args[::2], args[1::2]):
    im = Image.open(src).convert('RGBA')
    im.save(dst, 'WEBP', lossless=True, quality=100, method=6, exact=True)
    back = Image.open(dst).convert('RGBA')
    if back.tobytes() != im.tobytes():
        sys.exit('WebP не совпал с PNG: ' + src)
