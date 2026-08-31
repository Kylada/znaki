import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { CardType, Element } from '../types';

import artifactTemplate from '../assets/card-maker/template_artifacts_3.png?inline';
import monsterTemplate from '../assets/card-maker/template_monsters_3.png?inline';
import spellTemplate from '../assets/card-maker/template_spells_3.png?inline';
import sealsTemplate from '../assets/card-maker/seals.png?inline';
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
type RealElement = Exclude<Element, 'Нет'>;
type Rect = { x: number; y: number; width: number; height: number };

type CardDraft = {
  id: string;
  number: string;
  name: string;
  type: CardType;
  subtype: string;
  elements: RealElement[];
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

const CARD_WIDTH = 750;
const CARD_HEIGHT = 1050;
const px = (percent: number) => (CARD_WIDTH * percent) / 100;
const py = (percent: number) => (CARD_HEIGHT * percent) / 100;

const TITLE_RECT: Rect = { x: px(32), y: py(4), width: px(61), height: py(6) };
const SUBTYPE_RECT: Rect = { x: px(30), y: py(11), width: px(62), height: py(7) };
const COST_RECT: Rect = { x: px(4.5), y: py(1.75), width: px(15), height: py(15) };
const DEFAULT_TEXT_RECT: Rect = { x: px(18.5), y: py(69), width: px(72.5), height: py(24) };
const ARTIFACT_TEXT_RECT: Rect = { x: px(13.5), y: py(68), width: px(78.5), height: py(25) };
const ATTACK_ICON_RECT: Rect = { x: px(5), y: py(81), width: px(10), height: py(10) };
const ATTACK_VALUE_RECT: Rect = { x: px(7), y: py(83), width: px(7), height: py(7) };
const HEALTH_ICON_RECT: Rect = { x: px(14), y: py(88.5), width: px(11), height: py(11) };
const HEALTH_VALUE_RECT: Rect = { x: px(16), y: py(90.5), width: px(7), height: py(7) };
const SIGN_ELEMENT_AREA_RECT: Rect = { x: px(0.9), y: py(21.5), width: px(14), height: py(60) };
const NON_SIGN_ELEMENT_AREA_RECT: Rect = { x: px(0.3), y: py(18.7), width: px(14), height: py(60) };
const ELEMENT_SLOT_RECT: Rect = { x: 0, y: 0, width: px(14), height: py(14) };
const LOWER_LEFT_CORNER_DIAGONAL = {
  x1: px(2.5),
  y1: py(75),
  x2: px(36),
  y2: py(97.5),
};
const LOWER_LEFT_CORNER_PADDING = 8;

const ART_FRAME_BY_TYPE: Record<CardType, Rect> = {
  monster: { x: 106, y: 198, width: 597, height: 490 },
  spell: { x: 105, y: 195, width: 597, height: 490 },
  artifact: { x: 105, y: 202, width: 597, height: 490 },
  sign: { x: 0, y: 0, width: 0, height: 0 },
};

const ELEMENT_OPTIONS: RealElement[] = ['Свет', 'Тьма', 'Хаос', 'Порядок', 'Жизнь', 'Смерть'];

const templateByType: Record<CardType, string> = {
  monster: monsterTemplate,
  spell: spellTemplate,
  artifact: artifactTemplate,
  sign: sealsTemplate,
};

const elementIconByElement: Record<RealElement, string> = {
  Свет: lightIcon,
  Тьма: darknessIcon,
  Хаос: chaosIcon,
  Порядок: lawIcon,
  Жизнь: lifeIcon,
  Смерть: deathIcon,
};

const signElementIconByElement: Record<RealElement, string> = {
  Свет: lightSealIcon,
  Тьма: darknessSealIcon,
  Хаос: chaosSealIcon,
  Порядок: orderSealIcon,
  Жизнь: lifeSealIcon,
  Смерть: deathSealIcon,
};

const elementAliasMap: Record<string, RealElement | 'Нет'> = {
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

const processedAssetCache = new Map<string, Promise<string>>();

const makeEmptyDraft = (): CardDraft => ({
  id: crypto.randomUUID(),
  number: '',
  name: '',
  type: 'monster',
  subtype: '',
  elements: [],
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

const normalizeElements = (elements: readonly (RealElement | 'Нет')[]) =>
  Array.from(new Set(elements.filter((value): value is RealElement => value !== 'Нет')));

const parseSingleElement = (value: unknown): RealElement | 'Нет' => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return elementAliasMap[normalized] || 'Нет';
};

const parseElements = (...values: unknown[]): RealElement[] => {
  const split = values
    .flatMap(value => String(value ?? '').split(/[,+;/|\n]/g))
    .map(part => parseSingleElement(part))
    .filter((value): value is RealElement => value !== 'Нет');

  if (split.length > 0) return normalizeElements(split);

  return normalizeElements(values.map(parseSingleElement));
};

const parseType = (value: unknown, subtype?: unknown): CardType => {
  const primary = String(value ?? '').trim().toLowerCase();
  const secondary = String(subtype ?? '').trim().toLowerCase();

  if (primary.includes('знак') || primary.includes('seal') || primary.includes('sign') || secondary.includes('знак') || secondary.includes('seal') || secondary.includes('sign')) {
    return 'sign';
  }
  if (primary.includes('монстр') || primary.includes('monster')) return 'monster';
  if (primary.includes('артеф') || primary.includes('artifact')) return 'artifact';
  if (primary.includes('закля') || primary.includes('spell')) return 'spell';
  if (secondary.includes('монумент') || secondary.includes('экип') || secondary.includes('equipment')) return 'artifact';
  if (secondary.includes('быстр') || secondary.includes('длитель') || secondary.includes('spell')) return 'spell';
  return 'monster';
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

const removeBlackBackground = async (src: string) => {
  if (!processedAssetCache.has(src)) {
    processedAssetCache.set(
      src,
      new Promise<string>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('Не удалось обработать иконку'));
            return;
          }

          context.drawImage(image, 0, 0);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const { data } = imageData;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const max = Math.max(r, g, b);
            if (max < 24) {
              data[i + 3] = 0;
            }
          }

          context.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        image.onerror = () => reject(new Error('Не удалось загрузить иконку'));
        image.src = src;
      })
    );
  }

  return processedAssetCache.get(src)!;
};

