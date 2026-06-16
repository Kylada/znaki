// Default card database - loaded from the official Знаки spreadsheet
// Cards are auto-loaded on app start so users don't need to import manually

import type { CardTemplate, Element, CardType, SpellSubtype } from '../types';

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1nbgJgvpLo_IrieAlYpCbfW6WcW-K2lwPdKFYJSafLO0/export?format=csv';

const elementLetterMap: Record<string, Element> = {
  'a': 'Хаос', 'b': 'Порядок', 'c': 'Жизнь',
  'd': 'Свет', 'e': 'Смерть', 'f': 'Тьма',
};

function parseElement(val: string): Element {
  if (!val || val.trim() === '') return 'Нет';
  const lower = val.toLowerCase().trim();
  if (lower.length === 1 && elementLetterMap[lower]) return elementLetterMap[lower];
  const map: Record<string, Element> = {
    'свет': 'Свет', 'light': 'Свет', 'тьма': 'Тьма', 'dark': 'Тьма', 'darkness': 'Тьма',
    'хаос': 'Хаос', 'chaos': 'Хаос', 'порядок': 'Порядок', 'order': 'Порядок',
    'жизнь': 'Жизнь', 'life': 'Жизнь', 'смерть': 'Смерть', 'death': 'Смерть',
    'нет': 'Нет', 'none': 'Нет', '#n/a': 'Нет', '-': 'Нет',
  };
  return map[lower] || 'Нет';
}

function parseType(typeStr: string, subtypeStr: string): CardType {
  const v = typeStr?.toLowerCase()?.trim() || '';
  const s = subtypeStr?.toLowerCase()?.trim() || '';
  if (v === 'sign' || v.includes('знак') || s.includes('знак') || s.includes('sign')) return 'sign';
  if (v === 'monster' || v.includes('монстр')) return 'monster';
  if (v === 'spell' || v.includes('заклят')) return 'spell';
  if (v === 'artifact' || v.includes('артефакт')) return 'artifact';
  if (s.includes('заклятье') || s.includes('spell')) return 'spell';
  if (s.includes('монумент') || s.includes('экипировк')) return 'artifact';
  return 'monster';
}

function parseSpellSubtype(val: string): SpellSubtype | undefined {
  const v = val?.toLowerCase()?.trim() || '';
  if (v.includes('быстр') || v.includes('quick')) return 'quick';
  if (v.includes('длительн') || v.includes('continuous')) return 'continuous';
  if (v.includes('обычн') || v.includes('normal')) return 'normal';
  if (v.includes('заклят') || v.includes('spell')) return 'normal';
  return undefined;
}

// Simple CSV parser that handles quoted fields with commas and newlines
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\r') {
        i++;
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function csvToTemplates(csvText: string): CardTemplate[] {
  const data = parseCSV(csvText);
  if (data.length < 2) return [];

  const headers = data[0].map(h => h.toLowerCase().trim());
  const findCol = (...names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h === name || h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameCol = findCol('name', 'имя');
  const typeCol = findCol('card type', 'тип');
  const subtypeCol = findCol('subtype', 'подтип');
  const costCol = findCol('cost', 'цена');
  const elementCol = findCol('element decyph', 'элемент');
  const elementLetterCol = headers.indexOf('element');
  const attackCol = findCol('attack', 'атака');
  const healthCol = findCol('health', 'здоровье');
  const effectCol = findCol('effect', 'эффект');
  const imgbbCol = findCol('imgbb');
  const idCol = findCol('number', 'id');

  const templates: CardTemplate[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;
    const name = nameCol >= 0 ? (row[nameCol] || '').trim() : '';
    if (!name) continue;

    const typeStr = typeCol >= 0 ? row[typeCol] || '' : '';
    const subtypeStr = subtypeCol >= 0 ? row[subtypeCol] || '' : '';
    const type = parseType(typeStr, subtypeStr);

    let element: Element = 'Нет';
    if (elementCol >= 0 && row[elementCol]) element = parseElement(row[elementCol]);
    if (element === 'Нет' && elementLetterCol >= 0 && row[elementLetterCol]) element = parseElement(row[elementLetterCol]);

    let imageUrl = '';
    if (imgbbCol >= 0 && row[imgbbCol]) {
      const u = row[imgbbCol].trim();
      if (u.startsWith('http')) imageUrl = u;
    }

    const attackRaw = attackCol >= 0 ? row[attackCol] : undefined;
    const healthRaw = healthCol >= 0 ? row[healthCol] : undefined;
    const attack = attackRaw !== undefined && attackRaw !== '' ? Number(attackRaw) : undefined;
    const health = healthRaw !== undefined && healthRaw !== '' ? Number(healthRaw) : undefined;

    const id = idCol >= 0 && row[idCol] ? `${row[idCol].trim()}-${name.replace(/\s+/g, '_')}` : `auto-${i}-${name.replace(/\s+/g, '_')}`;

    templates.push({
      id,
      name,
      type,
      subtype: subtypeStr || undefined,
      spellSubtype: type === 'spell' ? parseSpellSubtype(subtypeStr || typeStr) : undefined,
      cost: costCol >= 0 ? Number(row[costCol]) || 0 : 0,
      element,
      attack: !isNaN(attack as number) ? attack : undefined,
      health: !isNaN(health as number) ? health : undefined,
      maxHealth: !isNaN(health as number) ? health : undefined,
      effectText: effectCol >= 0 ? (row[effectCol] || '') : '',
      imageUrl,
    });
  }

  return templates;
}

export async function loadDefaultCards(): Promise<CardTemplate[]> {
  try {
    const response = await fetch(SPREADSHEET_URL);
    if (!response.ok) throw new Error('Failed to fetch');
    const csvText = await response.text();
    return csvToTemplates(csvText);
  } catch (err) {
    console.error('Failed to load default cards from Google Sheets:', err);
    return [];
  }
}
