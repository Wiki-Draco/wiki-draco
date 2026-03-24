/**
 * Script de réorganisation du compendium.js
 * Regroupe les items par Palier puis par Catégorie avec des séparateurs visuels.
 * Usage : node _reorganize_compendium.js
 */

const fs   = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'compendium.js');
const src      = fs.readFileSync(filePath, 'utf8');

/* ── Repérer le tableau ITEMS ── */
const startMarker = 'const ITEMS = [';
const startIdx    = src.indexOf(startMarker) + startMarker.length;
const endIdx      = src.indexOf('];', startIdx);

const before   = src.slice(0, startIdx);   // inclut "const ITEMS = ["
const itemsSrc = src.slice(startIdx, endIdx);
const after    = src.slice(endIdx);        // inclut "];\n..."

/* ── Extraction des blocs bruts ── */
function extractItems(str) {
  const results = [];
  let depth = 0, itemStart = -1;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '{') {
      if (depth === 0) itemStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && itemStart >= 0) {
        const raw = str.slice(itemStart, i + 1);
        let obj;
        try {
          // eslint-disable-next-line no-eval
          obj = eval('(' + raw + ')');
        } catch (e) {
          console.error('Erreur de parsing :', raw.slice(0, 120));
          throw e;
        }
        results.push({
          raw,
          palier:   obj.palier   ?? 0,
          category: obj.category ?? '',
          id:       obj.id       ?? '',
        });
        itemStart = -1;
      }
    }
  }
  return results;
}

const items = extractItems(itemsSrc);
console.log(`Items trouvés : ${items.length}`);

/* ── Ordre des catégories ── */
const CAT_ORDER = [
  'arme', 'armure', 'accessoire',
  'consommable', 'nourriture',
  'materiaux', 'minerais',
  'rune', 'clef', 'outils', 'quete',
];

const CAT_LABELS = {
  arme:        'Armes',
  armure:      'Armures',
  accessoire:  'Accessoires',
  consommable: 'Consommables',
  nourriture:  'Nourriture',
  materiaux:   'Matériaux',
  minerais:    'Minerais',
  rune:        'Runes',
  clef:        'Clefs',
  outils:      'Outils',
  quete:       'Objets de Quête',
};

/* ── Groupement Palier → Catégorie ── */
const grouped = {};
for (const item of items) {
  const p = item.palier;
  const c = item.category;
  if (!grouped[p])    grouped[p]    = {};
  if (!grouped[p][c]) grouped[p][c] = [];
  grouped[p][c].push(item);
}

/* ── Re-indentation propre d'un bloc item ── */
function reindent(raw) {
  const lines = raw.split('\n');
  return lines.map((line, i) => {
    const stripped = line.trimStart();
    if (i === 0 || i === lines.length - 1) return '  ' + stripped; // { et }
    return '    ' + stripped;                                        // propriétés
  }).join('\n');
}

/* ── Construction de la nouvelle section ── */
let out = '\n';

const paliers = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));
for (const palier of paliers) {
  out += `\n  /* ══════════════════════════════════\n`;
  out += `       ★  PALIER ${palier}\n`;
  out += `  ══════════════════════════════════ */\n`;

  const cats = Object.keys(grouped[palier]).sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a);
    const ib = CAT_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  for (const cat of cats) {
    const label = CAT_LABELS[cat] || cat;
    out += `\n  /* ── ${label} ─────────────────────── */\n`;
    for (const item of grouped[palier][cat]) {
      out += reindent(item.raw) + ',\n';
    }
  }

  out += '\n';
}

/* ── Écriture ── */
const newSrc = before + out + after;
fs.writeFileSync(filePath, newSrc);

// Résumé
for (const palier of paliers) {
  const cats = Object.keys(grouped[palier]);
  console.log(`\nPalier ${palier}:`);
  for (const cat of cats.sort((a, b) => CAT_ORDER.indexOf(a) - CAT_ORDER.indexOf(b))) {
    console.log(`  ${(CAT_LABELS[cat] || cat).padEnd(18)} → ${grouped[palier][cat].length} items`);
  }
}

console.log('\n✓ compendium.js réorganisé avec succès.');
