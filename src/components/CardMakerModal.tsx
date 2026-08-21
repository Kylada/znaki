import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { CardType, Element } from '../types';

import artifactTemplate from '../assets/card-maker/template_artifacts_3.png?inline';
import monsterTemplate from '../assets/card-maker/template_monsters_3.png?inline';
import spellTemplate from '../assets/card-maker/template_spells_3.png?inline';
import battleAxeIcon from '../assets/card-maker/battle-axe.png?inline';
import mineralHeartIcon from '../assets/card-maker/mineral-heart.png?inline';
import chaosIcon from '../assets/card-maker/Chaos.png?inline';
import darknessIcon from '../assets/card-maker/Darkness.png?inline';
import deathIcon from '../assets/card-maker/Death.png?inline';
import lawIcon from '../assets/card-maker/Law.png?inline';
import lifeIcon from '../assets/card-maker/Life.png?inline';
import lightIcon from '../assets/card-maker/Light.png?inline';
import chaosSealIcon from '../assets/card-maker/chaosseals.png?inline';
import darknessSealIcon from '../assets/card-maker/darknessseals.png?inline';
import deathSealIcon from '../assets/card-maker/deathseals.png?inline';
import lifeSealIcon from '../assets/card-maker/lifeseals.png?inline';
import lightSealIcon from '../assets/card-maker/lightseals.png?inline';
import orderSealIcon from '../assets/card-maker/orderseals.png?inline';

interface CardMakerModalProps {
  onClose: () => void;
}

type MakerMode = 'single' | 'batch';
type ImageSourceMode = 'upload' | 'url';

type CardDraft = {
  id: string;
  number: string;
  name: string;
  type: CardType;
  subtype: string;
  element: Element;
  cost: string;
  health: string;
  attack: string;
  text: string;
  imageUrl: string;
  imageDataUrl: string;
  imageMode: ImageSourceMode;
  imageOffsetX: number;
  imageOffsetY: number;
  imageScale: number;
};

type BatchItem = {
  id: string;
  rowNumber: number;
  draft: CardDraft;
  missingFields: string[];
};

const getMissingFields = (draft: CardDraft): string[] => {
  const missing: string[] = [];
  if (!draft.name.trim()) missing.push('Название');
  if ((draft.type === 'monster' || draft.type === 'spell' || draft.type === 'artifact') && draft.cost === '') missing.push('Цена');
  if ((draft.type === 'monster' || draft.type === 'artifact') && draft.health === '') missing.push('Здоровье');
  if (draft.type === 'monster' && draft.attack === '') missing.push('Атака');
  if (draft.type !== 'sign' && !draft.imageDataUrl && !draft.imageUrl.trim()) missing.push('Изображение');
  return missing;
};

const CARD_WIDTH = 744;
const CARD_HEIGHT = 1048;
const ART_RECT = { x: 95, y: 176, width: 578, height: 492 };
const TITLE_RECT = { x: 206, y: 40, width: 450, height: 56 };
const SUBTYPE_RECT = { x: 486, y: 112, width: 174, height: 40 };
const TEXT_RECT = { x: 158, y: 730, width: 460, height: 228 };
const ICON_RECT = { x: 35, y: 271, width: 71, height: 121 };

const elementLabels: Element[] = ['Свет', 'Тьма', 'Хаос', 'Порядок', 'Жизнь', 'Смерть', 'Нет'];

const templateByType: Record<CardType, string> = {
  monster: monsterTemplate,
  spell: spellTemplate,
  artifact: artifactTemplate,
  sign: spellTemplate,
};

const elementIconByElement: Record<Exclude<Element, 'Нет'>, string> = {
  Свет: lightIcon,
  Тьма: darknessIcon,
  Хаос: chaosIcon,
  Порядок: lawIcon,
  Жизнь: lifeIcon,
  Смерть: deathIcon,
};

const sealIconByElement: Record<Exclude<Element, 'Нет'>, string> = {
  Свет: lightSealIcon,
  Тьма: darknessSealIcon,
  Хаос: chaosSealIcon,
  Порядок: orderSealIcon,
  Жизнь: lifeSealIcon,
  Смерть: deathSealIcon,
};

const elementAliasMap: Record<string, Element> = {
  a: 'Хаос',
  chaos: 'Хаос',
  хаос: 'Хаос',
  b: 'Порядок',
  order: 'Порядок',
  law: 'Порядок',
  порядок: 'Порядок',
  c: 'Жизнь',
  life: 'Жизнь',
  жизнь: 'Жизнь',
  d: 'Свет',
  light: 'Свет',
  свет: 'Свет',
  e: 'Смерть',
  death: 'Смерть',
  смерть: 'Смерть',
  f: 'Тьма',
  darkness: 'Тьма',
  dark: 'Тьма',
  тьма: 'Тьма',
  none: 'Нет',
  нет: 'Нет',
  '#n/a': 'Нет',
  '-': 'Нет',
};

