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
type RealElement = Exclude<Element, 'Нет'>;

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

type Rect = { x: number; y: number; width: number; height: number };

const CARD_WIDTH = 744;
const CARD_HEIGHT = 1048;

const ART_FRAME_BY_TYPE: Record<CardType, Rect> = {
  monster: { x: 105, y: 198, width: 592, height: 489 },
  artifact: { x: 104, y: 202, width: 592, height: 489 },
  spell: { x: 104, y: 195, width: 592, height: 489 },
  sign: { x: 104, y: 195, width: 592, height: 489 },
};

const TITLE_RECT: Rect = { x: 202, y: 32, width: 458, height: 68 };
const SUBTYPE_RECT: Rect = { x: 446, y: 104, width: 216, height: 52 };
const TEXT_RECT: Rect = { x: 96, y: 717, width: 556, height: 222 };
const ELEMENT_PANEL_RECT: Rect = { x: 24, y: 235, width: 74, height: 160 };
const COST_RECT: Rect = { x: 24, y: 24, width: 82, height: 104 };
const ATTACK_ICON_RECT: Rect = { x: 6, y: 842, width: 120, height: 120 };
const ATTACK_VALUE_RECT: Rect = { x: 48, y: 888, width: 52, height: 54 };
const HEALTH_ICON_RECT: Rect = { x: 62, y: 902, width: 110, height: 110 };
const HEALTH_VALUE_RECT: Rect = { x: 94, y: 947, width: 56, height: 56 };
const SIGN_WATERMARK_RECT: Rect = { x: 250, y: 280, width: 190, height: 190 };

const ELEMENT_OPTIONS: RealElement[] = ['Свет', 'Тьма', 'Хаос', 'Порядок', 'Жизнь', 'Смерть'];

const templateByType: Record<CardType, string> = {
  monster: monsterTemplate,
  spell: spellTemplate,
  artifact: artifactTemplate,
  sign: spellTemplate,
};

const elementIconByElement: Record<RealElement, string> = {
  Свет: lightIcon,
  Тьма: darknessIcon,
  Хаос: chaosIcon,
  Порядок: lawIcon,
  Жизнь: lifeIcon,
  Смерть: deathIcon,
};

const sealIconByElement: Record<RealElement, string> = {
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

const normalizeElements = (elements: readonly (RealElement | 'Нет')[]): RealElement[] => {
  const unique = Array.from(new Set(elements.filter((value): value is RealElement => value !== 'Нет')));
  return unique;
};

const parseSingleElement = (value: unknown): RealElement | 'Нет' => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return elementAliasMap[normalized] || 'Нет';
};

const parseElements = (...values: unknown[]): RealElement[] => {
  const pieces = values
    .flatMap(value => String(value ?? '').split(/[,+;/|\n]/g))
    .map(piece => parseSingleElement(piece))
    .filter((value): value is RealElement => value !== 'Нет');

  if (pieces.length > 0) return normalizeElements(pieces);

  const fallback = values
    .map(parseSingleElement)
    .filter((value): value is RealElement => value !== 'Нет');

  return normalizeElements(fallback);
};

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