const createSvgObjectUrl = (svg: string) =>
  URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));

const createMeasureContext = () => {
  const canvas = document.createElement('canvas');
  return canvas.getContext('2d');
};

const splitLongToken = (ctx: CanvasRenderingContext2D, token: string, maxWidth: number) => {
  const parts: string[] = [];
  let current = '';

  for (const char of token) {
    const candidate = current + char;
    if (!current || ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      parts.push(current);
      current = char;
    }
  }

  if (current) parts.push(current);
  return parts;
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
  if (!ctx) return { fontSize: minFont };

  for (let fontSize = maxFont; fontSize >= minFont; fontSize -= 1) {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(text).width <= width) {
      return { fontSize };
    }
  }

  return { fontSize: minFont };
};

const getCornerSafeLeft = (baselineY: number, defaultLeft: number) => {
  const { x1, y1, x2, y2 } = LOWER_LEFT_CORNER_DIAGONAL;
  if (baselineY <= y1) return defaultLeft;
  if (baselineY >= y2) return Math.max(defaultLeft, x2 + LOWER_LEFT_CORNER_PADDING);

  const ratio = (baselineY - y1) / (y2 - y1);
  const diagonalX = x1 + (x2 - x1) * ratio;
  return Math.max(defaultLeft, diagonalX + LOWER_LEFT_CORNER_PADDING);
};

