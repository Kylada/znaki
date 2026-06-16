import { v4 as uuidv4 } from 'uuid';
import type { CardTemplate, CardType, Element, SpellSubtype, ArtifactSubtype } from '../types';

let _XLSX: any = null;
async function getXLSX() {
  if (!_XLSX) {
    _XLSX = await import('xlsx');
  }
  return _XLSX;
}

const elementLetterMap: Record<string, Element> = {
  'a': 'Хаос',
  'b': 'Порядок',
  'c': 'Жизнь',
  'd': 'Свет',
  'e': 'Смерть',
  'f': 'Тьма',
};

function parseElement(val: string): Element {
  if (!val || val.trim() === '') return 'Нет';
  const lower = val.toLowerCase().trim();

  // Single letter codes (from the spreadsheet)
  if (lower.length === 1 && elementLetterMap[lower]) {
    return elementLetterMap[lower];
  }

  const map: Record<string, Element> = {
    'свет': 'Свет', 'light': 'Свет',
    'тьма': 'Тьма', 'dark': 'Тьма', 'darkness': 'Тьма',
    'хаос': 'Хаос', 'chaos': 'Хаос',
    'порядок': 'Порядок', 'order': 'Порядок',
    'жизнь': 'Жизнь', 'life': 'Жизнь',
    'смерть': 'Смерть', 'death': 'Смерть',
    'нет': 'Нет', 'none': 'Нет', '#n/a': 'Нет', '-': 'Нет',
  };
  return map[lower] || 'Нет';
}

function parseType(val: string, subtypeVal?: string): CardType {
  const v = val?.toLowerCase()?.trim() || '';
  const s = subtypeVal?.toLowerCase()?.trim() || '';

  // Check Card Type column first
  if (v === 'sign' || v === 'знак' || v.includes('знак') || v.includes('sign')) return 'sign';
  if (v === 'monster' || v.includes('монстр')) return 'monster';
  if (v === 'spell' || v.includes('заклят') || v.includes('закл')) return 'spell';
  if (v === 'artifact' || v.includes('артефакт')) return 'artifact';

  // Check Subtype column as fallback
  if (s.includes('знак') || s.includes('sign')) return 'sign';
  if (s.includes('заклятье') || s.includes('заклят') || s.includes('spell')) return 'spell';
  if (s.includes('монумент') || s.includes('monument') || s.includes('экипировк') || s.includes('equipment')) return 'artifact';
  if (s.includes('быстр') || s.includes('quick')) return 'spell';
  if (s.includes('длительн') || s.includes('continuous')) return 'spell';
  if (s.includes('обычн') || s.includes('normal')) return 'spell';

  return 'monster';
}

function parseSpellSubtype(val: string): SpellSubtype | undefined {
  const v = val?.toLowerCase()?.trim() || '';
  if (v.includes('быстр') || v.includes('quick')) return 'quick';
  if (v.includes('длительн') || v.includes('continuous')) return 'continuous';
  if (v.includes('обычн') || v.includes('normal')) return 'normal';
  // If it just says "заклятье" / "spell" without qualifier, default to normal
  if (v.includes('заклят') || v.includes('spell')) return 'normal';
  return undefined;
}

function parseArtifactSubtype(val: string): ArtifactSubtype | undefined {
  const v = val?.toLowerCase()?.trim() || '';
  if (v.includes('монумент') || v.includes('monument')) return 'monument';
  if (v.includes('экипировк') || v.includes('equipment')) return 'equipment';
  return undefined;
}