const makeEmptyDraft = (): CardDraft => ({
  id: crypto.randomUUID(),
  number: '',
  name: '',
  type: 'monster',
  subtype: '',
  element: 'Нет',
  cost: '0',
  health: '0',
  attack: '0',
  text: '',
  imageUrl: '',
  imageDataUrl: '',
  imageMode: 'upload',
  imageOffsetX: 0,
  imageOffsetY: 0,
  imageScale: 1,
});

const svgEscape = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'znaki-card';

const parseElement = (value: unknown): Element => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return elementAliasMap[normalized] || 'Нет';
};

const parseType = (value: unknown, subtype?: unknown): CardType => {
  const primary = String(value ?? '').trim().toLowerCase();
  const secondary = String(subtype ?? '').trim().toLowerCase();

  if (primary.includes('знак') || primary.includes('sign') || secondary.includes('знак') || secondary.includes('sign')) return 'sign';
  if (primary.includes('монстр') || primary.includes('monster')) return 'monster';
  if (primary.includes('артеф') || primary.includes('artifact')) return 'artifact';
  if (primary.includes('закля') || primary.includes('spell')) return 'spell';
  if (secondary.includes('монумент') || secondary.includes('equipment') || secondary.includes('экип')) return 'artifact';
  if (secondary.includes('быстр') || secondary.includes('длитель') || secondary.includes('spell')) return 'spell';
  return 'monster';
};

const numberToString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value).trim();
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл изображения'));
    reader.readAsDataURL(file);
  });

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Не удалось преобразовать изображение'));
    reader.readAsDataURL(blob);
  });

const urlToDataUrl = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Не удалось загрузить изображение по ссылке');
  return blobToDataUrl(await response.blob());
};

const readSheetDataFromFile = async (file: File): Promise<any[][]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
};

