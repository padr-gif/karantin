#!/usr/bin/env python3
"""Звуки игры → assets/sounds/*.mp3 (моно, 64 кбит/с, пик −1 дБ) + CREDITS.md с авторами и лицензиями.
Источники (все записи с freesound.org, CC0 или CC-BY — авторы перечислены в CREDITS.md):
  CDDA = github.com/Fris0uman/CDDA-Soundpacks (sound/CC-Sounds) — саундпак зомби-выживалки Cataclysm: DDA
  MTG  = github.com/minetest/minetest_game (mods/default/sounds)
  KEN  = паки Kenney «Impact Sounds» и «RPG Audio» (CC0), например github.com/kapishdima/soundcn/assets
   CDDA=… MTG=… KEN=… python3 tools/sounds/make.py
"""
import os, re, subprocess, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets/sounds')
S = {k: os.environ.get(k, '') for k in ('CDDA', 'MTG', 'KEN')}
C, M, K = 'CDDA', 'MTG', 'KEN'
PL = 'sound/CC-Sounds/plmove/'
# имя группы: [(источник, файл, автор, лицензия, ссылка)]
FS = 'https://freesound.org/'
def many(src, pat, n, author, lic, link, start=1):
    return [(src, pat.format(i), author, lic, link) for i in range(start, start + n)]
