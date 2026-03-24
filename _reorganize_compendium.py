"""
Script de réorganisation du compendium.js
Regroupe les items par Palier puis par Catégorie avec des séparateurs visuels.
Usage : python _reorganize_compendium.py
"""

import re, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FILE_PATH  = os.path.join(SCRIPT_DIR, 'compendium.js')

with open(FILE_PATH, encoding='utf-8') as f:
    src = f.read()

# ── Limites du tableau ITEMS ──────────────────────────────────────────────────
start_marker = 'const ITEMS = ['
start_idx    = src.index(start_marker) + len(start_marker)
end_idx      = src.index('];', start_idx)

before    = src[:start_idx]       # "const ITEMS = ["
items_src = src[start_idx:end_idx]
after     = src[end_idx:]         # "];\n..."

# ── Extraction des blocs bruts ────────────────────────────────────────────────
def extract_items(s):
    results = []
    depth = 0
    item_start = -1

    for i, ch in enumerate(s):
        if ch == '{':
            if depth == 0:
                item_start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0 and item_start >= 0:
                raw = s[item_start:i+1]
                palier   = int(m.group(1)) if (m := re.search(r'palier:\s*(\d+)', raw)) else 0
                category = m.group(1)      if (m := re.search(r"category:\s*'([^']+)'", raw)) else ''
                item_id  = m.group(1)      if (m := re.search(r"id:\s*'([^']+)'", raw)) else ''
                results.append({'raw': raw, 'palier': palier, 'category': category, 'id': item_id})
                item_start = -1

    return results

items = extract_items(items_src)
print(f"Items trouvés : {len(items)}")

# ── Ordre et libellés des catégories ─────────────────────────────────────────
CAT_ORDER = [
    'arme', 'armure', 'accessoire',
    'consommable', 'nourriture',
    'materiaux', 'minerais',
    'rune', 'clef', 'outils', 'quete',
]

CAT_LABELS = {
    'arme':        'Armes',
    'armure':      'Armures',
    'accessoire':  'Accessoires',
    'consommable': 'Consommables',
    'nourriture':  'Nourriture',
    'materiaux':   'Matériaux',
    'minerais':    'Minerais',
    'rune':        'Runes',
    'clef':        'Clefs',
    'outils':      'Outils',
    'quete':       'Objets de Quête',
}

def cat_sort_key(c):
    try:
        return CAT_ORDER.index(c)
    except ValueError:
        return 99

# ── Groupement Palier → Catégorie ─────────────────────────────────────────────
grouped = {}
for item in items:
    p = item['palier']
    c = item['category']
    grouped.setdefault(p, {}).setdefault(c, []).append(item)

# ── Re-indentation propre ────────────────────────────────────────────────────
def reindent(raw):
    lines = raw.split('\n')
    out = []
    for i, line in enumerate(lines):
        stripped = line.lstrip()
        if i == 0 or i == len(lines) - 1:
            out.append('  ' + stripped)   # { et }
        else:
            out.append('    ' + stripped) # propriétés
    return '\n'.join(out)

# ── Construction de la nouvelle section ──────────────────────────────────────
SEP = '═' * 36
out = '\n'

for palier in sorted(grouped.keys()):
    out += f'\n  /* {SEP}\n'
    out += f'       ★  PALIER {palier}\n'
    out += f'  {SEP} */\n'

    cats = sorted(grouped[palier].keys(), key=cat_sort_key)
    for cat in cats:
        label = CAT_LABELS.get(cat, cat)
        dashes = '─' * (36 - len(label) - 1)
        out += f'\n  /* ── {label} {dashes} */\n'
        for item in grouped[palier][cat]:
            out += reindent(item['raw']) + ',\n'

    out += '\n'

# ── Écriture ─────────────────────────────────────────────────────────────────
new_src = before + out + after
with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(new_src)

# ── Résumé ────────────────────────────────────────────────────────────────────
for palier in sorted(grouped.keys()):
    cats = sorted(grouped[palier].keys(), key=cat_sort_key)
    print(f"\nPalier {palier}:")
    for cat in cats:
        label = CAT_LABELS.get(cat, cat)
        print(f"  {label:<20} → {len(grouped[palier][cat])} items")

print('\n✓ compendium.js réorganisé avec succès.')
