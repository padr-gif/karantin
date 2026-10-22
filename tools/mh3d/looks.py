"""Внешности для листов игры: цвета здесь неважны — игра перекрашивает слоты сама (кожа, волосы, одежда)."""
# главный герой по фото автора: машинка, щетина, футболка, тёмные брюки, сумка через плечо, спортивное сложение
PM = dict(hair='buzz', beard=True, top='tee', bottom='pants', belt=True, sling=True, muscle=.68, weight=.55, height=.56)
PF = dict(fem=True, hair='long', top='jacket', bottom='pants', belt=True, pack=True)
ZM = dict(hair='short', top='long', bottom='pants', blood=1.3, weight=.55)
ZF = dict(fem=True, hair='long', top='long', bottom='pants', blood=2.1)
ZH = dict(hair='short', top='long', bottom='pants', blood=3.3, muscle=.9, weight=.85, height=.75)
# превью-цвета, как у игры по умолчанию
PREV = dict(skin='#e6bc98', hairc='#9a6a42', shirt='#e2d6bc', pants='#26282c')
ZPREV = dict(skin='#9aa58a', hairc='#4a3c2c', shirt='#68584a', sleeve='#68584a', pants='#3c4048')