const elementSummary = (elements: readonly RealElement[]) => (elements.length > 0 ? elements.join(', ') : 'Нет');

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
          for (let index = 0; index < data.length; index += 4) {
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            const value = Math.max(red, green, blue);
            if (value < 12) {
              data[index + 3] = 0;
            } else {
              data[index + 3] = Math.max(data[index + 3], Math.min(255, value + 35));
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

const createMeasureContext = () => {
  const canvas = document.createElement('canvas');
  return canvas.getContext('2d');
};

const splitLongToken = (ctx: CanvasRenderingContext2D, token: string, maxWidth: number) => {
  const parts: string[] = [];
  let current = '';

  for (const char of token) {
    if (!current) {
      current = char;
      continue;
    }

    if (ctx.measureText(current + char).width <= maxWidth) {
      current += char;
    } else {
      parts.push(current);
      current = char;
    }
  }

  if (current) parts.push(current);
  return parts;
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const paragraphs = text.replace(/\r/g, '').split('\n');
  const allLines: string[] = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (!paragraph.trim()) {
      allLines.push('');
    } else {
      const rawTokens = paragraph.match(/\S+|\s+/g) || [paragraph];
      let currentLine = '';

      rawTokens.forEach(token => {
        if (!token.trim()) {
          if (currentLine && ctx.measureText(currentLine + token).width <= maxWidth) {
            currentLine += token;
          }
          return;
        }

        const tokenParts = ctx.measureText(token).width > maxWidth ? splitLongToken(ctx, token, maxWidth) : [token];

        tokenParts.forEach((part, partIndex) => {
          const candidate = currentLine ? `${currentLine}${part}` : part;
          if (ctx.measureText(candidate).width <= maxWidth) {
            currentLine = candidate;
          } else {
            if (currentLine) allLines.push(currentLine.trimEnd());
            currentLine = part;
          }

          if (partIndex < tokenParts.length - 1) {
            allLines.push(currentLine.trimEnd());
            currentLine = '';
          }
        });
      });

      if (currentLine) {
        allLines.push(currentLine.trimEnd());
      }
    }

    if (paragraphIndex < paragraphs.length - 1) {
      allLines.push('');
    }
  });

  return allLines;
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

const fitMultiline = (
  text: string,
  width: number,
  height: number,
  maxFont: number,
  minFont: number,
  fontFamily: string,
  weight = 700,
  lineHeightMultiplier = 1.02,
) => {
  const ctx = createMeasureContext();
  if (!ctx) return { fontSize: minFont, lines: [text], lineHeight: minFont * lineHeightMultiplier };

  for (let fontSize = maxFont; fontSize >= minFont; fontSize -= 1) {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    const lines = wrapText(ctx, text, width);
    const lineHeight = fontSize * lineHeightMultiplier;
    if (lines.length * lineHeight <= height) {
      return { fontSize, lines, lineHeight };
    }
  }

  ctx.font = `${weight} ${minFont}px ${fontFamily}`;
  const lines = wrapText(ctx, text, width);
  return { fontSize: minFont, lines, lineHeight: minFont * lineHeightMultiplier };
};

const buildElementStackMarkup = (draft: CardDraft) => {
  const icons = draft.elements.map(element => (draft.type === 'sign' ? sealIconByElement[element] : elementIconByElement[element]));
  if (icons.length === 0) return '';

  const gap = icons.length > 1 ? 4 : 0;
  const singleHeight = 138;
  const iconHeight = icons.length === 1
    ? singleHeight
    : Math.min(74, (ELEMENT_PANEL_RECT.height - gap * (icons.length - 1)) / icons.length);
  const iconWidth = iconHeight * (77 / 150);
  const totalHeight = iconHeight * icons.length + gap * (icons.length - 1);
  const startX = ELEMENT_PANEL_RECT.x + (ELEMENT_PANEL_RECT.width - iconWidth) / 2;
  const startY = ELEMENT_PANEL_RECT.y + (ELEMENT_PANEL_RECT.height - totalHeight) / 2;

  return icons
    .map((icon, index) => {
      const y = startY + index * (iconHeight + gap);
      return `<image href="${icon}" x="${startX}" y="${y}" width="${iconWidth}" height="${iconHeight}" preserveAspectRatio="xMidYMid meet"/>`;
    })
    .join('');
};

const buildCardSvg = async (draft: CardDraft) => {
  const template = templateByType[draft.type];
  const artFrame = ART_FRAME_BY_TYPE[draft.type];
  const titleLayout = fitSingleLine(draft.name || 'Без названия', TITLE_RECT.width, 54, 22, 'Arial Black, Arial, sans-serif', 900);
  const subtypeLayout = fitSingleLine(draft.subtype || '', SUBTYPE_RECT.width, 42, 16, 'Arial Black, Arial, sans-serif', 800);
  const costLayout = fitSingleLine(draft.cost.trim() || '0', COST_RECT.width, 86, 24, "Georgia, 'Times New Roman', serif", 700);
  const attackLayout = fitSingleLine(draft.attack.trim() || '0', ATTACK_VALUE_RECT.width, 62, 24, 'Arial Black, Arial, sans-serif', 900);
  const healthLayout = fitSingleLine(draft.health.trim() || '0', HEALTH_VALUE_RECT.width, 62, 24, 'Arial Black, Arial, sans-serif', 900);
  const textLayout = fitMultiline(draft.text || '', TEXT_RECT.width, TEXT_RECT.height, 44, 13, 'Arial, Helvetica, sans-serif', 700, 1.01);

  const attackIcon = await removeBlackBackground(battleAxeIcon);
  const healthIcon = await removeBlackBackground(mineralHeartIcon);

  let artMarkup = `<rect x="${artFrame.x}" y="${artFrame.y}" width="${artFrame.width}" height="${artFrame.height}" fill="#efefef"/>`;

  if (draft.imageDataUrl) {
    const artImage = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Не удалось открыть изображение для карты'));
      image.src = draft.imageDataUrl;
    });

    const coverScale = Math.max(artFrame.width / artImage.width, artFrame.height / artImage.height);
    const scale = coverScale * draft.imageScale;
    const width = artImage.width * scale;
    const height = artImage.height * scale;
    const x = artFrame.x + (artFrame.width - width) / 2 + draft.imageOffsetX;
    const y = artFrame.y + (artFrame.height - height) / 2 + draft.imageOffsetY;

    artMarkup = `<image href="${draft.imageDataUrl}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none"/>`;
  } else if (draft.type === 'sign' && draft.elements.length > 0) {
    const sealIcon = sealIconByElement[draft.elements[0]];
    artMarkup = `
      <rect x="${artFrame.x}" y="${artFrame.y}" width="${artFrame.width}" height="${artFrame.height}" fill="#1f2937"/>
      <image href="${sealIcon}" x="${SIGN_WATERMARK_RECT.x}" y="${SIGN_WATERMARK_RECT.y}" width="${SIGN_WATERMARK_RECT.width}" height="${SIGN_WATERMARK_RECT.height}" opacity="0.9" preserveAspectRatio="xMidYMid meet"/>
    `;
  }

  const showCost = draft.type !== 'sign';
  const showAttack = draft.type === 'monster';
  const showHealth = draft.type === 'monster' || draft.type === 'artifact';
  const showSubtype = Boolean(draft.subtype.trim());
  const showText = Boolean(draft.text.trim());
  const elementStackMarkup = buildElementStackMarkup(draft);

  const textMarkup = showText
    ? textLayout.lines
        .map((line, index) => {
          const y = TEXT_RECT.y + textLayout.fontSize + index * textLayout.lineHeight;
          return `<text x="${TEXT_RECT.x}" y="${y}" font-size="${textLayout.fontSize}" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#111111">${svgEscape(line || ' ')}</text>`;
        })
        .join('')
    : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
      ${artMarkup}
      <image href="${template}" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}"/>
      ${elementStackMarkup}

      <text x="${TITLE_RECT.x + TITLE_RECT.width / 2}" y="${TITLE_RECT.y + TITLE_RECT.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${titleLayout.fontSize}" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#ffffff" stroke="#111111" stroke-width="6" paint-order="stroke fill">${svgEscape(draft.name || 'Без названия')}</text>
      ${showSubtype ? `<text x="${SUBTYPE_RECT.x + SUBTYPE_RECT.width}" y="${SUBTYPE_RECT.y + SUBTYPE_RECT.height / 2 + 4}" text-anchor="end" dominant-baseline="middle" font-size="${subtypeLayout.fontSize}" font-family="Arial Black, Arial, sans-serif" font-weight="800" fill="#ffffff" stroke="#111111" stroke-width="4.5" paint-order="stroke fill">${svgEscape(draft.subtype)}</text>` : ''}
      ${showCost ? `<text x="${COST_RECT.x + COST_RECT.width / 2}" y="${COST_RECT.y + COST_RECT.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${costLayout.fontSize}" font-family="Georgia, 'Times New Roman', serif" font-weight="700" fill="#111111">${svgEscape(draft.cost.trim() || '0')}</text>` : ''}

      ${textMarkup}

      ${showAttack ? `
        <image href="${attackIcon}" x="${ATTACK_ICON_RECT.x}" y="${ATTACK_ICON_RECT.y}" width="${ATTACK_ICON_RECT.width}" height="${ATTACK_ICON_RECT.height}" preserveAspectRatio="xMidYMid meet"/>
        <text x="${ATTACK_VALUE_RECT.x + ATTACK_VALUE_RECT.width / 2}" y="${ATTACK_VALUE_RECT.y + ATTACK_VALUE_RECT.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${attackLayout.fontSize}" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#fff9f4" stroke="#7a0000" stroke-width="8" paint-order="stroke fill">${svgEscape(draft.attack.trim() || '0')}</text>
      ` : ''}

      ${showHealth ? `
        <image href="${healthIcon}" x="${HEALTH_ICON_RECT.x}" y="${HEALTH_ICON_RECT.y}" width="${HEALTH_ICON_RECT.width}" height="${HEALTH_ICON_RECT.height}" preserveAspectRatio="xMidYMid meet"/>
        <text x="${HEALTH_VALUE_RECT.x + HEALTH_VALUE_RECT.width / 2}" y="${HEALTH_VALUE_RECT.y + HEALTH_VALUE_RECT.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${healthLayout.fontSize}" font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#fff9f4" stroke="#7a0000" stroke-width="8" paint-order="stroke fill">${svgEscape(draft.health.trim() || '0')}</text>
      ` : ''}
    </svg>
  `;
};

const createSvgObjectUrl = (svg: string) =>
  URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));

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

    const link = document.createElement('a');
    const pngUrl = URL.createObjectURL(blob);
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
    const hasElement = draft.elements.includes(element);
    update('elements', hasElement ? draft.elements.filter(current => current !== element) : [...draft.elements, element]);
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
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${draft.elements.length === 0 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
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
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  onClick={() => toggleElement(element)}
                >
                  {element}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-500">Выбрано: {elementSummary(draft.elements)}. Можно выбрать несколько элементов — в таком случае значки будут располагаться столбиком один под другим.</p>
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
            placeholder="Гад / Быстрое / Монумент..."
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
        <p className="text-[11px] text-gray-500">Текст автоматически переносится, умеет ломать слишком длинные слова и поджимается по размеру, чтобы не вылезать из текстового окна.</p>
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
            <p className="text-[11px] text-gray-500">Если сайт не разрешает кросс-доменные загрузки, используйте файл с устройства — так предпросмотр и экспорт PNG будут надёжнее.</p>
          </div>
        )}

        {imageError && <div className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">{imageError}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Смещение X</span>
            <input
              type="range"
              min={-260}
              max={260}
              value={draft.imageOffsetX}
              onChange={(e) => update('imageOffsetX', Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Смещение Y</span>
            <input
              type="range"
              min={-260}
              max={260}
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
          {batchMode && ' В пакетном режиме ссылка из таблицы будет подхвачена автоматически, но вы можете заменить её вручную для текущей карты.'}
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
    if (activeBatchIndex !== null) {
      saveCurrentBatchDraft(nextDraft);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const svg = await buildCardSvg(draft);
        if (cancelled) return;
        const nextPreviewUrl = createSvgObjectUrl(svg);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = nextPreviewUrl;
        setPreviewUrl(nextPreviewUrl);
      } catch (error) {
        if (!cancelled) {
          if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = '';
          }
          setPreviewUrl('');
          setModalError(error instanceof Error ? error.message : 'Не удалось собрать превью карты');
        }
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

  const clearCurrent = () => {
    const freshDraft = makeEmptyDraft();
    setImageError('');
    setModalError('');
    setDraft(freshDraft);
    if (mode === 'batch' && activeBatchIndex !== null) {
      saveCurrentBatchDraft(freshDraft);
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
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const scaleX = rect.width / CARD_WIDTH;
    const scaleY = rect.height / CARD_HEIGHT;
    const artFrame = ART_FRAME_BY_TYPE[draft.type];
    const localX = (event.clientX - rect.left) / scaleX;
    const localY = (event.clientY - rect.top) / scaleY;
    const insideArt = localX >= artFrame.x && localX <= artFrame.x + artFrame.width && localY >= artFrame.y && localY <= artFrame.y + artFrame.height;
    if (!insideArt || !draft.imageDataUrl) return;

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
            <p className="text-sm text-gray-400">Исправил разметку, подогнал безопасные зоны текста и добавил мульти-элементы. При необходимости ещё могу докрутить позиционирование по вашим новым примерам.</p>
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
                  <p>• Перетаскивайте картинку прямо по окну арта, чтобы выставить кадр.</p>
                  <p>• Цена, атака и здоровье теперь принимают и буквы / символы вроде <b>X</b> и <b>*</b>.</p>
                  <p>• Элементы можно выбирать несколько разом — они встанут столбиком в левой плашке.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-300">
                <h3 className="mb-2 text-base font-bold text-white">Что уже поправлено</h3>
                <ul className="list-disc space-y-1 pl-5">
                  <li>окно арта теперь подгоняется под реальные прозрачные рамки шаблона;</li>
                  <li>подтип опущен ниже и лучше центрируется;</li>
                  <li>текст умеет ужиматься и переносить длинные слова;</li>
                  <li>иконки атаки и здоровья автоматически очищаются от чёрного фона;</li>
                  <li>статы и цена масштабируются под доступное место.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
