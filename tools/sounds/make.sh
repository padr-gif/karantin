#!/bin/sh
# Звуки из паков Kenney (CC0): «Impact Sounds» и «RPG Audio» → assets/sounds/*.mp3 (моно, 64 кбит/с — MP3 играет везде, в том числе на iPhone)
#   KENNEY=путь/к/assets sh tools/sounds/make.sh   (папки kenney_impact-sounds и kenney_rpg-audio, например из github.com/kapishdima/soundcn)
set -e
K=${KENNEY:?укажи KENNEY=папка с kenney_impact-sounds и kenney_rpg-audio}
OUT="$(dirname "$0")/../../assets/sounds"; mkdir -p "$OUT"
cv() { ffmpeg -v error -y -i "$1" -ac 1 -ar 44100 -b:a 64k -af "silenceremove=start_periods=1:start_threshold=-50dB" "$OUT/$2.mp3"; }
for s in wood carpet concrete grass snow; do for n in 0 1 2 3 4; do cv "$K/kenney_impact-sounds/footstep_${s}_00$n.ogg" "step_${s}_$n"; done; done
for n in 1 2; do cv "$K/kenney_rpg-audio/doorOpen_$n.ogg" "door_open_$n"; done
for n in 1 2 3 4; do cv "$K/kenney_rpg-audio/doorClose_$n.ogg" "door_close_$n"; done
for n in 1 2 3; do cv "$K/kenney_rpg-audio/creak$n.ogg" "creak_$n"; done
for n in 1 2 3 4; do cv "$K/kenney_rpg-audio/cloth$n.ogg" "cloth_$n"; done
cv "$K/kenney_rpg-audio/handleSmallLeather.ogg" handle_1; cv "$K/kenney_rpg-audio/handleSmallLeather2.ogg" handle_2
cv "$K/kenney_rpg-audio/dropLeather.ogg" drop_1; cv "$K/kenney_rpg-audio/metalLatch.ogg" latch_1; cv "$K/kenney_rpg-audio/metalClick.ogg" click_1
cv "$K/kenney_rpg-audio/bookOpen.ogg" paper_1; cv "$K/kenney_rpg-audio/bookFlip1.ogg" paper_2
for n in 0 1 2; do cv "$K/kenney_impact-sounds/impactWood_light_00$n.ogg" "wood_$n"; cv "$K/kenney_impact-sounds/impactMetal_light_00$n.ogg" "metal_$n"; cv "$K/kenney_impact-sounds/impactSoft_medium_00$n.ogg" "soft_$n"; cv "$K/kenney_impact-sounds/impactPlank_medium_00$n.ogg" "plank_$n"; done
echo "Kenney (www.kenney.nl) — Impact Sounds, RPG Audio. Лицензия CC0 1.0: можно использовать где угодно, без указания автора." > "$OUT/LICENSE.txt"
ls "$OUT" | wc -l