const readSheetDataFromGoogle = async (url: string): Promise<any[][]> => {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('Некорректная ссылка Google Sheets');

  const spreadsheetId = match[1];
  const gidMatch = url.match(/gid=(\d+)/);
  const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gidParam}`;
  const response = await fetch(exportUrl);
  if (!response.ok) throw new Error('Не удалось загрузить таблицу Google Sheets');
  const csvText = await response.text();
  const workbook = XLSX.read(csvText, { type: 'string' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
};

const parseBatchItems = (rows: any[][]): BatchItem[] => {
  if (rows.length === 0) return [];
  const headers = rows[0].map(cell => String(cell ?? '').trim().toLowerCase());
  const findColumn = (...names: string[]) => {
    for (const name of names) {
      const index = headers.findIndex(header => header === name || header.includes(name));
      if (index !== -1) return index;
    }
    return -1;
  };

  const numberCol = findColumn('number', 'id');
  const nameCol = findColumn('name', 'имя', 'название');
  const typeCol = findColumn('card type', 'type', 'тип');
  const subtypeCol = findColumn('subtype', 'подтип');
  const costCol = findColumn('cost', 'цена');
  const attackCol = findColumn('attack', 'атака');
  const healthCol = findColumn('health', 'здоровье', 'hp');
  const effectCol = findColumn('effect', 'текст', 'text', 'описание');
  const elementDecyphCol = findColumn('element decyph', 'элемент', 'стихия');
  const elementCol = headers.indexOf('element');
  const imageCol = findColumn('imgbb', 'image', 'img', 'изображение', 'картинка', 'url');

  const items: BatchItem[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row || row.every(cell => String(cell ?? '').trim() === '')) continue;

    const type = parseType(typeCol >= 0 ? row[typeCol] : '', subtypeCol >= 0 ? row[subtypeCol] : '');
    const element = parseElement(
      elementDecyphCol >= 0 && row[elementDecyphCol] ? row[elementDecyphCol] : elementCol >= 0 ? row[elementCol] : ''
    );
    const draft: CardDraft = {
      id: crypto.randomUUID(),
      number: numberToString(numberCol >= 0 ? row[numberCol] : ''),
      name: numberToString(nameCol >= 0 ? row[nameCol] : ''),
      type,
      subtype: numberToString(subtypeCol >= 0 ? row[subtypeCol] : ''),
      element,
      cost: numberToString(costCol >= 0 ? row[costCol] : '', '0'),
      attack: numberToString(attackCol >= 0 ? row[attackCol] : '', type === 'monster' ? '0' : ''),
      health: numberToString(healthCol >= 0 ? row[healthCol] : '', type === 'monster' || type === 'artifact' ? '0' : ''),
      text: numberToString(effectCol >= 0 ? row[effectCol] : ''),
      imageUrl: numberToString(imageCol >= 0 ? row[imageCol] : ''),
      imageDataUrl: '',
      imageMode: 'url',
      imageOffsetX: 0,
      imageOffsetY: 0,
      imageScale: 1,
    };

    items.push({
      id: draft.id,
      rowNumber: rowIndex + 1,
      draft,
      missingFields: getMissingFields(draft),
    });
  }

  return items;
};

const getPreviewImageData = async (draft: CardDraft): Promise<string> => draft.imageDataUrl || '';

const createMeasureContext = () => {
  const canvas = document.createElement('canvas');
  return canvas.getContext('2d');
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const paragraphs = text.replace(/\r/g, '').split('\n');
  const lines: string[] = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
    } else {
      let current = words[0];
      for (let wordIndex = 1; wordIndex < words.length; wordIndex += 1) {
        const candidate = `${current} ${words[wordIndex]}`;
        if (ctx.measureText(candidate).width <= maxWidth) {
          current = candidate;
        } else {
          lines.push(current);
          current = words[wordIndex];
        }
      }
      lines.push(current);
    }

    if (paragraphIndex < paragraphs.length - 1) {
      lines.push('');
    }
  });

  return lines;
};

const fitSingleLine = (
  text: string,
  width: number,
  maxFont: number,
  minFont: number,
  fontFamily: string,
  weight = 700,
) => {
  const ctx = createMeasureContext();
  if (!ctx) return { fontSize: minFont, text };

  for (let fontSize = maxFont; fontSize >= minFont; fontSize -= 1) {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(text).width <= width) {
      return { fontSize, text };
    }
  }

  return { fontSize: minFont, text };
};

const fitMultiline = (
  text: string,
  width: number,
  height: number,
  maxFont: number,
  minFont: number,
  fontFamily: string,
  weight = 700,
  lineHeightMultiplier = 1.12,
) => {
  const ctx = createMeasureContext();
  if (!ctx) return { fontSize: minFont, lines: [text] };

  for (let fontSize = maxFont; fontSize >= minFont; fontSize -= 1) {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    const lines = wrapText(ctx, text, width);
    const lineHeight = fontSize * lineHeightMultiplier;
    if (lines.length * lineHeight <= height) {
      return { fontSize, lines };
    }
  }

  ctx.font = `${weight} ${minFont}px ${fontFamily}`;
  return { fontSize: minFont, lines: wrapText(ctx, text, width) };
};

const buildCardSvg = async (draft: CardDraft) => {
  const template = templateByType[draft.type];
  const imageData = await getPreviewImageData(draft);
  const elementIcon = draft.element !== 'Нет' && draft.type !== 'sign' ? elementIconByElement[draft.element] : '';
  const sealIcon = draft.element !== 'Нет' ? sealIconByElement[draft.element] : '';

  const titleLayout = fitSingleLine(draft.name || 'Без названия', TITLE_RECT.width, 52, 26, 'Arial Black, Arial, sans-serif', 900);
  const subtypeLayout = fitSingleLine(draft.subtype || '', SUBTYPE_RECT.width, 38, 20, 'Arial Black, Arial, sans-serif', 800);
  const textLayout = fitMultiline(draft.text || '', TEXT_RECT.width, TEXT_RECT.height, 40, 18, 'Arial, Helvetica, sans-serif', 700, 1.08);

  let artMarkup = '';

  if (imageData) {
    const artImage = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Не удалось открыть изображение для карты'));
      image.src = imageData;
    });

    const coverScale = Math.max(ART_RECT.width / artImage.width, ART_RECT.height / artImage.height);
    const scale = coverScale * draft.imageScale;
    const width = artImage.width * scale;
    const height = artImage.height * scale;
    const x = ART_RECT.x + (ART_RECT.width - width) / 2 + draft.imageOffsetX;
    const y = ART_RECT.y + (ART_RECT.height - height) / 2 + draft.imageOffsetY;

    artMarkup = `
      <image href="${imageData}" x="${x}" y="${y}" width="${width}" height="${height}" clip-path="url(#artClip)" preserveAspectRatio="none"/>
    `;
  } else if (draft.type === 'sign' && sealIcon) {
    artMarkup = `
      <rect x="${ART_RECT.x}" y="${ART_RECT.y}" width="${ART_RECT.width}" height="${ART_RECT.height}" fill="#0f172a" clip-path="url(#artClip)"/>
      <image href="${sealIcon}" x="${ART_RECT.x + 148}" y="${ART_RECT.y + 104}" width="280" height="280" opacity="0.95" clip-path="url(#artClip)" preserveAspectRatio="xMidYMid meet"/>
    `;
  }

  const attackValue = draft.attack.trim() || '0';
  const healthValue = draft.health.trim() || '0';
  const costValue = draft.cost.trim() || '0';
  const showCost = draft.type !== 'sign';
  const showAttack = draft.type === 'monster';
  const showHealth = draft.type === 'monster' || draft.type === 'artifact';
  const showSubtype = Boolean(draft.subtype.trim());
  const showEffect = Boolean(draft.text.trim());

  const textLinesMarkup = showEffect
    ? textLayout.lines
        .map((line, index) => {
          const y = TEXT_RECT.y + 34 + index * textLayout.fontSize * 1.08;
          return `<text x="${TEXT_RECT.x + TEXT_RECT.width / 2}" y="${y}" text-anchor="middle" font-size="${textLayout.fontSize}" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#111">${svgEscape(line || ' ')}</text>`;
        })
        .join('')
    : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
      <defs>
        <clipPath id="artClip">
          <rect x="${ART_RECT.x}" y="${ART_RECT.y}" width="${ART_RECT.width}" height="${ART_RECT.height}" rx="6" ry="6"/>
        </clipPath>
      </defs>

      <image href="${template}" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}"/>
      ${artMarkup}
      <image href="${template}" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}"/>

      ${elementIcon ? `<image href="${elementIcon}" x="${ICON_RECT.x}" y="${ICON_RECT.y}" width="${ICON_RECT.width}" height="${ICON_RECT.height}" preserveAspectRatio="xMidYMid meet"/>` : ''}
      ${draft.type === 'sign' && sealIcon ? `<image href="${sealIcon}" x="550" y="792" width="112" height="112" opacity="0.92" preserveAspectRatio="xMidYMid meet"/>` : ''}

      <text x="${TITLE_RECT.x + TITLE_RECT.width / 2}" y="90" text-anchor="middle" font-size="${titleLayout.fontSize}" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#ffffff" stroke="#111111" stroke-width="7" paint-order="stroke fill">${svgEscape(draft.name || 'Без названия')}</text>
      ${showSubtype ? `<text x="${SUBTYPE_RECT.x + SUBTYPE_RECT.width}" y="148" text-anchor="end" font-size="${subtypeLayout.fontSize}" font-family="Arial Black, Arial, sans-serif" font-weight="800" fill="#ffffff" stroke="#111111" stroke-width="5" paint-order="stroke fill">${svgEscape(draft.subtype)}</text>` : ''}
      ${showCost ? `<text x="70" y="116" text-anchor="middle" font-size="74" font-family="Georgia, 'Times New Roman', serif" font-weight="700" fill="#111111">${svgEscape(costValue)}</text>` : ''}

      ${showEffect ? textLinesMarkup : ''}

      ${showAttack ? `
        <image href="${battleAxeIcon}" x="28" y="856" width="96" height="96" preserveAspectRatio="xMidYMid meet"/>
        <text x="77" y="935" text-anchor="middle" font-size="64" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#fff7ef" stroke="#7f0000" stroke-width="9" paint-order="stroke fill">${svgEscape(attackValue)}</text>
      ` : ''}

      ${showHealth ? `
        <image href="${mineralHeartIcon}" x="88" y="906" width="96" height="96" preserveAspectRatio="xMidYMid meet"/>
        <text x="137" y="985" text-anchor="middle" font-size="64" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#fff7ef" stroke="#7f0000" stroke-width="9" paint-order="stroke fill">${svgEscape(healthValue)}</text>
      ` : ''}
    </svg>
  `;
};

const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const downloadPngFromSvg = async (svg: string, fileName: string) => {
  const image = new Image();
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Не удалось создать canvas для сохранения');

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Не удалось подготовить изображение карты к скачиванию'));
    image.src = svgToDataUrl(svg);
  });

  context.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  context.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Не удалось сохранить PNG');

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${sanitizeFileName(fileName)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

const CardForm: React.FC<{
  draft: CardDraft;
  onChange: (next: CardDraft) => void;
  onFileImage: (file: File) => Promise<void>;
  onResolveUrl: () => Promise<void>;
  imageBusy: boolean;
  imageError: string;
  batchMode: boolean;
}> = ({ draft, onChange, onFileImage, onResolveUrl, imageBusy, imageError, batchMode }) => {
  const update = <K extends keyof CardDraft>(key: K, value: CardDraft[K]) => onChange({ ...draft, [key]: value });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-gray-500">Название</span>
          <input
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
            value={draft.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Название карты"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-gray-500">Элемент</span>
          <select
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
            value={draft.element}
            onChange={(e) => update('element', e.target.value as Element)}
          >
            {elementLabels.map(element => (
              <option key={element} value={element}>{element}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-gray-500">Тип карты</span>
          <select
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
            value={draft.type}
            onChange={(e) => update('type', e.target.value as CardType)}
          >
            <option value="monster">monster</option>
            <option value="spell">spell</option>
            <option value="artifact">artifact</option>
            <option value="sign">sign</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-gray-500">Подтип</span>
          <input
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
            value={draft.subtype}
            onChange={(e) => update('subtype', e.target.value)}
            placeholder="Гад / Быстрое / Монумент..."
          />
        </label>
      </div>

      {(draft.type === 'monster' || draft.type === 'spell' || draft.type === 'artifact') && (
        <label className="space-y-1 block">
          <span className="text-xs uppercase tracking-wide text-gray-500">Цена</span>
          <input
            type="number"
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
            value={draft.cost}
            onChange={(e) => update('cost', e.target.value)}
          />
        </label>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(draft.type === 'monster' || draft.type === 'artifact') && (
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Здоровье</span>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
              value={draft.health}
              onChange={(e) => update('health', e.target.value)}
            />
          </label>
        )}
        {draft.type === 'monster' && (
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Атака</span>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
              value={draft.attack}
              onChange={(e) => update('attack', e.target.value)}
            />
          </label>
        )}
      </div>

      <label className="space-y-1 block">
        <span className="text-xs uppercase tracking-wide text-gray-500">Текст</span>
        <textarea
          className="min-h-[120px] w-full resize-y rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
          value={draft.text}
          onChange={(e) => update('text', e.target.value)}
          placeholder="Текст эффекта"
        />
        <p className="text-[11px] text-gray-500">Текст автоматически уменьшается и укладывается в безопасную область, не заходя на золотой угол.</p>
      </label>

      <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${draft.imageMode === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            onClick={() => update('imageMode', 'upload')}
          >
            Из файла
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${draft.imageMode === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            onClick={() => update('imageMode', 'url')}
          >
            По ссылке
          </button>
        </div>

        {draft.imageMode === 'upload' ? (
          <label className="block rounded-lg border border-dashed border-gray-700 bg-black/20 p-3 text-sm text-gray-300">
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-500"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await onFileImage(file);
                }
              }}
            />
          </label>
        ) : (
          <div className="space-y-2">
            <input
              className="w-full rounded-lg border border-gray-700 bg-black/20 px-3 py-2 text-sm text-white"
              value={draft.imageUrl}
              onChange={(e) => update('imageUrl', e.target.value)}
              placeholder="https://..."
            />
            <button
              type="button"
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60"
              onClick={onResolveUrl}
              disabled={imageBusy || !draft.imageUrl.trim()}
            >
              {imageBusy ? 'Загрузка...' : 'Загрузить изображение по ссылке'}
            </button>
            <p className="text-[11px] text-gray-500">Если сайт запрещает кросс-доменные загрузки, используйте файл с устройства — так сохранение PNG сработает надёжнее.</p>
          </div>
        )}

        {imageError && <div className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">{imageError}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Смещение X</span>
            <input
              type="range"
              min={-220}
              max={220}
              value={draft.imageOffsetX}
              onChange={(e) => update('imageOffsetX', Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Смещение Y</span>
            <input
              type="range"
              min={-220}
              max={220}
              value={draft.imageOffsetY}
              onChange={(e) => update('imageOffsetY', Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Масштаб</span>
            <input
              type="range"
              min={60}
              max={220}
              value={draft.imageScale * 100}
              onChange={(e) => update('imageScale', Number(e.target.value) / 100)}
              className="w-full"
            />
          </label>
        </div>

        <p className="text-[11px] text-gray-500">
          Перетаскивайте картинку прямо в превью справа. Ползунки дублируют ту же настройку и помогают точнее выставить кадр.
          {batchMode && ' В пакетном режиме ссылка автоматически подхватывается из таблицы, но вы можете заменить её вручную для текущей карты.'}
        </p>
      </div>
    </div>
  );
};

export const CardMakerModal: React.FC<CardMakerModalProps> = ({ onClose }) => {
  const [mode, setMode] = useState<MakerMode>('single');
  const [draft, setDraft] = useState<CardDraft>(makeEmptyDraft());
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState<number | null>(null);
  const [batchUrl, setBatchUrl] = useState('');
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const [batchStatus, setBatchStatus] = useState('');
  const [modalError, setModalError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const previewRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const autoImageAttempts = useRef<Set<string>>(new Set());

  const currentBatchItem = activeBatchIndex !== null ? batchItems[activeBatchIndex] : null;

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const svg = await buildCardSvg(draft);
        if (cancelled) return;
        setPreviewUrl(svgToDataUrl(svg));
      } catch (error) {
        if (cancelled) return;
        setPreviewUrl('');
        setModalError(error instanceof Error ? error.message : 'Не удалось собрать превью карты');
      }
    };

    setModalError('');
    render();

    return () => {
      cancelled = true;
    };
  }, [draft]);

  useEffect(() => {
    if (
      activeBatchIndex === null ||
      draft.type === 'sign' ||
      draft.imageDataUrl ||
      !draft.imageUrl.trim() ||
      autoImageAttempts.current.has(draft.id)
    ) {
      return;
    }

    autoImageAttempts.current.add(draft.id);
    setImageBusy(true);
    setImageError('');
    urlToDataUrl(draft.imageUrl.trim())
      .then((dataUrl) => {
        setDraft(prev => {
          if (prev.id !== draft.id) return prev;
          const nextDraft = { ...prev, imageDataUrl: dataUrl, imageMode: 'url' as const };
          saveCurrentBatchDraft(nextDraft);
          return nextDraft;
        });
      })
      .catch((error) => {
        setImageError(error instanceof Error ? error.message : 'Не удалось автозагрузить изображение');
      })
      .finally(() => setImageBusy(false));
  }, [activeBatchIndex, draft.id, draft.imageDataUrl, draft.imageUrl, draft.type]);

  const requiredBatchMissingFields = useMemo(() => {
    if (!currentBatchItem) return [];
    return getMissingFields(draft);
  }, [currentBatchItem, draft]);

  const handleClose = () => {
    onClose();
  };

  const resolveUrlImage = async () => {
    if (!draft.imageUrl.trim()) return;
    setImageBusy(true);
    setImageError('');
    try {
      const dataUrl = await urlToDataUrl(draft.imageUrl.trim());
      setDraft(prev => ({ ...prev, imageDataUrl: dataUrl, imageMode: 'url' }));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Не удалось загрузить изображение по ссылке');
    } finally {
      setImageBusy(false);
    }
  };

  const handleFileImage = async (file: File) => {
    setImageBusy(true);
    setImageError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      setDraft(prev => ({
        ...prev,
        imageDataUrl: dataUrl,
        imageUrl: file.name,
        imageMode: 'upload',
        imageOffsetX: 0,
        imageOffsetY: 0,
        imageScale: 1,
      }));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Не удалось загрузить изображение');
    } finally {
      setImageBusy(false);
    }
  };

  const saveCurrentBatchDraft = (nextDraft: CardDraft) => {
    if (activeBatchIndex === null) return;
    setBatchItems(prev => prev.map((item, index) => (
      index === activeBatchIndex ? { ...item, draft: nextDraft, missingFields: getMissingFields(nextDraft) } : item
    )));
  };

  const setDraftAndPersist = (nextDraft: CardDraft) => {
    setDraft(nextDraft);
    if (activeBatchIndex !== null) {
      saveCurrentBatchDraft(nextDraft);
    }
  };

  const downloadCurrentDraft = async (overrideDraft?: CardDraft) => {
    const targetDraft = overrideDraft ?? draft;
    if (!targetDraft.name.trim()) throw new Error('Введите название карты перед сохранением');
    const svg = await buildCardSvg(targetDraft);
    const baseName = [targetDraft.number.trim(), targetDraft.name.trim()].filter(Boolean).join('_');
    await downloadPngFromSvg(svg, baseName);
  };

  const continueBatchFrom = async (items: BatchItem[], startIndex: number) => {
    if (items.length === 0 || startIndex >= items.length) {
      setBatchStatus('Пакет завершён.');
      setActiveBatchIndex(null);
      return;
    }

    let index = startIndex;
    while (index < items.length) {
      const item = items[index];
      const needsManual = item.missingFields.length > 0;
      if (needsManual) {
        setActiveBatchIndex(index);
        setDraft(item.draft);
        setBatchStatus(`Карточка ${index + 1}/${items.length}: заполните недостающие поля (${item.missingFields.join(', ')})`);
        return;
      }

      setBatchStatus(`Автосохранение ${index + 1}/${items.length}: ${item.draft.name || 'Без названия'}`);
      try {
        const hydratedDraft = item.draft.imageUrl && !item.draft.imageDataUrl && item.draft.type !== 'sign'
          ? { ...item.draft, imageDataUrl: await urlToDataUrl(item.draft.imageUrl) }
          : item.draft;
        await downloadCurrentDraft(hydratedDraft);
        items[index] = { ...item, draft: hydratedDraft, missingFields: getMissingFields(hydratedDraft) };
        setBatchItems([...items]);
      } catch (error) {
        setActiveBatchIndex(index);
        setDraft(item.draft);
        setBatchStatus(`Карточка ${index + 1}/${items.length}: не удалось автозагрузить изображение, поправьте вручную.`);
        setImageError(error instanceof Error ? error.message : 'Не удалось автозагрузить изображение');
        return;
      }

      index += 1;
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    setBatchStatus('Пакет завершён.');
    setActiveBatchIndex(null);
  };

  const startBatchFromRows = async (rows: any[][]) => {
    const items = parseBatchItems(rows);
    if (items.length === 0) {
      throw new Error('В таблице не найдено карточек');
    }

    setBatchItems(items);
    setMode('batch');
    setImageError('');
    await continueBatchFrom([...items], 0);
  };

  const handleBatchFile = async (file: File) => {
    setLoadingBatch(true);
    setModalError('');
    try {
      const rows = await readSheetDataFromFile(file);
      await startBatchFromRows(rows);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Не удалось открыть таблицу');
    } finally {
      setLoadingBatch(false);
    }
  };

  const handleBatchUrl = async () => {
    if (!batchUrl.trim()) return;
    setLoadingBatch(true);
    setModalError('');
    try {
      const rows = await readSheetDataFromGoogle(batchUrl.trim());
      await startBatchFromRows(rows);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Не удалось загрузить таблицу');
    } finally {
      setLoadingBatch(false);
    }
  };

  const handleDownloadSingle = async () => {
    setDownloading(true);
    setModalError('');
    try {
      await downloadCurrentDraft();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Не удалось скачать карту');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAndContinueBatch = async () => {
    if (activeBatchIndex === null) return;

    setDownloading(true);
    setModalError('');
    setImageError('');
    try {
      const hydratedDraft = draft.imageUrl && draft.imageMode === 'url' && !draft.imageDataUrl && draft.type !== 'sign'
        ? { ...draft, imageDataUrl: await urlToDataUrl(draft.imageUrl.trim()) }
        : draft;
      setDraft(hydratedDraft);
      saveCurrentBatchDraft(hydratedDraft);
      await downloadCurrentDraft(hydratedDraft);

      const nextItems = batchItems.map((item, index) => (
        index === activeBatchIndex ? { ...item, draft: hydratedDraft, missingFields: getMissingFields(hydratedDraft) } : item
      ));
      setBatchItems(nextItems);
      await continueBatchFrom([...nextItems], activeBatchIndex + 1);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Не удалось скачать карту из пакета');
    } finally {
      setDownloading(false);
    }
  };

  const resetBatchQueue = () => {
    setMode('batch');
    setDraft(makeEmptyDraft());
    setActiveBatchIndex(null);
    setBatchStatus('');
    setImageError('');
    setBatchItems([]);
  };

  const beginPreviewDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const scaleX = rect.width / CARD_WIDTH;
    const scaleY = rect.height / CARD_HEIGHT;
    const localX = (event.clientX - rect.left) / scaleX;
    const localY = (event.clientY - rect.top) / scaleY;
    const insideArt = localX >= ART_RECT.x && localX <= ART_RECT.x + ART_RECT.width && localY >= ART_RECT.y && localY <= ART_RECT.y + ART_RECT.height;
    if (!insideArt || (!draft.imageDataUrl && !draft.imageUrl.trim())) return;

    dragState.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePreviewDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = (event.clientX - dragState.current.x) * (CARD_WIDTH / rect.width);
    const dy = (event.clientY - dragState.current.y) * (CARD_HEIGHT / rect.height);
    dragState.current = { ...dragState.current, x: event.clientX, y: event.clientY };

    setDraftAndPersist({
      ...draft,
      imageOffsetX: clamp(draft.imageOffsetX + dx, -260, 260),
      imageOffsetY: clamp(draft.imageOffsetY + dy, -260, 260),
    });
  };

  const endPreviewDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === event.pointerId) {
      dragState.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
      <div className="w-full max-w-7xl max-h-[95vh] overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-gray-800 px-4 py-3 md:px-6">
          <div>
            <h2 className="text-lg md:text-xl font-black text-yellow-400">🖼 Создать Карту</h2>
            <p className="text-sm text-gray-400">В конструкторе я добавил ещё два обязательных для макета поля, которых не было в списке: название и элемент.</p>
          </div>
          <button className="text-2xl text-gray-500 hover:text-white" onClick={handleClose}>✕</button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 px-4 py-3 md:px-6">
          <button
            className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            onClick={() => setMode('single')}
          >
            Одна карта
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'batch' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            onClick={() => setMode('batch')}
          >
            Пакетный режим
          </button>
          {mode === 'batch' && batchStatus && <div className="text-sm text-cyan-300">{batchStatus}</div>}
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_420px] gap-6 p-4 md:p-6">
            <div className="space-y-5">
              {mode === 'batch' && (
                <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-base font-bold text-white">Пакетное создание</h3>
                      <p className="text-sm text-gray-400">Поддерживаются .xlsx/.xls/.csv/.ods и публичная Google Sheets ссылка. Готовые карточки скачиваются по мере обработки.</p>
                    </div>
                    <button
                      className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700"
                      onClick={resetBatchQueue}
                    >
                      Сбросить очередь
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="rounded-xl border border-dashed border-gray-700 bg-black/20 p-3 text-sm text-gray-300">
                      <span className="block mb-2 text-xs uppercase tracking-wide text-gray-500">Из файла</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.ods"
                        className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-500"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleBatchFile(file);
                          }
                        }}
                        disabled={loadingBatch}
                      />
                    </label>
                    <div className="rounded-xl border border-gray-800 bg-black/20 p-3 space-y-2">
                      <span className="block text-xs uppercase tracking-wide text-gray-500">Из Google Sheets</span>
                      <input
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                        value={batchUrl}
                        onChange={(e) => setBatchUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        disabled={loadingBatch}
                      />
                      <button
                        type="button"
                        className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60"
                        onClick={handleBatchUrl}
                        disabled={loadingBatch || !batchUrl.trim()}
                      >
                        {loadingBatch ? 'Загрузка...' : 'Загрузить таблицу'}
                      </button>
                    </div>
                  </div>

                  {batchItems.length > 0 && (
                    <div className="rounded-xl border border-gray-800 bg-black/20 p-3">
                      <div className="mb-2 text-sm text-gray-300">Карточек в очереди: <b>{batchItems.length}</b></div>
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                        {batchItems.map((item, index) => (
                          <div key={item.id} className={`rounded-lg px-3 py-2 text-sm ${activeBatchIndex === index ? 'bg-blue-900/50 text-blue-100 border border-blue-600/60' : 'bg-gray-900/70 text-gray-300 border border-gray-800'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{item.draft.name || `Строка ${item.rowNumber}`}</span>
                              <span className="text-xs text-gray-500">#{index + 1}</span>
                            </div>
                            {item.missingFields.length > 0 && (
                              <div className="mt-1 text-xs text-amber-300">Не хватает: {item.missingFields.join(', ')}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentBatchItem && requiredBatchMissingFields.length > 0 && (
                    <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
                      Для текущей карточки ещё не заполнены: {requiredBatchMissingFields.join(', ')}
                    </div>
                  )}
                </div>
              )}

              <CardForm
                draft={draft}
                onChange={setDraftAndPersist}
                onFileImage={handleFileImage}
                onResolveUrl={resolveUrlImage}
                imageBusy={imageBusy}
                imageError={imageError}
                batchMode={mode === 'batch'}
              />

              <div className="flex flex-wrap gap-3">
                {mode === 'single' ? (
                  <button
                    className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black hover:bg-yellow-400 disabled:opacity-60"
                    onClick={handleDownloadSingle}
                    disabled={downloading}
                  >
                    {downloading ? 'Подготовка...' : '⬇ Скачать PNG'}
                  </button>
                ) : (
                  <button
                    className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black hover:bg-yellow-400 disabled:opacity-60"
                    onClick={handleDownloadAndContinueBatch}
                    disabled={downloading || activeBatchIndex === null}
                  >
                    {downloading ? 'Подготовка...' : '⬇ Скачать PNG и перейти к следующей'}
                  </button>
                )}
                <button
                  className="rounded-xl bg-gray-800 px-5 py-3 text-sm font-bold text-gray-200 hover:bg-gray-700"
                  onClick={() => {
                    setImageError('');
                    setModalError('');
                    setDraft(makeEmptyDraft());
                    if (mode === 'batch' && activeBatchIndex !== null) {
                      setBatchStatus('Текущая карточка очищена вручную.');
                    }
                  }}
                >
                  Очистить форму
                </button>
              </div>

              {modalError && <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">{modalError}</div>}
            </div>

            <div className="space-y-4 xl:sticky xl:top-6 self-start">
              <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
                <h3 className="mb-3 text-base font-bold text-white">Предпросмотр</h3>
                <div
                  ref={previewRef}
                  className="mx-auto aspect-[744/1048] w-full max-w-[380px] overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-[0_0_30px_rgba(0,0,0,0.45)] cursor-grab active:cursor-grabbing"
                  onPointerDown={beginPreviewDrag}
                  onPointerMove={movePreviewDrag}
                  onPointerUp={endPreviewDrag}
                  onPointerCancel={endPreviewDrag}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Превью карты" className="w-full h-full object-contain select-none pointer-events-none" draggable={false} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">Подготовка превью...</div>
                  )}
                </div>
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <p>• Перетащите картинку прямо по окну арта, чтобы выставить кадр.</p>
                  <p>• Для надёжного массового скачивания браузер может попросить разрешить несколько загрузок.</p>
                  <p>• Тип <b>sign</b> использует приложенные «seal» иконки как визуальный акцент поверх макета.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-300">
                <h3 className="mb-2 text-base font-bold text-white">Что умеет конструктор</h3>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Создание одной карты вручную с instant-preview.</li>
                  <li>Изображение с устройства или по ссылке, с перемещением и масштабом.</li>
                  <li>Автоподбор размера текста для названия, подтипа и эффекта.</li>
                  <li>Пакетная обработка таблиц в формате вашей базы карт.</li>
                  <li>Если строка неполная — конструктор останавливается на ней и просит заполнить недостающее.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