export function parseSpreadsheetData(data: any[][]): CardTemplate[] {
  if (data.length < 2) return [];

  const headers = data[0].map((h: any) => String(h).toLowerCase().trim());

  const findCol = (...names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h === name || h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // Match both the user's spreadsheet format and generic formats
  const nameCol = findCol('name', 'имя', 'название');
  const typeCol = findCol('card type', 'тип', 'type');
  const subtypeCol = findCol('subtype', 'подтип');
  const costCol = findCol('cost', 'цена', 'круг');
  const elementCol = findCol('element decyph', 'element', 'элемент', 'стихия');
  const elementLetterCol = headers.indexOf('element'); // The single-letter element column
  const attackCol = findCol('attack', 'атака', 'atk');
  const healthCol = findCol('health', 'здоровье', 'hp', 'жизн');
  const effectCol = findCol('effect', 'эффект', 'текст', 'text', 'описание');

  // Image columns: try imgbb first (has actual URLs), then img, then image
  const imgbbCol = findCol('imgbb');
  const imgCol = findCol('img', 'image', 'изображение', 'картинка', 'спрайт', 'sprite', 'url');
  const imageCol = imgbbCol >= 0 ? imgbbCol : imgCol;

  const idCol = findCol('id', 'ид', 'number');
  // Reserved for future use:
  // const flavorCol = findCol('flavor', 'флейвор');
  // const rarityCol = findCol('rarity', 'редкость');

  const templates: CardTemplate[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const name = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
    if (!name) continue;

    const typeStr = typeCol >= 0 ? String(row[typeCol] || '') : '';
    const subtypeStr = subtypeCol >= 0 ? String(row[subtypeCol] || '') : '';
    const type = parseType(typeStr, subtypeStr);

    // Get element: prefer the decoded element name, fall back to letter code
    let element: Element = 'Нет';
    if (elementCol >= 0 && row[elementCol]) {
      element = parseElement(String(row[elementCol]));
    }
    if (element === 'Нет' && elementLetterCol >= 0 && row[elementLetterCol]) {
      element = parseElement(String(row[elementLetterCol]));
    }

    // Get image URL
    let imageUrl = '';
    if (imageCol >= 0 && row[imageCol]) {
      const rawUrl = String(row[imageCol]).trim();
      // Only use HTTP/HTTPS URLs (skip local file paths like G:\...)
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        imageUrl = rawUrl;
      }
    }
    // If imgbb didn't work, try the other img column
    if (!imageUrl && imgCol >= 0 && imgCol !== imageCol && row[imgCol]) {
      const rawUrl = String(row[imgCol]).trim();
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        imageUrl = rawUrl;
      }
    }

    const attackRaw = attackCol >= 0 ? row[attackCol] : undefined;
    const healthRaw = healthCol >= 0 ? row[healthCol] : undefined;
    const attack = attackRaw !== undefined && attackRaw !== '' && attackRaw !== null ? Number(attackRaw) : undefined;
    const health = healthRaw !== undefined && healthRaw !== '' && healthRaw !== null ? Number(healthRaw) : undefined;

    const template: CardTemplate = {
      id: idCol >= 0 && row[idCol] ? `${String(row[idCol]).trim()}-${name.replace(/\s+/g, '_')}` : uuidv4(),
      name,
      type,
      subtype: subtypeStr || undefined,
      spellSubtype: type === 'spell' ? parseSpellSubtype(subtypeStr || typeStr) : undefined,
      artifactSubtype: type === 'artifact' ? parseArtifactSubtype(subtypeStr || typeStr) : undefined,
      cost: costCol >= 0 ? Number(row[costCol]) || 0 : 0,
      element,
      attack: !isNaN(attack as number) ? attack : undefined,
      health: !isNaN(health as number) ? health : undefined,
      maxHealth: !isNaN(health as number) ? health : undefined,
      effectText: effectCol >= 0 ? String(row[effectCol] || '') : '',
      imageUrl,
    };

    templates.push(template);
  }

  return templates;
}

export async function importFromFile(file: File): Promise<CardTemplate[]> {
  const XLSX = await getXLSX();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        const templates = parseSpreadsheetData(jsonData);
        resolve(templates);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function importFromGoogleSheets(url: string): Promise<CardTemplate[]> {
  // Extract spreadsheet ID from URL
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('Invalid Google Sheets URL');

  const spreadsheetId = match[1];

  // Try to extract gid for specific sheet
  const gidMatch = url.match(/gid=(\d+)/);
  const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';

  // Use the CSV export URL
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gidParam}`;

  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error('Не удалось загрузить таблицу. Убедитесь, что она доступна по ссылке (Файл → Поделиться → Все, у кого есть ссылка).');

  const csvText = await response.text();
  const XLSX = await getXLSX();
  const workbook = XLSX.read(csvText, { type: 'string' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
  return parseSpreadsheetData(jsonData);
}
