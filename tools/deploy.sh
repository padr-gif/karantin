#!/bin/sh
# Публикует папку site/ в ветку gh-pages: игра появится на https://padr-gif.github.io/karantin/
set -e
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
cp -r site/. "$TMP"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$OLDPWD" config user.name || echo deploy)" -c user.email="$(git -C "$OLDPWD" config user.email || echo deploy@localhost)" commit -q -m "Сайт: $(date '+%Y-%m-%d %H:%M')"
git push -f "$(git -C "$OLDPWD" remote get-url origin)" gh-pages
rm -rf "$TMP"
echo "Опубликовано: https://padr-gif.github.io/karantin/"
