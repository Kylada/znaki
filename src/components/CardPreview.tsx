import React from 'react';
import { useGameStore } from '../store/gameStore';

const elementColors: Record<string, string> = {
  'Свет': '#FFD700',
  'Тьма': '#4B0082',
  'Хаос': '#DC143C',
  'Порядок': '#1E90FF',
  'Жизнь': '#228B22',
  'Смерть': '#2F4F4F',
  'Нет': '#808080',
};

const elementIcons: Record<string, string> = {
  'Свет': '☀️',
  'Тьма': '🌑',
  'Хаос': '🔥',
  'Порядок': '❄️',
  'Жизнь': '🌿',
  'Смерть': '💀',
  'Нет': '⬡',
};

export const CardPreview: React.FC = () => {
  const { hoveredCardId, selectedCardId, getCard } = useGameStore();
  const cardId = hoveredCardId || selectedCardId;
  if (!cardId) return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-600 text-center text-sm">
      Наведите на карту для предпросмотра
    </div>
  );

  const card = getCard(cardId);
  if (!card || (card.faceDown && card.ownerId !== useGameStore.getState().localPlayerId)) return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-600 text-center text-sm">
      Карта скрыта
    </div>
  );

  const elem = card.template.element || 'Нет';
  const borderColor = elementColors[elem] || '#808080';

  const typeLabels: Record<string, string> = {
    monster: 'Монстр',
    spell: 'Заклятье',
    artifact: 'Артефакт',
    sign: 'Знак',
  };

  const subtypeLabels: Record<string, string> = {
    normal: 'Обычное',
    continuous: 'Длительное',
    quick: 'Быстрое',
    monument: 'Монумент',
    equipment: 'Экипировка',
  };

  return (
    <div className="bg-gray-900 border-2 rounded-lg overflow-hidden" style={{ borderColor }}>
      {/* Header */}
      <div className="p-2 flex justify-between items-center" style={{ background: borderColor }}>
        <span className="font-bold text-black text-sm">{card.template.name}</span>
        <span className="text-black font-bold">{card.template.cost}</span>
      </div>

      {/* Image */}
      {card.template.imageUrl && (
        <div className="h-[160px] bg-gray-800">
          <img
            src={card.template.imageUrl}
            alt={card.template.name}
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      {/* Info */}
      <div className="p-2 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">
            {typeLabels[card.template.type] || card.template.type}
            {card.template.subtype && ` — ${card.template.subtype}`}
            {card.template.spellSubtype && ` (${subtypeLabels[card.template.spellSubtype] || card.template.spellSubtype})`}
            {card.template.artifactSubtype && ` (${subtypeLabels[card.template.artifactSubtype] || card.template.artifactSubtype})`}
          </span>
          <span>{elementIcons[elem]} {elem}</span>
        </div>

        {/* Stats */}
        {(card.template.type === 'monster' || card.template.type === 'artifact') && (
          <div className="flex gap-3 text-sm">
            {card.template.type === 'monster' && (
              <span className="text-red-400">⚔ ATK: {card.currentAttack ?? card.template.attack ?? 0}</span>
            )}
            <span className="text-green-400">♥ HP: {card.currentHealth ?? card.template.health ?? 0}{card.template.maxHealth ? ` / ${card.template.maxHealth}` : ''}</span>
          </div>
        )}

        {/* Position */}
        {card.position && (
          <div className="text-xs text-gray-400">
            Позиция: {card.position === 'attack' ? '⚔️ Атакующая' : '🛡️ Защитная'}
          </div>
        )}

        {/* Effect */}
        {card.template.effectText && (
          <div className="bg-gray-800 rounded p-2 text-xs text-gray-200 leading-relaxed">
            {card.template.effectText}
          </div>
        )}

        {/* Counters */}
        {Object.keys(card.counters).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(card.counters).map(([name, count]) => (
              <span key={name} className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {name}: {count}
              </span>
            ))}
          </div>
        )}

        {/* Zone info */}
        <div className="text-[10px] text-gray-600">
          Зона: {card.zone} | {card.isToken ? 'Токен' : 'Карта'} | {card.faceDown ? 'Рубашкой' : 'Лицом'}
          {card.exhausted && ' | Истощён'}
        </div>
      </div>
    </div>
  );
};