SET = {
  'step_wood': many(C, PL + 'walk_t_floor/walk_t_floor_{}.ogg', 6, 'kretopi', 'CC0', FS + 'people/kretopi/'),
  'step_carpet': many(C, PL + 'walk_t_carpet/walk_t_carpet_{}.ogg', 8, 'taure', 'CC0', FS + 'people/taure/'),
  'step_tile': many(C, PL + 'walk_t_rock_floor_{}.ogg', 4, 'samulis', 'CC0', FS + 'people/samulis/'),
  'step_concrete': many(C, PL + 'walk_t_concrete_{}.ogg', 8, 'InspectorJ', 'CC BY 4.0', FS + 'people/InspectorJ/'),
  'step_grass': many(C, PL + 'walk_grass/walk_grass_{}.ogg', 4, 'Ashe Kirk', 'CC0', FS + 'people/Ashe%20Kirk/', 3),
  'step_snow': many(M, 'mods/default/sounds/default_snow_footstep.{}.ogg', 5, 'Ryding', 'CC0', FS + 'people/Ryding/sounds/94337/'),
  'step_bare': many(C, PL + 'walk_barefoot_{}.ogg', 10, 'SpliceSound', 'CC0', FS + 'people/SpliceSound/'),
  'door_open': [(C, 'sound/CC-Sounds/open_door/door_wood/open_door.ogg', 'Peter Havran (Raven2236)', 'CC BY 3.0', FS + 'people/MaxDemianAGL/sounds/183603/')],
  'door_close': [(C, 'sound/CC-Sounds/close_door/door_wood/close_door.ogg', 'kyles', 'CC0', FS + 'people/kyles/')],
  'safe_open': [(C, 'sound/CC-Sounds/open_door/gun_safe/open_safe.ogg', 'DoctorBoomstick', 'CC BY 4.0', FS + 'people/DoctorBoomstick/')],
  'safe_close': [(C, 'sound/CC-Sounds/close_door/gun_safe/close_safe.ogg', 'DoctorBoomstick', 'CC BY 4.0', FS + 'people/DoctorBoomstick/')],
  'mdoor_open': [(C, 'sound/CC-Sounds/open_door/door_metal/open_door_metal.ogg', 'Fabrizio84', 'CC0', FS + 'people/Fabrizio84/')],
  'trunk_open': [(C, 'sound/CC-Sounds/vehicle_open/trunk/open_car_trunk.ogg', 'Tokyoshowdown', 'CC0', FS + 'people/Tokyoshowdown/')],
  'trunk_close': [(C, 'sound/CC-Sounds/vehicle_close/trunk/close_car_trunk.ogg', 'jackthemurray', 'CC0', FS + 'people/jackthemurray/')],
  'cardoor_open': [(C, 'sound/CC-Sounds/vehicle_open/door/open_car_door.ogg', 'j1987', 'CC0', FS + 'people/j1987/')],
  'cardoor_close': [(C, 'sound/CC-Sounds/vehicle_close/door/close_car_door.ogg', 'monotraum', 'CC0', FS + 'people/monotraum/')],
  'chest_open': [(M, 'mods/default/sounds/default_chest_open.ogg', 'sofar (Minetest), из записей Sevin7, Percy Duke, kingsamas, bulbastre, Yoyodaman234', 'CC BY 3.0', 'https://github.com/minetest/minetest_game')],
  'chest_close': [(M, 'mods/default/sounds/default_chest_close.ogg', 'sofar (Minetest), из записей Sevin7, Percy Duke, kingsamas, bulbastre, Yoyodaman234', 'CC BY 3.0', 'https://github.com/minetest/minetest_game')],
  'window_open': [(C, 'sound/CC-Sounds/open_door/window/open_window.ogg', 'xdrav', 'CC0', FS + 'people/xdrav/')],
  'window_close': [(C, 'sound/CC-Sounds/close_door/window/close_window.ogg', 'cabled_mess', 'CC0', FS + 'people/cabled_mess/')],
  # Kenney (CC0): мелкие звуки вещей
  'cloth': many(K, 'kenney_rpg-audio/cloth{}.ogg', 4, 'Kenney', 'CC0', 'https://kenney.nl/assets/rpg-audio'),
  'handle': [(K, 'kenney_rpg-audio/handleSmallLeather.ogg', 'Kenney', 'CC0', 'https://kenney.nl/assets/rpg-audio'), (K, 'kenney_rpg-audio/handleSmallLeather2.ogg', 'Kenney', 'CC0', 'https://kenney.nl/assets/rpg-audio')],
  'drop': [(K, 'kenney_rpg-audio/dropLeather.ogg', 'Kenney', 'CC0', 'https://kenney.nl/assets/rpg-audio')],
  'paper': [(K, 'kenney_rpg-audio/bookOpen.ogg', 'Kenney', 'CC0', 'https://kenney.nl/assets/rpg-audio'), (K, 'kenney_rpg-audio/bookFlip1.ogg', 'Kenney', 'CC0', 'https://kenney.nl/assets/rpg-audio')],
  'soft': many(K, 'kenney_impact-sounds/impactSoft_medium_00{}.ogg', 3, 'Kenney', 'CC0', 'https://kenney.nl/assets/impact-sounds', 0),
}
def peak(f):
    r = subprocess.run(['ffmpeg', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.search(r'max_volume: ([-0-9.]+)', r).group(1))
if __name__ == '__main__':
    for k, v in S.items():
        if not v: sys.exit('укажи ' + k + '=папка')
    os.makedirs(OUT, exist_ok=True)
    for f in glob.glob(os.path.join(OUT, '*.mp3')): os.remove(f)
    credits = ['# Авторы звуков', '', 'Все записи — с freesound.org и из паков Kenney. CC0 — общественное достояние; CC BY — можно использовать с указанием автора (ниже).', '',
               '| Файл | Автор | Лицензия | Источник |', '|---|---|---|---|']
    for g, items in SET.items():
        for n, (src, rel, author, lic, link) in enumerate(items):
            f = os.path.join(S[src], rel); name = '%s_%d' % (g, n)
            gain = -1 - peak(f)
            af = 'silenceremove=start_periods=1:start_threshold=-50dB,volume=%.1fdB' % gain
            if g.startswith('step_'):                                            # шаг: один удар, без шипящего хвоста и фона
                af += ',highpass=f=70,agate=threshold=0.03:ratio=6:attack=1:release=60,atrim=0:0.34,afade=t=out:st=0.2:d=0.14'
            else:
                af += ',agate=threshold=0.01:ratio=3:attack=2:release=120'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-ac', '1', '-ar', '44100', '-b:a', '64k',
                            '-af', af, os.path.join(OUT, name + '.mp3')], check=True)
            credits.append('| %s.mp3 | %s | %s | %s |' % (name, author, lic, link))
    open(os.path.join(OUT, 'CREDITS.md'), 'w').write('\n'.join(credits) + '\n')
    for f in glob.glob(os.path.join(OUT, 'LICENSE.txt')): os.remove(f)
    print(len(glob.glob(os.path.join(OUT, '*.mp3'))), 'звуков')