const fitTextToShapedArea = (
  text: string,
  rect: Rect,
  maxFont: number,
  minFont: number,
  fontFamily: string,
  weight = 700,
  lineHeightMultiplier = 1.04,
  align: 'left' | 'center' = 'center',
  avoidLowerLeftCorner = false,
) => {
  const ctx = createMeasureContext();
  if (!ctx) {
    return {
      fontSize: minFont,
      lineHeight: minFont * lineHeightMultiplier,
      lines: [{ text, x: rect.x, y: rect.y + minFont, anchor: align === 'center' ? 'middle' as const : 'start' as const }],
    };
  }

  const buildLayout = (fontSize: number) => {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    const lineHeight = fontSize * lineHeightMultiplier;
    const right = rect.x + rect.width;
    const lines: { text: string; x: number; y: number; anchor: 'start' | 'middle' }[] = [];

    const lineMetrics = (lineIndex: number) => {
      const baselineY = rect.y + fontSize + lineIndex * lineHeight;
      const left = avoidLowerLeftCorner ? getCornerSafeLeft(baselineY, rect.x) : rect.x;
      return {
        baselineY,
        left,
        width: Math.max(16, right - left),
      };
    };

    const pushLine = (value: string) => {
      const lineIndex = lines.length;
      const { baselineY, left, width } = lineMetrics(lineIndex);
      lines.push({
        text: value.trimEnd(),
        x: align === 'center' ? left + width / 2 : left,
        y: baselineY,
        anchor: align === 'center' ? 'middle' : 'start',
      });
    };

    for (const paragraph of text.replace(/\r/g, '').split('\n')) {
      if (!paragraph.trim()) {
        pushLine('');
        continue;
      }

      let remaining = paragraph;
      while (remaining.length > 0) {
        const { width } = lineMetrics(lines.length);

        if (ctx.measureText(remaining).width <= width) {
          pushLine(remaining);
          remaining = '';
          break;
        }

        let fitted = '';
        let lastSpaceIndex = -1;
        for (let index = 0; index < remaining.length; index += 1) {
          const candidate = remaining.slice(0, index + 1);
          if (candidate.trimEnd().endsWith(' ')) {
            lastSpaceIndex = index;
          }

          if (ctx.measureText(candidate).width > width) {
            break;
          }
          fitted = candidate;
        }

        if (!fitted) {
          const chunks = splitLongToken(ctx, remaining, width);
          fitted = chunks[0] || remaining[0];
        } else if (lastSpaceIndex > 0) {
          const spacedFit = remaining.slice(0, lastSpaceIndex + 1).trimEnd();
          if (spacedFit) {
            fitted = spacedFit;
          }
        }

        pushLine(fitted);
        remaining = remaining.slice(fitted.length).replace(/^\s+/, '');
      }
    }

    return { fontSize, lineHeight, lines };
  };

  for (let fontSize = maxFont; fontSize >= minFont; fontSize -= 1) {
    const layout = buildLayout(fontSize);
    if (layout.lines.length * layout.lineHeight <= rect.height) {
      return layout;
    }
  }

  return buildLayout(minFont);
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
    const draft: CardDraft = {
      id: crypto.randomUUID(),
      number: numberToString(numberCol >= 0 ? row[numberCol] : ''),
      name: numberToString(nameCol >= 0 ? row[nameCol] : ''),
      type,
      subtype: numberToString(subtypeCol >= 0 ? row[subtypeCol] : ''),
      elements: parseElements(
        elementDecyphCol >= 0 ? row[elementDecyphCol] : '',
        elementCol >= 0 ? row[elementCol] : ''
      ),
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

const buildElementStackMarkup = (draft: CardDraft) => {
  if (draft.elements.length === 0) return '';

  const isSign = draft.type === 'sign';
  const iconSet = isSign ? signElementIconByElement : elementIconByElement;
  const area = isSign ? SIGN_ELEMENT_AREA_RECT : NON_SIGN_ELEMENT_AREA_RECT;
  const slotW = ELEMENT_SLOT_RECT.width;
  const slotH = ELEMENT_SLOT_RECT.height;
  const step = isSign ? slotH * 0.86 : slotH * 0.6;

  return draft.elements
    .map((element, index) => {
      const slotY = area.y + step * index;
      return `<image href="${iconSet[element]}" x="${area.x}" y="${slotY}" width="${slotW}" height="${slotH}" preserveAspectRatio="xMidYMid meet"/>`;
    })
    .join('');
};

const buildCardSvg = async (draft: CardDraft) => {
  const template = templateByType[draft.type];
  const attackIcon = await removeBlackBackground(battleAxeIcon);
  const healthIcon = await removeBlackBackground(mineralHeartIcon);
  const artFrame = ART_FRAME_BY_TYPE[draft.type];
  const textRect = draft.type === 'artifact' ? ARTIFACT_TEXT_RECT : DEFAULT_TEXT_RECT;
  const effectAlignment = draft.type === 'artifact' ? 'left' : 'center';

  const titleText = draft.name.trim() || 'Без названия';
  const subtypeText = draft.subtype.trim();
  const costText = draft.cost.trim() || '0';
  const attackText = draft.attack.trim() || '0';
  const healthText = draft.health.trim() || '0';
  const effectText = draft.text.trim();

  const titleLayout = fitSingleLine(titleText, TITLE_RECT.width, 60, 22, 'Arial Black, Arial, sans-serif', 900);
  const subtypeLayout = fitSingleLine(subtypeText || ' ', SUBTYPE_RECT.width, 48, 16, 'Arial Black, Arial, sans-serif', 800);
  const costLayout = fitSingleLine(costText, COST_RECT.width * 0.82, 96, 26, "Georgia, 'Times New Roman', serif", 700);
  const attackLayout = fitSingleLine(attackText, ATTACK_VALUE_RECT.width * 0.9, 68, 22, 'Arial Black, Arial, sans-serif', 900);
  const healthLayout = fitSingleLine(healthText, HEALTH_VALUE_RECT.width * 0.9, 68, 22, 'Arial Black, Arial, sans-serif', 900);
  const effectLayout = fitTextToShapedArea(
    effectText,
    textRect,
    draft.type === 'artifact' ? 27 : 31,
    9,
    'Arial, Helvetica, sans-serif',
    700,
    1.04,
    effectAlignment,
    draft.type !== 'sign',
  );

  let underlay = '';

  if (draft.type !== 'sign' && draft.imageDataUrl) {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const instance = new Image();
      instance.onload = () => resolve(instance);
      instance.onerror = () => reject(new Error('Не удалось открыть изображение для карты'));
      instance.src = draft.imageDataUrl;
    });

    const scale = Math.max(artFrame.width / image.width, artFrame.height / image.height) * draft.imageScale;
    const width = image.width * scale;
    const height = image.height * scale;
    const x = artFrame.x + (artFrame.width - width) / 2 + draft.imageOffsetX;
    const y = artFrame.y + (artFrame.height - height) / 2 + draft.imageOffsetY;
    underlay = `<image href="${draft.imageDataUrl}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none"/>`;
  }

  const effectMarkup = effectText
    ? effectLayout.lines
        .map(line =>
          `<text x="${line.x}" y="${line.y}" text-anchor="${line.anchor}" font-size="${effectLayout.fontSize}" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#111111">${svgEscape(line.text || ' ')}</text>`
        )
        .join('')
    : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
      ${underlay}
      <image href="${template}" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}"/>
      ${buildElementStackMarkup(draft)}

      <text x="${TITLE_RECT.x + TITLE_RECT.width / 2}" y="${TITLE_RECT.y + TITLE_RECT.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${titleLayout.fontSize}" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#f5f5f5" stroke="#111111" stroke-width="6" paint-order="stroke fill">${svgEscape(titleText)}</text>
      ${subtypeText ? `<text x="${SUBTYPE_RECT.x + SUBTYPE_RECT.width}" y="${SUBTYPE_RECT.y + SUBTYPE_RECT.height / 2}" text-anchor="end" dominant-baseline="middle" font-size="${subtypeLayout.fontSize}" font-family="Arial Black, Arial, sans-serif" font-weight="800" fill="#f5f5f5" stroke="#111111" stroke-width="5" paint-order="stroke fill">${svgEscape(subtypeText)}</text>` : ''}
      ${draft.type !== 'sign' ? `<text x="${COST_RECT.x + COST_RECT.width / 2}" y="${COST_RECT.y + COST_RECT.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${costLayout.fontSize}" font-family="Georgia, 'Times New Roman', serif" font-weight="700" fill="#111111">${svgEscape(costText)}</text>` : ''}

      ${effectMarkup}

      ${draft.type === 'monster' ? `
        <image href="${attackIcon}" x="${ATTACK_ICON_RECT.x}" y="${ATTACK_ICON_RECT.y}" width="${ATTACK_ICON_RECT.width}" height="${ATTACK_ICON_RECT.height}" preserveAspectRatio="xMidYMid meet"/>
        <text x="${ATTACK_VALUE_RECT.x + ATTACK_VALUE_RECT.width / 2}" y="${ATTACK_VALUE_RECT.y + ATTACK_VALUE_RECT.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${attackLayout.fontSize}" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#ffffff" stroke="#111111" stroke-width="6" paint-order="stroke fill">${svgEscape(attackText)}</text>
      ` : ''}

      ${(draft.type === 'monster' || draft.type === 'artifact') ? `
        <image href="${healthIcon}" x="${HEALTH_ICON_RECT.x}" y="${HEALTH_ICON_RECT.y}" width="${HEALTH_ICON_RECT.width}" height="${HEALTH_ICON_RECT.height}" preserveAspectRatio="xMidYMid meet"/>
        <text x="${HEALTH_VALUE_RECT.x + HEALTH_VALUE_RECT.width / 2}" y="${HEALTH_VALUE_RECT.y + HEALTH_VALUE_RECT.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${healthLayout.fontSize}" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#ffffff" stroke="#111111" stroke-width="6" paint-order="stroke fill">${svgEscape(healthText)}</text>
      ` : ''}
    </svg>
  `;
};

const downloadPngFromSvg = async (svg: string, fileName: string) => {
  const image = new Image();
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Не удалось создать canvas для сохранения');

  const svgUrl = createSvgObjectUrl(svg);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Не удалось подготовить изображение карты к скачиванию'));
      image.src = svgUrl;
    });

    context.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    context.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Не удалось сохранить PNG');

    const pngUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${sanitizeFileName(fileName)}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
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
  const toggleElement = (element: RealElement) => {
    const exists = draft.elements.includes(element);
    update('elements', exists ? draft.elements.filter(current => current !== element) : [...draft.elements, element]);
  };

  return (
    <div className="space-y-4">
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
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-gray-500">Элементы</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${draft.elements.length === 0 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => update('elements', [])}
            >
              Нет элемента
            </button>
            {ELEMENT_OPTIONS.map(element => {
              const active = draft.elements.includes(element);
              return (
                <button
                  key={element}
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${active ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  onClick={() => toggleElement(element)}
                >
                  {element}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-500">Несколько элементов просто складываются столбиком, без уменьшения значков.</p>
        </div>
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
            placeholder="Гад / Обычное Заклятье / Монумент..."
          />
        </label>
      </div>

      {(draft.type === 'monster' || draft.type === 'spell' || draft.type === 'artifact') && (
        <label className="space-y-1 block">
          <span className="text-xs uppercase tracking-wide text-gray-500">Цена</span>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
            value={draft.cost}
            onChange={(e) => update('cost', e.target.value)}
            placeholder="1 / X / *"
          />
        </label>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(draft.type === 'monster' || draft.type === 'artifact') && (
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Здоровье</span>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
              value={draft.health}
              onChange={(e) => update('health', e.target.value)}
              placeholder="1 / X / *"
            />
          </label>
        )}
        {draft.type === 'monster' && (
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Атака</span>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
              value={draft.attack}
              onChange={(e) => update('attack', e.target.value)}
              placeholder="1 / X / *"
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
        <p className="text-[11px] text-gray-500">Текст рендерится по правилам, близким к вашему NanDeck макету: разные безопасные зоны для монстров/заклятий и артефактов.</p>
      </label>

      <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${draft.imageMode === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            onClick={() => update('imageMode', 'upload')}
          >
            Из файла
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${draft.imageMode === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
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
                if (file) await onFileImage(file);
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
            <p className="text-[11px] text-gray-500">Если сайт режет кросс-доменные загрузки, лучше использовать файл с устройства.</p>
          </div>
        )}

        {imageError && <div className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">{imageError}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Смещение X</span>
            <input
              type="range"
              min={-320}
              max={320}
              value={draft.imageOffsetX}
              onChange={(e) => update('imageOffsetX', Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Смещение Y</span>
            <input
              type="range"
              min={-320}
              max={320}
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
              max={240}
              value={draft.imageScale * 100}
              onChange={(e) => update('imageScale', Number(e.target.value) / 100)}
              className="w-full"
            />
          </label>
        </div>

        <p className="text-[11px] text-gray-500">
          Перетаскивайте картинку прямо в превью справа. Ползунки дублируют ту же настройку и помогают точнее выставить кадр.
          {batchMode && ' В пакетном режиме ссылка из таблицы подхватывается автоматически, но вы можете заменить её вручную для текущей карты.'}
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
  const previewUrlRef = useRef('');
  const dragState = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const autoImageAttempts = useRef<Set<string>>(new Set());

  const currentBatchItem = activeBatchIndex !== null ? batchItems[activeBatchIndex] : null;

  const saveCurrentBatchDraft = (nextDraft: CardDraft) => {
    if (activeBatchIndex === null) return;
    setBatchItems(prev => prev.map((item, index) => (
      index === activeBatchIndex ? { ...item, draft: nextDraft, missingFields: getMissingFields(nextDraft) } : item
    )));
  };

  const setDraftAndPersist = (nextDraft: CardDraft) => {
    setDraft(nextDraft);
    if (activeBatchIndex !== null) saveCurrentBatchDraft(nextDraft);
  };

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const svg = await buildCardSvg(draft);
        if (cancelled) return;
        const url = createSvgObjectUrl(svg);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } catch (error) {
        if (cancelled) return;
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = '';
        }
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

  useEffect(() => () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
  }, []);

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
          const next = { ...prev, imageDataUrl: dataUrl, imageMode: 'url' as const };
          saveCurrentBatchDraft(next);
          return next;
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

  const resolveUrlImage = async () => {
    if (!draft.imageUrl.trim()) return;
    setImageBusy(true);
    setImageError('');
    try {
      const dataUrl = await urlToDataUrl(draft.imageUrl.trim());
      setDraftAndPersist({ ...draft, imageDataUrl: dataUrl, imageMode: 'url' });
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
      setDraftAndPersist({
        ...draft,
        imageDataUrl: dataUrl,
        imageUrl: file.name,
        imageMode: 'upload',
        imageOffsetX: 0,
        imageOffsetY: 0,
        imageScale: 1,
      });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Не удалось загрузить изображение');
    } finally {
      setImageBusy(false);
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
      if (item.missingFields.length > 0) {
        setActiveBatchIndex(index);
        setDraft(item.draft);
        setBatchStatus(`Карточка ${index + 1}/${items.length}: заполните недостающие поля (${item.missingFields.join(', ')})`);
        return;
      }

      setBatchStatus(`Автосохранение ${index + 1}/${items.length}: ${item.draft.name || 'Без названия'}`);
      try {
        const hydrated = item.draft.imageUrl && !item.draft.imageDataUrl && item.draft.type !== 'sign'
          ? { ...item.draft, imageDataUrl: await urlToDataUrl(item.draft.imageUrl) }
          : item.draft;
        await downloadCurrentDraft(hydrated);
        items[index] = { ...item, draft: hydrated, missingFields: getMissingFields(hydrated) };
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
    if (items.length === 0) throw new Error('В таблице не найдено карточек');
    autoImageAttempts.current.clear();
    setBatchItems(items);
    setMode('batch');
    setImageError('');
    await continueBatchFrom([...items], 0);
  };

  const handleBatchFile = async (file: File) => {
    setLoadingBatch(true);
    setModalError('');
    try {
      await startBatchFromRows(await readSheetDataFromFile(file));
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
      await startBatchFromRows(await readSheetDataFromGoogle(batchUrl.trim()));
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
      const hydrated = draft.imageUrl && draft.imageMode === 'url' && !draft.imageDataUrl && draft.type !== 'sign'
        ? { ...draft, imageDataUrl: await urlToDataUrl(draft.imageUrl.trim()) }
        : draft;
      setDraft(hydrated);
      saveCurrentBatchDraft(hydrated);
      await downloadCurrentDraft(hydrated);

      const nextItems = batchItems.map((item, index) => (
        index === activeBatchIndex ? { ...item, draft: hydrated, missingFields: getMissingFields(hydrated) } : item
      ));
      setBatchItems(nextItems);
      await continueBatchFrom([...nextItems], activeBatchIndex + 1);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Не удалось скачать карту из пакета');
    } finally {
      setDownloading(false);
    }
  };

  const clearCurrent = () => {
    const fresh = makeEmptyDraft();
    setImageError('');
    setModalError('');
    setDraft(fresh);
    if (mode === 'batch' && activeBatchIndex !== null) {
      saveCurrentBatchDraft(fresh);
      setBatchStatus('Текущая карточка очищена вручную.');
    }
  };

  const resetBatchQueue = () => {
    autoImageAttempts.current.clear();
    setMode('batch');
    setDraft(makeEmptyDraft());
    setActiveBatchIndex(null);
    setBatchStatus('');
    setImageError('');
    setBatchItems([]);
  };

  const beginPreviewDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!previewRef.current || draft.type === 'sign' || !draft.imageDataUrl) return;
    const rect = previewRef.current.getBoundingClientRect();
    const scaleX = rect.width / CARD_WIDTH;
    const scaleY = rect.height / CARD_HEIGHT;
    const artFrame = ART_FRAME_BY_TYPE[draft.type];
    const localX = (event.clientX - rect.left) / scaleX;
    const localY = (event.clientY - rect.top) / scaleY;
    const insideArt = localX >= artFrame.x && localX <= artFrame.x + artFrame.width && localY >= artFrame.y && localY <= artFrame.y + artFrame.height;
    if (!insideArt) return;

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
      imageOffsetX: clamp(draft.imageOffsetX + dx, -320, 320),
      imageOffsetY: clamp(draft.imageOffsetY + dy, -320, 320),
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
            <p className="text-sm text-gray-400">Подогнал геометрию ближе к вашему NanDeck-шаблону и подключил отдельную рамку для Печатей.</p>
          </div>
          <button className="text-2xl text-gray-500 hover:text-white" onClick={onClose}>✕</button>
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
                          if (file) await handleBatchFile(file);
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
                  onClick={clearCurrent}
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
                  className="mx-auto aspect-[5/7] w-full max-w-[380px] overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-[0_0_30px_rgba(0,0,0,0.45)] cursor-grab active:cursor-grabbing"
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
                  <p>• Геометрия полей теперь опирается на проценты из вашего файла `nandocards.txt`.</p>
                  <p>• Для Печатей используется отдельный шаблон `seals.png`, а не перераскрашенная рамка заклятья.</p>
                  <p>• Если нужно, я могу следующим проходом уже добивать чисто пиксельные микро-сдвиги по вашим новым примерам.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
