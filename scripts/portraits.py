# Builds public/portraits/*.webp and src/data/portraits.json from docs/suiko-characters/*.png.
# Trims each image to its visible (non-transparent) part, scales to 256 px high, saves WebP.
# Needs Pillow: python3 -m pip install pillow ; run: python3 scripts/portraits.py
import json, os, sys
from PIL import Image
root = sys.argv[1] if len(sys.argv) > 1 else "."
src = os.path.join(root, 'docs/suiko-characters')
out = os.path.join(root, 'public/portraits')
os.makedirs(out, exist_ok=True)
jokers = [j['id'] for j in json.load(open(os.path.join(root, 'src/data/jokers.json')))]
bosses = [b['id'] for b in json.load(open(os.path.join(root, 'src/data/bosses.json')))]
files = {f[:-4] for f in os.listdir(src) if f.endswith('.png')}
ALIAS = {
  'jowy_atreides': 'jowy', 'luca_blight': 'luca', 'freed_yamamoto': 'freed_y', 'yoshino_yamamoto': 'yoshino',
  'ridley_wizen': 'ridley', 'boris_wizen': 'boris', 'teresa_wisemail': 'teresa', 'kiba_windamier': 'kiba',
  'humphrey_mintz': 'humphrey', 'simone_verdricci': 'simone', 'sierra_mikain': 'sierra', 'kahn_marley': 'kahn',
  'lo_wen': 'lowen', 'georg_prime': 'georg', 'tai_ho': 'taiho', 'yam_koo': 'yamkoo', 'hai_yo': 'haiyo',
  'long_chan_chan': 'longchanchan', 'sigfried': 'siegfried', 'eilie': 'ellie',
  # bosses
  'jowy_boss': 'jowy', 'solon_jhee': 'solonjhee', 'gorudo': 'gordeau',
}
done, missing = [], []
for id_ in jokers + bosses:
  f = ALIAS.get(id_, id_)
  if f not in files:
    missing.append(id_); continue
  im = Image.open(os.path.join(src, f + '.png')).convert('RGBA')
  bbox = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
  if bbox: im = im.crop(bbox)
  h = 256
  im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
  im.save(os.path.join(out, id_ + '.webp'), 'WEBP', quality=82, method=6)
  if id_ not in done: done.append(id_)
json.dump(sorted(done), open(os.path.join(root, 'src/data/portraits.json'), 'w'), indent=1)
print('portraits', len(done), 'missing', missing)
print('unused files', sorted(files - {ALIAS.get(i, i) for i in done}))
